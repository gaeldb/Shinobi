var loadedLiveGrids = {}
var monitorPops = {}
var liveGridElements = {}
var runningJpegStreams = {}
var containerElement = $(`#monitors_live`)
var liveGrid = $('#monitors_live .stream-element-container')
var websocketPath = checkCorrectPathEnding(urlPrefix) + 'socket.io'
//
var onLiveStreamInitiateExtensions = []
function onLiveStreamInitiate(callback){
    onLiveStreamInitiateExtensions.push(callback)
}
var onLiveStreamCloseExtensions = []
function onLiveStreamClose(callback){
    onLiveStreamCloseExtensions.push(callback)
}
var onSignalCheckLiveStreamExtensions = []
function onSignalCheckLiveStream(callback){
    onSignalCheckLiveStreamExtensions.push(callback)
}
var onBuildStreamElementExtensions = []
function onBuildStreamElement(callback){
    onBuildStreamElementExtensions.push(callback)
}
//
function debugLog(...args){
    console.log(...args)
}
function buildStreamElementHtml(streamType){
    var html = ''
    if(window.jpegModeOn === true){
        html = '<img class="stream-element">';
    }else{
        switch(streamType){
            case'hls':case'flv':case'mp4':
                html = `<video class="stream-element" playsinline muted autoplay></video>`;
            break;
            case'mjpeg':
                html = '<iframe class="stream-element"></iframe>';
            break;
            case'jpeg':
                html = '<img class="stream-element">';
            break;
            default://base64//h265
                html = '<canvas class="stream-element"></canvas>';
            break;
        }
        $.each(onBuildStreamElementExtensions,function(n,extender){
            var newHtml = extender(streamType)
            html = newHtml ? newHtml : html
        })
    }
    return html
}
function resetMonitorCanvas(monitorId,initiateAfter,subStreamChannel){
    var monitor = loadedMonitors[monitorId]
    var details = monitor.details
    var streamType = subStreamChannel ? details.substream ? details.substream.output.stream_type : 'hls' : details.stream_type
    if(!liveGridElements[monitorId])return;
    var streamBlock = liveGridElements[monitorId].monitorItem.find('.stream-block')
    closeLiveGridPlayer(monitorId,false)
    streamBlock.find('.stream-element').remove()
    streamBlock.append(buildStreamElementHtml(streamType))
    if(initiateAfter)initiateLiveGridPlayer(monitor,subStreamChannel)
}
function buildLiveGridBlock(monitor){
    if(monitor.mode === 'stop'){
        new PNotify({
            title: lang.sorryNo,
            text: lang[`Cannot watch a monitor that isn't running.`],
            type: 'danger'
        })
        return
    }
    var monitorId = monitor.mid
    var monitorDetails = safeJsonParse(monitor.details)
    var monitorLiveId = `monitor_live_${monitor.mid}`
    var subStreamChannel = monitor.subStreamChannel
    var streamType = monitorDetails.stream_type === 'useSubstream' ? monitorDetails.substream.output.stream_type : monitorDetails.stream_type
    var streamElement = buildStreamElementHtml(streamType)
    var streamBlockInfo = definitions['Monitor Stream Window']
    if(!loadedLiveGrids[monitor.mid])loadedLiveGrids[monitor.mid] = {}
    var quickLinkHtml = ''
    var baseHtml = `<div
        id="${monitorLiveId}"
        data-ke="${monitor.ke}"
        data-mid="${monitor.mid}"
        data-mode="${monitor.mode}"
        class="monitor_item glM${monitor.mid} ${streamBlockInfo.gridBlockClass || ''}"
    >
        <div class="stream-objects"></div>
        <div class="stream-hud">
            ${streamBlockInfo.streamBlockHudHtml || ''}
        </div>
        ${streamElement}
        ${(streamBlockInfo.gridBlockAfterContentHtml || '').replace(`$QUICKLINKS`,quickLinkHtml)}
    </div>`
    return baseHtml
}

function drawLiveGridBlock(monitorConfig,subStreamChannel){
    var monitorId = monitorConfig.mid
    var html = buildLiveGridBlock(monitorConfig)
    liveGrid.html(html);
    var theBlock = $('#monitor_live_' + monitorId);
    var streamElement = theBlock.find('.stream-element')
    liveGridElements[monitorId] = {
        monitorItem: theBlock,
        streamElement: streamElement,
        eventObjects: theBlock.find('.stream-objects'),
        motionMeter: theBlock.find('.indifference .progress-bar'),
        motionMeterText: theBlock.find('.indifference .progress-bar span'),
        width: streamElement.width(),
        height: streamElement.height(),
    }
    initiateLiveGridPlayer(loadedMonitors[monitorId],subStreamChannel)
}
function unmuteVideoPlayer(){
    console.log('Unmuting...')
    setTimeout(function(){
        try{
            var videoEl = $(`video`)
            if(videoEl.length > 0){
                videoEl[0].muted = false;
            }
        }catch(err){
            console.log(err)
        }
    },3000)
    $('.unmute-embed-audio').remove()
}
function initiateLiveGridPlayer(monitor){
    var livePlayerElement = loadedLiveGrids[monitor.mid]
    var details = monitor.details
    var groupKey = monitor.ke
    var monitorId = monitor.mid
    var loadedMonitor = loadedMonitors[monitorId]
    var loadedPlayer = loadedLiveGrids[monitor.mid]
    var subStreamChannel = loadedMonitor.subStreamChannel
    var streamType = details.stream_type === 'useSubstream' ? details.substream.output.stream_type : details.stream_type
    switch(streamType){
        case'jpeg':
            startJpegStream(monitorId)
        break;
        case'b64':
            if(loadedPlayer.Base64 && loadedPlayer.Base64.connected){
                loadedPlayer.Base64.disconnect()
            }
            loadedPlayer.Base64 = io(location.origin,{ path: websocketPath, transports: ['websocket'], forceNew: false})
            var ws = loadedPlayer.Base64
            var buffer
            ws.on('diconnect',function(){
                console.log('Base64 Stream Disconnected')
            })
            ws.on('connect',function(){
                ws.emit('Base64',{
                    auth: $user.auth_token,
                    uid: $user.uid,
                    ke: monitor.ke,
                    id: monitor.mid,
                    channel: subStreamChannel
                })
                if(!loadedPlayer.ctx || loadedPlayer.ctx.length === 0){
                    loadedPlayer.ctx = containerElement.find('canvas');
                }
                var ctx = loadedPlayer.ctx[0]
                var ctx2d = ctx.getContext("2d")
                loadedPlayer.image = new Image()
                var image = loadedPlayer.image
                image.onload = function() {
                    loadedPlayer.imageLoading = false
                    var x = 0
                    var y = 0
                    ctx.getContext("2d").drawImage(image,x,y,ctx.width,ctx.height)
                    URL.revokeObjectURL(loadedPlayer.imageUrl)
                }
                ws.on('data',function(imageData){
                    try{
                        if(loadedPlayer.imageLoading === true)return console.log('drop');
                        loadedPlayer.imageLoading = true
                        var arrayBufferView = new Uint8Array(imageData);
                        var blob = new Blob( [ arrayBufferView ], { type: "image/jpeg" } );
                        loadedPlayer.imageUrl = URL.createObjectURL( blob );
                        loadedPlayer.image.src = loadedPlayer.imageUrl
                    }catch(er){
                        console.error('base64 frame',er)
                    }
                })
            })
        break;
        case'mp4':
            var stream = containerElement.find('.stream-element');
            var onPoseidonError = function(){
                // setTimeout(function(){
                //     mainSocket.f({f:'monitor',ff:'watch_on',id:monitorId})
                // },2000)
            }
            if(!loadedPlayer.PoseidonErrorCount)loadedPlayer.PoseidonErrorCount = 0
            if(loadedPlayer.PoseidonErrorCount >= 5)return
            if(subStreamChannel ? details.substream.output.stream_flv_type === 'ws' : monitor.details.stream_flv_type === 'ws'){
                if(loadedPlayer.Poseidon){
                    loadedPlayer.Poseidon.stop()
                    revokeVideoPlayerUrl(monitorId)
                }
                try{
                    loadedPlayer.Poseidon = new Poseidon({
                        video: stream[0],
                        auth_token: $user.auth_token,
                        ke: monitor.ke,
                        uid: $user.uid,
                        id: monitor.mid,
                        url: location.origin,
                        path: websocketPath,
                        query: websocketQuery,
                        onError : onPoseidonError,
                        channel : subStreamChannel
                    })
                    loadedPlayer.Poseidon.start();
                }catch(err){
                    // onPoseidonError()
                    console.log('onTryPoseidonError',err)
                }
            }else{
                stream.attr('src',getApiPrefix(`mp4`)+'/'+monitor.mid + (subStreamChannel ? `/${subStreamChannel}` : '')+'/s.mp4?time=' + (new Date()).getTime())
                stream[0].onerror = function(err){
                    console.error(err)
                }
            }
        break;
        case'flv':
            if (flvjs.isSupported()) {
                if(loadedPlayer.flv){
                    loadedPlayer.flv.destroy()
                    revokeVideoPlayerUrl(monitorId)
                }
                var options = {
                    type: 'flv',
                    isLive: true,
                    url: getApiPrefix(`flv`)+'/'+monitor.mid + (subStreamChannel ? `/${subStreamChannel}` : '')+'/s.flv'
                }
                loadedPlayer.flv = flvjs.createPlayer(options);
                loadedPlayer.flv.attachMediaElement(containerElement.find('.stream-element')[0]);
                loadedPlayer.flv.on('error',function(err){
                    console.log(err)
                });
                loadedPlayer.flv.load();
                loadedPlayer.flv.play();
            }else{
                new PNotify({title:'Stream cannot be started',text:'FLV.js is not supported on this browser. Try another stream type.',type:'error'});
            }
        break;
        case'hls':
            function createSteamNow(){
                clearTimeout(loadedPlayer.m3uCheck)
                var url = getApiPrefix(`hls`) + '/' + monitor.mid + (subStreamChannel ? `/${subStreamChannel}` : '') + '/s.m3u8'
                $.get(url,function(m3u){
                    if(m3u == 'File Not Found'){
                        loadedPlayer.m3uCheck = setTimeout(function(){
                            createSteamNow()
                        },2000)
                    }else{
                        var video = containerElement.find('.stream-element')[0]
                        if (isAppleDevice) {
                            video.src = url;
                            video.addEventListener('loadedmetadata', function() {
                              setTimeout(function(){
                                video.play();
                              },3000)
                            }, false);
                        }else{
                            var hlsOptions = safeJsonParse(dashboardOptions().hlsOptions) || {}
                            if(hlsOptions instanceof String){
                                hlsOptions = {}
                                new PNotify({
                                    title: lang['Invalid JSON'],
                                    text: lang.hlsOptionsInvalid,
                                    type: `warning`,
                                })
                            }
                            if(loadedPlayer.hls){
                                loadedPlayer.hls.destroy()
                                revokeVideoPlayerUrl(monitorId)
                            }
                            loadedPlayer.hls = new Hls(hlsOptions)
                            loadedPlayer.hls.loadSource(url)
                            loadedPlayer.hls.attachMedia(video)
                            loadedPlayer.hls.on(Hls.Events.MANIFEST_PARSED,function() {
                                if (video.paused) {
                                    video.play();
                                }
                            });
                        }
                    }
                })
            }
            createSteamNow()
        break;
        case'mjpeg':
            var liveStreamElement = containerElement.find('.stream-element')
            var setSource = function(){
                liveStreamElement.attr('src',getApiPrefix(`mjpeg`)+'/'+monitorId + (subStreamChannel ? `/${subStreamChannel}` : ''))
                liveStreamElement.unbind('ready')
                liveStreamElement.ready(function(){
                    setTimeout(function(){
                        liveStreamElement.contents().find("body").append('<style>img{width:100%;height:100%}</style>')
                    },1000)
                })
            }
            setSource()
            liveStreamElement.on('error',function(err){
                setTimeout(function(){
                    setSource()
                },4000)
            })
        break;
    }
    $.each(onLiveStreamInitiateExtensions,function(n,extender){
        extender(streamType,monitor,loadedPlayer,subStreamChannel)
    })
    //initiate signal check
    if(streamType !== 'useSubstream'){
        var signalCheckInterval = (isNaN(loadedMonitor.details.signal_check) ? 10 : parseFloat(loadedMonitor.details.signal_check)) * 1000 * 60
        if(signalCheckInterval > 0){
            clearInterval(loadedPlayer.signal)
            loadedPlayer.signal = setInterval(function(){
                signalCheckLiveStream({
                    mid: monitorId,
                    checkSpeed: 1000,
                })
            },signalCheckInterval);
        }
    }
}
function revokeVideoPlayerUrl(monitorId){
    try{
        URL.revokeObjectURL(liveGridElements[monitorId].streamElement[0].src)
    }catch(err){
        debugLog(err)
    }
}
function closeLiveGridPlayer(monitorId,killElement){
    try{
        var livePlayerElement = loadedLiveGrids[monitorId]
        if(livePlayerElement){
            if(livePlayerElement.hls){livePlayerElement.hls.destroy()}
            clearTimeout(livePlayerElement.m3uCheck)
            if(livePlayerElement.Poseidon){livePlayerElement.Poseidon.stop()}
            if(livePlayerElement.Base64){livePlayerElement.Base64.disconnect()}
            if(livePlayerElement.dash){livePlayerElement.dash.reset()}
            if(livePlayerElement.jpegInterval){
                stopJpegStream(monitorId)
            }
            $.each(onLiveStreamCloseExtensions,function(n,extender){
                extender(livePlayerElement)
            })
        }
        if(liveGridElements[monitorId])revokeVideoPlayerUrl(monitorId)
        clearInterval(livePlayerElement.signal)
    }catch(err){
        console.log(err)
    }
    if(killElement){
        var theElement = $('#monitor_live_'+monitorId)
        if(theElement.length > 0){
            theElement.remove()
            delete(loadedLiveGrids[monitorId])
            delete(liveGridElements[monitorId])
        }
    }
}

function fullScreenLiveGridStream(monitorItem){
    var videoElement = monitorItem.find('.stream-element')
    monitorItem.addClass('fullscreen')
    if(videoElement.is('canvas')){
        var theBody = $('body')
        videoElement.attr('height',theBody.height())
        videoElement.attr('width',theBody.width())
    }
    fullScreenInit(videoElement[0])
}
function toggleJpegMode(){
    var sendData = {
        f: 'monitor',
        ff: 'jpeg_on'
    }
    if(window.jpegModeOn === true){
        sendData.ff = 'jpeg_off'
    }
    mainSocket.f(sendData)
}
function startJpegStream(monitorId){
    if(loadedLiveGrids[monitorId]){
        var monitor = loadedMonitors[monitorId]
        var loadedBlock = loadedLiveGrids[monitorId]
        var jpegInterval = !isNaN(monitor.details.jpegInterval) ? parseFloat(monitor.details.jpegInterval) : 1
        resetMonitorCanvas(monitorId,false)
        var streamElement = $('#monitor_live_' + monitorId + ' .stream-element');
        // stopJpegStream(monitorId)
        var jpegUrl = getApiPrefix('jpeg') + '/' + monitorId + '/s.jpg?time='
        function drawNewFrame(){
            streamElement.attr('src',jpegUrl + (new Date()).getTime())
        }
        streamElement.on('load',function(){
            loadedBlock.jpegInterval = setTimeout(drawNewFrame,1000/jpegInterval)
        }).on('error',function(){
            loadedBlock.jpegInterval = setTimeout(drawNewFrame,1000/jpegInterval)
        })
        drawNewFrame()
    }
}
function stopJpegStream(monitorId){
    var livePlayerElement = loadedLiveGrids[monitorId]
    if(!livePlayerElement)return;
    try{
        liveGridElements[monitorId].streamElement.off('load').off('error')
        clearTimeout(livePlayerElement.jpegInterval)
    }catch(err){
        console.log(err)
        console.log(monitorId)
    }
}
function startAllJpegStreams(monitorId){
    $.each(loadedMonitors,function(n,monitor){
        startJpegStream(monitor.mid)
    })
}
function stopAllJpegStreams(monitorId){
    $.each(loadedMonitors,function(n,monitor){
        stopJpegStream(monitor.mid)
    })
}
function signalCheckLiveStream(options){
    try{
        var monitorId = options.mid
        var monitorConfig = loadedMonitors[monitorId]
        var liveGridData = liveGridElements[monitorId]
        var monitorItem = liveGridData.monitorItem
        var monitorDetails = monitorConfig.details
        var checkCount = 0
        var base64Data = null;
        var checkSpeed = options.checkSpeed || 1000
        var subStreamChannel = monitorConfig.subStreamChannel
        var streamType = subStreamChannel ? monitorDetails.substream ? monitorDetails.substream.output.stream_type : 'hls' : monitorDetails.stream_type
        function failedStreamCheck(){
            if(monitorConfig.signal_check_log == 1){
                logWriterDraw(monitorId, {
                    log: {
                        type: 'Stream Check',
                        msg: lang.clientStreamFailedattemptingReconnect
                    }
                })
            }
            requestMonitorInit()
        }
        function succeededStreamCheck(){
            if(monitorConfig.signal_check_log == 1){
                logWriterDraw(monitorId, {
                    log: {
                        type: 'Stream Check',
                        msg : lang.Success
                    }
                })
            }
        }
        function executeCheck(){
            switch(streamType){
                case'b64':
                    monitorItem.resize()
                break;
                case'hls':case'flv':case'mp4':
                    if(monitorItem.find('video')[0].paused){
                        failedStreamCheck()
                    }else{
                        succeededStreamCheck()
                    }
                break;
                default:
                    if(dashboardOptions().jpeg_on === true){return}
                    getSnapshot({
                        monitor: loadedMonitors[monitorId],
                    },function(url){
                        base64Data = url;
                        setTimeout(function(){
                            getSnapshot({
                                monitor: loadedMonitors[monitorId],
                            },function(url){
                                if(base64Data === url){
                                    if(checkCount < 3){
                                        ++checkCount;
                                        setTimeout(function(){
                                            executeCheck();
                                        },checkSpeed)
                                    }else{
                                        failedStreamCheck()
                                    }
                                }else{
                                    succeededStreamCheck()
                                }
                            });
                        },checkSpeed)
                    });
                break;
            }
            $.each(onSignalCheckLiveStreamExtensions,function(n,extender){
                extender(streamType,monitorItem)
            })
        }
        executeCheck();
    }catch(err){
        console.log(err)
        var errorStack = err.stack;
        function phraseFoundInErrorStack(x){return errorStack.indexOf(x) > -1}
        if(phraseFoundInErrorStack("The HTMLImageElement provided is in the 'broken' state.")){
            requestMonitorInit()
        }
        clearInterval(liveGridData.signal);
        delete(liveGridData.signal);
    }
}
function requestMonitorInit(){
    mainSocket.f({
        f: 'monitor',
        ff: 'watch_on',
        id: monitorId
    });
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
    var substreamUrl = getApiPrefix() + '/toggleSubstream/'+$user.ke+'/'+monitorId;
    $.getJSON(`${substreamUrl}?action=status`,function(response){
        if(!response.isRunning){
            $.getJSON(substreamUrl,function(d){
                monitor.subStreamChannel = d.channel
                monitor.subStreamToggleLock = false
                debugLog(d)
                if(callback)callback()
            })
        }else{
            monitor.subStreamChannel = response.channel
            monitor.subStreamToggleLock = false
            if(callback)callback()
        }
    })
}
$(document).ready(function(e){
    $('body')
    .on('dblclick','.stream-block',function(){
        var monitorItem = $(this).parents('[data-mid]');
        fullScreenLiveGridStream(monitorItem)
    })
    .on('click','.reconnect-live-grid-monitor',function(){
        requestMonitorInit()
    })
    .on('click','.toggle-live-grid-monitor-fullscreen',function(){
        var monitorItem = $(this).parents('[data-mid]')
        fullScreenLiveGridStream(monitorItem)
    });
    onWebSocketEvent(function (d){
        switch(d.f){
            case'init_success':
                // loadPreviouslyOpenedLiveGridBlocks()
            break;
            case'monitor_watch_off':case'monitor_stopping':
                if(monitorId === d.id){
                    closeLiveGridPlayer(monitorId,(d.f === 'monitor_watch_off'))
                }
            break;
            case'monitor_status':
                if(monitorId === d.id && (d.code === 2 || d.code === 3)){
                    setTimeout(function(){
                        requestMonitorInit()
                    },2000)
                }
            break;
            case'substream_start':
                loadedMonitors[d.mid].subStreamChannel = d.channel
                setTimeout(() => {
                    resetMonitorCanvas(d.mid,true,d.channel)
                },3000)
            break;
            case'substream_end':
                loadedMonitors[d.mid].subStreamChannel = null
                resetMonitorCanvas(d.mid,true,null)
            break;
            case'monitor_watch_on':
                var monitorId = d.mid || d.id
                var loadedMonitor = loadedMonitors[monitorId]
                var subStreamChannel = loadedMonitor.subStreamChannel || d.channel
                if(loadedMonitor.details.stream_type === 'useSubstream'){
                    toggleSubStream(monitorId,function(){
                        drawLiveGridBlock(loadedMonitors[monitorId],subStreamChannel)
                    })
                }else{
                    drawLiveGridBlock(loadedMonitors[monitorId],subStreamChannel)
                }
            break;
            case'mode_jpeg_off':
                window.jpegModeOn = false
                $.each(loadedMonitors,function(n,v){
                    stopJpegStream(v.mid)
                    resetMonitorCanvas(v.mid)
                    initiateLiveGridPlayer(v)
                })
                $('body').removeClass('jpegMode')
            break;
            case'mode_jpeg_on':
                window.jpegModeOn = true
                startAllJpegStreams()
                $('body').addClass('jpegMode')
            break;
            case'detector_trigger':
                var monitorId = d.id
                var liveGridElement = liveGridElements[monitorId]
                if(!window.dontShowDetection && liveGridElement){
                    var monitorElement = liveGridElement.monitorItem
                    var livePlayerElement = loadedLiveGrids[monitorId]
                    if(d.doObjectDetection === true){
                        monitorElement.addClass('doObjectDetection')
                        clearTimeout(livePlayerElement.detector_trigger_doObjectDetection_timeout)
                        livePlayerElement.detector_trigger_doObjectDetection_timeout = setTimeout(function(){
                            monitorElement.removeClass('doObjectDetection')
                        },3000)
                    }else{
                        monitorElement.removeClass('doObjectDetection')
                    }
                    if(d.details.matrices&&d.details.matrices.length>0){
                        drawMatrices(d,{
                            theContainer: liveGridElement.eventObjects,
                            height: liveGridElement.height,
                            width: liveGridElement.width,
                        })
                    }
                    if(d.details.confidence){
                        var eventConfidence = d.details.confidence
                        if(eventConfidence > 100)eventConfidence = 100
                        liveGridElement.motionMeter.css('width',eventConfidence + '%');
                        liveGridElement.motionMeterText[0].innerHtml = d.details.confidence+'% change in <b>'+d.details.name+'</b>'
                    }
                    monitorElement.addClass('detector_triggered')
                    clearTimeout(livePlayerElement.detector_trigger_timeout);
                    livePlayerElement.detector_trigger_timeout = setTimeout(function(){
                        monitorElement.removeClass('detector_triggered');
                        liveGridElement.eventObjects.find('.stream-detected-object,.stream-detected-point').remove()
                    },800);
                }
            break;
        }
    });
    createWebsocket(location.origin,{
        path: websocketPath
    });
    onInitWebsocket(function(){
        requestMonitorInit();
    });
    $(window)
    .focus(function(){
        unmuteVideoPlayer()
    })
    $('.unmute-embed-audio').click(function(){
        unmuteVideoPlayer()
    })
});
