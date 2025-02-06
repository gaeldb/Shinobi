module.exports = (s,config,lang) => {
    const fs = require('fs');
    const URL = require('url');
    const events = require('events');
    const Mp4Frag = require('mp4frag');
    const treekill = require('tree-kill');
    const exec = require('child_process').exec;
    const spawn = require('child_process').spawn;
    const connectionTester = require('connection-tester')
    const SoundDetection = require('shinobi-sound-detection')
    const streamViewerCountTimeouts = {}
    const { createQueueAwaited } = require('../common.js')
    const {
        applyPartialToConfiguration,
        getWarningChangesForMonitor,
        createPipeArray,
        splitForFFMPEG,
        sanitizedFfmpegCommand,
    } = require('../ffmpeg/utils.js')(s,config,lang)
    const {
        buildSubstreamString,
        getDefaultSubstreamFields,
    } = require('../ffmpeg/builders.js')(s,config,lang)
    const {
        addEventDetailsToString,
        closeEventBasedRecording,
        convertRegionPointsToNewDimensions,
        triggerEvent,
    } = require('../events/utils.js')(s,config,lang)
    const {
        setHomePositionPreset,
        moveToHomePosition,
    } = require('../control/ptz.js')(s,config,lang)
    const {
        scanForOrphanedVideos,
        reEncodeVideoAndBinOriginalAddToQueue,
    } = require('../video/utils.js')(s,config,lang)
    const {
        selectNodeForOperation,
        bindMonitorToChildNode
    } = require('../childNode/utils.js')(s,config,lang)
    const isMasterNode = (
        (
            config.childNodes.enabled === true &&
            config.childNodes.mode === 'master'
        ) ||
        config.childNodes.enabled === false
    );
    const getUpdateableFields = require('./updatedFields.js')
    const processKill = (proc) => {
        const response = {ok: true}
        const processPID = proc && proc.pid ? parseInt(`${proc.pid}`) : null
        return new Promise((resolve,reject) => {
            let alreadyResolved = false
            function doResolve(response){
                if(alreadyResolved)return;
                alreadyResolved = true;
                resolve(response)
            }
            if(!proc || !processPID){
                response.msg = 'No Process to Kill'
                doResolve(response)
                return
            }
            function sendError(err){
                response.ok = false
                response.err = err
                doResolve(response)
            }
            function lastResort(){
                treekill(processPID)
                response.msg = 'treekill'
                doResolve(response)
            }
            try{
                proc.removeAllListeners()
                proc.on('exit',() => {
                    response.msg = 'proc.on.exit'
                    clearTimeout(killTimer)
                    doResolve(response)
                    treekill(processPID)
                });
                if(proc && proc.stdin) {
                    proc.stdin.write("q\r\n");
                }
                let killTimer = setTimeout(() => {
                    if(proc && proc.kill){
                        if(s.isWin){
                            response.msg = 'taskkill'
                            spawn("taskkill", ["/pid", processPID, '/t'])
                        }else{
                            response.msg = 'SIGTERM'
                            proc.kill('SIGTERM')
                        }
                        killTimer = setTimeout(lastResort,3000)
                    }
                },1000)
            }catch(err){
                s.debugLog(err)
                sendError(err)
            }
        })
    }
    const cameraDestroy = async function(e,p){
        const groupKey = e.ke
        const monitorId = e.mid || e.id
        const theGroup = s.group[groupKey]
        if(
            theGroup &&
            theGroup.activeMonitors[e.id] &&
            theGroup.activeMonitors[e.id].spawn !== undefined
        ){
            const activeMonitor = s.group[groupKey].activeMonitors[e.id];
            const proc = s.group[groupKey].activeMonitors[e.id].spawn;
            if(proc){
                activeMonitor.allowStdinWrite = false
                s.txToDashcamUsers({
                    f : 'disable_stream',
                    ke : groupKey,
                    mid : e.id
                },groupKey)
    //            if(activeMonitor.p2pStream){activeMonitor.p2pStream.unpipe();}
                try{
                    proc.removeListener('end',activeMonitor.spawn_exit);
                    proc.removeListener('exit',activeMonitor.spawn_exit);
                    delete(activeMonitor.spawn_exit);
                }catch(er){

                }
            }
            if(activeMonitor.audioDetector){
              activeMonitor.audioDetector.stop()
              delete(activeMonitor.audioDetector)
            }
            activeMonitor.firstStreamChunk = {}
            clearTimeout(activeMonitor.recordingChecker);
            delete(activeMonitor.recordingChecker);
            clearTimeout(activeMonitor.streamChecker);
            delete(activeMonitor.streamChecker);
            clearTimeout(activeMonitor.timelapseFramesChecker);
            delete(activeMonitor.timelapseFramesChecker);
            clearTimeout(activeMonitor.checkSnap);
            delete(activeMonitor.checkSnap);
            clearTimeout(activeMonitor.watchdog_stop);
            delete(activeMonitor.watchdog_stop);
            // delete(activeMonitor.secondaryDetectorOutput);
            delete(activeMonitor.detectorFrameSaveBuffer);
            clearTimeout(activeMonitor.recordingSnapper);
            clearInterval(activeMonitor.getMonitorCpuUsage);
            clearInterval(activeMonitor.objectCountIntervals);
            clearTimeout(activeMonitor.timeoutToRestart)
            clearTimeout(activeMonitor.fatalErrorTimeout);
            delete(activeMonitor.onvifConnection)
            // if(activeMonitor.onChildNodeExit){
            //     activeMonitor.onChildNodeExit()
            // }
            try{
                activeMonitor.spawn.stdio.forEach(function(stdio){
                  try{
                    stdio.unpipe()
                  }catch(err){
                    console.log(err)
                  }
                })
            }catch(err){
                // s.debugLog(err)
            }
            if(activeMonitor.mp4frag){
                var mp4FragChannels = Object.keys(activeMonitor.mp4frag)
                mp4FragChannels.forEach(function(channel){
                    activeMonitor.mp4frag[channel].removeAllListeners()
                    delete(activeMonitor.mp4frag[channel])
                })
            }
            if(config.childNodes.enabled === true && config.childNodes.mode === 'child' && config.childNodes.host){
                s.cx({f:'clearCameraFromActiveList',ke:groupKey,id:e.id})
            }
            if(activeMonitor.childNode){
                s.cx({f:'kill',d:s.cleanMonitorObject(e)},activeMonitor.childNodeId)
            }else{
                const killResponse = await processKill(proc);
                s.debugLog(`cameraDestroy`,killResponse)
                activeMonitor.allowDestroySubstream = true
                const killSubResponse = await destroySubstreamProcess(activeMonitor)
                if(killSubResponse.hadSubStream)s.debugLog(`cameraDestroy`,killSubResponse.closeResponse)
            }
        }
    }
    function copyMonitorConfiguration(groupKey,monitorId){
        return Object.assign({},s.group[groupKey].rawMonitorConfigurations[monitorId])
    }
    function getMonitorConfiguration(groupKey,monitorId){
        return s.group[groupKey].rawMonitorConfigurations[monitorId]
    }
    function getActiveMonitor(groupKey,monitorId){
        return s.group[groupKey].activeMonitors[monitorId]
    }
    const createSnapshot = (options) => {
        const url = options.url
        const streamDir = options.streamDir || s.dir.streams
        const inputOptions = options.input || []
        const outputOptions = options.output || []
        return new Promise((resolve,reject) => {
            if(!url){
                resolve(null);
                return
            }
            const completeRequest = () => {
                fs.readFile(temporaryImageFile,(err,imageBuffer) => {
                    fs.rm(temporaryImageFile,(err) => {
                        if(err){
                            s.debugLog(err)
                        }
                    })
                    if(err){
                        s.debugLog(err)
                    }
                    resolve(imageBuffer)
                })
            }
            const temporaryImageFile = streamDir + s.gid(5) + '.jpg'
            const ffmpegCmd = splitForFFMPEG(`-y -loglevel warning -re ${inputOptions.join(' ')} -i "${url}" ${outputOptions.join(' ')} -f mjpeg -an -frames:v 1 "${temporaryImageFile}"`)
            const snapProcess = spawn(config.ffmpegDir, ffmpegCmd, {detached: true})
            snapProcess.stderr.on('data',function(data){
                // s.debugLog(data.toString())
            })
            snapProcess.on('close',async function(data){
                clearTimeout(snapProcessTimeout)
                completeRequest()
            })
            var snapProcessTimeout = setTimeout(function(){
                processKill(snapProcess).then((response) => {
                    s.debugLog(`createSnapshot-snapProcessTimeout`,response)
                    completeRequest()
                })
            },5000)
        })
    }
    const addCredentialsToStreamLink = (options) => {
        const streamUrl = options.url
        const username = options.username
        const password = options.password
        const urlParts = streamUrl.split('://')
        urlParts[0] = 'http'
        return ['rtsp','://',`${username}:${password}@`,urlParts[1]].join('')
    }
    const monitorConfigurationMigrator = (monitor) => {
        // converts the old style to the new style.
        const updatedFields = getUpdateableFields()
        const fieldKeys = Object.keys(updatedFields)
        fieldKeys.forEach((oldKey) => {
            if(oldKey === 'details'){
                const detailKeys = Object.keys(updatedFields.details)
                detailKeys.forEach((oldKey) => {
                    if(oldKey === 'stream_channels'){
                        if(monitor.details.stream_channels){
                            const channelUpdates = updatedFields.details.stream_channels
                            const channelKeys = Object.keys(channelUpdates)
                            const streamChannels = s.parseJSON(monitor.details.stream_channels) || []
                            streamChannels.forEach(function(channel,number){
                                channelKeys.forEach((oldKey) => {
                                    const newKey = channelUpdates[oldKey]
                                    monitor.details.stream_channels[number][newKey] = streamChannels[number][oldKey] ? streamChannels[number][oldKey] : monitor.details.stream_channels[number][newKey]
                                    // delete(e.details.stream_channels[number][oldKey])
                                })
                            })
                        }
                    }else{
                        const newKey = updatedFields.details[oldKey]
                        monitor.details[newKey] = monitor.details[oldKey] ? monitor.details[oldKey] : monitor.details[newKey]
                        // delete(monitor.details[oldKey])
                    }
                })
            }else{
                const newKey = updatedFields[oldKey]
                monitor[newKey] = monitor[oldKey] ? monitor[oldKey] : monitor[newKey]
                // delete(monitor[oldKey])
            }
        })
    }
    const sendSubstreamEvent = function(groupKey, monitorId, eventName = 'substream_start'){
        const activeMonitor = getActiveMonitor(groupKey,monitorId)
        s.tx({
            f: eventName,
            mid: monitorId,
            ke: groupKey,
            channel: activeMonitor.subStreamChannel
        },'GRP_'+groupKey);
    }
    const sendSubstreamEventActiveMonitor = function(activeMonitor, eventName = 'substream_start'){
        s.tx({
            f: eventName,
            mid: activeMonitor.mid,
            ke: activeMonitor.ke,
            channel: activeMonitor.subStreamChannel
        },'GRP_'+activeMonitor.ke);
    }
    const spawnSubstreamProcess = function(e){
        // e = monitorConfig
        try{
            const groupKey = e.ke
            const monitorId = e.mid || e.id
            const monitorConfig = copyMonitorConfiguration(groupKey,monitorId)
            const monitorDetails = monitorConfig.details
            const activeMonitor = getActiveMonitor(groupKey,monitorId)
            const channelNumber = 1 + (monitorDetails.stream_channels || []).length
            const ffmpegCommand = [`-progress pipe:5`];
            const logLevel = monitorDetails.loglevel ? e.details.loglevel : 'warning'
            const stdioPipes = createPipeArray({}, 2)
            const substreamConfig = monitorConfig.details.substream
            substreamConfig.input.type = !substreamConfig.input.fulladdress ? monitorConfig.type : substreamConfig.input.type || monitorConfig.details.rtsp_transport
            substreamConfig.input.fulladdress = substreamConfig.input.fulladdress || s.buildMonitorUrl(monitorConfig)
            substreamConfig.input.rtsp_transport = substreamConfig.input.rtsp_transport || monitorConfig.details.rtsp_transport
            const {
                otherInputFlags,
                otherOutputFlags,
                inputAndConnectionFields,
                outputFields,
            } = getDefaultSubstreamFields(monitorConfig);
            ffmpegCommand.push(...otherInputFlags);
            ffmpegCommand.push(...otherOutputFlags);
            ([
                buildSubstreamString(channelNumber + config.pipeAddition,e),
            ]).forEach(function(commandStringPart){
                ffmpegCommand.push(commandStringPart)
            });
            const ffmpegCommandString = ffmpegCommand.join(' ')
            activeMonitor.ffmpegSubstream = sanitizedFfmpegCommand(e,ffmpegCommandString)
            const ffmpegCommandParsed = splitForFFMPEG(ffmpegCommandString)
            activeMonitor.subStreamChannel = channelNumber;
            s.userLog({
                ke: groupKey,
                mid: monitorId,
            },
            {
                type: lang["Substream Process"],
                msg: {
                    msg: lang["Process Started"],
                    cmd: ffmpegCommandString,
                },
            });
            const subStreamProcess = spawn(config.ffmpegDir,ffmpegCommandParsed,{detached: true,stdio: stdioPipes})
            attachStreamChannelHandlers({
                ke: groupKey,
                mid: e.mid,
                fields: Object.assign({},inputAndConnectionFields,outputFields),
                number: activeMonitor.subStreamChannel,
                ffmpegProcess: subStreamProcess,
            })
            if(config.debugLog === true){
                subStreamProcess.stderr.on('data',(data) => {
                    console.log(`${groupKey} ${monitorId}`)
                    console.log(data.toString())
                })
            }

            subStreamProcess.stderr.on('data',(data) => {
                const string = data.toString();
                if(string.includes('No such')){
                    processKill(subStreamProcess);
                    return;
                }
                if(logLevel !== 'quiet'){
                    s.userLog({
                        ke: groupKey,
                        mid: monitorId,
                    },{
                        type: lang["Substream Process"],
                        msg: string
                    })
                }
            });

            subStreamProcess.stdio[5].on('data',(data) => {
                resetStreamCheck({
                    ke: groupKey,
                    mid: monitorId,
                })
            });

            subStreamProcess.on('close',(data) => {
                if(!activeMonitor.allowDestroySubstream){
                    subStreamProcess.stderr.on('data',(data) => {
                        s.userLog({
                            ke: groupKey,
                            mid: monitorId,
                        },
                        {
                            type: lang["Substream Process"],
                            msg: lang["Process Crashed for Monitor"],
                        })
                    })
                    setTimeout(() => {
                        spawnSubstreamProcess(e)
                    },2000)
                }
            })
            activeMonitor.subStreamProcess = subStreamProcess
            sendSubstreamEvent(groupKey, monitorId)
            return subStreamProcess
        }catch(err){
            s.systemLog(err)
            return null
        }
    }
    const destroySubstreamProcess = async function(activeMonitor){
        // e = monitorConfig.details.substream
        const response = {
            hadSubStream: false,
            alreadyClosing: false
        }
        try{
            if(activeMonitor.subStreamProcessClosing){
                response.alreadyClosing = true
            }else if(activeMonitor.subStreamProcess){
                activeMonitor.subStreamProcessClosing = true
                activeMonitor.subStreamChannel = null;
                activeMonitor.subStreamOutputReady = false;
                clearInterval(activeMonitor.subStreamOutputReadyCheck);
                const closeResponse = await processKill(activeMonitor.subStreamProcess)
                response.hadSubStream = true
                response.closeResponse = closeResponse
                delete(activeMonitor.subStreamProcess)
                sendSubstreamEventActiveMonitor(activeMonitor, 'substream_end')
                activeMonitor.subStreamProcessClosing = false
            }
        }catch(err){
            console.error(err)
            s.debugLog('destroySubstreamProcess',err)
        }
        return response
    }
    function attachStreamChannelHandlers(options){
        const fields = options.fields
        const number = options.number
        const ffmpegProcess = options.ffmpegProcess
        const activeMonitor = s.group[options.ke].activeMonitors[options.mid]
        const pipeNumber = number + config.pipeAddition;
        if(!activeMonitor.emitterChannel[pipeNumber]){
            activeMonitor.emitterChannel[pipeNumber] = new events.EventEmitter().setMaxListeners(0);
        }
       let frameToStreamAdded
       switch(fields.stream_type){
           case'mp4':
               delete(activeMonitor.mp4frag[pipeNumber])
               if(!activeMonitor.mp4frag[pipeNumber])activeMonitor.mp4frag[pipeNumber] = new Mp4Frag();
               ffmpegProcess.stdio[pipeNumber].pipe(activeMonitor.mp4frag[pipeNumber],{ end: false })
           break;
           case'mjpeg':
               frameToStreamAdded = function (d) {
                    activeMonitor.emitterChannel[pipeNumber].emit('data', d)
               }
           break;
           case'b64':
               var buffer
               frameToStreamAdded = function(d){
                    if(!buffer){
                        buffer=[d]
                    }else{
                        buffer.push(d)
                    }
                    if((d[d.length-2] === 0xFF && d[d.length-1] === 0xD9)){
                        activeMonitor.emitterChannel[pipeNumber].emit('data',Buffer.concat(buffer))
                        buffer = null
                    }
               }
           break;
           case'flv':
               frameToStreamAdded = function(d){
                   if(!activeMonitor.firstStreamChunk[pipeNumber])activeMonitor.firstStreamChunk[pipeNumber] = d;
                   frameToStreamAdded = function(d){
                       activeMonitor.emitterChannel[pipeNumber].emit('data',d)
                   }
                   frameToStreamAdded(d)
               }
           break;
           case'h264':
               frameToStreamAdded = function(d){
                   activeMonitor.emitterChannel[pipeNumber].emit('data',d)
               }
           break;
        }
        if(frameToStreamAdded){
            ffmpegProcess.stdio[pipeNumber].on('data',frameToStreamAdded)
        }
    }
    function setActiveViewer(groupKey,monitorId,connectionId,isBeingAdded){
        const viewerList = s.group[groupKey].activeMonitors[monitorId].watch;
        if(isBeingAdded){
            if(viewerList.indexOf(connectionId) == -1)viewerList.push(connectionId);
        }else{
            viewerList.splice(viewerList.indexOf(connectionId), 1)
        }
        const numberOfViewers = viewerList.length
        s.tx({
            f: 'viewer_count',
            viewers: numberOfViewers,
            ke: groupKey,
            id: monitorId
        },'MON_' + groupKey + monitorId)
        return numberOfViewers;
    }
    function getActiveViewerCount(groupKey,monitorId){
        const viewerList = s.group[groupKey].activeMonitors[monitorId].watch;
        const numberOfViewers = viewerList.length
        return numberOfViewers;
    }
    function setTimedActiveViewerForHttp(req){
        const groupKey = req.params.ke
        const connectionId = req.params.auth
        const loggedInUser = s.group[groupKey].users[connectionId]
        if(!loggedInUser){
            const monitorId = req.params.id
            const viewerList = s.group[groupKey].activeMonitors[monitorId].watch
            const theViewer = viewerList[connectionId]
            if(!theViewer){
                setActiveViewer(groupKey,monitorId,connectionId,true)
            }
            clearTimeout(streamViewerCountTimeouts[req.originalUrl])
            streamViewerCountTimeouts[req.originalUrl] = setTimeout(() => {
                setActiveViewer(groupKey,monitorId,connectionId,false)
            },5000)
        }else{
            s.debugLog(`User is Logged in, Don't add to viewer count`);
        }
    }
    function attachMainProcessHandlers(e,fatalError){
        const groupKey = e.ke
        const monitorId = e.mid || e.id
        const activeMonitor = getActiveMonitor(groupKey,monitorId);
        const monitorConfig = copyMonitorConfiguration(groupKey,monitorId);
        const streamType = monitorConfig.details.stream_type;
        const analyzeDuration = (parseInt(monitorConfig.details.aduration) / 1000) || 10000;
        let initialHeartBeat = null
        if(streamType !== 'useSubstream'){
            initialHeartBeat = setTimeout(() => {
                resetStreamCheck({
                    ke: groupKey,
                    mid: monitorId,
                })
            }, analyzeDuration);
        }
        activeMonitor.spawn_exit = async function(){
            clearTimeout(initialHeartBeat)
            if(activeMonitor.isStarted === true){
                if(e.details.loglevel !== 'quiet'){
                    s.userLog(e,{type:lang['Process Unexpected Exit'],msg:{msg:lang.unexpectedExitText,cmd:activeMonitor.ffmpeg}});
                }
                await fatalError(e,'Process Unexpected Exit');
                scanForOrphanedVideos(e,{
                    forceCheck: true,
                    checkMax: 2
                })
                s.onMonitorUnexpectedExitExtensions.forEach(function(extender){
                    extender(monitorConfig,e)
                })
            }
        }
        activeMonitor.spawn.on('end',activeMonitor.spawn_exit)
        activeMonitor.spawn.on('exit',activeMonitor.spawn_exit)
        activeMonitor.spawn.on('error',function(er){
            s.userLog(e,{type:'Spawn Error',msg:er});fatalError(e,'Spawn Error')
        })
        s.userLog(e,{
            type: lang['Process Started'],
            msg: {
                cmd: activeMonitor.ffmpeg
            }
        })
    }
    async function deleteMonitorData(groupKey,monitorId){
        // deleteVideos
        // deleteFileBinFiles
        // deleteTimelapseFrames
        async function deletePath(thePath){
            try{
                await fs.promises.stat(thePath)
                await fs.promises.rm(thePath, {recursive: true})
            }catch(err){

            }
        }
        async function deleteFromTable(tableName){
            await s.knexQueryPromise({
                action: "delete",
                table: tableName,
                where: {
                    ke: groupKey,
                    mid: monitorId,
                }
            })
        }
        async function getSizeFromTable(tableName){
            const response = await s.knexQueryPromise({
                action: "select",
                columns: "size",
                table: tableName,
                where: {
                    ke: groupKey,
                    mid: monitorId,
                }
            })
            const rows = response.rows
            let size = 0
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i]
                size += row.size
            }
            return size
        }
        async function adjustSpaceCounterForTableWithAddStorage(tableName,storageType){
            // does normal videos and addStorage
            const response = await s.knexQueryPromise({
                action: "select",
                columns: "ke,mid,details,size",
                table: tableName || 'Videos',
                where: {
                    ke: groupKey,
                    mid: monitorId,
                }
            })
            const rows = response.rows
            for (let i = 0; i < rows.length; i++) {
                const video = rows[i]
                const storageIndex = s.getVideoStorageIndex(video)
                if(storageIndex){
                    s.setDiskUsedForGroupAddStorage(video.ke,{
                        size: -(video.size / 1048576),
                        storageIndex: storageIndex
                    },storageType)
                }else{
                    s.setDiskUsedForGroup(video.ke,-(video.size / 1048576),storageType)
                }
            }
        }
        async function adjustSpaceCounter(tableName,storageType){
            const amount = await getSizeFromTable(tableName)
            s.setDiskUsedForGroup(groupKey,-amount,storageType)
        }
        const videosDir = s.dir.videos + `${groupKey}/${monitorId}`
        const binDir = s.dir.fileBin + `${groupKey}/${monitorId}`

        // videos and addStorage
        await adjustSpaceCounterForTableWithAddStorage('Timelapse Frames','timelapseFrames')
        await adjustSpaceCounterForTableWithAddStorage('Videos')
        await deleteFromTable('Videos')
        await deletePath(videosDir)
        for (let i = 0; i < s.dir.addStorage.length; i++) {
            const storage = s.dir.addStorage[i]
            const addStorageDir = storage.path + groupKey + '/' + monitorId
            await deletePath(addStorageDir)
            await deletePath(addStorageDir + '_timelapse')
        }

        // timelapse frames
        await adjustSpaceCounter('Timelapse Frames','timelapseFrames')
        await deleteFromTable('Timelapse Frames')
        await deletePath(videosDir + '_timelapse')

        // fileBin
        await adjustSpaceCounter('Files','fileBin')
        await deleteFromTable('Files')
        await deletePath(binDir)
    }
    async function deleteMonitor(options){
        const response = { ok: true }
        try{
            const user = options.user
            const userId = user.uid
            const groupKey = options.ke
            const monitorId = options.id || options.mid
            const deleteFiles = options.deleteFiles === undefined ? true : options.deleteFiles
            s.userLog({
                ke: groupKey,
                mid: monitorId
            },{
                type: lang.monitorDeleted,
                msg: `${lang.byUser} : ${userId}`
            });
            s.camera('stop', {
                ke: groupKey,
                mid: monitorId,
                delete: 1,
            });
            s.tx({
                f: 'monitor_delete',
                uid: userId,
                mid: monitorId,
                ke: groupKey
            },`GRP_${groupKey}`);
            await s.knexQueryPromise({
                action: "delete",
                table: "Monitors",
                where: {
                    ke: groupKey,
                    mid: monitorId,
                }
            });
            if(deleteFiles){
                await deleteMonitorData(groupKey,monitorId)
                s.debugLog(`Deleted Monitor Data`,{
                    ke: groupKey,
                    mid: monitorId,
                });
            }
            delete(s.group[groupKey].activeMonitors[monitorId]);
            delete(s.group[groupKey].rawMonitorConfigurations[monitorId]);
            response.msg = `${lang.monitorDeleted} ${lang.byUser} : ${userId}`
        }catch(err){
            response.ok = false
            response.err = err
            s.systemLog(err)
        }
        return response
    }
    function getUrlProtocol(urlString){
        let modifiedUrlString = `${urlString}`.split('://')
        const originalProtocol = `${modifiedUrlString[0]}`
        return originalProtocol
    }
    function modifyUrlProtocol(urlString,newProtocol){
        let modifiedUrlString = `${urlString}`.split('://')
        const originalProtocol = `${modifiedUrlString[0]}`
        modifiedUrlString[0] = newProtocol;
        modifiedUrlString = modifiedUrlString.join('://')
        return modifiedUrlString
    }
    function getUrlParts(urlString){
        const originalProtocol = getUrlProtocol(urlString)
        const modifiedUrlString = modifyUrlProtocol(urlString,'http')
        const url = URL.parse(modifiedUrlString)
        const data = {}
        Object.keys(url).forEach(function(key){
            const value = url[key];
            if(value && typeof value !== 'function')data[key] = url[key];
        });
        data.href = `${urlString}`
        data.origin = modifyUrlProtocol(data.origin,originalProtocol)
        data.protocol = `${originalProtocol}:`
        return data
    }
    async function monitorStop(e){
        const groupKey = e.ke
        const monitorId = e.mid || e.id
        if(!s.group[groupKey]||!s.group[groupKey].activeMonitors[monitorId]){return}
        const activeMonitor = getActiveMonitor(groupKey,monitorId);
        const monitorConfig = copyMonitorConfiguration(groupKey,monitorId);
        const monitorOnChildNode = config.childNodes.enabled === true && config.childNodes.mode === 'master' && activeMonitor.childNode && s.childNodes[activeMonitor.childNode].activeCameras[groupKey+monitorId];
        if(monitorOnChildNode){
            activeMonitor.isStarted = false
            s.cx({
                f:'sync',
                sync: monitorConfig,
                ke: groupKey,
                mid: monitorId
            },activeMonitor.childNodeId);
            s.cx({
                f: 'cameraStop',
                d: monitorConfig
            },activeMonitor.childNodeId);
        }else{
            closeEventBasedRecording(e)
            if(activeMonitor.fswatch){activeMonitor.fswatch.close();delete(activeMonitor.fswatch)}
            if(activeMonitor.fswatchStream){activeMonitor.fswatchStream.close();delete(activeMonitor.fswatchStream)}
            if(activeMonitor.last_frame){delete(activeMonitor.last_frame)}
            if(activeMonitor.isStarted !== true){return}
            await cameraDestroy(e)
            clearTimeout(activeMonitor.trigger_timer)
            delete(activeMonitor.trigger_timer)
            clearInterval(activeMonitor.detector_notrigger_timeout)
            clearTimeout(activeMonitor.fatalErrorTimeout);
            activeMonitor.isStarted = false
            activeMonitor.isRecording = false
            s.tx({f:'monitor_stopping',mid:monitorId,ke:groupKey,time:s.formattedTime()},'GRP_'+groupKey);
            s.cameraSendSnapshot({mid:monitorId,ke:groupKey,mon:e},{useIcon: true})
            s.userLog(e,{type:lang['Monitor Stopped'],msg:lang.MonitorStoppedText});
            clearTimeout(activeMonitor.delete)
            if(e.delete === 1){
                activeMonitor.delete = setTimeout(function(){
                    delete(s.group[groupKey].activeMonitors[monitorId]);
                    delete(s.group[groupKey].rawMonitorConfigurations[monitorId]);
                },1000 * 20);
            }
        }
        s.sendMonitorStatus({
            id: monitorId,
            ke: groupKey,
            status: lang.Stopped,
            code: 5,
        });
        if(isMasterNode){
            setTimeout(() => {
                scanForOrphanedVideos({
                    ke: groupKey,
                    mid: monitorId,
                },{
                    forceCheck: true,
                    checkMax: 2
                })
            },2000)
        }
        s.onMonitorStopExtensions.forEach(function(extender){
            extender(monitorConfig,e)
        })
    }
    function monitorIdle(e){
        const monitorId = e.mid || e.id
        const groupKey = e.ke
        s.tx({f:'monitor_idle',mid:monitorId,ke:groupKey,time:s.formattedTime()},'GRP_'+groupKey);
        s.userLog(e,{type:lang['Monitor Idling'],msg:lang.MonitorIdlingText});
        s.sendMonitorStatus({
            id: monitorId,
            ke: groupKey,
            status: lang.Idle,
            code: 6,
        })
    }
    async function monitorRestart(e){
        const groupKey = e.ke
        const monitorId = e.mid || e.id
        s.sendMonitorStatus({
            id: monitorId,
            ke: groupKey,
            status: lang.Restarting,
            code: 4,
        });
        await s.camera('stop',e)
        if(e.mode !== 'restart')await s.camera(`${e.mode}`,e);
    }
    function monitorAddViewer(e,cn){
        const groupKey = e.ke
        const monitorId = e.mid || e.id
        const activeMonitor = getActiveMonitor(groupKey,monitorId);
        if(!cn.monitorsCurrentlyWatching){cn.monitorsCurrentlyWatching = {}}
        if(!cn.monitorsCurrentlyWatching[monitorId]){cn.monitorsCurrentlyWatching[monitorId] = { ke: groupKey }}
        setActiveViewer(groupKey,monitorId,cn.id,true)
        activeMonitor.allowDestroySubstream = false
        clearTimeout(activeMonitor.noViewerCountDisableSubstream)
        if (e.monitorTimeout) {
            const uniqueId = cn.url + cn.id;
            clearTimeout(streamViewerCountTimeouts[uniqueId])
            streamViewerCountTimeouts[uniqueId] = setTimeout(() => {
                monitorRemoveViewer(e,cn)
            },e.monitorTimeout)
        }
    }
    function monitorRemoveViewer(e,cn){
        const groupKey = e.ke
        const monitorId = e.mid || e.id
        const activeMonitor = getActiveMonitor(groupKey,monitorId);
        if(cn.monitorsCurrentlyWatching){delete(cn.monitorsCurrentlyWatching[monitorId])}
        setActiveViewer(groupKey,monitorId,cn.id,false)
        clearTimeout(activeMonitor.noViewerCountDisableSubstream)
        activeMonitor.noViewerCountDisableSubstream = setTimeout(async () => {
            let currentCount = getActiveViewerCount(groupKey,monitorId)
            if(currentCount === 0 && activeMonitor.subStreamProcess){
                activeMonitor.allowDestroySubstream = true
                await destroySubstreamProcess(activeMonitor)
            }
        },10000)
    }
    function createRecordingDirectory(e,callback){
        var directory;
        const groupKey = e.ke
        const monitorId = e.mid || e.id
        if(e.details && e.details.dir && e.details.dir !== '' && config.childNodes.mode !== 'child'){
            //addStorage choice
            directory = s.checkCorrectPathEnding(e.details.dir) + groupKey + '/'
            fs.mkdir(directory,function(err){
                s.handleFolderError(err)
                directory = directory + monitorId + '/'
                fs.mkdir(directory,function(err){
                    s.handleFolderError(err)
                    callback(err,directory)
                })
            })
        }else{
            //MAIN videos dir
            directory = s.dir.videos + groupKey + '/'
            fs.mkdir(directory,function(err){
                s.handleFolderError(err)
                directory = s.dir.videos + groupKey + '/' + monitorId + '/'
                fs.mkdir(directory,function(err){
                    s.handleFolderError(err)
                    callback(err,directory)
                })
            })
        }
    }
    function createTimelapseDirectory(e,callback){
        var directory = s.getTimelapseFrameDirectory(e)
        fs.mkdir(directory,{ recursive: true },function(err){
            s.handleFolderError(err)
            callback(err,directory)
        })
    }
    function createFileBinDirectory(e,callback){
        const groupKey = e.ke
        const monitorId = e.mid || e.id
        var directory = s.dir.fileBin + groupKey + '/'
        fs.mkdir(directory,function(err){
            s.handleFolderError(err)
            directory = s.dir.fileBin + groupKey + '/' + monitorId + '/'
            fs.mkdir(directory,function(err){
                s.handleFolderError(err)
                callback(err,directory)
            })
        })
    }
    function createStreamDirectory(e,callback){
        const groupKey = e.ke
        const monitorId = e.mid || e.id
        callback = callback || function(){}
        var directory = s.dir.streams + groupKey + '/'
        fs.mkdir(directory,function(err){
            directory = s.dir.streams + groupKey + '/' + monitorId + '/'
            s.handleFolderError(err)
            fs.mkdir(directory,function(err){
                if (err){
                    s.handleFolderError(err)
                    s.file('deleteFolder',directory + '*',function(err){
                        callback(err,directory)
                    })
                }else{
                    callback(err,directory)
                }
            })
        })
    }
    function createCameraFolders(e,callback){
        return new Promise((resolve) => {
            //set the recording directory
            const groupKey = e.ke
            const monitorId = e.mid || e.id
            var activeMonitor = s.group[groupKey].activeMonitors[monitorId]
            createStreamDirectory(e,function(err,directory){
                activeMonitor.sdir = directory
                e.sdir = directory
                createRecordingDirectory(e,function(err,directory){
                    activeMonitor.dir = directory
                    e.dir = directory
                    createTimelapseDirectory(e,function(err,directory){
                        activeMonitor.dirTimelapse = directory
                        e.dirTimelapse = directory
                        createFileBinDirectory(e,function(err){
                            if(callback)callback()
                            resolve()
                        })
                    })
                })
            })
        })
    }
    async function forceMonitorRestart(monitor,restartMessage){
        const groupKey = monitor.ke
        const monitorId = monitor.mid
        const monitorConfig = copyMonitorConfiguration(groupKey,monitorId)
        s.sendMonitorStatus({
            id: monitorId,
            ke: groupKey,
            status: lang.Restarting,
            code: 4,
        })
        await launchMonitorProcesses(monitorConfig)
        s.userLog({
            ke: groupKey,
            mid: monitorId,
        },restartMessage)
        scanForOrphanedVideos({
            ke: groupKey,
            mid: monitorId,
        },{
            forceCheck: true,
            checkMax: 2
        })
    }
    function stripAuthFromHost(e){
        var host = e.host.split('@');
        if(host[1]){
            //username and password found
            host = host[1]
        }else{
            //no username or password in `host` string
            host = host[0]
        }
        return host
    }
    function resetRecordingCheck(e){
        const groupKey = e.ke
        const monitorId = e.mid || e.id
        const activeMonitor = getActiveMonitor(groupKey,monitorId)
        clearTimeout(activeMonitor.recordingChecker)
        const segmentLengthInMinutes = !isNaN(parseFloat(e.details.cutoff)) ? parseFloat(e.details.cutoff) : '15'
        const segmentLength = e.type === 'dashcam' ? segmentLengthInMinutes * 100 : segmentLengthInMinutes
        const monitorConfig = getMonitorConfiguration(groupKey,monitorId);
        activeMonitor.recordingChecker = setTimeout(function(){
            if(activeMonitor.isStarted === true && monitorConfig.mode === 'record'){
                forceMonitorRestart({
                    ke: groupKey,
                    mid: monitorId,
                },{
                    type: lang['Camera is not recording'],
                    msg: {
                        msg: lang['Restarting Process']
                    }
                })
            }
        },60000 * segmentLength * 1.3);
    }
    function resetStreamCheck(e){
        const groupKey = e.ke
        const monitorId = e.mid || e.id
        const activeMonitor = getActiveMonitor(groupKey,monitorId)
        if(!activeMonitor)return;
        clearTimeout(activeMonitor.streamChecker)
        activeMonitor.streamChecker = setTimeout(function(){
            if(activeMonitor && activeMonitor.isStarted === true){
                forceMonitorRestart({
                    ke: groupKey,
                    mid: monitorId,
                },{
                    type: lang['Camera is not streaming'],
                    msg: {
                        msg: lang['Restarting Process']
                    }
                })
            }
        },60000 * 1);
    }
    function resetTimelapseFramesCheck(e){
        const groupKey = e.ke
        const monitorId = e.mid || e.id
        const activeMonitor = getActiveMonitor(groupKey,monitorId)
        const monitorConfig = s.group[groupKey].rawMonitorConfigurations[monitorId]
        const creationInterval = parseFloat(monitorConfig.details.record_timelapse_fps) || 900;
        clearTimeout(activeMonitor.timelapseFramesChecker)
        activeMonitor.timelapseFramesChecker = setTimeout(function(){
            if(activeMonitor && activeMonitor.isStarted === true){
                forceMonitorRestart({
                    ke: groupKey,
                    mid: monitorId,
                },{
                    type: lang['Camera is not recording'],
                    msg: {
                        msg: lang['Restarting Process']
                    }
                })
            }
        }, 1000 * creationInterval * 2);
    }
    function setUpChosenDetector(e){
        const groupKey = e.ke
        const monitorId = e.mid || e.id
        const activeMonitor = getActiveMonitor(groupKey,monitorId);
        const monitorConfig = getMonitorConfiguration(groupKey,monitorId);
        const monitorDetails = monitorConfig.details;
        let chosenDetector = monitorDetails.detectors_selected;
        if(chosenDetector instanceof Array)chosenDetector = chosenDetector.join(',');
        let sendToDetector = (data) => {
            s.ocvTx({
                f : 'frame',
                mon : monitorDetails,
                ke : groupKey,
                id : monitorId,
                time : s.formattedTime(),
                frame : data
            })
        }
        if(chosenDetector && !(chosenDetector.includes('all'))){
            const pluginsGettingIt = chosenDetector.split(',').map(item => item.trim()).filter(item => !!item);
            sendToDetector = (data) => {
                for(pluginName of pluginsGettingIt){
                    s.sendToDetector(pluginName, {
                        f : 'frame',
                        mon : monitorDetails,
                        ke : groupKey,
                        id : monitorId,
                        time : s.formattedTime(),
                        frame : data
                    })
                }
            }
        }
        activeMonitor.forDetectorJpegOutputAlone = sendToDetector;
    }
    function onDetectorJpegOutputAlone(e,d){
        if(s.isAtleatOneDetectorPluginConnected){
            const groupKey = e.ke
            const monitorId = e.mid || e.id
            const activeMonitor = getActiveMonitor(groupKey,monitorId);
            activeMonitor.forDetectorJpegOutputAlone(d)
        }
    }
    function onDetectorJpegOutputSecondary(e,buffer){
        if(s.isAtleatOneDetectorPluginConnected){
            const groupKey = e.ke
            const monitorId = e.mid || e.id
            const activeMonitor = getActiveMonitor(groupKey,monitorId)
            const theArray = activeMonitor.pipe4BufferPieces
            theArray.push(buffer)
            if(buffer[buffer.length-2] === 0xFF && buffer[buffer.length-1] === 0xD9){
                activeMonitor.secondaryDetectorOutput.emit('data',Buffer.concat(theArray))
                activeMonitor.pipe4BufferPieces = []
            }
        }
    }
    async function createCameraFfmpegProcess(e){
        const groupKey = e.ke
        const monitorId = e.mid || e.id
        var activeMonitor = getActiveMonitor(groupKey,monitorId)
        //launch ffmpeg (main)
        s.tx({
            f: 'monitor_starting',
            mode: e.functionMode,
            mid: monitorId,
            time: s.formattedTime()
        },'GRP_'+groupKey)
        activeMonitor.spawn = await s.ffmpeg(e)
        if(activeMonitor.spawn){
            attachMainProcessHandlers(e,fatalError)
        }else{
            s.debugLog(`Failed to Launch Monitor!`)
        }
        return activeMonitor.spawn
    }
    function createEventCounter(monitor){
        if(monitor.details.detector_obj_count === '1'){
            const activeMonitor = s.group[monitor.ke].activeMonitors[monitor.id]
            activeMonitor.eventsCountStartTime = new Date()
            clearInterval(activeMonitor.objectCountIntervals)
            activeMonitor.objectCountIntervals = setInterval(() => {
                const eventsCounted = activeMonitor.eventsCounted || {}
                const countsToSave = Object.assign(eventsCounted,{})
                activeMonitor.eventsCounted = {}
                const groupKey = monitor.ke
                const monitorId = monitor.id
                const startTime = new Date(activeMonitor.eventsCountStartTime + 0)
                const endTime = new Date()
                const countedKeys = Object.keys(countsToSave)
                activeMonitor.eventsCountStartTime = new Date()
                if(countedKeys.length > 0)countedKeys.forEach((tag) => {
                    const tagInfo = countsToSave[tag]
                    const count = Object.keys(tagInfo.count)
                    const times = tagInfo.times
                    const realTag = tagInfo.tag
                    s.knexQuery({
                        action: "insert",
                        table: "Events Counts",
                        insert: {
                            ke: groupKey,
                            mid: monitorId,
                            details: JSON.stringify({
                                times: times,
                                count: count,
                            }),
                            time: startTime,
                            end: endTime,
                            count: count.length,
                            tag: realTag
                        }
                    })
                })
            },60000) //every minute
        }
    }
    function createCameraStreamHandlers(e){
        const groupKey = e.ke
        const monitorId = e.mid || e.id
        const activeMonitor = getActiveMonitor(groupKey,monitorId)
        const detectorEnabled = e.details.detector === '1'
        activeMonitor.spawn.stdio[5].on('data',function(data){
            resetStreamCheck(e)
        })
        //emitter for mjpeg
        if(!e.details.stream_mjpeg_clients||e.details.stream_mjpeg_clients===''||isNaN(e.details.stream_mjpeg_clients)===false){e.details.stream_mjpeg_clients=20;}else{e.details.stream_mjpeg_clients=parseInt(e.details.stream_mjpeg_clients)}
        activeMonitor.emitter = new events.EventEmitter().setMaxListeners(e.details.stream_mjpeg_clients);
        if(detectorEnabled && e.details.detector_audio === '1'){
            if(activeMonitor.audioDetector){
              activeMonitor.audioDetector.stop()
              delete(activeMonitor.audioDetector)
            }
            var triggerLevel
            var triggerLevelMax
            if(e.details.detector_audio_min_db && e.details.detector_audio_min_db !== ''){
                triggerLevel = parseInt(e.details.detector_audio_min_db)
            }else{
                triggerLevel = 5
            }
            if(e.details.detector_audio_max_db && e.details.detector_audio_max_db !== ''){
                triggerLevelMax = parseInt(e.details.detector_audio_max_db)
            }
            var audioDetector = new SoundDetection({
                format: {
                    bitDepth: 16,
                    numberOfChannels: 1,
                    signed: true
                },
                triggerLevel: triggerLevel,
                triggerLevelMax: triggerLevelMax
            },function(dB) {
                triggerEvent({
                    f: 'trigger',
                    id: monitorId,
                    ke: groupKey,
                    details: {
                        plug: 'audio',
                        name: 'db',
                        reason: 'soundChange',
                        confidence: dB
                    }
                })
            })
            activeMonitor.audioDetector = audioDetector
            audioDetector.start()
            activeMonitor.spawn.stdio[6].pipe(audioDetector.streamDecoder,{ end: false })
        }
        if(e.details.record_timelapse === '1'){
            var timelapseRecordingDirectory = s.getTimelapseFrameDirectory(e)
            activeMonitor.spawn.stdio[7].on('data', function(data){
                try{
                    var fileStream = activeMonitor.recordTimelapseWriter
                    if(!fileStream){
                        var currentDate = s.formattedTime(null,'YYYY-MM-DD')
                        var filename = s.formattedTime() + '.jpg'
                        var location = timelapseRecordingDirectory + currentDate + '/'
                        if(!fs.existsSync(location)){
                            fs.mkdirSync(location)
                        }
                        fileStream = fs.createWriteStream(location + filename)
                        fileStream.on('error', err => s.debugLog(err))
                        fileStream.on('close', function () {
                            activeMonitor.recordTimelapseWriter = null
                            s.createTimelapseFrameAndInsert(e,location,filename)
                            resetTimelapseFramesCheck(e)
                        })
                        activeMonitor.recordTimelapseWriter = fileStream
                    }
                    fileStream.write(data)
                    clearTimeout(activeMonitor.recordTimelapseWriterTimeout)
                    activeMonitor.recordTimelapseWriterTimeout = setTimeout(function(){
                        fileStream.end()
                    },900)
                }catch(err){
                    s.debugLog(err)
                }
            })
        }
        if(e.details.detector === '1'){
            //frames from motion detect
            if(e.details.detector_pam === '1'){
               // activeMonitor.spawn.stdio[3].pipe(activeMonitor.p2p).pipe(activeMonitor.pamDiff)
               // spawn.stdio[3] is deprecated and now motion events are handled by dataPort
                if(e.details.detector_use_detect_object === '1' && e.details.detector_use_motion === '1' ){
                    activeMonitor.spawn.stdio[4].on('data',function(data){
                        onDetectorJpegOutputSecondary(e,data)
                    })
                }else{
                    setUpChosenDetector(e)
		            activeMonitor.spawn.stdio[4].on('data',function(data){
                        onDetectorJpegOutputAlone(e,data)
                    })
		        }
            }else if(e.details.detector_use_detect_object === '1' && e.details.detector_send_frames !== '1'){
                activeMonitor.spawn.stdio[4].on('data',function(data){
                    onDetectorJpegOutputSecondary(e,data)
                })
            }else{
                setUpChosenDetector(e)
                activeMonitor.spawn.stdio[4].on('data',function(data){
                    onDetectorJpegOutputAlone(e,data)
                })
            }
        }
        //frames to stream
       var frameToStreamPrimary;
       const streamType = e.details.stream_type;
       switch(streamType){
           case'mp4':
               delete(activeMonitor.mp4frag['MAIN'])
               if(!activeMonitor.mp4frag['MAIN'])activeMonitor.mp4frag['MAIN'] = new Mp4Frag()
               activeMonitor.mp4frag['MAIN'].on('error',function(error){
                   s.userLog(e,{type:lang['Mp4Frag'],msg:{error:error}})
               })
               activeMonitor.spawn.stdio[1].pipe(activeMonitor.mp4frag['MAIN'],{ end: false })
           break;
           case'flv':
               frameToStreamPrimary = function(d){
                   if(!activeMonitor.firstStreamChunk['MAIN'])activeMonitor.firstStreamChunk['MAIN'] = d;
                   frameToStreamPrimary = function(d){
                       resetStreamCheck(e)
                       activeMonitor.emitter.emit('data',d)
                   }
                   frameToStreamPrimary(d)
               }
           break;
           case'mjpeg':
               frameToStreamPrimary = function(d){
                   resetStreamCheck(e)
                   activeMonitor.emitter.emit('data',d)
               }
           break;
           case'b64':case undefined:case null:case'':
               var buffer
               frameToStreamPrimary = function(d){
                  resetStreamCheck(e)
                  if(!buffer){
                      buffer=[d]
                  }else{
                      buffer.push(d)
                  }
                  if((d[d.length-2] === 0xFF && d[d.length-1] === 0xD9)){
                      activeMonitor.emitter.emit('data',Buffer.concat(buffer))
                      buffer = null
                  }
               }
           break;
        }
        s.onMonitorCreateStreamPipeExtensions.forEach(function(extender){
            if(!frameToStreamPrimary)frameToStreamPrimary = extender(streamType,e,resetStreamCheck)
        });
        if(frameToStreamPrimary){
            activeMonitor.spawn.stdout.on('data',frameToStreamPrimary)
        }
        if(e.details.stream_channels && e.details.stream_channels !== ''){
            s.parseJSON(e.details.stream_channels,{}).forEach((fields,number) => {
                attachStreamChannelHandlers({
                    ke: groupKey,
                    mid: monitorId,
                    fields: fields,
                    number: number,
                    ffmpegProcess: activeMonitor.spawn,
                })
            })
        }
    }
    function catchNewSegmentNames(e){
        const groupKey = e.ke
        const monitorId = e.mid || e.id
        const activeMonitor = getActiveMonitor(groupKey,monitorId)
        const monitorConfig = getMonitorConfiguration(groupKey,monitorId)
        const monitorDetails = monitorConfig.details
        const autoCompressionEnabled = monitorDetails.auto_compress_videos === '1'
        var checkLog = function(d,x){return d.indexOf(x)>-1}
        activeMonitor.spawn.stdio[8].on('data',function(d){
            d=d.toString();
            if(/T[0-9][0-9]-[0-9][0-9]-[0-9][0-9]./.test(d)){
                var filename = d.split('.')[0].split(' [')[0].trim()+'.'+e.ext
                s.insertCompletedVideo(e,{
                    file: filename,
                    events: activeMonitor.detector_motion_count
                },function(err,response){
                    s.userLog(e,{type:lang['Video Finished'],msg:{filename:d}})
                    if(
                        e.details.detector === '1' &&
                        activeMonitor.isStarted === true &&
                        e.details &&
                        e.details.detector_record_method === 'del'&&
                        e.details.detector_delete_motionless_videos === '1'&&
                        activeMonitor.detector_motion_count.length === 0
                    ){
                        if(e.details.loglevel !== 'quiet'){
                            s.userLog(e,{type:lang['Delete Motionless Video'],msg:filename})
                        }
                        s.deleteVideo({
                            filename : filename,
                            ke : groupKey,
                            id : monitorId
                        })
                    }else if(autoCompressionEnabled){
                        s.debugLog('Queue Automatic Compression',response.insertQuery)
                        reEncodeVideoAndBinOriginalAddToQueue({
                            video: response.insertQuery,
                            targetExtension: 'webm',
                            doSlowly: false,
                            automated: true,
                        }).then((encodeResponse) => {
                            s.debugLog('Complete Automatic Compression',encodeResponse)
                        }).catch((err) => {
                            console.log(err)
                        })
                    }
                    activeMonitor.detector_motion_count = []
                })
                resetRecordingCheck(e)
            }
        })
    }
    async function doFatalErrorCatch(e,d){
        const groupKey = e.ke
        const monitorId = e.mid || e.id
        const activeMonitor = getActiveMonitor(groupKey,monitorId)
        if(activeMonitor.isStarted === true){
            const activeMonitor = getActiveMonitor(groupKey,monitorId)
            activeMonitor.isStarted = false
            await cameraDestroy(e)
            activeMonitor.isStarted = true
            fatalError(e,d)
        }else{
            await cameraDestroy(e)
        }
    }
    function cameraFilterFfmpegLog(e){
        var checkLog = function(d,x){return d.indexOf(x)>-1}
        const groupKey = e.ke
        const monitorId = e.mid || e.id
        const activeMonitor = getActiveMonitor(groupKey,monitorId)
        activeMonitor.spawn.stderr.on('data',async function(d){
            d=d.toString();
            switch(true){
                case checkLog(d,'Not Enough Bandwidth'):
                    activeMonitor.criticalErrors['453'] = true
                break;
                case checkLog(d,'No space left on device'):
                    s.checkUserPurgeLock(groupKey)
                    s.purgeDiskForGroup(groupKey)
                break;
                case checkLog(d,'error parsing AU headers'):
                    s.userLog(e,{type:lang['Error While Decoding'],msg:lang.ErrorWhileDecodingTextAudio});
                break;
                case checkLog(d,'error while decoding'):
                    s.userLog(e,{type:lang['Error While Decoding'],msg:lang.ErrorWhileDecodingText});
                break;
                case checkLog(d,'pkt->duration = 0'):
                case checkLog(d,'[hls @'):
                case checkLog(d,'Past duration'):
                case checkLog(d,'Last message repeated'):
                case checkLog(d,'Non-monotonous DTS'):
                case checkLog(d,'NULL @'):
                case checkLog(d,'RTP: missed'):
                case checkLog(d,'deprecated pixel format used'):
                    return
                break;
                case checkLog(d,'Could not find tag for vp8'):
                case checkLog(d,'Only VP8 or VP9 Video'):
                case checkLog(d,'Could not write header'):
                    return s.userLog(e,{type:lang['Incorrect Settings Chosen'],msg:{msg:d}})
                break;
                case checkLog(d,'Connection refused'):
                case checkLog(d,'Connection timed out'):
                case checkLog(d,'Immediate exit requested'):
                case checkLog(d,'mjpeg_decode_dc'):
                case checkLog(d,'bad vlc'):
                case checkLog(d,'does not contain an image sequence pattern or a pattern is invalid.'):
                case checkLog(d,'error dc'):
                    // activeMonitor.timeoutToRestart = setTimeout(() => {
                    //     doFatalErrorCatch(e,d)
                    // },15000)
                break;
                case checkLog(d,'Could not find codec parameters'):
                case checkLog(d,'No route to host'):
                    activeMonitor.timeoutToRestart = setTimeout(async () => {
                        doFatalErrorCatch(e,d)
                    },60000)
                break;
            }
            s.userLog(e,{type:"FFMPEG STDERR",msg:d})
        })
    }
    function setNoEventsDetector(e){
        const groupKey = e.ke
        const monitorId = e.mid || e.id
        var detector_notrigger_timeout = (parseFloat(e.details.detector_notrigger_timeout) || 10) * 1000 * 60
        var currentConfig = getMonitorConfiguration(groupKey,monitorId).details
        clearInterval(s.group[groupKey].activeMonitors[monitorId].detector_notrigger_timeout)
        s.group[groupKey].activeMonitors[monitorId].detector_notrigger_timeout = setInterval(function(){
            if(currentConfig.detector_notrigger_webhook === '1' && !s.group[groupKey].activeMonitors[monitorId].detector_notrigger_webhook){
                s.group[groupKey].activeMonitors[monitorId].detector_notrigger_webhook = s.createTimeout('detector_notrigger_webhook',s.group[groupKey].activeMonitors[monitorId],currentConfig.detector_notrigger_webhook_timeout,10)
                var detector_notrigger_webhook_url = addEventDetailsToString(e,currentConfig.detector_notrigger_webhook_url)
                var webhookMethod = currentConfig.detector_notrigger_webhook_method
                if(!webhookMethod || webhookMethod === '')webhookMethod = 'GET';
                fetchTimeout(detector_notrigger_webhook_url,10000,{
                    method: webhookMethod
                }).catch((err) => {
                    s.userLog(d,{type:lang["Event Webhook Error"],msg:{error:err,data:data}})
                })
            }
            if(currentConfig.detector_notrigger_command_enable === '1' && !s.group[groupKey].activeMonitors[monitorId].detector_notrigger_command){
                s.group[groupKey].activeMonitors[monitorId].detector_notrigger_command = s.createTimeout('detector_notrigger_command',s.group[groupKey].activeMonitors[monitorId],currentConfig.detector_notrigger_command_timeout,10)
                var detector_notrigger_command = addEventDetailsToString(e,currentConfig.detector_notrigger_command)
                if(detector_notrigger_command === '')return
                exec(detector_notrigger_command,{detached: true},function(err){
                    if(err)s.debugLog(err)
                })
            }
            s.onDetectorNoTriggerTimeoutExtensions.forEach(function(extender){
                extender(e)
            })
        },detector_notrigger_timeout)
    }
    function setMotionLock(e){
        const monitorId = e.mid || e.id
        const groupKey = e.ke
        const activeMonitor = getActiveMonitor(groupKey,monitorId)
        if(e.details.detector_trigger === '1'){
            clearTimeout(activeMonitor.motion_lock)
            activeMonitor.motion_lock = setTimeout(function(){
                clearTimeout(activeMonitor.motion_lock)
                delete(activeMonitor.motion_lock)
            },15000)
        }
    }
    function asyncConnectionTest(host,port,timeout){
        return new Promise((resolve) => {
            connectionTester.test(host,port,timeout,(err,response) => {
                resolve({
                    err,
                    response,
                })
            })
        })
    }
    async function launchMonitorProcesses(e){
        const groupKey = e.ke
        const monitorId = e.mid || e.id
        const theGroup = s.group[groupKey]
        const activeMonitor = theGroup.activeMonitors[monitorId]
        const monitorConfig = theGroup.rawMonitorConfigurations[monitorId]
        const isMacOS = s.platform !== 'darwin';
        const isWatchOnly = monitorConfig.mode === 'start'
        const isRecord = monitorConfig.mode === 'record'
        const isWatchOnlyOrRecord = isWatchOnly || isRecord;
        const streamTypeIsJPEG = e.details.stream_type === 'jpeg'
        const streamTypeIsHLS = e.details.stream_type === 'hls'
        const jpegApiEnabled = e.details.snap === '1'
        const typeIsDashcam = e.type === 'dashcam' || e.type === 'socket'
        const typeIsMjpeg = e.type === 'mjpeg'
        const typeIsH264 = e.type === 'h264'
        const typeIsLocal = e.type === 'local'
        const doPingTest = e.type !== 'socket' && e.type !== 'dashcam' && e.protocol !== 'udp' && e.type !== 'local' && e.details.skip_ping !== '1';
        if(!theGroup.startMonitorInQueue){
            theGroup.startMonitorInQueue = createQueueAwaited(0.5, 1)
        }
        const startMonitorInQueue = theGroup.startMonitorInQueue
        if(!activeMonitor.isStarted)return;
        // e = monitor object
        clearTimeout(activeMonitor.resetFatalErrorCountTimer)
        activeMonitor.resetFatalErrorCountTimer = setTimeout(()=>{
            activeMonitor.errorFatalCount = 0
        },1000 * 60)
        s.sendMonitorStatus({
            id: monitorId,
            ke: groupKey,
            status: lang.Starting,
            code: 1
        });
        //create host string without username and password
        const strippedHost = stripAuthFromHost(e)
        async function doOnThisMachine(callback){
            await createCameraFolders(e)
            activeMonitor.allowStdinWrite = false
            setMotionLock(e)
            //start "no motion" checker
            if(e.details.detector === '1' && e.details.detector_notrigger === '1'){
                setNoEventsDetector(e)
            }
            if(config.childNodes.mode !== 'child' && s.platform!=='darwin' && (e.functionMode === 'record' || (e.functionMode === 'start'&&e.details.detector_record_method==='sip'))){
                if(activeMonitor.fswatch && activeMonitor.fswatch.close){
                  activeMonitor.fswatch.close()
                }
                activeMonitor.fswatch = fs.watch(e.dir, {encoding : 'utf8'}, (event, filename) => {
                    switch(event){
                        case'change':
                            resetRecordingCheck(e)
                        break;
                    }
                });
            }
            if(
                isMacOS &&
                isWatchOnlyOrRecord &&
                (streamTypeIsJPEG || streamTypeIsHLS || jpegApiEnabled)
            ){
                if(activeMonitor.fswatchStream && activeMonitor.fswatchStream.close){
                    activeMonitor.fswatchStream.close()
                }
                activeMonitor.fswatchStream = fs.watch(activeMonitor.sdir, {encoding : 'utf8'}, () => {
                    resetStreamCheck(e)
                })
            }
            if(!activeMonitor.criticalErrors['453'])s.cameraSendSnapshot({mid:monitorId,ke:groupKey,mon:e},{useIcon: true});
            //check host to see if has password and user in it
            clearTimeout(activeMonitor.recordingChecker)
            try{
                await cameraDestroy(e)
            }catch(err){
                // s.debugLog(err)
            }
            async function startVideoProcessor(err,pingResponse){
                pingResponse = pingResponse ? pingResponse : {success: true}
                return new Promise((resolve) => {
                    if(pingResponse.success === true){
                        activeMonitor.isRecording = true
                        try{
                            createCameraFfmpegProcess(e).then((mainProcess) => {
                                if(mainProcess){
                                    createEventCounter(e)
                                    createCameraStreamHandlers(e)
                                    if(typeIsDashcam){
                                        setTimeout(function(){
                                            activeMonitor.allowStdinWrite = true
                                            s.txToDashcamUsers({
                                                f : 'enable_stream',
                                                ke : groupKey,
                                                mid : monitorId
                                            },groupKey)
                                        },30000)
                                    }
                                    if(
                                        isRecord ||
                                        typeIsMjpeg ||
                                        typeIsH264 ||
                                        typeIsLocal
                                    ){
                                        catchNewSegmentNames(e)
                                        cameraFilterFfmpegLog(e)
                                    }
                                    if(isRecord){
                                        s.sendMonitorStatus({
                                            id: monitorId,
                                            ke: groupKey,
                                            status: lang.Recording,
                                            code: 3
                                        });
                                    }else{
                                        s.sendMonitorStatus({
                                            id: monitorId,
                                            ke: groupKey,
                                            status: lang.Watching,
                                            code: 2
                                        });
                                    }
                                }
                                s.onMonitorStartExtensions.forEach(function(extender){
                                    extender(Object.assign(theGroup.rawMonitorConfigurations[monitorId],{}),e)
                                })
                                resolve()
                            })
                        }catch(err){
                            console.log('Failed to Load',monitorId,groupKey)
                            console.log(err)
                            resolve()
                        }
                      }else{
                          s.onMonitorPingFailedExtensions.forEach(function(extender){
                              extender(Object.assign(theGroup.rawMonitorConfigurations[monitorId],{}),e)
                          })
                          s.userLog(e,{type:lang["Ping Failed"],msg:lang.skipPingText1});
                          fatalError(e,"Ping Failed").then(() => {
                              resolve();
                          });
                      }
                })
            }
            if(doPingTest){
                try{
                    const testResult = await asyncConnectionTest(strippedHost,e.port,2000)
                    await startVideoProcessor(testResult.err,testResult.response)
                }catch(err){
                    await startVideoProcessor()
                }
            }else{
                await startVideoProcessor()
            }
            if(callback)callback()
        }
        async function doOnChildMachine(){
            function startVideoProcessor(){
                s.cx({
                    f : 'cameraStart',
                    mode : e.functionMode,
                    d : theGroup.rawMonitorConfigurations[monitorId]
                },activeMonitor.childNodeId)
                clearTimeout(activeMonitor.recordingChecker);
                clearTimeout(activeMonitor.streamChecker);
            }
            if(doPingTest){
                const testResult = await asyncConnectionTest(strippedHost,e.port,2000)
                startVideoProcessor(testResult.err,testResult.response)
            }else{
                startVideoProcessor()
            }
        }
        try{
            if(config.childNodes.enabled === true && config.childNodes.mode === 'master'){
                const selectedNode = await selectNodeForOperation({
                    ke: groupKey,
                    mid: monitorId,
                });
                if(selectedNode){
                    bindMonitorToChildNode({
                        ke: groupKey,
                        mid: monitorId,
                        childNodeId: selectedNode,
                    })
                    await doOnChildMachine()
                }else{
                    startMonitorInQueue.push(doOnThisMachine,function(){})
                }
            }else{
                startMonitorInQueue.push(doOnThisMachine,function(){})
            }
        }catch(err){
            startMonitorInQueue.push(doOnThisMachine,function(){})
            console.log(err)
        }
    }
    async function fatalError(e,errorMessage){
        const groupKey = e.ke
        const monitorId = e.mid || e.id
        const activeMonitor = getActiveMonitor(groupKey,monitorId)
        const monitorConfig = copyMonitorConfiguration(groupKey,monitorId)
        const monitorDetails = monitorConfig.details
        const maxCount = !monitorDetails.fatal_max || isNaN(monitorDetails.fatal_max) ? 0 : parseFloat(monitorDetails.fatal_max);
        clearTimeout(activeMonitor.fatalErrorTimeout);
        ++activeMonitor.errorFatalCount;
        if(activeMonitor.isStarted === true){
            activeMonitor.fatalErrorTimeout = setTimeout(function(){
                if(maxCount !== 0 && activeMonitor.errorFatalCount > maxCount){
                    s.userLog(e,{type:lang["Fatal Error"],msg:lang.onFatalErrorExit});
                    s.camera('stop',{mid:monitorId,ke:groupKey})
                }else{
                    launchMonitorProcesses(monitorConfig)
                };
            },5000);
        }else{
            await cameraDestroy(e)
        }
        s.sendMonitorStatus({
            id: monitorId,
            ke: groupKey,
            status: lang.Died,
            code: 7
        });
        s.onMonitorDiedExtensions.forEach(function(extender){
            extender(monitorConfig,e)
        })
    }
    async function monitorStart(e){
        const groupKey = e.ke
        const monitorId = e.mid || e.id
        const monitorConfig = getMonitorConfiguration(groupKey,monitorId);
        monitorConfigurationMigrator(e)
        s.initiateMonitorObject({ke:groupKey,mid:monitorId})
        const activeMonitor = getActiveMonitor(groupKey,monitorId)
        if(!monitorConfig){
            s.group[groupKey].rawMonitorConfigurations[monitorId] = s.cleanMonitorObject(e)
        }
        if(activeMonitor.isStarted === true){
            s.debugLog('Monitor Already Started!')
            return
        }
        if(activeMonitor.masterSaysToStop === true){
            s.sendMonitorStatus({
                id: monitorId,
                ke: groupKey,
                status: lang.Stopped,
                code: 5,
            })
            return;
        }
        if(config.probeMonitorOnStart === true){
            const {
                configPartial,
                warnings,
                probeResponse,
                probeStreams,
            } = await getWarningChangesForMonitor(monitorConfig)
            if(warnings.length > 0){
                applyPartialToConfiguration(e,configPartial)
                applyPartialToConfiguration(activeMonitor,configPartial)
                applyPartialToConfiguration(s.group[groupKey].rawMonitorConfigurations[monitorId],configPartial)
            }
            activeMonitor.warnings = warnings
        }
        activeMonitor.isStarted = true
        if(e.details && e.details.dir && e.details.dir !== ''){
            activeMonitor.addStorageId = e.details.dir
        }else{
            activeMonitor.addStorageId = null
        }
        //set recording status
        if(e.functionMode === 'record'){
            activeMonitor.isRecording = true
        }else{
            activeMonitor.isRecording = false
        }
        //set up fatal error handler
        activeMonitor.errorFatalCount = 0;
        delete(activeMonitor.childNode)
        if(e.details.detector_ptz_follow === '1'){
            // setHomePositionPreset(e)
            moveToHomePosition(e)
        }
        try{
            await launchMonitorProcesses(e)
            resetStreamCheck(e)
        }catch(err){
            console.error(err)
        }
    }
    function checkObjectsInMonitorDetails(e){
        const groupKey = e.ke
        const monitorId = e.mid || e.id
        const activeMonitor = getActiveMonitor(groupKey,monitorId);
        //parse Objects
        (['detector_cascades','cords','detector_filters','input_map_choices']).forEach(function(v){
            if(e.details && e.details[v]){
                try{
                    if(!e.details[v] || e.details[v] === '')e.details[v] = '{}'
                    e.details[v] = s.parseJSON(e.details[v])
                    if(!e.details[v])e.details[v] = {}
                    activeMonitor.details = e.details
                    switch(v){
                        case'cords':
                            const fromWidth = parseInt(e.details.detector_scale_x) || 640
                            const fromHeight = parseInt(e.details.detector_scale_y) || 480
                            const toWidth = parseInt(e.details.detector_scale_x_object) || 1280
                            const toHeight = parseInt(e.details.detector_scale_y_object) || 720
                            const theCords = Object.values(s.parseJSON(e.details[v])) || [];
                            activeMonitor.parsedObjects.cordsForObjectDetection = convertRegionPointsToNewDimensions(theCords,{
                                fromWidth,
                                fromHeight,
                                toWidth,
                                toHeight,
                            });
                            activeMonitor.parsedObjects.cords = theCords
                        break;
                        default:
                            activeMonitor.parsedObjects[v] = s.parseJSON(e.details[v])
                        break;
                    }
                }catch(err){

                }
            }
        });
        //parse Arrays
        (['stream_channels','input_maps']).forEach(function(v){
            if(e.details&&e.details[v]&&(e.details[v] instanceof Array)===false){
                try{
                    e.details[v]=JSON.parse(e.details[v]);
                    if(!e.details[v])e.details[v]=[];
                }catch(err){
                    e.details[v]=[];
                }
            }
        });
    }
    function isGroupBelowMaxMonitorCount(groupKey){
        const theGroup = s.group[groupKey];
        try{
            const initData = theGroup.init;
            const maxCamerasAllowed = parseInt(initData.max_camera) || false;
            return (!maxCamerasAllowed || Object.keys(theGroup.activeMonitors).length <= parseInt(maxCamerasAllowed))
        }catch(err){
            return true
        }
    }
    function getStreamDirectory(options){
        const streamDir = s.dir.streams + options.ke + '/' + options.mid + '/'
        return streamDir
    }
    function removeSenstiveInfoFromMonitorConfig(monitorConfig){
        monitorConfig.protocol = ''
        monitorConfig.host = ''
        monitorConfig.path = ''
        monitorConfig.port = ''
        monitorConfig.details.muser = ''
        monitorConfig.details.mpass = ''
        monitorConfig.details.auto_host = ''
        monitorConfig.details.rtmp_key = ''
        monitorConfig.details.notes = ''
        monitorConfig.details.tv_channel_id = ''
        monitorConfig.details.tv_channel_group_title = ''
        monitorConfig.details.control_base_url = ''
        monitorConfig.details.cust_input = ''
        monitorConfig.details.cust_stream = ''
        monitorConfig.details.cust_snap = ''
        monitorConfig.details.cust_snap_raw = ''
        monitorConfig.details.cust_record = ''
        monitorConfig.details.cust_record = ''
        monitorConfig.details.cust_detect = ''
        monitorConfig.details.cust_detect_object = ''
        monitorConfig.details.cust_sip_record = ''
        monitorConfig.details.custom_output = ''
        monitorConfig.details.detector_cascades = ''
        monitorConfig.details.stream_channels = ''
        monitorConfig.details.input_maps = ''
        delete(monitorConfig.details.input_map_choices)
        delete(monitorConfig.details.substream)
        return monitorConfig
    }
    return {
        monitorStop,
        monitorIdle,
        monitorStart,
        monitorRestart,
        monitorAddViewer,
        monitorRemoveViewer,
        getUrlProtocol,
        modifyUrlProtocol,
        getUrlParts,
        deleteMonitor,
        deleteMonitorData,
        checkObjectsInMonitorDetails,
        getActiveMonitor,
        getStreamDirectory,
        copyMonitorConfiguration,
        getMonitorConfiguration,
        isGroupBelowMaxMonitorCount,
        setNoEventsDetector,
        cameraDestroy: cameraDestroy,
        createSnapshot: createSnapshot,
        processKill: processKill,
        addCredentialsToStreamLink: addCredentialsToStreamLink,
        monitorConfigurationMigrator: monitorConfigurationMigrator,
        spawnSubstreamProcess: spawnSubstreamProcess,
        destroySubstreamProcess: destroySubstreamProcess,
        attachStreamChannelHandlers: attachStreamChannelHandlers,
        setActiveViewer: setActiveViewer,
        getActiveViewerCount: getActiveViewerCount,
        setTimedActiveViewerForHttp: setTimedActiveViewerForHttp,
        attachMainProcessHandlers: attachMainProcessHandlers,
        removeSenstiveInfoFromMonitorConfig,
        sendSubstreamEvent,
        sendSubstreamEventActiveMonitor
    }
}
