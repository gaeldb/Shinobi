$(document).ready(function(e){
    //onvif probe
    var loadedResults = {}
    var loadedResultsByIp = {}
    var monitorEditorWindow = $('#tab-monitorSettings')
    var onvifScannerWindow = $('#tab-onvifScanner')
    var onvifScannerStartButton = onvifScannerWindow.find('.start-scan')
    var onvifScannerStopButton = onvifScannerWindow.find('.stop-scan')
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
    var showStopButton = function(appearance){
        if(appearance){
            onvifScannerStartButton.addClass('d-none')
            onvifScannerStopButton.removeClass('d-none')
        }else{
            onvifScannerStartButton.removeClass('d-none')
            onvifScannerStopButton.addClass('d-none')
        }
    }

    function drawDeviceTableRow(device, gotAccess){
        var ip = device.ip;
        var el = onvifScannerResultPane.find(`[scan-item="${ip}"]`)
        var hasError = !!device.error;
        var uriText = !hasError ? device.uri : device.error;
        var statusColor = hasError ? 'red' : 'green';
        var snapShot = device.snapShot;
        // console.log(ip, device.error, hasError)
        if(gotAccess)loadMonitorConfigFromResult(device)
        if(el.length === 0){
            var html = `<tr scan-item="${ip}">
                <td><i class="fa fa-circle" style="color:${statusColor}"></i></td>
                <td><img class="scan-item-img copy" src='data:image/jpeg;base64,${snapShot}' onerror="replaceBrokenImage(this)"></td>
                <td>${ip}<br><small class="uri">${uriText}</small></td>
                <td class="text-center copy-button">${!hasError ? makeButton({text: lang.Copy, class:'copy', color: 'primary'}) : ''}</td>
             </tr>`
             onvifScannerResultPane.append(html)
        }else{
            var copyButton = el.find('.copy-button');
            var imgEl = el.find('.scan-item-img');
            if(hasError){
                copyButton.empty()
                imgEl.removeClass('copy cursor-pointer')
            }else{
                copyButton.html(makeButton({text: lang.Copy, class:'copy', color: 'primary'}))
                imgEl.addClass('copy cursor-pointer')
            }
            imgEl.text(snapShot)
            el.find('.uri').text(uriText)
            el.find('.fa-circle').css('color', statusColor)
        }
    }
    function loadMonitorConfigFromResult(options){
        var monitorId = removeSpecialCharacters(options.ip)
        var currentUsername = options.user
        var currentPassword = options.pass
        var streamUrl = ''
        var launchWebPage = `target="_blank" href="http${options.port == 443 ? 's' : ''}://${options.ip}:${options.port}"`
        if(options.uri){
            streamUrl = options.uri
        }
        var theLocation = getLocationFromUri(options.uri)
        var pathLocation = theLocation.location
        var monitorConfigPartial = {
            name: pathLocation.hostname,
            mid: monitorId,
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
        loadedResults[monitorId] = monitorConfigPartial;
        loadedResultsByIp[monitorConfigPartial.host] = monitorConfigPartial;
        return monitorConfigPartial
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
        })
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
        showStopButton(true)
        mainSocket.f({
            f: 'onvif',
            ip: form.ip,
            port: form.port,
            user: form.user,
            pass: form.pass
        });
        clearTimeout(checkTimeout)
        checkTimeout = setTimeout(function(){
            if(onvifScannerResultPane.find('[scan-item]').length === 0){
                showStopButton(false)
                onvifScannerResultPane.append(`<div class="p-2 text-center ${definitions.Theme.isDark ? 'text-white' : ''} _notfound text-white epic-text">${lang.sorryNothingWasFound}</div>`)
            }
        },5000)
        return false;
    });
    onvifScannerWindow.on('click','.copy',function(e){
        e.preventDefault()
        openMonitorEditorPage()
        var el = $(this).parents('[scan-item]');
        var id = el.attr('scan-item');
        var onvifRecord = loadedResultsByIp[id];
        var streamURL = onvifRecord.details.auto_host
        writeToMonitorSettingsWindow(onvifRecord)
    })
    onvifScannerWindow.on('click','.add-all',function(){
        filterOutMonitorsThatAreAlreadyAdded(loadedResults,function(importableCameras){
            const numberOfCameras = importableCameras.length
            if(numberOfCameras === 0){
                new PNotify({
                    title: lang["ONVIF Scanner"],
                    text: lang.sorryNothingWasFound,
                    type: 'danger',
                })
            }else{
                $.confirm.create({
                    title: lang['Add Cameras'],
                    body: `<p>${lang.addAllCamerasText.replace('9001', numberOfCameras)}</p><ul>${importableCameras.map(item => `<li>${item.host}</li>`).join('')}</ul>`,
                    clickOptions: {
                        class: 'btn-success',
                        title: lang.Add,
                    },
                    clickCallback: function(){
                        $.each(importableCameras,function(n,camera){
                            // console.log(camera)
                            postMonitor(camera)
                        })
                    }
                })
            }
        })
    })
    onvifScannerWindow.on('click','.stop-scan',function(){
        mainSocket.f({ f: 'onvif_stop' });
    })

    loadLocalOptions()
    onInitWebsocket(function (){
        mainSocket.f({ f: 'onvif_scan_reconnect' });
    })
    onWebSocketEvent(function (d){
        switch(d.f){
            case'onvif':
                try{
                    drawDeviceTableRow(d, d.ff !== 'failed_capture' && !d.failedConnection);
                }catch(err){
                    console.error(err)
                }
            break;
            case'onvif_scan_current':
                console.log(d)
                if(d.isScanning){
                    showStopButton(true)
                }else{
                    showStopButton(false)
                }
                d.devices.forEach(device => {
                    console.log('onvif_scan_current', device)
                    drawDeviceTableRow(device, !device.error && !d.failedConnection)
                });
            break;
            case'onvif_scan_complete':
                showStopButton(false)
                d.devices.forEach(device => {
                    console.log('onvif_scan_complete',device)
                    drawDeviceTableRow(device, !device.error && !d.failedConnection)
                });
            break;
        }
    })
})
