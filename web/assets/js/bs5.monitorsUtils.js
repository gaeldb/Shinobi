var monitorGroupSelections = $('#monitor-group-selections')
var onGetSnapshotByStreamExtensions = []
var redAlertNotices = {};
function onGetSnapshotByStream(callback){
    onGetSnapshotByStreamExtensions.push(callback)
}
var onBuildStreamUrlExtensions = []
function onBuildStreamUrl(callback){
    onBuildStreamUrlExtensions.push(callback)
}
function humanReadableModeLabel(mode){
    var humanMode = lang['Disabled']
    switch(mode){
        case'idle':
            humanMode = lang['Idle']
        break;
        case'stop':
            humanMode = lang['Disabled']
        break;
        case'record':
            humanMode = lang['Record']
        break;
        case'start':
            humanMode = lang['Watch Only']
        break;
    }
    return humanMode
}
function setCosmeticMonitorInfo(monitorConfig){
    var monitorId = monitorConfig.mid
    var monitorElements = $('.glM' + monitorId)
    if(safeJsonParse(monitorConfig.details).vcodec !=='copy' && monitorConfig.mode == 'record'){
        monitorElements.find('.monitor_not_record_copy').show()
    }else{
        monitorElements.find('.monitor_not_record_copy').hide()
    }
    var humanReadableMode = humanReadableModeLabel(monitorConfig.mode)
    monitorElements.find('.monitor_name').text(monitorConfig.name)
    monitorElements.find('.monitor_mid').text(monitorId)
    monitorElements.find('.monitor_ext').text(monitorConfig.ext)
    monitorElements.find('.monitor_mode').text(humanReadableMode)
    monitorElements.find('.monitor_status').html(definitions['Monitor Status Codes'][monitorConfig.code] || monitorConfig.status || '<i class="fa fa-spinner fa-pulse"></i>')
    monitorElements.attr('mode',humanReadableMode)
    monitorElements.find('.lamp').attr('title',humanReadableMode)
    if(monitorConfig.details.control=="1"){
        monitorElements.find('[monitor="control_toggle"]').show()
    }else{
        monitorElements.find('.pad').remove()
        monitorElements.find('[monitor="control_toggle"]').hide()
    }
}

function getSnapshot(options,cb){
    return new Promise((resolve,reject) => {
        function endAction(url,image_data,width,height,fileSize){
            if(cb)cb(url,image_data,width,height,fileSize);
            resolve({
                url,
                image_data,
                width,
                height,
                fileSize
            });
        }
        var image_data
        var url
        var monitor = options.mon || options.monitor || options
        var targetElement = $(options.targetElement || `[data-mid="${monitor.mid}"].monitor_item .stream-element`)
        var details = safeJsonParse(monitor.details)
        var streamType = details.stream_type;
        if(window.jpegModeOn !== true){
            function completeAction(image_data,width,height){
                var len = image_data.length
                var arraybuffer = new Uint8Array( len )
                for (var i = 0; i < len; i++)        {
                    arraybuffer[i] = image_data.charCodeAt(i)
                }
                try {
                    var blob = new Blob([arraybuffer], {type: 'application/octet-stream'})
                } catch (e) {
                    var bb = new (window.WebKitBlobBuilder || window.MozBlobBuilder)
                    bb.append(arraybuffer);
                    var blob = bb.getBlob('application/octet-stream');
                }
                url = (window.URL || window.webkitURL).createObjectURL(blob)
                endAction(url,image_data,width,height,arraybuffer.length)
                try{
                    setTimeout(function(){
                        URL.revokeObjectURL(url)
                    },10000)
                }catch(er){}
            }
            switch(streamType){
                case'hls':
                case'flv':
                case'mp4':
                    getVideoSnapshot(targetElement[0],function(base64,video_data,width,height){
                        completeAction(video_data,width,height)
                    })
                break;
                case'mjpeg':
                    $('#temp').html('<canvas></canvas>')
                    var c = $('#temp canvas')[0]
                    var img = $('img',targetElement.contents())[0]
                    c.width = img.width
                    c.height = img.height
                    var ctx = c.getContext('2d')
                    ctx.drawImage(img, 0, 0,c.width,c.height)
                    completeAction(atob(c.toDataURL('image/jpeg').split(',')[1]),c.width,c.height)
                break;
                case'b64':
                    var c = targetElement[0]
                    var ctx = c.getContext('2d')
                    completeAction(atob(c.toDataURL('image/jpeg').split(',')[1]),c.width,c.height)
                break;
                case'jpeg':
                    url = targetElement.attr('src')
                    image_data = new Image()
                    image_data.src = url
                    endAction(url,image_data,image_data.width,image_data.height,0)
                break;
            }
            $.each(onGetSnapshotByStreamExtensions,function(n,extender){
                extender(streamType,targetElement,completeAction,cb)
            })
        }else{
            url = targetElement.attr('src')
            image_data = new Image()
            image_data.src = url
            endAction(url,image_data,image_data.width,image_data.height,0)
        }
    })
}
function getVideoSnapshot(videoElement,cb){
    var image_data
    var base64
    $('#temp').html('<canvas></canvas>')
    var c = $('#temp canvas')[0]
    var img = videoElement
    c.width = img.videoWidth
    c.height = img.videoHeight
    var ctx = c.getContext('2d')
    ctx.drawImage(img, 0, 0,c.width,c.height)
    base64=c.toDataURL('image/jpeg')
    image_data=atob(base64.split(',')[1])
    var arraybuffer = new ArrayBuffer(image_data.length)
    var view = new Uint8Array(arraybuffer)
    for (var i=0; i<image_data.length; i++) {
        view[i] = image_data.charCodeAt(i) & 0xff
    }
    try {
        var blob = new Blob([arraybuffer], {type: 'application/octet-stream'})
    } catch (e) {
        var bb = new (window.WebKitBlobBuilder || window.MozBlobBuilder)
        bb.append(arraybuffer)
        var blob = bb.getBlob('application/octet-stream')
    }
    cb(base64,image_data,c.width,c.height)
}

function runPtzCommand(monitorId,switchChosen){
    switch(switchChosen){
        case'setHome':
            $.getJSON(getApiPrefix(`control`) + '/' + monitorId + '/setHome',function(data){
                console.log(data)
            })
        break;
        default:
            mainSocket.f({
                f: 'control',
                direction: switchChosen,
                id: monitorId,
                ke: $user.ke
            })
        break;
    }
}
function runPtzMove(monitorId,switchChosen,doMove){
    mainSocket.f({
        f: doMove ? 'startMove' : 'stopMove',
        direction: switchChosen,
        id: monitorId,
        ke: $user.ke
    })
}
function runTestDetectionTrigger(monitorId,customData){
    return new Promise((resolve,reject) => {
        var detectionData = Object.assign({
            "plug":"dashboard",
            "name":"Test Object",
            "reason":"object",
            "confidence": 80,
            imgHeight: 640,
            imgWidth: 480,
            matrices: [
                {
                    x: 15,
                    y: 15,
                    width: 50,
                    height: 50,
                    tag: 'Object Test',
                    confidence: 100,
                }
            ]
        },customData || {});
        $.getJSON(getApiPrefix() + '/motion/'+$user.ke+'/'+monitorId+'/?data=' + JSON.stringify(detectionData),function(d){
            debugLog(d)
            resolve(d)
        })
    })
}
function toggleSubStream(monitorId,callback){
    var monitor = loadedMonitors[monitorId]
    var substreamConfig = monitor.details.substream
    var isSubStreamConfigured = !!substreamConfig.output;
    if(!isSubStreamConfigured){
        new PNotify({
            type: 'warning',
            title: lang['Invalid Settings'],
            text: lang.SubstreamNotConfigured,
        });
        return;
    }
    if(monitor.subStreamToggleLock)return false;
    monitor.subStreamToggleLock = true
    $.getJSON(getApiPrefix() + '/toggleSubstream/'+$user.ke+'/'+monitorId + (monitor.subStreamActive ? '?action=stop' : ''),function(d){
        monitor.subStreamToggleLock = false
        debugLog(d)
        if(callback)callback()
    })
}
function playAudioAlert(){
    var fileName = $user.details.audio_alert
    if(window.audioAlertOnEvent && !fileName){
        fileName = `alert.mp3`
    }
    if(fileName && window.soundAlarmed !== true){
        window.soundAlarmed = true
        var audio = new Audio(`libs/audio/${fileName}`)
        var audioDelay = !isNaN($user.details.audio_delay) ? parseFloat($user.details.audio_delay) : 1
        audio.onended = function(){
            setTimeout(function(){
                window.soundAlarmed = false
            },audioDelay * 1000)
        }
        if(windowFocus === true){
            audio.play()
        }else{
            clearInterval(window.soundAlarmInterval)
            window.soundAlarmInterval = setInterval(function(){
                audio.play()
            },audioDelay * 1000)
        }
    }
}

function buildStreamUrl(monitorId){
    var monitor = loadedMonitors[monitorId]
    var streamURL = ''
    var streamType = safeJsonParse(monitor.details).stream_type
    switch(streamType){
        case'jpeg':
            streamURL = getApiPrefix(`jpeg`) + '/' + monitorId + '/s.jpg'
        break;
        case'mjpeg':
            streamURL = getApiPrefix(`mjpeg`) + '/' + monitorId
        break;
        case'hls':
            streamURL = getApiPrefix(`hls`) + '/' + monitorId + '/s.m3u8'
        break;
        case'flv':
            streamURL = getApiPrefix(`flv`) + '/' + monitorId + '/s.flv'
        break;
        case'mp4':
            streamURL = getApiPrefix(`mp4`) + '/' + monitorId + '/s.mp4'
        break;
        case'b64':
            streamURL = 'Websocket'
        break;
        case'useSubstream':
            streamURL = lang['Use Substream']
        break;
    }
    if(!streamURL){
        $.each(onBuildStreamUrlExtensions,function(n,extender){
            console.log(extender)
            streamURL = extender(streamType,monitorId)
        })
    }
    return streamURL
}

function buildEmbedUrl(monitor){
    var monitorId = monitor.mid;
    var streamURL = `${getApiPrefix(`embed`)}/${monitorId}/fullscreen|jquery|gui|relative?host=${location.pathname}`
    return streamURL;
}

function getDbColumnsForMonitor(monitor){
    var acceptedFields = [
        'mid',
        'ke',
        'name',
        'details',
        'type',
        'ext',
        'protocol',
        'host',
        'path',
        'port',
        'fps',
        'mode',
        'saveDir',
        'tags',
        'width',
        'height'
    ]
    var row = {};
    $.each(monitor,function(m,b){
        if(acceptedFields.indexOf(m)>-1){
            row[m]=b;
        }
    })
    return row
}

function downloadMonitorConfigurationsToDisk(monitorIds){
    var selectedMonitors = []
    $.each(monitorIds,function(n,monitorId){
        var monitor = monitorId instanceof Object ? monitorId : loadedMonitors[monitorId]
        if(monitor)selectedMonitors.push(monitor)
    })
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(selectedMonitors));
    $('#temp').html('<a></a>')
        .find('a')
        .attr('href',dataStr)
        .attr('download',`${applicationName}_Monitors_${$user.ke}_${new Date()}.json`)
        [0].click()
}

function importM3u8Playlist(textData){
    var m3u8List = textData.replace('#EXTM3U','').trim().split('\n')
    var parsedList = {}
    var currentName
    m3u8List.forEach(function(line){
        if(line.indexOf('#EXTINF:-1,') > -1){
            currentName = line.replace('#EXTINF:-1,','').trim()
        }else{
            parsedList[currentName] = line.trim()
        }
    })
    $.each(parsedList,function(name,url){
        var link = getUrlParts(url)
        var newMon = generateDefaultMonitorSettings()
        newMon.details = safeJsonParse(newMon.details)
        newMon.mid = 'HLS' + name.toLowerCase()
        newMon.name = name
        newMon.port = link.port
        newMon.host = link.hostname
        newMon.path = link.pathname
        newMon.details.tv_channel = '1'
        newMon.details.tv_channel_id = name
        newMon.details.auto_host_enable = '1'
        newMon.details.auto_host = url
        newMon.details.stream_quality = '1'
        newMon.details.stream_fps = ''
        newMon.details.stream_vcodec = 'libx264'
        newMon.details.stream_acodec = 'aac'
        newMon.details.stream_type = 'hls'
        newMon.details.hls_time = '10'
        newMon.type = 'mp4'
        newMon.details = JSON.stringify(newMon.details)
        postMonitor(newMon)
    })
}
function convertZoneMinderZonesToCords(rows,width,height){
    var coordinates = {}
    const defaultDetectionWidth = 640
    const defaultDetectionHeight = 480
    rows.forEach((row) => {
        const zone = row.Zone || row
        let widthRatio = width > defaultDetectionWidth ? defaultDetectionWidth / width : 1
        let heightRatio = height > defaultDetectionHeight ? defaultDetectionHeight / height : 1
        const points = zone.Coords.split(' ').map((item) => {
            let points = item.split(',').map((num) => parseInt(num));
            points[0] = parseInt(points[0] * widthRatio);
            points[1] = parseInt(points[1] * heightRatio);
            return points
        })
        const monitorId = zone.MonitorId
        coordinates[generateId(5)] = {
           "name": `${zone.Id}-${monitorId}`,
           "sensitivity": "5",
           "max_sensitivity": "",
           "threshold": 1,
           "color_threshold": 9,
           "points": points
        }
    })
    return coordinates
}
function mergeZoneMinderZonesIntoMonitors(data){
    const monitors = data.monitors
    const singleMonitor = data.monitor && data.monitor.Monitor ? data.monitor.Monitor : null
    const zones = data.zones
    const targetMonitors = singleMonitor ? [singleMonitor] : monitors
    targetMonitors.forEach((row) => {
        const monitor = row.Monitor
        const width = parseInt(monitor.Width)
        const height = parseInt(monitor.Height)
        const monitorZones = zones.filter(zone => {
            return zone.Zone.MonitorId === monitor.Id
        })
        monitor.Zones = convertZoneMinderZonesToCords(monitorZones,width,height) || {}
    })
    if(singleMonitor){
        data.monitor.Monitor = targetMonitors[0]
    }
}
function importZoneMinderMonitor(Monitor){
    var newMon = generateDefaultMonitorSettings()
    newMon.details = safeJsonParse(newMon.details)
    switch(Monitor.Type.toLowerCase()){
        case'ffmpeg':case'libvlc':
            const url = getUrlParts(Monitor.Path)
            const username = url.username || Monitor.User || Monitor.ONVIF_Username
            const password = url.password || Monitor.Pass || Monitor.ONVIF_Password
            const host = addCredentialsToUrl(url.origin,username,password)
            const monitorIdSuffix = removeSpecialCharacters(Monitor.Name).toLowerCase().substring(0,15)
            newMon.name = Monitor.Name + ` (ZM)`
            newMon.mid = `zm${monitorIdSuffix}`;
            newMon.host = host
            newMon.protocol = `${url.protocol}//`
            newMon.port = url.port || Monitor.Port
            newMon.path = url.pathname + url.search
            newMon.details.auto_host_enable = '1'
            newMon.details.auto_host = Monitor.Path
            newMon.details.muser = username
            newMon.details.mpass = password
            newMon.details.stream_type = 'hls'
            newMon.details.detector_buffer_acodec = 'auto'
            newMon.type = 'h264'
            if(Monitor.Zones){
                newMon.details.cords = JSON.stringify(Monitor.Zones)
            }
            switch(Monitor.Function){
                case'None':
                    // The monitor is currently disabled.
                    newMon.mode = 'stop'
                break;
                case'Monitor':
                    // The monitor is only available for live streaming.
                    // No image analysis is done so no alarms or events will be generated
                    // nothing will be recorded.
                    newMon.mode = 'start'
                    newMon.details.detector = '0'
                break;
                case'Modect':
                    // (Monitor) or MOtion DEteCTtion.
                    // All captured images will be analysed
                    // events generated with recorded video where motion is detected.
                    newMon.mode = 'start'
                    newMon.details.detector = '1'
                    newMon.details.detector_http_api = '1'
                    newMon.details.detector_send_frames = '1'
                break;
                case'Record':
                    // The monitor will be continuously recorded.
                    // No motion detection takes place in this mode.
                    newMon.mode = 'record'
                    newMon.details.detector = '0'
                break;
                case'Mocord':
                    // The monitor will be continuously recorded
                    // motion being highlighted within those events.
                    newMon.mode = 'record'
                    newMon.details.detector = '1'
                    newMon.details.detector_http_api = '1'
                    newMon.details.detector_send_frames = '1'
                break;
                case'Nodect':
                    // (Mocord) or No DEteCTtion.
                    // This is a special mode designed to be used with external triggers.
                    // In Nodect no motion detection takes place but events are recorded if external triggers require it.
                    newMon.mode = 'start'
                    newMon.details.detector = '1'
                    newMon.details.detector_send_frames = '0'
                    newMon.details.detector_http_api = '1'
                break;
            }
            if(
                url.protocol === 'rtsp:' ||
                url.protocol === 'rtmp:' ||
                url.protocol === 'rtmps:'
            ){
                newMon.type = 'h264'
            }else{
                new PNotify({
                    title: lang['Please Check Your Settings'],
                    text: lang.migrateText1,type:'error'
                })
            }
        break;
        default:
            new PNotify({
                title: lang['Please Check Your Settings'],
                text: lang.migrateText1,type:'error'
            })
        break;
    }
    newMon.details = JSON.stringify(newMon.details)
    return newMon
}

function importMonitor(textData){
    try{
        var parsedData = textData instanceof Object ? textData : safeJsonParse(mergeConcattedJsonString(textData))
        function postMonitor(v){
            var monitorId = v.mid
            $.post(`${getApiPrefix('configureMonitor')}/${monitorId}`,{
                data: JSON.stringify(v,null,3)
            },function(d){
                debugLog(d)
            })
        }
        //zoneminder one monitor
        if(parsedData.monitor){
            mergeZoneMinderZonesIntoMonitors(parsedData)
            postMonitor(importZoneMinderMonitor(parsedData.monitor.Monitor))
        }else
        //zoneminder multiple monitors
        if(parsedData.monitors){
            mergeZoneMinderZonesIntoMonitors(parsedData)
            $.each(parsedData.monitors,function(n,v){
                postMonitor(importZoneMinderMonitor(v.Monitor))
            })
        }else
        //shinobi one monitor
        if(parsedData.mid){
            postMonitor(parsedData)
        }else
        //shinobi multiple monitors
        if(parsedData[0] && parsedData[0].mid){
            $.each(parsedData,function(n,v){
                postMonitor(v)
            })
        }
    }catch(err){
        //#EXTM3U
        if(textData instanceof String && textData.indexOf('#EXTM3U') > -1 && textData.indexOf('{"') === -1){
            importM3u8Playlist(textData)
        }else{
            debugLog(err)
            new PNotify({
                title: lang['Invalid JSON'],
                text: lang.InvalidJSONText,
                type: 'error'
            })
        }
    }
}
function deleteMonitors(monitorsSelected,afterDelete){
    $.confirm.create({
        title: lang['Delete']+' '+lang['Monitors'],
        body: '<p>'+lang.DeleteMonitorsText+'</p>',
        clickOptions: [
            {
                title:lang['Delete']+' '+lang['Monitors'],
                class:'btn-danger',
                callback:function(){
                    $.each(monitorsSelected,function(n,monitor){
                        $.getJSON(`${getApiPrefix(`configureMonitor`)}/${monitor.mid}/delete`,function(data){
                            notifyIfActionFailed(data)
                            if(monitorsSelected.length === n + 1){
                                //last
                                if(afterDelete)afterDelete(monitorsSelected)
                            }
                        })
                    })
                }
            },
            {
                title:lang['Delete Monitors and Files'],
                class:'btn-danger',
                callback:function(){
                    $.each(monitorsSelected,function(n,monitor){
                        $.getJSON(`${getApiPrefix(`configureMonitor`)}/${monitor.mid}/delete?deleteFiles=true`,function(data){
                            notifyIfActionFailed(data)
                            if(monitorsSelected.length === n + 1){
                                //last
                                if(afterDelete)afterDelete(monitorsSelected)
                            }
                        })
                    })
                }
            }
        ]
    })
}
function launchImportMonitorWindow(callback){
    var html = `${lang.ImportMultiMonitorConfigurationText}
    <div style="margin-top: 15px;">
        <div class="form-group">
            <textarea placeholder="${lang['Paste JSON here.']}" class="form-control"></textarea>
        </div>
        <label class="upload_file btn btn-primary btn-block">${lang['Upload File']}<input class="upload" type="file" name="files[]" /></label>
    </div>`
    $.confirm.create({
        title: lang['Import Monitor Configuration'],
        body: html,
        clickOptions: [
            {
                title: lang['Import'],
                class: 'btn-primary',
                callback: function(){
                    var textData = safeJsonParse(mergeConcattedJsonString($.confirm.e.find('textarea').val()))
                    if(callback){
                        callback(textData)
                    }else{
                        importMonitor(textData)
                    }
                }
            },
            // {
            //     title: lang['Upload'],
            //     class: 'btn-primary',
            //     callback: function(e){
            //         var files = e.target.files; // FileList object
            //         f = files[0];
            //         var reader = new FileReader();
            //         reader.onload = function(ee) {
            //             $.confirm.e.find('textarea').val(ee.target.result);
            //         }
            //         reader.readAsText(f);
            //     }
            // }
        ],
    })
    $.confirm.e.find('.upload').change(function(e){
        var files = e.target.files; // FileList object
        f = files[0];
        var reader = new FileReader();
        reader.onload = function(ee) {
            $.confirm.e.find('textarea').val(ee.target.result);
        }
        reader.readAsText(f);
    });
}
function redAlertNotify({ title, text, type }) {
    var redAlertNotice = redAlertNotices[title];
    if (redAlertNotice) {
        redAlertNotice.update({
            title: title,
            text: text,
            type: type,
            hide: false,
            delay: 30000
        });
    } else {
        redAlertNotices[title] = new PNotify({
            title: title,
            text: text,
            type: type,
            hide: false,
            delay: 30000
        });
        redAlertNotices[title].on('close', function() {
            redAlertNotices[title] = null;
        });
    }
}
function buildPosePoints(bodyParts, x, y){
    let theArray = []
    for(const point of bodyParts){
        theArray.push({
            tag: point.name,
            x: x + point.x - 5, // Assuming a 10x10 rectangle for the wrist
            y: y + point.y - 5,
            width: 10,
            height: 10,
            confidence: point.score,
        })
    }
    return theArray;
}
function drawMatrices(event, options, autoRemoveTimeout, drawTrails){
    var theContainer = options.theContainer
    var height = options.height
    var width = options.width
    var widthRatio = width / event.details.imgWidth
    var heightRatio = height / event.details.imgHeight
    var objectTagGroup = event.details.reason === 'motion' ? 'motion' : event.details.name
    theContainer.find(`.stream-detected-object[name="${objectTagGroup}"]`).remove()
    var html = ''
    let moreMatrices = []
    var monitorId = event.id;
    function processMatrix(n,matrix){
        const newWidth = widthRatio * matrix.width;
        const newHeight = heightRatio * matrix.height;
        if(drawTrails)html += `<div class="stream-detected-object fresh-detected-trail" style="height:2px;width:2px;top:${heightRatio * matrix.y + (newHeight / 2)}px;left:${widthRatio * matrix.x + (newWidth / 2)}px;border-color: green;"></div>`
        html += `<div class="stream-detected-object fresh-detected-object" name="${objectTagGroup}" style="height:${newHeight}px;width:${newWidth}px;top:${heightRatio * matrix.y}px;left:${widthRatio * matrix.x}px;border-color: ${matrix.color};">`
        if(matrix.tag)html += `<span class="tag">${matrix.tag}${!isNaN(matrix.id) ? ` <small class="label label-default">${matrix.id}</small>`: ''} (${matrix.confidence.toFixed(2) || 0})</span>`
        if(matrix.notice)html += `<div class="matrix-info" style="color:yellow">${matrix.notice}</div>`;
        if(matrix.missingNear && matrix.missingNear.length > 0){
            html += `<div class="matrix-info yellow"><small>Missing Near</small><br>${matrix.missingRecently.map(item => `${item.tag} (${item.id}) by ${item.missedNear.tag} (${item.missedNear.id})`).join(', ')}</div>`;
        }
        if(matrix.missingRecentlyNearHands && matrix.missingRecentlyNearHands.length > 0){
            html += `<div class="matrix-info yellow"><small>Missing Recently</small><br>${matrix.missingRecentlyNearHands.map(item => `${item.tag} (${item.id})`).join(', ')}</div>`;
        }
        if(matrix.pose){
            var pose = matrix.pose;
            html += `<div class="matrix-info text-left">`;
            if(pose.isPersonFallen)html += `<div><small>Stance</small><br>${pose.isPersonFallen}</div>`;
            if(pose.isPersonReaching){
                html += `<div><small>Left Hand</small><br>${pose.isPersonReaching.left.pose}</div>`;
                html += `<div><small>Right Hand</small><br>${pose.isPersonReaching.right.pose}</div>`;
            }
            // if(pose.isPersonTouchingWaistOrHips)html += `<div>Waist or Hips : ${pose.isPersonTouchingWaistOrHips}</div>`;
            html += `</div>`;
            // console.log(matrix.poseInference)
        }
        if(matrix.poseInference)moreMatrices.push(...buildPosePoints(matrix.poseInference.keypoints,matrix.x,matrix.y))
        if(matrix.nearHands){
            var leftHand = matrix.nearHands.leftWrist;
            var rightHand = matrix.nearHands.rightWrist;
            html += `<div class="matrix-info text-left">`
                html += `<div><small>Left Interact</small><br>${leftHand.matrices.map(item => `${item.tag} (${item.id})`).join(', ')}</div>`;
                html += `<div><small>Right Interact</small><br>${rightHand.matrices.map(item => `${item.tag} (${item.id})`).join(', ')}</div>`;
            html += `</div>`
        }
        if(matrix.nearBy){
            html += `<div class="matrix-info">`
            matrix.nearBy.forEach((nearMatrix) => {
                html += `<div class="mb-1">${nearMatrix.tag} <small class="label label-default">${nearMatrix.id}</small> (${nearMatrix.overlapPercent.toFixed(2)}%)</div>`
            });
            html += `</div>`
        }
        if(matrix.redAlert){
            var monitor = loadedMonitors[monitorId]
            redAlertNotify({
                title: `${monitor.name}`,
                text: `${matrix.tag} (${matrix.id})<br>${matrix.notice}`,
                type: 'danger'
            });
        }
        html += '</div>'
    }
    $.each(event.details.matrices, processMatrix);
    $.each(moreMatrices, processMatrix);
    var addedEls = theContainer.append(html)
    if(autoRemoveTimeout){
        addedEls = addedEls.find('.fresh-detected-object').removeClass('fresh-detected-object')
        setTimeout(function(){
            addedEls.remove()
        }, autoRemoveTimeout);
    }
    if(drawTrails){
        var addedTrails = theContainer.find('.fresh-detected-trail').removeClass('fresh-detected-trail')
        setTimeout(function(){
            addedTrails.remove()
        }, 5000);
    }
}
function setMonitorCountOnUI(){
    $('.cameraCount').text(Object.keys(loadedMonitors).length)
}
function muteMonitorAudio(monitorId,buttonEl){
    var masterMute = dashboardOptions().switches.monitorMuteAudio
    var monitorMutes = dashboardOptions().monitorMutes || {}
    monitorMutes[monitorId] = monitorMutes[monitorId] === 1 ? 0 : 1
    dashboardOptions('monitorMutes',monitorMutes)
    var vidEl = $('.monitor_item[data-mid="' + monitorId + '"] video')[0]
    try{
        if(monitorMutes[monitorId] === 1){
            vidEl.muted = true
        }else{
            if(masterMute !== 1){
                if(windowFocus && hadFocus){
                    vidEl.muted = false
                }else{
                    console.error('User must have window active to unmute.')
                }
            }
        }
    }catch(err){
        console.log(err)
    }
    var volumeIcon = monitorMutes[monitorId] !== 1 ? 'volume-up' : 'volume-off'
    if(buttonEl)buttonEl.find('i').removeClass('fa-volume-up fa-volume-off').addClass('fa-' + volumeIcon)
}
function getMonitorsFromIds(monitorIds){
    var foundMonitors = []
    monitorIds.forEach((monitorId) => {
        foundMonitors.push(loadedMonitors[monitorId])
    })
    return foundMonitors
}
function getListOfTagsFromMonitors(){
    var listOftags = {}
    $.each(loadedMonitors,function(monitorId,monitor){
        if(monitor.tags){
           monitor.tags.split(',').forEach((tag) => {
               if(!listOftags[tag])listOftags[tag] = [];
               listOftags[tag].push(monitorId)
           })
        }
    })
    return listOftags
}
function sanitizeTagList(tags){
    var allTags = getListOfTagsFromMonitors()
    return findCommonElements(allTags,tags)
}
function getMonitorsFromTags(tags){
    var foundMonitors = {}
    $.each(loadedMonitors,function(monitorId,monitor){
        if(monitor.tags){
            tags.forEach((tag) => {
                if(monitor.tags.includes(tag)){
                    if(!foundMonitors[monitorId])foundMonitors[monitorId] = monitor
                }
            })

        }
    })
    return Object.values(foundMonitors)
}
function buildMonitorGroupListFromTags(){
    var html = ``
    var listOftags = getListOfTagsFromMonitors()
    $.each(listOftags,function(tagName,monitorIds){
        html += `<li class="cursor-pointer"><a class="dropdown-item monitor-live-group-open" monitor-ids="${monitorIds.join(',')}">${tagName}</a></li>`
    })
    return html
}
function drawMonitorGroupList(){
    var html = `<li><hr class="dropdown-divider"></li>
    <li class="pl-4"><small class="text-muted">${lang.Tags}</small></li>`
    html += buildMonitorGroupListFromTags()
    monitorGroupSelections.html(html)
}
function buildDefaultMonitorMenuItems(){
    return `
    <li><a class="dropdown-item launch-live-grid-monitor cursor-pointer">${lang['Live Grid']}</a></li>
    <li><a class="dropdown-item run-live-grid-monitor-pop cursor-pointer">${lang['Pop']}</a></li>
    <li><a class="dropdown-item toggle-substream cursor-pointer">${lang['Toggle Substream']}</a></li>
    <li><hr class="dropdown-divider"></li>
    <li><a class="dropdown-item open-videosTable cursor-pointer">${lang['Videos List']}</a></li>
    <!-- <li><a class="dropdown-item cursor-pointer" monitor-action="pvv">${lang['Power Viewer']}</a></li> -->
    <li><a class="dropdown-item open-timelapse-viewer cursor-pointer">${lang['Time-lapse']}</a></li>
    <li><hr class="dropdown-divider"></li>
    <li><a class="dropdown-item open-monitor-settings cursor-pointer">${lang['Monitor Settings']}</a></li>
    <li><a class="dropdown-item export-this-monitor-settings cursor-pointer">${lang['Export']}</a></li>
    <li><hr class="dropdown-divider"></li>
    <li class="pl-4"><small class="text-muted">${lang['Set Mode']}</small></li>
    <li><a class="dropdown-item cursor-pointer" set-mode="stop">${lang.Disable}</a></li>
    <li><a class="dropdown-item cursor-pointer" set-mode="start">${lang['Watch-Only']}</a></li>
    <li><a class="dropdown-item cursor-pointer" set-mode="record">${lang.Record}</a></li>`
}
function createMagnifyStreamMask(options){
    if(!options.p && !options.parent){
        var el = $(this),
        parent = el.parents('[mid]')
    }else{
        parent = options.p || options.parent
    }
    var zoomHoverShade = parent.find('.zoomHoverShade')
    if(zoomHoverShade.length === 0){
        const html = `<div class="zoomHoverShade magnify-glass-live-grid-stream"></div>`
        parent.append(html)
        zoomHoverShade = parent.find('.zoomHoverShade')
    }
    return zoomHoverShade
}
function magnifyStream(options){
    if(!options.p && !options.parent){
        var el = $(this),
        parent = el.parents('[mid]')
    }else{
        parent = options.p || options.parent
    }
    if(!options.attribute){
        options.attribute = ''
    }
    if(options.animate === true){
        var zoomGlassAnimate = 'animate'
    }else{
        var zoomGlassAnimate = 'css'
    }
    if(!options.magnifyOffsetElement){
        options.magnifyOffsetElement = '.stream-block'
    }
    if(!options.targetForZoom){
        options.targetForZoom = '.stream-element'
    }
    if(options.auto === true){
        var streamBlockOperator = 'position'
    }else{
        var streamBlockOperator = 'offset'
    }
    var magnifiedElement
    if(!options.videoUrl){
        if(options.useCanvas === true){
            magnifiedElement = 'canvas'
        }else{
            magnifiedElement = 'iframe'
        }
    }else{
        magnifiedElement = 'video'
    }
    if(!options.mon && !options.monitor){
        var monitorId = parent.attr('data-mid')//monitor id
        var monitor = loadedMonitors[monitorId]
    }else{
        var monitor = options.mon || options.monitor
    }
    if(options.zoomAmount)zoomAmount = 3
    if(!zoomAmount)zoomAmount = 3
    var realHeight = parent.attr('realHeight')
    var realWidth = parent.attr('realWidth')
    var height = parseFloat(realHeight) * zoomAmount//height of stream
    var width = parseFloat(realWidth) * zoomAmount//width of stream
    var targetForZoom = parent.find(options.targetForZoom)
    zoomGlass = parent.find(".zoomGlass")
    var zoomFrame = function(){
        var magnify_offset = parent.find(options.magnifyOffsetElement)[streamBlockOperator]()
        var mx = options.pageX - magnify_offset.left
        var my = options.pageY - magnify_offset.top
        var rx = Math.round(mx/targetForZoom.width()*width - zoomGlass.width()/2)*-1
        var ry = Math.round(my/targetForZoom.height()*height - zoomGlass.height()/2)*-1
        var px = mx - zoomGlass.width()/2
        var py = my - zoomGlass.height()/2
        zoomGlass[zoomGlassAnimate]({left: px, top: py}).find(magnifiedElement)[zoomGlassAnimate]({left: rx, top: ry})
    }
    var commit = function(height,width){
        zoomGlass.find(magnifiedElement).css({
            height: height,
            width: width
        })
        zoomFrame()
    }
    if(!height || !width || zoomGlass.length === 0){
        zoomGlass = parent.find(".zoomGlass")
        var zoomGlassShell = function(contents){return `<div ${options.attribute} class="zoomGlass">${contents}</div>`}
        if(!options.videoUrl){
            getSnapshot(monitor,function(url,buffer,w,h){
                parent.attr('realWidth',w)
                parent.attr('realHeight',h)
                if(zoomGlass.length === 0){
                    if(options.useCanvas === true){
                        parent.append(zoomGlassShell('<canvas class="blenderCanvas"></canvas>'))
                    }else{
                        parent.append(zoomGlassShell('<iframe src="'+getApiPrefix('embed')+'/'+monitorId+'/fullscreen|jquery|relative"/>'))
                    }
                    zoomGlass = parent.find(".zoomGlass")
                }
                commit(h,w)
            })
        }else{
            if(zoomGlass.length === 0){
                parent.append(zoomGlassShell(`<video src="${options.videoUrl}" preload></video>`))
            }
            if(options.setTime){
                var video = zoomGlass.find('video')[0]
                video.currentTime = options.setTime
                height = video.videoHeight
                width = video.videoWidth
                parent.attr('realWidth',width)
                parent.attr('realHeight',height)
            }
            commit(height,width)
        }
    }else{
        if(options.setTime){
            var video = zoomGlass.find('video')
            var src = video.attr('src')
            video[0].currentTime = options.setTime
            if(options.videoUrl !== src)zoomGlass.html(`<video src="${options.videoUrl}" preload></video>`)
        }
        commit(height,width)
    }
}
function getCardMonitorSettingsFields(formElement){
    var formValues = {};
    formValues.details = {}
    $.each(['name','detail','monitor-groups-selected'],function(n,keyType){
        formElement.find(`[${keyType}]`).each(function(n,v){
            var el = $(v);
            var key = el.attr(keyType)
            if(el.is(':checkbox')){
                var value = el.prop("checked") ? '1' : '0'
            }else{
                var value = el.val()
            }
            switch(keyType){
                case'detail':
                    formValues.details[key] = value;
                break;
                case'monitor-groups-selected':
                    formValues.details.groups = value;
                break;
                case'name':
                    formValues[key] = value;
                break;
            }
            if(key === 'detector_pam' || key === 'detector_use_detect_object'){
                formValues.details.detector = '1'
            }else{
                formValues.details.detector = '0'
            }
        })
    })
    return formValues;
}
function updateMonitor(monitorToPost,callback){
    var newMon = mergeDeep(generateDefaultMonitorSettings(),monitorToPost)
    $.post(getApiPrefix(`configureMonitor`) + '/' + monitorToPost.mid,{data:JSON.stringify(newMon,null,3)},callback || function(){})
}
var miniCardBodyPages = []
var miniCardPageSelectorTabs = [
    {
        label: lang.Info,
        value: 'info',
        icon: 'info-circle',
    },
    {
        label: lang['Quick Settings'],
        value: 'settings',
        icon: 'wrench',
    },
]
var miniCardSettingsFields = [
    function(monitorAlreadyAdded){
        return  {
            label: lang['Motion Detection'],
            name: "detail=detector_pam",
            value: monitorAlreadyAdded.details.detector_pam || '0',
            fieldType: 'toggle',
        }
    },
]
function buildMiniMonitorCardBody(monitorAlreadyAdded,monitorConfigPartial,additionalInfo,doOpenVideosInsteadOfDelete){
    if(!monitorConfigPartial)monitorConfigPartial = monitorAlreadyAdded;
    var monitorId = monitorConfigPartial.mid
    var monitorSettingsHtml = ``
    var cardPageSelectors = ``
    var infoHtml = additionalInfo instanceof Object ? jsonToHtmlBlock(additionalInfo) : additionalInfo ? additionalInfo : ''
    var miniCardBodyPagesHtml = ''
    $.each(miniCardBodyPages,function(n,pagePiece){
        if(typeof pagePiece === 'function'){
            miniCardBodyPagesHtml += pagePiece(monitorAlreadyAdded,monitorConfigPartial,additionalInfo,doOpenVideosInsteadOfDelete)
        }else{
            miniCardBodyPagesHtml += pagePiece
        }
    });
    if(monitorAlreadyAdded){
        monitorSettingsHtml += `<form onsubmit="return false;" data-mid="${monitorId}" class="mini-monitor-editor card-page-container" card-page-container="settings" style="display:none">
        <div class="card-body p-2">
        `
        $.each(([]).concat(miniCardSettingsFields),function(n,option){
            option = typeof option === 'function' ? option(monitorAlreadyAdded,monitorConfigPartial,additionalInfo,doOpenVideosInsteadOfDelete) : option
            var newFieldHtml = '';
            if((['div']).indexOf(option.fieldType) > -1){
                switch(option.fieldType){
                    case'div':
                        newFieldHtml += `<div id="${option.id}" ${option.attributes || ''} class="${option.class || ''}" style="${option.style || ''}">${option.divContent || ''}</div>`
                    break;
                }
            }else{
                newFieldHtml += `<div class="row mb-2">
                    <div class="col-md-9">
                        ${option.label}
                    </div>
                    <div class="col-md-3 text-right">`
                        switch(option.fieldType){
                            case'toggle':
                                newFieldHtml += `<input class="form-check-input" type="checkbox" ${option.value === '1' ? 'checked' : ''} ${option.name.indexOf('=') > -1 ? option.name : `name="${option.name}"`}>`
                            break;
                            case'text':
                                newFieldHtml += `<input class="form-control text-center form-control-sm" type="text" ${option.name.indexOf('=') > -1 ? option.name : `name="${option.name}"`} value="${option.value || ''}" placeholder="${option.placeholder || ''}">`
                            break;
                            case'select':
                                newFieldHtml += `<select ${option.name.indexOf('=') > -1 ? option.name : `name="${option.name}"`} ${option.id ? `id="${option.id}"` : ''} ${option.attributes || ''} class="form-control form-control-sm ${option.class || ''}" style="${option.style || ''}">`
                                if(option.possible){
                                    option.possible.forEach(function(item){
                                        newFieldHtml += `<option value="${item.value}" ${item.selected ? 'selected' : ''}>${item.name}</option>`
                                    })
                                }
                                newFieldHtml += `</select>`
                            break;
                        }
                        newFieldHtml += `</div>
                    </div>`
            }
            monitorSettingsHtml += newFieldHtml;
        })
        monitorSettingsHtml += `</div>
            <div class="card-footer text-center">
                <a class="btn btn-sm btn-secondary open-region-editor" data-mid="${monitorConfigPartial.mid}">${lang['Zones']}</a>
                <button type="submit" class="btn btn-sm btn-success">${lang['Save']}</button>
                <!-- <a class="btn btn-sm btn-default copy">${lang['Advanced']}</a> -->
            </div>
        </form>`

        $.each(miniCardPageSelectorTabs,function(n,v){
            cardPageSelectors += `<a class="btn btn-sm btn-secondary card-page-selector mt-2 ${miniCardPageSelectorTabs.length !== n + 1 ? 'mr-2' : ''}" card-page-selector="${v.value}"><i class="fa fa-${v.icon}"></i> ${v.label}</a>`
        });
    }
    var cardBody = `
        <div class="card-page-selectors text-center">
            ${cardPageSelectors}
        </div>
        <div class="card-page-container" card-page-container="info">
            <div class="card-body p-2">
                <div>${infoHtml}</div>
            </div>
            <div class="card-footer text-center" data-mid="${monitorId}">
                <a class="btn btn-sm btn-block btn-${monitorAlreadyAdded ? doOpenVideosInsteadOfDelete ? 'primary open-videosTable' : 'danger delete-monitor' : 'success add-monitor'}">${monitorAlreadyAdded ? doOpenVideosInsteadOfDelete ? lang['Videos'] : lang['Delete Camera'] : lang['Add Camera']}</a>
            </div>
        </div>
        ${monitorSettingsHtml}
        ${miniCardBodyPagesHtml}
    `
    return cardBody
}
function buildMonitorsListSelectFieldHtml(arrayOfSelected){
    var monitorList = Object.values(loadedMonitors).map(function(item){
        return {
            value: item.mid,
            label: item.name,
            selected: (arrayOfSelected || []).indexOf(item.mid) > -1,
        }
    });
    return createOptionListHtml(monitorList)
}
function getRowsMonitorId(rowEl){
    var el = $(rowEl).parents('[data-mid]')
    var monitorId = el.attr('data-mid')
    return monitorId
}
function getMonitorEmbedLink(monitorConfig){
    return `${getApiPrefix('embed')}/${monitorConfig.mid}/fullscreen|jquery|relative`
}
function getRunningMonitors(asArray){
    const foundMonitors = {}
    $.each(loadedMonitors,function(monitorId,monitor){
        if(
            monitor.mode === 'start' ||
            monitor.mode === 'record'
        ){
            foundMonitors[monitorId] = monitor
        }
    })
    return asArray ? Object.values(foundMonitors) : foundMonitors
}
function buildFileBinUrl(data){
    return apiBaseUrl + '/fileBin/' + data.ke + '/' + data.mid + '/' + data.name
}
$(document).ready(function(){
    $('body')
    .on('click','[system]',function(){
        var e = {};
        var el = $(this)
        switch(el.attr('system')){
            case'monitorMuteAudioSingle':
                var monitorId = el.attr('mid')
                muteMonitorAudio(monitorId,el)
            break;
        }
    })
    .on('click','[shinobi-switch]',function(){
        var el = $(this)
        var systemSwitch = el.attr('shinobi-switch');
        dashboardSwitch(systemSwitch)
    })
    .on('click','.mini-monitor-editor [type="submit"]',function(e){
        var formElement = $(this).parents('form')
        var monitorId = formElement.attr('data-mid');
        var loadedMonitor = getDbColumnsForMonitor(loadedMonitors[monitorId])
        var thisForm = getCardMonitorSettingsFields(formElement);
        var baseConfig = mergeDeep({},loadedMonitor)
        baseConfig.details.groups = [];
        var newConfig = mergeDeep(baseConfig,thisForm)
        updateMonitor(newConfig)
    })
    .on('click','.card-page-selector',function(e){
        e.preventDefault()
        var el = $(this)
        var pageSelection = el.attr('card-page-selector')
        var parent = el.parents('.card-page-selection')
        parent.find(`[card-page-container]`).hide()
        parent.find(`[card-page-container="${pageSelection}"]`).show()
        return false;
    });
})
