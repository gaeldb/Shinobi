var sidebarMenu = $('#sidebarMenu')
var sidebarMenuInner = $('#menu-side')
var pageTabContainer = $('#pageTabContainer')
var topMenu = $('#topMenu')
var monitorSideList = $('#monitorSideList')
var sideMenuCollapsePoint = $('#side-menu-collapse-point')
var floatingHideButton = $('#floating-hide-button')
var floatingBackButton = $('#floating-back-button')
function buildTabHtml(tabName,tabLabel,tabIcon){
    return `<li class="nav-link side-menu-link cursor-pointer" page-open="${tabName}">
        <div class="d-flex flex-row">
            <div class="d-flex pr-2">
                <span>
                    <i class="fa fa-${tabIcon ? tabIcon : 'file-o'}"></i>
                </span>
            </div>
            <div class="flex-grow-1 pr-2">
                ${tabLabel}
            </div>
            <div class="d-flex">
                <span class="delete-tab">
                    <i class="fa fa-times-circle-o"></i>
                </span>
            </div>
        </div>
      </li>`
}
function drawMonitorIconToMenu(item){
    var html = `<li class="nav-item monitor-icon monitor_block glM${item.mid}" data-ke="${item.ke}" data-mid="${item.mid}" data-status-code="${item.code}">
        <div title="Monitor ID : ${item.mid}" class="d-flex d-flex-row align-items-center p-2 mt-0 mb-3 mx-0 btn btn-default rounded shadow-sm cursor-pointer">
          <div class="lh-1 text-start">
            <img class="me-3 snapshot launch-live-grid-monitor" src="${true ? logoLocation196x196 : getApiPrefix('icon') + '/' + item.mid}">
          </div>
          <div class="lh-1 text-start hidden-squeeze">
            <h1 class="h6 mb-0 lh-1"><span class="monitor_name">${item.name}</span></h1>
            <div class="pt-1">
                <small class="monitor_status">${definitions['Monitor Status Codes'][item.code] || item.status}</small>
            </div>
          </div>
          <div class="flex-fill text-end squeeze-button">
              <div class="dropstart">
                  <button type="button" class="d-inline-block badge btn btn-default dropdown-toggle dropdown-toggle-split" id="monitorMenuItem${item.mid}" data-bs-toggle="dropdown" aria-expanded="false" data-bs-reference="parent">
                    <i class="fa fa-ellipsis-v" aria-hidden="true"></i>
                  </button>
                  <ul class="dropdown-menu ${definitions["Monitor Options"].dropdownClass} shadow-lg" aria-labelledby="monitorMenuItem${item.mid}">
                      ${buildDefaultMonitorMenuItems()}
                  </ul>
              </div>
          </div>
        </div>
    </li>`
    monitorSideList.append(html)
}
function drawMonitors(){
    monitorSideList.empty()
    $.each(loadedMonitors,function(n,item){
        drawMonitorIconToMenu(item)
    })
}
function resizeMonitorIcons(){
    var monitorIcons = sidebarMenuInner.find('.monitor_block img')
    var iconWidth = monitorIcons.first().width()
    monitorIcons.css({
        height: `${iconWidth}px`,
    })
}
function fixSideMenuScroll(){
    sidebarMenuInner.css({
        height: window.innerHeight - (topMenu.height() || 0),
        overflow: "auto",
    })
}
function correctDropdownPosition(dropdownElement){
    var p = dropdownElement.offset();
    var dropdDownHeight = dropdownElement.height()
    var windowHeight = window.innerHeight
    var modifyX = p.left < 0
    var modifyY = p.top + dropdDownHeight > windowHeight
    if (modifyX || modifyY){
        dropdownElement[0].style = `transform:translate(${modifyX ? -p.left + 20 : 0}px, ${modifyY ? -dropdDownHeight - 20 : 0}px)!important;`
    }
}
function correctDropdownPositionAfterChange(dropdownElement){
    if(sideListMenuDropdownOpen){
        clearTimeout(sideListScrollTimeout)
        sideListScrollTimeout = setTimeout(function(){
            correctDropdownPosition(sideListMenuDropdownOpen)
        },500)
    }
}
function sortListMonitors(){
    if(!$user.details.monitorListOrder)$user.details.monitorListOrder = {0:[]}
    var getIdPlace = function(x){return $user.details.monitorListOrder[0].indexOf(x)}
    monitorSideList.find('.monitor_block').sort(function(a, b) {
        var contentA = getIdPlace($(a).attr('data-mid'))
        var contentB = getIdPlace($(b).attr('data-mid'))
        return contentA - contentB
     }).each(function() {
         monitorSideList.append($(this))
     })
     resizeMonitorIcons()
}
function toggleSideMenuVisibility(){
    if(pageTabContainer.hasClass('col-md-9')){
        sidebarMenu.css('width','0px')
        pageTabContainer.addClass('col-md-12 col-lg-12')
        pageTabContainer.removeClass('col-md-9 col-lg-10')
    }else{
        sidebarMenu.css('width','')
        pageTabContainer.removeClass('col-md-12 col-lg-12')
        pageTabContainer.addClass('col-md-9 col-lg-10')
    }
}
function toggleSideMenuCollapse(dontSaveChange){
    var isVisible = sideMenuCollapsePoint.hasClass('show')
    if(isVisible){
        sideMenuCollapsePoint.collapse('hide')
    }else{
        sideMenuCollapsePoint.collapse('show')
    }
    if(!dontSaveChange)dashboardOptions('sideMenuCollapsed',!isVisible ? '0' : 1)
}
function loadSideMenuCollapseStatus(){
    var isCollapsed = dashboardOptions().sideMenuCollapsed === 1;
    if(isCollapsed){
        sideMenuCollapsePoint.collapse('hide')
    }else{
        sideMenuCollapsePoint.collapse('show')
    }
    return isCollapsed
}
function isSideBarMenuCollapsed(){
    return dashboardOptions().sideMenuCollapsed === 1
}
function isSideBarMenuHidden(){
    return dashboardOptions().sideMenuHidden === 1
}
function toggleSideBarMenuHide(){
    var theBody = $('body')
    theBody.toggleClass('hide-side-menu')
    var isHidden = theBody.hasClass('hide-side-menu')
    dashboardOptions('sideMenuHidden',isHidden ? 1 : '0')
    if(isHidden){
        floatingHideButton.show()
        floatingBackButton.hide()
    }else{
        floatingHideButton.hide()
        if(tabTree.back)floatingBackButton.show()
    }
    onToggleSideBarMenuHideExtensions.forEach(function(extender){
        extender(isHidden)
    })
}
function makeMonitorListSortable(){
    var monitorSideList = $('#monitorSideList')
    if(isMobile)return;
    var options = {
        cellHeight: 80,
        verticalMargin: 10,
    };
    monitorSideList.sortable({
        containment: "parent",
        stop : function(event,ui){
            var order = []
            var monitorBlocks = monitorSideList.find('.monitor_block')
            $.each(monitorBlocks,function(n,block){
                var mid = $(block).attr('data-mid')
                order.push(mid)
            })
            $user.details.monitorListOrder = {0: order}
            mainSocket.f({
                f:'monitorListOrder',
                monitorListOrder: {0: order}
            })
        },
    })
}
$('#monitors_list_search').keyup(function(){
    var monitorBlocks = monitorSideList.find('.monitor_block');
    var searchTerms = $(this).val().toLowerCase().split(' ')
    if(searchTerms.length === 0 || searchTerms[0] === ''){
        monitorBlocks.show()
        return
    }
    monitorBlocks.hide()
    $.each(loadedMonitors,function(n,monitor){
        var searchThis = JSON.stringify(monitor).toLowerCase().replace('"','');
        $.each(searchTerms,function(m,term){
            if(searchThis.indexOf(term) >-1 ){
                monitorSideList.find('.monitor_block[data-ke="'+monitor.ke+'"][data-mid="'+monitor.mid+'"]').show()
            }
        })
    })
})
var sideListMenuDropdownOpen = null
var sideListScrollTimeout = null
monitorSideList.on('mouseup','[data-bs-toggle="dropdown"]',function(){
    var dropdownElement = $(this).next()
    sideListMenuDropdownOpen = dropdownElement
    setTimeout(function(){
        correctDropdownPosition(dropdownElement)
    },500)
})
monitorSideList.on('hidden.bs.dropdown', '[data-bs-toggle="dropdown"]', function(e) {
    sideListMenuDropdownOpen = null
})
sidebarMenuInner.scroll(correctDropdownPositionAfterChange)
$('[data-target="#monitorSideList"]').click(function(){
    setTimeout(resizeMonitorIcons,500)
})
$(window).resize(function(){
    fixSideMenuScroll()
    resizeMonitorIcons()
    correctDropdownPositionAfterChange()
})
onDashboardReady(function(){
    pageTabLinks.find(`.side-menu-link.go-home`).addClass('page-link-active active');
    drawMonitors()
    fixSideMenuScroll()
    sortListMonitors()
    loadSideMenuCollapseStatus()
    makeMonitorListSortable()
    $('.toggle-menu-collapse').click(function(){
        toggleSideMenuCollapse()
    })
    $('body').on('click','.hide-side-menu-toggle',function(){
        toggleSideBarMenuHide()
    })
    if(isSideBarMenuHidden()){
        toggleSideBarMenuHide()
    }
})
onWebSocketEvent(function(d){
    switch(d.f){
        case'monitor_status':
            monitorSideList.find('[data-mid="'+d.id+'"]').attr('data-status-code',d.code);
        break;
        case'monitor_snapshot':
            setTimeout(function(){
                var snapElement = $(`[data-mid="${d.mid}"] .snapshot`)
                switch(d.snapshot_format){
                    case'plc':
                        snapElement.attr('src',placeholder.getData(placeholder.plcimg({text:d.snapshot.toUpperCase().split('').join(' '), fsize: 25, bgcolor:'#1462a5'})))
                    break;
                    case'ab':
                        var theReader = new FileReader()
                        theReader.addEventListener("loadend",function(){
                            snapElement.attr('src',d.reader.result)
                            delete(theReader)
                        })
                        theReader.readAsDataURL(new Blob([d.snapshot],{type:"image/jpeg"}))
                    break;
                    case'b64':
                        snapElement.attr('src','data:image/jpeg;base64,'+d.snapshot)
                    break;
                }
            },1000)
        break;
    }
})
