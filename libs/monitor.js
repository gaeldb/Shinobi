const fs = require('fs');
const spawn = require('child_process').spawn;
const exec = require('child_process').exec;
const events = require('events');
const URL = require('url')
const {
  Worker
} = require('worker_threads');
const { queryStringToObject, createQueryStringFromObject } = require('./common.js')
module.exports = function(s,config,lang){
    const {
        asyncSetTimeout,
    } = require('./basic/utils.js')(process.cwd(),config)
    const {
        splitForFFMPEG,
        applyPartialToConfiguration,
        getWarningChangesForMonitor,
    } = require('./ffmpeg/utils.js')(s,config,lang)
    const {
        processKill,
        monitorStop,
        monitorIdle,
        monitorStart,
        monitorRestart,
        monitorAddViewer,
        monitorRemoveViewer,
        getMonitorConfiguration,
        copyMonitorConfiguration,
        checkObjectsInMonitorDetails,
        spawnSubstreamProcess,
    } = require('./monitor/utils.js')(s,config,lang)
    const {
        canAddMoreMonitors,
        sanitizeMonitorConfig,
        isGroupBelowMaxMonitorCount,
    } = require('./checker/utils.js')(s,config,lang)
    s.initiateMonitorObject = function(e){
        if(!s.group[e.ke]){s.group[e.ke]={}};
        if(!s.group[e.ke].activeMonitors){s.group[e.ke].activeMonitors={}}
        if(!s.group[e.ke].activeMonitors[e.mid]){s.group[e.ke].activeMonitors[e.mid]={}}
        const activeMonitor = s.group[e.ke].activeMonitors[e.mid]
        activeMonitor.ke = e.ke
        activeMonitor.mid = e.mid
        if(!activeMonitor.streamIn){activeMonitor.streamIn={}};
        if(!activeMonitor.emitterChannel){activeMonitor.emitterChannel={}};
        if(!activeMonitor.mp4frag){activeMonitor.mp4frag={}};
        if(!activeMonitor.firstStreamChunk){activeMonitor.firstStreamChunk={}};
        if(!activeMonitor.contentWriter){activeMonitor.contentWriter={}};
        if(!activeMonitor.childNodeStreamWriters){activeMonitor.childNodeStreamWriters={}};
        if(!activeMonitor.eventBasedRecording){activeMonitor.eventBasedRecording={}};
        if(!activeMonitor.watch){activeMonitor.watch = []};
        if(!activeMonitor.fixingVideos){activeMonitor.fixingVideos={}};
        // if(!activeMonitor.viewerConnection){activeMonitor.viewerConnection={}};
        // if(!activeMonitor.viewerConnectionCount){activeMonitor.viewerConnectionCount=0};
        if(!activeMonitor.parsedObjects){activeMonitor.parsedObjects={}};
        if(!activeMonitor.detector_motion_count){activeMonitor.detector_motion_count=[]};
        if(!activeMonitor.eventsCounted){activeMonitor.eventsCounted = {}};
        if(!activeMonitor.isStarted){activeMonitor.isStarted = false};
        if(!activeMonitor.pipe4BufferPieces){activeMonitor.pipe4BufferPieces = []};
        if(!activeMonitor.secondaryDetectorOutput){activeMonitor.secondaryDetectorOutput = new events.EventEmitter()};
        if(activeMonitor.delete){clearTimeout(activeMonitor.delete)}
        if(!s.group[e.ke].rawMonitorConfigurations){s.group[e.ke].rawMonitorConfigurations={}}
        if(!activeMonitor.criticalErrors)activeMonitor.criticalErrors = {
            "404": false,
            "453": false,
            "500": false,
        }
        s.onMonitorInitExtensions.forEach(function(extender){
            extender(e)
        })
    }
    s.sendMonitorStatus = function(e){
        if(!e.status || !e.code)console.error(JSON.stringify(e),new Error());
        const groupKey = e.ke
        const monitorId = e.mid || e.id
        const activeMonitor = s.group[groupKey].activeMonitors[monitorId]
        activeMonitor.monitorStatus = `${e.status}`
        activeMonitor.monitorStatusCode = `${e.code}`
        s.tx(Object.assign(e,{f:'monitor_status'}),'GRP_'+e.ke)
    }
    s.getMonitorCpuUsage = function(e,callback){
        if(s.group[e.ke].activeMonitors[e.mid] && s.group[e.ke].activeMonitors[e.mid].spawn){
            const getUsage = function(callback2){
                fs.promises.readFile("/proc/" + s.group[e.ke].activeMonitors[e.mid].spawn.pid + "/stat").then((data) => {
                    const elems = data.toString().split(' ');
                    const utime = parseInt(elems[13]);
                    const stime = parseInt(elems[14]);
                    callback2(utime + stime);
                }).catch((err) => {
                    s.debugLog(err)
                    clearInterval(0)
                })
            }
            getUsage(function(startTime){
                setTimeout(function(){
                    getUsage(function(endTime){
                        const delta = endTime - startTime;
                        const percentage = 100 * (delta / 10000);
                        callback(percentage)
                    })
                }, 1000)
            })
        }else{
            callback(0)
        }
    }
    s.buildMonitorUrl = function(e,noPath){
        var authd = ''
        var url
        if(e.details.muser&&e.details.muser!==''&&e.host.indexOf('@')===-1) {
            e.username = e.details.muser
            e.password = e.details.mpass
            authd = e.details.muser+':'+e.details.mpass+'@'
        }
        if(e.port==80&&e.details.port_force!=='1'){e.porty=''}else{e.porty=':'+e.port}
        url = e.protocol+'://'+authd+e.host+e.porty
        if(noPath !== true)url += e.path
        return url
    }
    s.cleanMonitorObjectForDatabase = function(dirtyMonitor){
        var cleanMonitor = {}
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
        ];
        Object.keys(dirtyMonitor).forEach(function(key){
            if(acceptedFields.indexOf(key) > -1){
                cleanMonitor[key] = dirtyMonitor[key]
            }
        })
        return cleanMonitor
    }
    s.cleanMonitorObject = function(e){
        var x = {keys:Object.keys(e),ar:{}};
        x.keys.forEach(function(v){
            if(v!=='last_frame'&&v!=='record'&&v!=='spawn'&&v!=='running'&&(v!=='time'&&typeof e[v]!=='function')){x.ar[v]=e[v];}
        });
        return x.ar;
    }
    s.getStreamsDirectory = (monitor) => {
        return s.dir.streams + monitor.ke + '/' + (monitor.mid || monitor.id) + '/'
    }
    s.getRawSnapshotFromMonitor = function(monitor,options){
        return new Promise((resolve,reject) => {
            options = options instanceof Object ? options : {flags: ''}
            s.checkDetails(monitor)
            let isDetectorStream = false
            var inputOptions = []
            var outputOptions = []
            var streamDir = s.dir.streams + monitor.ke + '/' + monitor.mid + '/'
            var url = options.url
            var secondsInward = options.secondsInward || '5'
            if(secondsInward.length === 1 && !isNaN(secondsInward))secondsInward = '0' + secondsInward;
            var dynamicTimeout = (secondsInward * 1000) + 5000;
            if(options.flags)outputOptions.push(options.flags)
            const checkExists = function(streamDir,callback){
                s.fileStats(streamDir,function(err){
                    var response = false
                    if(err){
                        // s.debugLog(err)
                    }else{
                        response = true
                    }
                    callback(response)
                })
            }
            const noIconChecks = function(){
                const runExtraction = async function(){
                    var sendTempImage = function(){
                      fs.readFile(temporaryImageFile,function(err,buffer){
                         if(!err){
                             resolve({
                                 screenShot: buffer,
                                 isStaticFile: false
                             })
                             fs.rm(temporaryImageFile,function(){})
                         }else{
                             resolve({
                                 screenShot: null,
                                 isStaticFile: false
                             })
                         }
                      })
                    }
                    try{
                        var temporaryImageFile = streamDir + s.gid(5) + '.jpg'
                        var iconImageFile = streamDir + 'icon.jpg'
                        const snapRawFilters = monitor.details.cust_snap_raw
                        if(snapRawFilters)outputOptions.push(snapRawFilters);
                        var ffmpegCmd = splitForFFMPEG(`-y -loglevel warning ${isDetectorStream ? '-live_start_index 2' : ''} -re ${inputOptions.join(' ')} -i "${url}" ${outputOptions.join(' ')} -f mjpeg -an -frames:v 1 "${temporaryImageFile}"`)
                        try{
                            await fs.promises.mkdir(streamDir, {recursive: true}, (err) => {s.debugLog(err)})
                        }catch(err){
                            console.error(err)
                        }
                        const snapProcess = new Worker(__dirname + '/cameraThread/snapshot.js', {
                            workerData: {
                                jsonData: {
                                  cmd: ffmpegCmd,
                                  temporaryImageFile: temporaryImageFile,
                                  iconImageFile: iconImageFile,
                                  useIcon: options.useIcon,
                                  rawMonitorConfig: s.group[monitor.ke].rawMonitorConfigurations[monitor.mid],
                              },
                              ffmpegAbsolutePath: config.ffmpegDir,
                            }
                        });
                        snapProcess.on('message', function(data){
                            s.debugLog(data)
                        })
                        snapProcess.on('error', (data) => {
                            console.log(data)
                            processKill(snapProcess)
                        })
                        snapProcess.on('exit', (code) => {
                            clearTimeout(snapProcessTimeout)
                            sendTempImage()
                        })
                        var snapProcessTimeout = setTimeout(function(){
                            processKill(snapProcess)
                        },dynamicTimeout)
                    }catch(err){
                        console.log(err)
                    }
                }
                if(url){
                    runExtraction()
                }else{
                    checkExists(streamDir + 's.jpg',function(success){
                        if(success === false){
                            checkExists(streamDir + 'detectorStream.m3u8',function(success){
                                if(success === false){
                                    checkExists(streamDir + 's.m3u8',function(success){
                                        if(success === false){
                                            switch(monitor.type){
                                                case'h264':
                                                    switch(monitor.protocol){
                                                        case'rtsp':
                                                            if(
                                                                monitor.details.rtsp_transport
                                                                && monitor.details.rtsp_transport !== ''
                                                                && monitor.details.rtsp_transport !== 'no'
                                                            ){
                                                                inputOptions.push('-rtsp_transport ' + monitor.details.rtsp_transport)
                                                            }
                                                        break;
                                                    }
                                                break;
                                            }
                                            url = s.buildMonitorUrl(monitor)
                                        }else{
                                            outputOptions.push(`-ss 00:00:${secondsInward}`)
                                            url = streamDir + 's.m3u8'
                                        }
                                        runExtraction()
                                    })
                                }else{
                                    isDetectorStream = true
                                    outputOptions.push(`-ss 00:00:${secondsInward}`)
                                    url = streamDir + 'detectorStream.m3u8'
                                    runExtraction()
                                }
                            })
                        }else{
                            fs.promises.readFile(streamDir + 's.jpg').then(function(snapBuffer){
                                resolve({
                                    screenShot: snapBuffer,
                                    isStaticFile: true
                                })
                            }).catch(() => {
                                sendTempImage()
                            })
                        }
                    })
                }
            }
            if(options.useIcon === true){
                checkExists(streamDir + 'icon.jpg',function(success){
                    if(success === false){
                        noIconChecks()
                    }else{
                        var snapBuffer = fs.readFileSync(streamDir + 'icon.jpg')
                        resolve({
                            screenShot: snapBuffer,
                            isStaticFile: false
                        })
                    }
                })
            }else{
                noIconChecks()
            }
        })
    }
    s.mergeDetectorBufferChunks = function(monitor,callback){
        return new Promise((resolve,reject) => {
            var pathDir = s.dir.streams+monitor.ke+'/'+monitor.id+'/'
            var mergedFile = s.formattedTime()+'.mp4'
            var mergedFilepath = pathDir+mergedFile
            fs.readdir(pathDir,function(err,streamDirItems){
                var items = []
                var copiedItems = []
                var videoLength = s.group[monitor.ke].rawMonitorConfigurations[monitor.id].details.detector_send_video_length
                if(!videoLength || videoLength === '')videoLength = '10'
                if(videoLength.length === 1)videoLength = '0' + videoLength
                var createMerged = function(copiedItems){
                    var allts = pathDir+items.join('_')
                    s.fileStats(allts,function(err,stats){
                        if(err){
                            //not exist
                            var cat = 'cat '+copiedItems.join(' ')+' > '+allts
                            exec(cat,function(){
                                var merger = spawn(config.ffmpegDir,splitForFFMPEG(('-re -i '+allts+' -acodec copy -vcodec copy -t 00:00:' + videoLength + ' '+pathDir+mergedFile)))
                                merger.stderr.on('data',function(data){
                                    s.userLog(monitor,{type:"Buffer Merge",msg:data.toString()})
                                })
                                merger.on('close',function(){
                                    s.file('delete',allts)
                                    copiedItems.forEach(function(copiedItem){
                                        s.file('delete',copiedItem)
                                    })
                                    setTimeout(function(){
                                        s.file('delete',mergedFilepath)
                                    },1000 * 60 * 3)
                                    delete(merger)
                                    if(callback)callback(mergedFilepath,mergedFile)
                                    resolve({
                                        filePath: mergedFilepath,
                                        filename: mergedFile,
                                    })
                                })
                            })
                        }else{
                            //file exist
                            if(callback)callback(mergedFilepath,mergedFile)
                            resolve({
                                filePath: mergedFilepath,
                                filename: mergedFile,
                            })
                        }
                    })
                }
                streamDirItems.forEach(function(filename){
                    if(filename.indexOf('detectorStream') > -1 && filename.indexOf('.m3u8') === -1){
                        items.push(filename)
                    }
                })
                items.sort()
                // items = items.slice(items.length - 5,items.length)
                items.forEach(function(filename){
                    try{
                        var tempFilename = filename.split('.')
                        tempFilename[0] = tempFilename[0] + 'm'
                        tempFilename = tempFilename.join('.')
                        var tempWriteStream = fs.createWriteStream(pathDir+tempFilename)
                        tempWriteStream.on('finish', function(){
                            copiedItems.push(pathDir+tempFilename)
                            if(copiedItems.length === items.length){
                                createMerged(copiedItems.sort())
                            }
                        })
                        fs.createReadStream(pathDir+filename).pipe(tempWriteStream)
                    }catch(err){

                    }
                })
            })
        })
    }
    s.mergeRecordedVideos = function(videoRows,groupKey,callback){
        var tempDir = s.dir.streams + groupKey + '/'
        var pathDir = s.dir.fileBin + groupKey + '/'
        var streamDirItems = fs.readdirSync(pathDir)
        var items = []
        var mergedFile = []
        videoRows.forEach(function(video){
            var filepath = s.getVideoDirectory(video) + s.formattedTime(video.time) + '.' + video.ext
            if(
                filepath.indexOf('.mp4') > -1
                // || filename.indexOf('.webm') > -1
            ){
                mergedFile.push(s.formattedTime(video.time))
                items.push(filepath)
            }
        })
        mergedFile.sort()
        mergedFile = mergedFile.join('_') + '.mp4'
        var mergedFilepath = pathDir + mergedFile
        var mergedRawFilepath = pathDir + 'raw_' + mergedFile
        items.sort()
        s.fileStats(mergedFilepath,function(err,stats){
            if(err){
                //not exist
                var tempScriptPath = tempDir + s.gid(5) + '.sh'
                var cat = 'cat '+items.join(' ')+' > '+mergedRawFilepath
                fs.writeFileSync(tempScriptPath,cat,'utf8')
                exec('sh ' + tempScriptPath,function(){
                    s.userLog({
                        ke: groupKey,
                        mid: '$USER'
                    },{type:lang['Videos Merge'],msg:mergedFile})
                    var merger = spawn(config.ffmpegDir,splitForFFMPEG(('-re -loglevel warning -i ' + mergedRawFilepath + ' -acodec copy -vcodec copy ' + mergedFilepath)))
                    merger.stderr.on('data',function(data){
                        s.userLog({
                            ke: groupKey,
                            mid: '$USER'
                        },{type:lang['Videos Merge'],msg:data.toString()})
                    })
                    merger.on('close',function(){
                        s.file('delete',mergedRawFilepath)
                        s.file('delete',tempScriptPath)
                        setTimeout(function(){
                            s.fileStats(mergedFilepath,function(err,stats){
                                if(!err)s.file('delete',mergedFilepath)
                            })
                        },1000 * 60 * 60 * 24)
                        delete(merger)
                        callback(mergedFilepath,mergedFile)
                    })
                })
            }else{
                //file exist
                callback(mergedFilepath,mergedFile)
            }
        })
        return items
    }
    s.cameraControlOptionsFromUrl = function(e,monitorConfig){
        URLobject = URL.parse(e)
        if(monitorConfig.details.control_url_method === 'ONVIF' && monitorConfig.details.control_base_url === ''){
            if(monitorConfig.details.onvif_port === ''){
                monitorConfig.details.onvif_port = 8000
            }
            URLobject.port = monitorConfig.details.onvif_port
        }else if(!URLobject.port){
            URLobject.port = 80
        }
        const options = {
            host: URLobject.hostname,
            port: URLobject.port,
            method: monitorConfig.details.control_url_method
        }
        const queryStringObjects = queryStringToObject(URLobject.query || "")
        if (queryStringObjects && queryStringObjects.postData) {
            options.postData = decodeURIComponent(queryStringObjects.postData)
            options.path = URLobject.pathname + '?' + decodeURIComponent(createQueryStringFromObject(Object.assign(queryStringObjects,{postData: null})))
        } else if(URLobject.query){
            options.path = URLobject.pathname + '?' + URLobject.query
        } else {
            options.path = URLobject.pathname
        }
        if(URLobject.username&&URLobject.password){
            options.username = URLobject.username
            options.password = URLobject.password
            options.auth=URLobject.username+':'+URLobject.password
        }else if(URLobject.auth){
            var auth = URLobject.auth.split(':')
            options.auth=URLobject.auth
            options.username = auth[0]
            options.password = auth[1]
        }
        return options
    }
    s.cameraSendSnapshot = async (e,options) => {
        options = Object.assign({
            flags: '-s 500x500'
        },options || {})
        s.checkDetails(e)
        if(e.ke && config.doSnapshot === true){
            if(s.group[e.ke] && s.group[e.ke].rawMonitorConfigurations && s.group[e.ke].rawMonitorConfigurations[e.mid] && s.group[e.ke].rawMonitorConfigurations[e.mid].mode !== 'stop'){
                async function getRaw(){
                    var pathDir = s.dir.streams+e.ke+'/'+e.mid+'/'
                    const {screenShot, isStaticFile} = await s.getRawSnapshotFromMonitor(s.group[e.ke].rawMonitorConfigurations[e.mid],options)
                    if(screenShot){
                        s.tx({
                            f: 'monitor_snapshot',
                            snapshot: screenShot.toString('base64'),
                            snapshot_format: 'b64',
                            mid: e.mid,
                            ke: e.ke
                        },'GRP_'+e.ke)
                    }else{
                        s.debugLog('Damaged Snapshot Data')
                        s.tx({f:'monitor_snapshot',snapshot:e.mon.name,snapshot_format:'plc',mid:e.mid,ke:e.ke},'GRP_'+e.ke)
                    }
                }
                const onvifDevice = s.group[e.ke].activeMonitors[e.mid].onvifConnection || (await s.createOnvifDevice({ id: e.mid, ke: e.ke })).device;
                if(onvifDevice){
                    try{
                        const screenShot = await s.getSnapshotFromOnvif({
                            ke: e.ke,
                            mid: e.mid,
                        });
                        s.tx({
                            f: 'monitor_snapshot',
                            snapshot: screenShot.toString('base64'),
                            snapshot_format: 'b64',
                            mid: e.mid,
                            ke: e.ke
                        },'GRP_'+e.ke)
                    }catch(err){
                        s.debugLog(err)
                        await getRaw()
                    }
                }else{
                    await getRaw()
                }
            }else{
                s.tx({f:'monitor_snapshot',snapshot:'Disabled',snapshot_format:'plc',mid:e.mid,ke:e.ke},'GRP_'+e.ke)
            }
        }else{
            s.tx({f:'monitor_snapshot',snapshot:e.mon.name,snapshot_format:'plc',mid:e.mid,ke:e.ke},'GRP_'+e.ke)
        }
    }
    s.getCameraSnapshot = async (e,options) => {
        const getDefaultImage = async () => {
            return await fs.promises.readFile(config.defaultMjpeg)
        }
        options = Object.assign({
            flags: '-s 500x500'
        },options || {})
        if(e.ke && config.doSnapshot === true){
            if(s.group[e.ke] && s.group[e.ke].rawMonitorConfigurations && s.group[e.ke].rawMonitorConfigurations[e.mid] && s.group[e.ke].rawMonitorConfigurations[e.mid].mode !== 'stop'){
                var pathDir = s.dir.streams+e.ke+'/'+e.mid+'/'
                const {screenShot, isStaticFile} = await s.getRawSnapshotFromMonitor(s.group[e.ke].rawMonitorConfigurations[e.mid],options)
                if(screenShot){
                    return screenShot
                }else{
                    return await getDefaultImage()
               }
            }else{
                return await getDefaultImage()
            }
        }else{
            return await getDefaultImage()
        }
    }
    s.addOrEditMonitor = async function(form,callback,user){
        var endData = {
            ok: false
        }
        if(!form.mid || !s.timeReady){
            endData.msg = !s.timeReady ? lang.notReadyYet : lang['No Monitor ID Present in Form']
            if(callback)callback(endData);
            return
        }
        form.mid = form.mid.replace(/[^\w\s]/gi,'').replace(/ /g,'')
        const selectResponse = await s.knexQueryPromise({
            action: "select",
            columns: "*",
            table: "Monitors",
            where: [
                ['ke','=',form.ke],
                ['mid','=',form.mid],
            ]
        });
        const monitorExists = selectResponse.rows && selectResponse.rows[0];
        const systemMax = canAddMoreMonitors();
        const groupMax = isGroupBelowMaxMonitorCount(form.ke);
        const canDoTheDo = systemMax && groupMax;
        var affectMonitor = false
        var monitorQuery = {}
        var txData = {
            f: 'monitor_edit',
            mid: form.mid,
            ke: form.ke,
            mon: form
        }
        // auto correct
        const {
            configPartial,
            warnings,
            probeResponse,
            probeStreams,
        } = await getWarningChangesForMonitor(form)
        applyPartialToConfiguration(form,configPartial)
        form = s.cleanMonitorObjectForDatabase(form)
        //
        if(monitorExists){
            txData.new = false
            Object.keys(form).forEach(function(v){
                if(
                    form[v] !== undefined &&
                    form[v] !== `undefined` &&
                    form[v] !== null &&
                    form[v] !== `null` &&
                    form[v] !== false &&
                    form[v] !== `false`
                ){
                    if(form[v] instanceof Object){
                        form[v] = s.s(form[v])
                    }
                    monitorQuery[v] = form[v]
                }
            })
            s.userLog(form,{type:'Monitor Updated',msg:'by user : '+user.uid})
            endData.msg = user.lang['Monitor Updated by user']+' : '+user.uid
            s.knexQuery({
                action: "update",
                table: "Monitors",
                update: monitorQuery,
                where: [
                    ['ke','=',form.ke],
                    ['mid','=',form.mid],
                ]
            })
            affectMonitor = true
        }else if(canDoTheDo){
            txData.new = true
            Object.keys(form).forEach(function(v){
                if(form[v] && form[v] !== ''){
                    if(form[v] instanceof Object){
                        form[v] = s.s(form[v])
                    }
                    monitorQuery[v] = form[v]
                }
            })
            s.userLog(form,{type:'Monitor Added',msg:'by user : '+user.uid})
            endData.msg = user.lang['Monitor Added by user']+' : '+user.uid
            s.knexQuery({
                action: "insert",
                table: "Monitors",
                insert: monitorQuery
            })
            affectMonitor = true
        }else{
            txData.f = 'monitor_edit_failed'
            txData.ff = 'max_reached'
            endData.msg = !systemMax ? user.lang.monitorEditFailedMaxReachedUnactivated : user.lang.monitorEditFailedMaxReached
        }
        if(affectMonitor === true){
            form.details = JSON.parse(form.details)
            endData.ok = true
            s.initiateMonitorObject({mid:form.mid,ke:form.ke})
            s.group[form.ke].rawMonitorConfigurations[form.mid] = s.cleanMonitorObject(form)
            if(form.mode === 'stop'){
                await s.camera('stop',form)
            }else{
                let monitorConfig = copyMonitorConfiguration(form.ke,form.mid)
                await s.camera('stop',monitorConfig);
                await asyncSetTimeout(2500)
                await s.camera(form.mode,monitorConfig);
            }
            s.tx(txData,'STR_'+form.ke)
        }
        s.tx(txData,'GRP_'+form.ke)
        if(callback)callback(!endData.ok,endData);
        if(monitorExists || canDoTheDo){
            let monitorConfig = copyMonitorConfiguration(form.ke,form.mid)
            s.onMonitorSaveExtensions.forEach(function(extender){
                extender(monitorConfig,form,endData)
            })
        }
        return endData
    }
    s.getStreamWaitTimeout = function (groupId, monitorId) {
        const monitorConfig = s.group[groupId].rawMonitorConfigurations[monitorId];
        var streamType = monitorConfig.details.stream_type;
        var hls_time;
        if (streamType === 'useSubstream') {
            streamType = monitorConfig.details.substream.output.stream_type;
            hls_time = monitorConfig.details.substream.output.hls_time;
        } else {
            hls_time = monitorConfig.details.hls_time;
        }
        return streamType == 'hls' && hls_time != ''
            ? (parseInt(hls_time) * 1000) + 10000
            : 10000;
    }
    s.toggleSubstreamAndWaitForOutput = async function (groupId, monitorId) {
        const monitorConfig = s.group[groupId].rawMonitorConfigurations[monitorId];
        const streamType = monitorConfig.details.stream_type;
        if (streamType === 'useSubstream') {
            const activeMonitor = s.group[groupId].activeMonitors[monitorId];
            if (!activeMonitor.subStreamProcess) {
                spawnSubstreamProcess(monitorConfig);
            }
            if (!activeMonitor.subStreamOutputReady) {
                const checkTime = 250;
                var monitorTimeout = s.getStreamWaitTimeout(groupId, monitorId);
                return await new Promise((resolve, reject) => {
                    let totalTime = 0;
                    const timer = setInterval(function () {
                        totalTime += checkTime;
                        if (activeMonitor.subStreamOutputReady || totalTime >= monitorTimeout) {
                            clearInterval(timer);
                            resolve(activeMonitor.subStreamOutputReady);
                        }
                    }, checkTime);
                });
            }
        }
        return false;
    }
    s.camera = async (selectedMode,e,cn) => {
        // e = monitor object
        // cn = socket connection or callback or options (depends on function chosen)
        if(cn && cn.ke && !e.ke){e.ke = cn.ke}
        const groupKey = e.ke
        const monitorId = e.mid || e.id
        e.functionMode = selectedMode
        if(!e.mode){e.mode = selectedMode}
        s.checkDetails(e)
        s.initiateMonitorObject({ke:e.ke,mid:monitorId})
        checkObjectsInMonitorDetails(e)
        switch(e.functionMode){
            case'watch_on':
                monitorAddViewer(e,cn)
            break;
            case'watch_off':
                monitorRemoveViewer(e,cn)
            break;
            case'restart':
                await monitorRestart(e)
            break;
            case'idle':case'stop':
                await monitorStop(e)
                if(e.functionMode === 'idle'){
                    monitorIdle(e)
                }
            break;
            case'start':case'record':
                await monitorStart(e)
                s.tx({
                    f: 'monitor_watch_on',
                    id: monitorId,
                    ke: groupKey,
                    subStreamChannel: s.group[groupKey].activeMonitors[monitorId].subStreamChannel,
                    warnings: s.group[groupKey].activeMonitors[monitorId].warnings || []
                }, `MON_${groupKey}${monitorId}`)
            break;
            default:
                console.log('No s.camera execute : ',selectedMode)
            break;
        }
        if(typeof cn === 'function'){cn()}
    }
    //
    s.activateMonitorStates = function(groupKey,stateName,user,callback){
        var endData = {
            ok: false
        }
        s.findPreset([groupKey,'monitorStates',stateName],function(notFound,preset){
            if(notFound === false){
                var sqlQuery = 'SELECT * FROM Monitors WHERE ke=? AND '
                var monitorQuery = []
                var monitorPresets = {}
                preset.details.monitors.forEach(function(monitor){
                    const whereConditions = {}
                    if(monitorQuery.length === 0){
                        whereConditions.ke = groupKey
                        monitorQuery.push(['ke','=',groupKey])
                    }else{
                        monitorQuery.push(['or','ke','=',groupKey])
                    }
                    monitorQuery.push(['mid','=',monitor.mid])
                    monitorPresets[monitor.mid] = monitor
                })
                s.knexQuery({
                    action: "select",
                    columns: "*",
                    table: "Monitors",
                    where: monitorQuery
                },function(err,monitors){
                    if(monitors && monitors[0]){
                        monitors.forEach(function(monitor){
                            s.checkDetails(monitor)
                            s.checkDetails(monitorPresets[monitor.mid])
                            var monitorPreset = monitorPresets[monitor.mid]
                            monitorPreset.details = Object.assign(monitor.details,monitorPreset.details)
                            monitor = s.cleanMonitorObjectForDatabase(Object.assign(monitor,monitorPreset))
                            monitor.details = JSON.stringify(monitor.details)
                            s.addOrEditMonitor(Object.assign({},monitor),null,user)
                        })
                        endData.ok = true
                        s.tx({f:'change_group_state',ke:groupKey,name:stateName},'GRP_'+groupKey)
                        callback(endData)
                    }else{
                        endData.msg = user.lang['State Configuration has no monitors associated']
                        callback(endData)
                    }
                })
            }else{
                endData.msg = user.lang['State Configuration Not Found']
                callback(endData)
            }
        })
    }
    s.getMonitorRestrictions = (permissions,monitorId) => {
        const monitorRestrictions = []
        if(
            !monitorId &&
            permissions.sub &&
            permissions.monitors &&
            permissions.allmonitors !== '1'
        ){
            try{
                permissions.monitors = s.parseJSON(permissions.monitors)
                permissions.monitors.forEach(function(v,n){
                    if(n === 0){
                        monitorRestrictions.push(['mid','=',v])
                    }else{
                        monitorRestrictions.push(['or','mid','=',v])
                    }
                })
                console.log(monitorRestrictions)
            }catch(er){
            }
        }else if(
            monitorId && (
                !permissions.sub ||
                permissions.allmonitors !== '0' ||
                permissions.monitors.indexOf(monitorId) >- 1
            )
        ){
            monitorRestrictions.push(['mid','=',monitorId])
        }else if(
            !monitorId &&
            permissions.sub &&
            permissions.allmonitors !== '0'
        ){}
        return monitorRestrictions
    }
    s.checkPermission = (user) => {
        // provide "user" object given from "s.auth"
        const isSubAccount = !!user.details.sub
        const isApiKey = !user.login_type;
        const isSessionKey = user.isSessionKey;
        const response = {
            isSubAccount,
            hasAllPermissions: isSubAccount && user.details.allmonitors === '1',
            isRestricted: isSubAccount && user.details.allmonitors !== '1',
            isRestrictedApiKey: false,
            apiKeyPermissions: {},
            userPermissions: {},
        }
        const permissions = user.permissions
        const details = user.details;
        [
            'auth_socket',
            'get_monitors',
            'edit_monitors',
            'control_monitors',
            'get_logs',
            'watch_stream',
            'watch_snapshot',
            'watch_videos',
            'delete_videos',
        ].forEach((key) => {
            const permissionOff = !isSessionKey && isApiKey && permissions[key] !== '1';
            response.apiKeyPermissions[key] = isSessionKey || permissions[key] === '1';
            response.apiKeyPermissions[`${key}_disallowed`] = permissionOff;
            response.isRestrictedApiKey = response.isRestrictedApiKey || permissionOff;
        });
        // Base Level Permissions
            // allmonitors : All Monitors and Privileges
            // monitor_create : Can Create and Delete Monitors
            // user_change : Can Change User Settings
            // view_logs : Can View Logs
        [
            'allmonitors',
            'monitor_create',
            'user_change',
            'view_logs',
        ].forEach((key) => {
            response.userPermissions[key] = details[key] === '1' || !details[key];
            response.userPermissions[`${key}_disallowed`] = details[key] === '0';
        });
        return response
    }
    s.getMonitorsPermitted = (userDetails,monitorId,permissionTarget) => {
        const monitorRestrictions = []
        const monitors = {}
        permissionTarget = permissionTarget || 'monitors'
        const permissionSet = s.parseJSON(userDetails[permissionTarget]) || []
        // const viewOnlyCheck = permissionTarget === 'monitors'
        function setMonitorPermissions(mid){
            // monitors : Can View Monitor
            // monitor_edit : Can Edit Monitor (Delete as well)
            // video_view : Can View Videos and Events
            // video_delete : Can Delete Videos and Events
            [
                'monitors',
                'monitor_edit',
                'video_view',
                'video_delete',
            ].forEach((key) => {
                monitors[`${mid}_${key}`] = userDetails[key] && userDetails[key].indexOf(mid) > -1 || false;
            });
            return true
        }
        function addToQuery(mid,n){
            if(n === 0){
                monitorRestrictions.push(['mid','=',mid])
            }else{
                monitorRestrictions.push(['or','mid','=',mid])
            }
        };
        if(
            !monitorId &&
            userDetails.sub &&
            permissionSet &&
            userDetails.allmonitors !== '1'
        ){
            try{
                permissionSet.forEach(function(v,n){
                    setMonitorPermissions(v)
                    addToQuery(v,n)
                })
            }catch(err){
                s.debugLog(err)
            }
        }else if(
            monitorId && (
                !userDetails.sub ||
                userDetails.allmonitors !== '0' ||
                permissionSet.indexOf(monitorId) >- 1
            )
        ){
            setMonitorPermissions(monitorId)
            addToQuery(monitorId,0)
        }
        return {
            monitorPermissions: monitors,
            // queryConditions
            monitorRestrictions: monitorRestrictions,
        }
    }
}
