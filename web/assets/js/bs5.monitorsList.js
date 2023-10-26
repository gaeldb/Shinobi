$(document).ready(function(){
    var selectedApiKey = `${$user.auth_token}`
    var theBlock = $('#tab-monitorsList')
    var theList = $('#monitorsListRows')
    var apiKeySelector = $('#multi_mon_api_key_selector')
    var multiMonitorSelect = $('#multimon_select_all')
    function drawRowToList(row){
        var streamUrl = libURL + buildStreamUrl(row.mid).replace($user.auth_token,selectedApiKey)
        theList.append(`
        <div data-mid="${row.mid}" class="col-md-4 card-page-selection glM${row.mid}">
            <div class="${definitions.Theme.isDark ? 'text-white' : 'text-dark'} mb-3 card shadow-sm btn-default">
                <div class="card monitor-card-preview snapshot launch-live-grid-monitor cursor-pointer" style="background-image:url(${getApiPrefix('icon') + '/' + row.mid})"></div>
                ${buildMiniMonitorCardBody(loadedMonitors[row.mid],null,`<div>
                <div class="mb-2">
                    <div class="d-flex flex-row">
                        <div class="flex-grow-1">
                            <span class="monitor_name" title="${row.mid}">${row.name}</span>
                        </div>
                        <div class="text-right">
                            <input class="monitor-list-select form-check-input no-abs m-0" type="checkbox" value="${row.mid}" name="${row.mid}" id="monitorListSelect-${row.mid}">
                        </div>
                    </div>
                    <small class="text-muted monitor_host">${row.host}</small><br>
                    <small class="text-muted monitor_status">${row.status || lang.Stopped}</small>
                </div>
                <div class="d-flex flex-row">
                    <div class="flex-grow-1">
                        <a href="javascript:console.log('${row.mid} Export')" class="badge btn btn-dark export-this-monitor-settings"><i class="fa fa-download"></i> ${lang['Export']}</a>
                        <a href="javascript:console.log('${row.mid} Settings')" class="badge btn btn-dark open-monitor-settings"><i class="fa fa-wrench"></i> ${lang['Edit']}</a>
                        <a class="badge btn btn-dark copy-stream-url" href="${streamUrl}" target="_blank">${lang['Copy Stream URL']}</a>
                        <!-- <a class="badge btn btn-primary duplicate-monitor"><i class="fa fa-copy"></i> ${lang['Duplicate']}</a> -->
                    </div>
                    <div>
                        <div class="dropup">
                            <button type="button" class="d-inline-block badge btn btn-dark dropdown-toggle dropdown-toggle-split" id="monitorMenuItem${row.mid}" data-bs-toggle="dropdown" aria-expanded="false" data-bs-reference="parent">
                              <i class="fa fa-ellipsis-v" aria-hidden="true"></i>
                            </button>
                            <ul class="dropdown-menu ${definitions.Theme.isDark ? 'dropdown-menu-dark bg-dark' : ''} shadow-lg" aria-labelledby="monitorMenuItem${row.mid}">
                                ${buildDefaultMonitorMenuItems()}
                            </ul>
                        </div>
                    </div>
                </div>
              </div>`,true)}
          </div>
      </div>`)
    }
    function loadMonitorsFromMemory(options,callback){
        theList.empty();
        $.each(getLoadedMonitorsAlphabetically(),function(n,row){
            drawRowToList(row)
        })
    }
    function getSelectedMonitors(){
        var monitorsSelected = [];
        theList.find('.monitor-list-select').each(function(n,v){
            var el = $(v)
            if(el.is(':checked')){
                var key = el.attr('name')
                monitorsSelected.push(getDbColumnsForMonitor(loadedMonitors[key]))
            }
        })
        return monitorsSelected;
    }
    function toggleMonitorListSelectAll(isChecked){
        var nameField = theList.find('input[type=checkbox][name]')
        if(isChecked === true){
            nameField.prop('checked',true)
        }else{
            nameField.prop('checked',false)
        }
    }
    function drawMonitorsListApiKeyList(){
        $.getJSON(getApiPrefix(`api`) + '/list',function(d){
            var html = ''
            $.each(d.keys || [],function(n,key){
                console.log(key)
                html += createOptionHtml({
                    value: key.code,
                    label: key.code,
                })
            })
            apiKeySelector.find('optgroup').html(html)
        })
    }
    function correctDropdownPosition(dropdownElement){
        var p = dropdownElement.offset();
        if (p.top < 0){
            dropdownElement[0].style = `transform:translate(0px, ${-p.top + 20}px)!important;`
        }
    }
    var monitorListMenuDropdownOpen = null
    var monitorListScrollTimeout = null
    theBlock.on('mouseup','[data-bs-toggle="dropdown"]',function(){
        var dropdownElement = $(this).next()
        monitorListMenuDropdownOpen = dropdownElement
        setTimeout(function(){
            correctDropdownPosition(dropdownElement)
        },500)
    })
    $('body')
    .on('click','.create-live-player',function(){
        var el = $(this).parents('[data-mid]')
        var monitorId = el.attr('data-mid')
        createLivePlayerTab(loadedMonitors[monitorId])
    })
    .on('click','[set-mode]',function(){
        var thisEl = $(this)
        var el = thisEl.parents('[data-mid]')
        var monitorId = el.attr('data-mid')
        var mode = thisEl.attr('set-mode')
        $.getJSON(`${getApiPrefix('monitor')}/${monitorId}/${mode}`,function(data){
            console.log(data)
        })
    })
    .on('click','.export-this-monitor-settings',function(){
        var monitorId = getRowsMonitorId(this)
        downloadMonitorConfigurationsToDisk([
            monitorId
        ])
    })
    theBlock
    .find('.export-selected-monitor-settings').click(function(){
        var monitorsSelected = getSelectedMonitors()
        if(monitorsSelected.length === 0){
            new PNotify({
                title: lang['No Monitors Selected'],
                type: 'error'
            });
            return
        }
        downloadMonitorConfigurationsToDisk(monitorsSelected)
    })
    theBlock
    .find('.delete-selected-monitor-settings').click(function(){
        var monitorsSelected = getSelectedMonitors()
        if(monitorsSelected.length === 0){
            new PNotify({
                title: lang['No Monitors Selected'],
                text: lang['Select atleast one monitor to delete'],
                type: 'error'
            });
            return
        }
        deleteMonitors(monitorsSelected)
    })
    theList
    .on('click','.copy-stream-url',function(e){
        e.preventDefault()
        var el = $(this)
        var href = getFullOrigin() + el.attr('href')
        copyToClipboard(href)
        new PNotify({
            title: lang['Copied'],
            text: lang['Copied to Clipboard'],
            type: 'success'
        })
        return false
    })
    multiMonitorSelect.change(function(){
        var el = $(this);
        var isChecked = el.prop('checked')
        toggleMonitorListSelectAll(isChecked)
    })
    apiKeySelector.change(function(){
        var value = $(this).val()
        selectedApiKey = `${value}`
        loadMonitorsFromMemory()
        multiMonitorSelect.prop('checked',false)
    })
    theBlock.find('.import-monitor-settings').click(function(){
        launchImportMonitorWindow()
    })
    addOnTabOpen('monitorsList', function () {
        loadMonitorsFromMemory()
        drawMonitorsListApiKeyList()
    })
    addOnTabReopen('monitorsList', function () {
        loadMonitorsFromMemory()
        drawMonitorsListApiKeyList()
    })
    onWebSocketEvent(function (d){
        switch(d.f){
            case'monitor_edit':
                clearTimeout(window.renewListTimeout)
                window.renewListTimeout = setTimeout(() => {
                    if(tabTree.name === 'monitorsList'){
                        loadMonitorsFromMemory()
                    }
                },5000)
            break;
        }
    })
    // $('#monitors_list_search').keyup(function(){
    //     var monitorBlocks = $('.monitor_block');
    //     var searchTerms = $(this).val().toLowerCase().split(' ')
    //     if(searchTerms.length === 0 || searchTerms[0] === ''){
    //         monitorBlocks.show()
    //         return
    //     }
    //     monitorBlocks.hide()
    //     $.each($.ccio.mon,function(n,monitor){
    //         var searchThis = JSON.stringify($.ccio.init('cleanMon',monitor)).toLowerCase().replace('"','');
    //         $.each(searchTerms,function(m,term){
    //             if(searchThis.indexOf(term) >-1 ){
    //                 $('.monitor_block[ke="'+monitor.ke+'"][mid="'+monitor.mid+'"]').show()
    //             }
    //         })
    //     })
    // })
})
