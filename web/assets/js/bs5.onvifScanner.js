$(document).ready(function(e){
    //onvif probe
    var loadedResults = {}
    var loadedResultsByIp = {}
    var monitorEditorWindow = $('#tab-monitorSettings')
    var onvifScannerWindow = $('#tab-onvifScanner')
    var onvifScannerResultPane = onvifScannerWindow.find('.onvif_result')
    var onvifScannerErrorResultPane = onvifScannerWindow.find('.onvif_result_error')
    var scanForm = onvifScannerWindow.find('form');
    var sideMenuList = $(`#side-menu-link-onvifScanner  ul`)
    var checkTimeout;
    function addCredentialsToUri(uri,username,password){
        let newUri = `${uri}`
        const uriParts = newUri.split('://')
        uriParts[1] = `${username}:${password}@${uriParts[1]}`
        newUri = uriParts.join('://')
        return newUri
    }
    function drawFoundCamerasSubMenu(){
        var allFound = []
        Object.keys(loadedResults).forEach(function(monitorId){
            var item = loadedResults[monitorId]
            allFound.push({
                attributes: `href="#onvif-result-${monitorId}" scrollToParent="#tab-onvifScanner"`,
                class: `scrollTo`,
                color: 'blue',
                label: item.host + ':' + item.details.onvif_port,
            })
        })
        var html = buildSubMenuItems(allFound)
        sideMenuList.html(html)
    }
    var setAsLoading = function(appearance){
        if(appearance){
            onvifScannerWindow.find('._loading').show()
            onvifScannerWindow.find('[type="submit"]').prop('disabled',true)
        }else{
            onvifScannerWindow.find('._loading').hide()
            onvifScannerWindow.find('[type="submit"]').prop('disabled',false)
        }
    }
    function drawProbeResult(options){
        if(!options.error){
            var currentUsername = onvifScannerWindow.find('[name="user"]').val()
            var currentPassword = onvifScannerWindow.find('[name="pass"]').val()
            var tempID = generateId()
            var info = options.info ? jsonToHtmlBlock(options.info) : ''
            var streamUrl = ''
            var launchWebPage = `target="_blank" href="http${options.port == 443 ? 's' : ''}://${options.ip}:${options.port}"`
            if(options.uri){
                streamUrl = options.uri
            }
            var theLocation = getLocationFromUri(options.uri)
            var pathLocation = theLocation.location
            var monitorConfigPartial = {
                name: pathLocation.hostname,
                mid: tempID + `${options.port}`,
                host: pathLocation.hostname,
                port: pathLocation.port,
                path: pathLocation.pathname + (pathLocation.search && pathLocation.search !== '?' ? pathLocation.search : ''),
                protocol: theLocation.protocol,
                details: {
                    auto_host: addCredentialsToUri(streamUrl,currentUsername,currentPassword),
                    muser: currentUsername,
                    mpass: currentPassword,
                    is_onvif: '1',
                    onvif_port: options.port,
                },
            }
            if(options.isPTZ){
                monitorConfigPartial.details = Object.assign(monitorConfigPartial.details,{
                    control: '1',
                    control_url_method: 'ONVIF',
                    control_stop: '1',
                })
            }
            var monitorAlreadyAdded = isOnvifRowAlreadyALoadedMonitor(monitorConfigPartial)
            if(monitorAlreadyAdded){
                monitorConfigPartial.mid = monitorAlreadyAdded.mid;
            }
            var monitorId = monitorConfigPartial.mid
            loadedResults[monitorId] = monitorConfigPartial;
            loadedResultsByIp[monitorConfigPartial.host] = monitorConfigPartial;
            onvifScannerResultPane.append(`
                <div class="col-md-4 mb-3" onvif_row="${monitorId}" id="onvif-result-${monitorId}">
                    <div style="display:block" class="card shadow btn-default copy">
                        <div class="preview-image card-header" style="background-image:url(${options.snapShot ? 'data:image/png;base64,' + options.snapShot : placeholder.getData(placeholder.plcimg({text: ' ', fsize: 25, bgcolor:'#1f80f9'}))})"></div>
                        <div class="card-body" style="min-height:190px">
                            <div>${info}</div>
                            <div class="url">${streamUrl}</div>
                        </div>
                        <div class="card-footer">${options.ip}:${options.port}</div>
                    </div>
                </div>
            `)
            onvifScannerWindow.find('._notfound').remove()
            setAsLoading(false)
            drawFoundCamerasSubMenu()
        }else{
            if(!loadedResultsByIp[options.ip]){
                onvifScannerErrorResultPane.append(`
                    <div onvif_error_row="${options.ip}" class="d-flex flex-row">
                        <div class="py-2 px-1" style="min-width:170px"><b>${options.ip}:${options.port}</b></div>
                        <div class="py-2 px-1 flex-grow-1">${options.error}</div>
                        <div class="py-2 px-1 text-right">
                            <a target="_blank" class="btn btn-sm btn-secondary" href="http://${options.ip}:${options.port}"><i class="fa fa-external-link"></i></a>
                        </div>
                    </div>
                `)
            }
        }
    }
    function isOnvifRowAlreadyALoadedMonitor(onvifRow){
        var matches = null;
        $.each(loadedMonitors,function(n,monitor){
            if(monitor.host === onvifRow.host){
                matches = monitor
            }
        })
        return matches;
    }
    var filterOutMonitorsThatAreAlreadyAdded = function(listOfCameras,callback){
        $.getJSON(getApiPrefix(`monitor`),function(monitors){
            var monitorsNotExisting = []
            $.each(listOfCameras,function(n,camera){
                var matches = false
                $.each(monitors,function(m,monitor){
                    if(monitor.host === camera.host){
                        matches = true
                    }
                })
                if(!matches){
                    monitorsNotExisting.push(camera)
                }
            })
            callback(monitorsNotExisting)
        })
    }
    var getLocationFromUri = function(uri){
        var newString = uri.split('://')
        var protocol = `${newString[0]}`
        newString[0] = 'http'
        newString = newString.join('://')
        var uriLocation = new URL(newString)
        // uriLocation.protocol = protocol
        return {
            location: uriLocation,
            protocol: protocol
        }
    }
    var postMonitor = function(monitorToPost){
        var newMon = mergeDeep(generateDefaultMonitorSettings(),monitorToPost)
        $.post(getApiPrefix(`configureMonitor`) + '/' + monitorToPost.mid,{data:JSON.stringify(newMon,null,3)},function(d){
            debugLog(d)
        }).fail(function(xhr, status, error) {
            console.error(error)
        });
    }
    function loadLocalOptions(){
        var currentOptions = dashboardOptions()
        $.each(['ip','port','user'],function(n,key){
            onvifScannerWindow.find(`[name="${key}"]`).change(function(e){
                var value = $(this).val()
                dashboardOptions(`onvif_probe_${key}`,value,{x: value ? null : 0})
            })
            if(currentOptions[`onvif_probe_${key}`]){
                onvifScannerWindow.find(`[name="${key}"]`).val(currentOptions[`onvif_probe_${key}`])
            }
        })
    }
    scanForm.submit(function(e){
        e.preventDefault();
        loadedResults = {}
        loadedResultsByIp = {}
        var el = $(this)
        var form = el.serializeObject();
        onvifScannerResultPane.empty();
        onvifScannerErrorResultPane.empty();
        setAsLoading(true)
        mainSocket.f({
            f: 'onvif',
            ip: form.ip,
            port: form.port,
            user: form.user,
            pass: form.pass
        });
        clearTimeout(checkTimeout)
        checkTimeout = setTimeout(function(){
            if(onvifScannerResultPane.find('.card').length === 0){
                setAsLoading(false)
                onvifScannerResultPane.append(`<div class="p-2 text-center ${definitions.Theme.isDark ? 'text-white' : ''} _notfound text-white epic-text">${lang.sorryNothingWasFound}</div>`)
            }
        },5000)
        return false;
    });
    onvifScannerWindow.on('click','.copy',function(){
        openMonitorEditorPage()
        var el = $(this).parents('[onvif_row]');
        var id = el.attr('onvif_row');
        var onvifRecord = loadedResults[id];
        var streamURL = onvifRecord.details.auto_host
        writeToMonitorSettingsWindow(onvifRecord)
    })
    onvifScannerWindow.on('click','.add-all',function(){
        filterOutMonitorsThatAreAlreadyAdded(loadedResults,function(importableCameras){
            $.each(importableCameras,function(n,camera){
                // console.log(camera)
                postMonitor(camera)
            })
        })
    })
    loadLocalOptions()
    onWebSocketEvent(function (d){
        switch(d.f){
            case'onvif':
                drawProbeResult(d)
            break;
        }
    })
})
