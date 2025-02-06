const fs = require('fs').promises;
const moment = require('moment');
const execSync = require('child_process').execSync;
const exec = require('child_process').exec;
const spawn = require('child_process').spawn;
const imageSaveEventLock = {};
// Matrix In Region Libs >
const SAT = require('sat')
const V = SAT.Vector;
const P = SAT.Polygon;
const B = SAT.Box;
// Matrix In Region Libs />
module.exports = (s,config,lang) => {
    const motionFrameSaveTimeouts = {}
    // Event Filters >
    const acceptableOperators = ['indexOf','!indexOf','===','!==','>=','>','<','<=']
    // Event Filters />
    const {
        splitForFFMPEG
    } = require('../ffmpeg/utils.js')(s,config,lang)
    const {
        moveCameraPtzToMatrix
    } = require('../control/ptz.js')(s,config,lang)
    const {
        cutVideoLength,
        reEncodeVideoAndBinOriginalAddToQueue
    } = require('../video/utils.js')(s,config,lang)
    const {
        getTracked,
        setLastTracked,
        trackObjectWithTimeout,
        getAllMatricesThatMoved,
    } = require('./tracking.js')(config)
    const {
        isEven,
        fetchTimeout,
    } = require('../basic/utils.js')(process.cwd(),config)
    const glyphs = require('../../definitions/glyphs.js')
    async function saveImageFromEvent(options,frameBuffer){
        const monitorId = options.mid || options.id
        const groupKey = options.ke
        //if(!frameBuffer || imageSaveEventLock[groupKey + monitorId])return;
	    if(!frameBuffer || frameBuffer.length === 0 || imageSaveEventLock[groupKey + monitorId]) return;
        const eventTime = options.time
        const objectsFound = options.matrices
        const monitorConfig = Object.assign({id: monitorId},s.group[groupKey].rawMonitorConfigurations[monitorId])
        const timelapseRecordingDirectory = s.getTimelapseFrameDirectory(monitorConfig)
        const currentDate = s.formattedTime(eventTime,'YYYY-MM-DD')
        const filename = s.formattedTime(eventTime) + '.jpg'
        const location = timelapseRecordingDirectory + currentDate + '/'
        try{
            await fs.stat(location)
        }catch(err){
            await fs.mkdir(location)
        }
        await fs.writeFile(location + filename,frameBuffer)
        s.createTimelapseFrameAndInsert(monitorConfig,location,filename,eventTime,{
            objects: objectsFound
        })
        imageSaveEventLock[groupKey + monitorId] = setTimeout(function(){
            delete(imageSaveEventLock[groupKey + monitorId])
        },1000)
    }
    const countObjects = async (event) => {
        const matrices = event.details.matrices
        const eventsCounted = s.group[event.ke].activeMonitors[event.id].eventsCounted || {}
        if(matrices){
            matrices.forEach((matrix)=>{
                const id = matrix.tag
                if(!eventsCounted[id])eventsCounted[id] = {times: [], count: {}, tag: matrix.tag}
                if(!isNaN(matrix.id))eventsCounted[id].count[matrix.id] = 1
                eventsCounted[id].times.push(new Date().getTime())
            })
        }
        return eventsCounted
    }
    const addEventDetailsToString = (eventData,string,addOps) => {
        //d = event data
        if(!addOps)addOps = {}
        var newString = string + ''
        var d = Object.assign(eventData,addOps)
        var detailString = s.stringJSON(d.details)
        var firstMatrix = d.details.matrices ? d.details.matrices[0] : null;
        var tag = firstMatrix ? firstMatrix.tag : '';
        newString = newString
            .replace(/{{CONFIDENCE}}/g,d.details.confidence)
            .replace(/{{TIME}}/g,d.currentTimestamp)
            .replace(/{{REGION_NAME}}/g,d.details.name)
            .replace(/{{SNAP_PATH}}/g,s.dir.streams+d.ke+'/'+d.id+'/s.jpg')
            .replace(/{{MONITOR_ID}}/g,d.id)
            .replace(/{{MONITOR_NAME}}/g,s.group[d.ke].rawMonitorConfigurations[d.id].name)
            .replace(/{{GROUP_KEY}}/g,d.ke)
            .replace(/{{DETAILS}}/g,detailString);
        if(firstMatrix && tag){
            newString = newString.replace(/{{TAG}}/g,tag)
        }
        if(d.details.confidence || firstMatrix){
            newString = newString
            .replace(/{{CONFIDENCE}}/g,d.details.confidence || firstMatrix.confidence)
        }
        if(d.details.reason && newString.includes("REASON")) {
            newString = newString
            .replace(/{{REASON}}/g, d.details.reason)
        }
        return newString
    }
    const isAtleastOneMatrixInRegion = function(regions,matrices){
        var regionPolys = []
        var matrixPoints = []
        regions.forEach(function(region,n){
            var polyPoints = []
            region.points.forEach(function(point){
                polyPoints.push(new V(parseInt(point[0]),parseInt(point[1])))
            })
            regionPolys[n] = new P(new V(0,0), polyPoints)
        })
        var collisions = []
        matrices.forEach(function(matrix){
            var matrixPoly = new B(new V(matrix.x, matrix.y), matrix.width, matrix.height).toPolygon()
            var foundInRegion = false
            regionPolys.forEach(function(region,n){
                if(!foundInRegion){
                    var response = new SAT.Response()
                    var collided = SAT.testPolygonPolygon(matrixPoly, region, response)
                    if(collided === true){
                        foundInRegion = true
                        collisions.push(matrix)
                    }
                }
            })
        })
        return collisions
    }
    const getLargestMatrix = (matrices) => {
        var largestMatrix = {width: 0, height: 0}
        matrices.forEach((matrix) => {
            if(matrix.width > largestMatrix.width && matrix.height > largestMatrix.height)largestMatrix = matrix
        })
        return largestMatrix.x ? largestMatrix : null
    }
    const addToEventCounter = (eventData) => {
        const eventsCounted = s.group[eventData.ke].activeMonitors[eventData.id].detector_motion_count
        eventsCounted.push(eventData)
    }
    const clearEventCounter = (groupKey,monitorId) => {
        s.group[eventData.ke].activeMonitors[eventData.id].detector_motion_count = []
    }
    const getEventsCounted = (groupKey,monitorId) => {
        return s.group[eventData.ke].activeMonitors[eventData.id].detector_motion_count.length
    }
    const hasMatrices = (eventDetails) => {
        return (eventDetails.matrices && eventDetails.matrices.length > 0) && eventDetails.reason !== 'motion'
    }
    const checkEventFilters = (d,monitorDetails,filter) => {
        const eventDetails = d.details
        if(
            monitorDetails.use_detector_filters === '1' &&
            ((monitorDetails.use_detector_filters_object === '1' && d.details.matrices && d.details.reason !== 'motion') ||
            monitorDetails.use_detector_filters_object !== '1')
        ){
            const parseValue = function(key,val){
                var newVal
                switch(val){
                    case'':
                        newVal = filter[key]
                    break;
                    case'0':
                        newVal = false
                    break;
                    case'1':
                        newVal = true
                    break;
                    default:
                        newVal = val
                    break;
                }
                return newVal
            }
            const filters = monitorDetails.detector_filters
            Object.keys(filters).forEach(function(key){
                var conditionChain = {}
                var dFilter = filters[key]
                if(dFilter.enabled === '0')return;
                var numberOfOpenAndCloseBrackets = 0
                dFilter.where.forEach(function(condition,place){
                    const hasOpenBracket = condition.openBracket === '1';
                    const hasCloseBracket = condition.closeBracket === '1';
                    conditionChain[place] = {
                        ok: false,
                        next: condition.p4,
                        matrixCount: 0,
                        openBracket: hasOpenBracket,
                        closeBracket: hasCloseBracket,
                    }
                    if(hasOpenBracket)++numberOfOpenAndCloseBrackets;
                    if(hasCloseBracket)++numberOfOpenAndCloseBrackets;
                    if(d.details.matrices)conditionChain[place].matrixCount = d.details.matrices.length
                    var modifyFilters = function(toCheck,matrixPosition){
                        var param = toCheck[condition.p1]
                        var pass = function(){
                            if(matrixPosition && dFilter.actions.halt === '1'){
                                delete(d.details.matrices[matrixPosition])
                            }else{
                                conditionChain[place].ok = true
                            }
                        }
                        switch(condition.p2){
                            case'indexOf':
                                if(param.indexOf(condition.p3) > -1){
                                    pass()
                                }
                            break;
                            case'!indexOf':
                                if(param.indexOf(condition.p3) === -1){
                                    pass()
                                }
                            break;
                            case'===':
                            case'!==':
                            case'>=':
                            case'>':
                            case'<':
                            case'<=':
                                if(eval('param '+condition.p2+' "'+condition.p3.replace(/"/g,'\\"')+'"')){
                                    pass()
                                }
                            break;
                        }
                    }
                    switch(condition.p1){
                        case'tag':
                        case'x':
                        case'y':
                        case'height':
                        case'width':
                        case'confidence':
                            if(d.details.matrices){
                                d.details.matrices.forEach(function(matrix,position){
                                    modifyFilters(matrix,position)
                                })
                            }
                        break;
                        case'time':
                            var timeNow = new Date()
                            var timeCondition = new Date()
                            var doAtTime = condition.p3.split(':')
                            var atHour = parseInt(doAtTime[0]) - 1
                            var atHourNow = timeNow.getHours()
                            var atMinuteNow = timeNow.getMinutes()
                            var atSecondNow = timeNow.getSeconds()
                            if(atHour){
                                var atMinute = parseInt(doAtTime[1]) - 1 || timeNow.getMinutes()
                                var atSecond = parseInt(doAtTime[2]) - 1 || timeNow.getSeconds()
                                var nowAddedInSeconds = atHourNow * 60 * 60 + atMinuteNow * 60 + atSecondNow
                                var conditionAddedInSeconds = atHour * 60 * 60 + atMinute * 60 + atSecond
                                if(acceptableOperators.indexOf(condition.p2) > -1 && eval('nowAddedInSeconds '+condition.p2+' conditionAddedInSeconds')){
                                    conditionChain[place].ok = true
                                }
                            }
                        break;
                        default:
                            modifyFilters(d.details)
                        break;
                    }
                })
                var conditionArray = Object.values(conditionChain)
                var validationString = []
                var allowBrackets = false;
                if (numberOfOpenAndCloseBrackets === 0 || isEven(numberOfOpenAndCloseBrackets)){
                    allowBrackets = true;
                }else{
                    s.userLog(d,{type:lang["Event Filter Error"],msg:lang.eventFilterErrorBrackets})
                }
                conditionArray.forEach(function(condition,number){
                    validationString.push(`${allowBrackets && condition.openBracket ? '(' : ''}${condition.ok}${allowBrackets && condition.closeBracket ? ')' : ''}`);
                    if(conditionArray.length-1 !== number){
                        validationString.push(condition.next)
                    }
                })
                if(eval(validationString.join(' '))){
                    if(dFilter.actions.halt !== '1'){
                        delete(dFilter.actions.halt)
                        Object.keys(dFilter.actions).forEach(function(key){
                            var value = dFilter.actions[key]
                            filter[key] = parseValue(key,value)
                        })
                        if(dFilter.actions.record === '1'){
                            filter.forceRecord = true
                        }
                    }else{
                        filter.halt = true
                    }
                }
            })
            if(d.details.matrices && d.details.matrices.length === 0 && d.details.reason !== 'motion' || filter.halt === true){
                return false
            }else if(hasMatrices(d.details)){
                var reviewedMatrix = []
                d.details.matrices.forEach(function(matrix){
                    if(matrix)reviewedMatrix.push(matrix)
                })
                d.details.matrices = reviewedMatrix
            }
        }
        // check modified indifference
        if(
            filter.indifference &&
            eventDetails.confidence < parseFloat(filter.indifference)
        ){
            // fails indifference check for modified indifference
            return
        }
        return true
    }
    const checkMotionLock = (eventData,monitorDetails) => {
        if(s.group[eventData.ke].activeMonitors[eventData.id].motion_lock){
            return false
        }
        var detector_lock_timeout
        if(!monitorDetails.detector_lock_timeout||monitorDetails.detector_lock_timeout===''){
            detector_lock_timeout = 2000
        }
        detector_lock_timeout = parseFloat(monitorDetails.detector_lock_timeout);
        if(!s.group[eventData.ke].activeMonitors[eventData.id].detector_lock_timeout){
            s.group[eventData.ke].activeMonitors[eventData.id].detector_lock_timeout=setTimeout(function(){
                clearTimeout(s.group[eventData.ke].activeMonitors[eventData.id].detector_lock_timeout)
                delete(s.group[eventData.ke].activeMonitors[eventData.id].detector_lock_timeout)
            },detector_lock_timeout)
        }else{
            return false
        }
        return true
    }
    const runMultiEventBasedRecord = (monitorConfig, monitorIdsToTrigger, eventTime) => {
        monitorIdsToTrigger.forEach(function(monitorId){
            const groupKey = monitorConfig.ke
            const monitor = s.group[groupKey].rawMonitorConfigurations[monitorId]
            if(monitorId !== monitorConfig.mid && monitor){
                const monitorDetails = monitor.details
                if(
                    monitorDetails.detector_trigger === '1' &&
                    monitor.mode === 'start' &&
                    (monitorDetails.detector_record_method === 'sip' || monitorDetails.detector_record_method === 'hot')
                ){
                    const secondBefore = (parseInt(monitorDetails.detector_buffer_seconds_before) || 5) + 1
                    createEventBasedRecording(monitor,moment(eventTime).subtract(secondBefore,'seconds').format('YYYY-MM-DDTHH-mm-ss'))
                }
            }
        })
    }
    function bindTagLegendForMonitors(groupKey){
        const newTagLegend = {}
        const theGroup = s.group[groupKey]
        const monitorIds = Object.keys(theGroup.rawMonitorConfigurations || {})
        monitorIds.forEach((monitorId) => {
            const monitorConfig = theGroup.rawMonitorConfigurations[monitorId]
            const theTags = (monitorConfig.tags || '').split(',')
            theTags.forEach((tag) => {
                if(!tag)return;
                if(!newTagLegend[tag])newTagLegend[tag] = []
                if(newTagLegend[tag].indexOf(monitorId) === -1)newTagLegend[tag].push(monitorId)
            })
        })
        theGroup.tagLegend = newTagLegend
    }
    function findMonitorsAssociatedToTags(groupKey,triggerTags){
        const monitorsToTrigger = []
        const theGroup = s.group[groupKey]
        triggerTags.forEach((tag) => {
            const monitorIds = theGroup.tagLegend[tag]
            monitorIds.forEach((monitorId) => {
                if(monitorsToTrigger.indexOf(monitorId) === -1)monitorsToTrigger.push(monitorId)
            })
        })
        return monitorsToTrigger
    }
    const runEventExecutions = async (eventTime,monitorConfig,eventDetails,forceSave,filter,d, triggerEvent) => {
        const groupKey = monitorConfig.ke
        const monitorId = d.id || d.mid
        const monitorDetails = monitorConfig.details
        const detailString = JSON.stringify(eventDetails)
        const reason = eventDetails.reason
        const timeoutId = `${groupKey}${monitorId}`
        if(monitorDetails.detector_ptz_follow === '1'){
            moveCameraPtzToMatrix(d,monitorDetails.detector_ptz_follow_target)
        }
        if(monitorDetails.det_trigger_tags){
            const triggerTags = monitorDetails.det_trigger_tags.split(',')
            const monitorIds = findMonitorsAssociatedToTags(groupKey, triggerTags)
            runMultiEventBasedRecord(monitorConfig, monitorIds, eventTime)
        }
        //save this detection result in SQL, only coords. not image.
        if(d.frame){
            saveImageFromEvent({
                ke: groupKey,
                mid: monitorId,
                time: eventTime,
                matrices: eventDetails.matrices || [],
            },d.frame)
        }else if(
            !motionFrameSaveTimeouts[timeoutId] &&
            reason === 'motion' &&
            monitorDetails.detector_motion_save_frame === '1' &&
            (
              monitorDetails.detector_use_detect_object !== '1' ||
              (monitorDetails.detector_use_detect_object === '1' && monitorDetails.detector_use_motion !== '1')
            )
        ){
            motionFrameSaveTimeouts[timeoutId] = setTimeout(() => {
                delete(motionFrameSaveTimeouts[timeoutId])
            },10000);
            s.getRawSnapshotFromMonitor(monitorConfig,{
                secondsInward: parseInt(monitorConfig.details.detector_buffer_seconds_before) || 5
            }).then(({ screenShot, isStaticFile }) => {
                saveImageFromEvent({
                    ke: groupKey,
                    mid: monitorId,
                    time: eventTime,
                    matrices: eventDetails.matrices || [],
                }, screenShot)
            })
        }
        if(forceSave || (filter.save || monitorDetails.detector_save === '1')){
            s.knexQuery({
                action: "insert",
                table: "Events",
                insert: {
                    ke: groupKey,
                    mid: monitorId,
                    details: detailString,
                    time: s.formattedTime(eventTime),
                }
            })
        }
        var detector_timeout
        if(!monitorDetails.detector_timeout||monitorDetails.detector_timeout===''){
            detector_timeout = 10
        }else{
            detector_timeout = parseFloat(monitorDetails.detector_timeout)
        }
        if(
            (filter.forceRecord || (filter.record && monitorDetails.detector_trigger === '1')) &&
            monitorConfig.mode === 'start' &&
            (monitorDetails.detector_record_method === 'sip' || monitorDetails.detector_record_method === 'hot')
        ){
            const secondBefore = (parseInt(monitorDetails.detector_buffer_seconds_before) || 5) + 1
            createEventBasedRecording(d,moment(eventTime).subtract(secondBefore,'seconds').format('YYYY-MM-DDTHH-mm-ss'))
        }
        d.currentTime = eventTime
        d.currentTimestamp = s.timeObject(eventTime).format()
        d.screenshotName =  eventDetails.reason + '_'+(monitorConfig.name.replace(/[^\w\s]/gi,''))+'_'+d.id+'_'+d.ke+'_'+s.formattedTime(eventTime)
        d.screenshotBuffer = null

        if(filter.webhook && monitorDetails.detector_webhook === '1' && !s.group[d.ke].activeMonitors[d.id].detector_webhook){
            s.group[d.ke].activeMonitors[d.id].detector_webhook = s.createTimeout('detector_webhook',s.group[d.ke].activeMonitors[d.id],monitorDetails.detector_webhook_timeout,10)
            var detector_webhook_url = addEventDetailsToString(d,monitorDetails.detector_webhook_url)
            var webhookMethod = monitorDetails.detector_webhook_method
            if(!webhookMethod || webhookMethod === '')webhookMethod = 'GET'
            fetchTimeout(detector_webhook_url,10000,{
                method: webhookMethod
            }).catch((err) => {
                s.userLog(d,{type:lang["Event Webhook Error"],msg:{error:err,data:data}})
            })
        }

        if(
            filter.command || (
                monitorDetails.detector_command_enable === '1' &&
                !s.group[d.ke].activeMonitors[monitorId].detector_command
            )
        ){
            s.group[d.ke].activeMonitors[monitorId].detector_command = s.createTimeout('detector_command',s.group[d.ke].activeMonitors[monitorId],monitorDetails.detector_command_timeout,10)
            var detector_command = addEventDetailsToString(d,monitorDetails.detector_command)
            if(detector_command === '')return
            exec(detector_command,{detached: true},function(err){
                if(err)s.debugLog(err)
            })
        }

        for (var i = 0; i < s.onEventTriggerExtensions.length; i++) {
            const extender = s.onEventTriggerExtensions[i]
            await extender(d,filter)
        }
    }
    const getEventBasedRecordingUponCompletion = function(options){
        const response = {ok: true}
        return new Promise((resolve,reject) => {
            const groupKey = options.ke
            const monitorId = options.mid
            const activeMonitor = s.group[groupKey].activeMonitors[monitorId]
            if(activeMonitor && activeMonitor.eventBasedRecording && activeMonitor.eventBasedRecording.process){
                const eventBasedRecording = activeMonitor.eventBasedRecording
                const monitorConfig = s.group[groupKey].rawMonitorConfigurations[monitorId]
                const videoLength = parseInt(monitorConfig.details.detector_send_video_length) || 10
                const recordingDirectory = s.getVideoDirectory(monitorConfig)
                const fileTime = eventBasedRecording.lastFileTime
                const filename = `${fileTime}.mp4`
                response.filename = `${filename}`
                response.filePath = `${recordingDirectory}${filename}`
                eventBasedRecording.process.on('exit',function(){
                    setTimeout(async () => {
                        if(!isNaN(videoLength)){
                            const cutResponse = await cutVideoLength({
                                ke: groupKey,
                                mid: monitorId,
                                filePath: response.filePath,
                                cutLength: videoLength,
                            })
                            if(cutResponse.ok){
                                response.filename = cutResponse.filename
                                response.filePath = cutResponse.filePath
                            }else{
                                s.debugLog('cutResponse',cutResponse)
                            }
                        }
                        resolve(response)
                        for (var i = 0; i < s.onEventBasedRecordingCompleteExtensions.length; i++) {
                            const extender = s.onEventBasedRecordingCompleteExtensions[i]
                            await extender(response,monitorConfig)
                        }
                    },1000)
                })
            }else{
                resolve(response)
            }
        })
    }
    const createEventBasedRecording = function(d,fileTime){
        if(!fileTime)fileTime = s.formattedTime()
        const logTitleText = lang["Traditional Recording"]
        const groupKey = d.ke
        const monitorId = d.mid || d.id
        const activeMonitor = s.group[groupKey].activeMonitors[monitorId]
        const monitorConfig = s.group[groupKey].rawMonitorConfigurations[monitorId]
        const monitorDetails = monitorConfig.details
        const overlappingRecordings = monitorDetails.detector_record_overlap === '1'
        if(monitorDetails.detector !== '1'){
            return
        }
        if(!overlappingRecordings && activeMonitor.eventBasedRecordingLastFileTime)fileTime = activeMonitor.eventBasedRecordingLastFileTime;
        var detector_timeout;
        if(!monitorDetails.detector_timeout||monitorDetails.detector_timeout===''){
            detector_timeout = 10
        }else{
            detector_timeout = parseFloat(monitorDetails.detector_timeout)
        }
        if(!activeMonitor.eventBasedRecording[fileTime])activeMonitor.eventBasedRecording[fileTime] = {};
        if((!overlappingRecordings && monitorDetails.watchdog_reset === '1') || !activeMonitor.eventBasedRecording[fileTime].timeout){
            clearTimeout(activeMonitor.eventBasedRecording[fileTime].timeout)
            activeMonitor.eventBasedRecording[fileTime].timeout = setTimeout(function(){
                activeMonitor.eventBasedRecording[fileTime].allowEnd = true
                try{
                    activeMonitor.eventBasedRecording[fileTime].process.stdin.setEncoding('utf8')
                    activeMonitor.eventBasedRecording[fileTime].process.stdin.write('q')
                }catch(err){
                    s.debugLog(err)
                }
                activeMonitor.eventBasedRecording[fileTime].process.kill('SIGINT')
                delete(activeMonitor.eventBasedRecording[fileTime].timeout)
            },detector_timeout * 1000 * 60)
        }
        if(!activeMonitor.eventBasedRecording[fileTime].process){
            activeMonitor.eventBasedRecording[fileTime].allowEnd = false;
            activeMonitor.eventBasedRecordingLastFileTime = `${fileTime}`;
            const runRecord = function(){
                var ffmpegError = ''
                var error
                var filename = fileTime + '.mp4'
                let outputMap = `-map 0:0 `
                const analyzeDuration = parseInt(monitorDetails.event_record_aduration) || 1000
                const probeSize = parseInt(monitorDetails.event_record_probesize) || 32
                s.userLog(d,{
                    type: logTitleText,
                    msg: lang["Started"]
                })
                for (var i = 0; i < s.onEventBasedRecordingStartExtensions.length; i++) {
                    const extender = s.onEventBasedRecordingStartExtensions[i]
                    extender(monitorConfig,filename)
                }
                //-t 00:'+s.timeObject(new Date(detector_timeout * 1000 * 60)).format('mm:ss')+'
                if(
                    monitorDetails.detector_buffer_acodec &&
                    monitorDetails.detector_buffer_acodec !== 'no' &&
                    monitorDetails.detector_buffer_acodec !== 'auto'
                ){
                    outputMap += `-map 0:1? `
                }
                const secondsBefore = parseInt(monitorDetails.detector_buffer_seconds_before) || 5
                let LiveStartIndex = parseInt(secondsBefore / 2 + 1)
                const ffmpegCommand = `-loglevel warning -live_start_index -${LiveStartIndex} -analyzeduration ${analyzeDuration} -probesize ${probeSize} -re -i "${s.dir.streams+groupKey+'/'+monitorId}/detectorStream.m3u8" ${outputMap}-movflags faststart -fflags +igndts -c:v copy -c:a aac -strict -2 -strftime 1 -y "${s.getVideoDirectory(monitorConfig) + filename}"`
                s.debugLog(ffmpegCommand)
                activeMonitor.eventBasedRecording[fileTime].process = spawn(
                    config.ffmpegDir,
                    splitForFFMPEG(ffmpegCommand)
                )
                activeMonitor.eventBasedRecording[fileTime].process.stderr.on('data',function(data){
                    s.userLog(d,{
                        type: logTitleText,
                        msg: data.toString()
                    })
                })
                activeMonitor.eventBasedRecording[fileTime].process.on('close',function(){
                    if(!activeMonitor.eventBasedRecording[fileTime].allowEnd){
                        s.userLog(d,{
                            type: logTitleText,
                            msg: lang["Detector Recording Process Exited Prematurely. Restarting."]
                        })
                        runRecord()
                        return
                    }
                    const secondBefore = (parseInt(monitorDetails.detector_buffer_seconds_before) || 5) + 1
                    s.insertCompletedVideo(monitorConfig,{
                        file : filename,
                        objects: overlappingRecordings && d.details && d.details.matrices instanceof Array ? d.details.matrices : undefined,
                        endTime: moment(new Date()).subtract(secondBefore,'seconds')._d,
                    },function(err,response){
                        const autoCompressionEnabled = monitorDetails.auto_compress_videos === '1';
                        if(autoCompressionEnabled){
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
                    });
                    s.userLog(d,{
                        type: logTitleText,
                        msg: lang["Detector Recording Complete"]
                    });
                    s.userLog(d,{
                        type: logTitleText,
                        msg: lang["Clear Recorder Process"]
                    });
                    if(!overlappingRecordings)delete(activeMonitor.eventBasedRecordingLastFileTime)
                    clearTimeout(activeMonitor.eventBasedRecording[fileTime].timeout)
                    clearTimeout(activeMonitor.recordingChecker)
                    delete(activeMonitor.eventBasedRecording[fileTime])
                })
            }
            runRecord()
        }
    }
    const closeEventBasedRecording = function(e){
        const activeMonitor = s.group[e.ke].activeMonitors[e.id]
        const eventBasedRecordings = activeMonitor.eventBasedRecording;
        for(fileTime in eventBasedRecordings){
            if(eventBasedRecordings[fileTime].process){
                clearTimeout(eventBasedRecordings[fileTime].timeout)
                eventBasedRecordings[fileTime].allowEnd = true
                eventBasedRecordings[fileTime].process.kill('SIGTERM')
            }
        }
        // var stackedProcesses = s.group[e.ke].activeMonitors[e.id].eventBasedRecording.stackable
        // Object.keys(stackedProcesses).forEach(function(key){
        //     var item = stackedProcesses[key]
        //     clearTimeout(item.timeout)
        //     item.allowEnd = true;
        //     item.process.kill('SIGTERM');
        // })
    }
    const legacyFilterEvents = (x,d) => {
        switch(x){
            case'archive':
                d.videos.forEach(function(v,n){
                    s.video('archive',v)
                })
            break;
            case'delete':
                s.deleteListOfVideos(d.videos)
            break;
            case'execute':
                exec(d.execute,{detached: true})
            break;
        }
        s.onEventTriggerBeforeFilterExtensions.forEach(function(extender){
            extender(x,d)
        })
    }
    const sendFramesFromSecondaryOutput = (groupKey,monitorId,timeout) => {
        const activeMonitor = s.group[groupKey].activeMonitors[monitorId]
        const theEmitter = activeMonitor.secondaryDetectorOutput
        if(!activeMonitor.sendingFromSecondaryDetectorOuput){
            const monitorConfig = s.group[groupKey].rawMonitorConfigurations[monitorId]
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
            s.debugLog('start sending object frames',groupKey,monitorId)
            theEmitter.on('data', activeMonitor.secondaryDetectorOuputContentWriter = sendToDetector)
        }
        clearTimeout(activeMonitor.sendingFromSecondaryDetectorOuput)
        activeMonitor.sendingFromSecondaryDetectorOuput = setTimeout(() => {
            theEmitter.removeListener('data',activeMonitor.secondaryDetectorOuputContentWriter)
            delete(activeMonitor.sendingFromSecondaryDetectorOuput)
        },timeout || 5000)
    }
    const triggerEvent = async (d,forceSave) => {
        var didCountingAlready = false
        const groupKey = d.ke
        const monitorId = d.mid || d.id
        const filter = {
            halt : false,
            addToMotionCounter : true,
            useLock : true,
            save : false,
            webhook : false,
            command : false,
            record : true,
            forceRecord : false,
            indifference : false,
            countObjects : false
        }
        if(!s.group[d.ke] || !s.group[d.ke].activeMonitors[d.id]){
            return s.systemLog(lang['No Monitor Found, Ignoring Request'])
        }
        const monitorConfig = s.group[d.ke].rawMonitorConfigurations[d.id]
        if(!monitorConfig){
            return s.systemLog(lang['No Monitor Found, Ignoring Request'])
        }
        const activeMonitor = s.group[d.ke].activeMonitors[d.id]
        const monitorDetails = monitorConfig.details
        s.onEventTriggerBeforeFilterExtensions.forEach(function(extender){
            extender(d,filter)
        })
        const passedEventFilters = checkEventFilters(d,activeMonitor.details,filter)
        if(!passedEventFilters)return;
        const eventTime = new Date()
        if(
            filter.addToMotionCounter &&
            filter.record &&
            (
                monitorConfig.mode === 'record' ||
                monitorConfig.mode === 'start' &&
                (
                    (
                        monitorDetails.detector_record_method === 'sip' &&
                        monitorDetails.detector_trigger === '1'
                    ) ||
                    (
                        monitorDetails.detector_record_method === 'del' &&
                        monitorDetails.detector_delete_motionless_videos === '1'
                    )
                )
            )
        ){
            addToEventCounter(d)
        }
        const eventDetails = d.details
        if(
            (filter.countObjects || monitorDetails.detector_obj_count === '1') &&
            monitorDetails.detector_obj_count_in_region !== '1'
        ){
            didCountingAlready = true
            countObjects(eventDetails.matrices)
        }
        if(filter.useLock){
            const passedMotionLock = checkMotionLock(d,monitorDetails)
            if(!passedMotionLock)return
        }
        const thisHasMatrices = hasMatrices(eventDetails)
        if(thisHasMatrices && monitorDetails.detector_obj_region === '1'){
            var regions = s.group[monitorConfig.ke].activeMonitors[monitorConfig.mid].parsedObjects.cordsForObjectDetection
            var matricesInRegions = isAtleastOneMatrixInRegion(regions,eventDetails.matrices)
            eventDetails.matrices = matricesInRegions
            if(matricesInRegions.length === 0)return;
            if(filter.countObjects && monitorDetails.detector_obj_count === '1' && monitorDetails.detector_obj_count_in_region === '1' && !didCountingAlready){
                countObjects(eventDetails.matrices)
            }
        }
        if(thisHasMatrices && monitorDetails.detector_object_ignore_not_move === '1'){
            const trackerId = `${groupKey}${monitorId}`
            trackObjectWithTimeout(trackerId,eventDetails.matrices)
            const trackedObjects = getTracked(trackerId)
            const objectsThatMoved = getAllMatricesThatMoved(monitorConfig,trackedObjects)
            setLastTracked(trackerId, trackedObjects)
            if(objectsThatMoved.length === 0)return;
            eventDetails.matrices = objectsThatMoved
        }
        //
        d.doObjectDetection = (
            eventDetails.reason !== 'object' &&
            s.isAtleatOneDetectorPluginConnected &&
            monitorDetails.detector_use_detect_object === '1' &&
            monitorDetails.detector_use_motion === '1'
        );
        if(d.doObjectDetection === true){
            sendFramesFromSecondaryOutput(d.ke,d.id)
        }
        //
        if(
            monitorDetails.detector_use_motion === '0' ||
            d.doObjectDetection !== true
        ){
            runEventExecutions(eventTime,monitorConfig,eventDetails,forceSave,filter,d, triggerEvent)
        }
        //show client machines the event
        s.tx({
            f: 'detector_trigger',
            id: d.id,
            ke: d.ke,
            details: eventDetails,
            doObjectDetection: d.doObjectDetection
        },`DETECTOR_${monitorConfig.ke}${monitorConfig.mid}`);
    }
    function convertRegionPointsToNewDimensions(regions, options) {
      const { fromWidth, fromHeight, toWidth, toHeight } = options;

      // Compute the conversion factors for x and y coordinates
      const xFactor = toWidth / fromWidth;
      const yFactor = toHeight / fromHeight;

      // Clone the regions array and update the points for each region
      const newRegions = regions.map(region => {
        const { points } = region;

        // Clone the points array and update the coordinates
        const newPoints = points.map(([x, y]) => {
          const newX = Math.round(x * xFactor);
          const newY = Math.round(y * yFactor);
          return [newX.toString(), newY.toString()];
        });

        // Clone the region object and update the points
        return { ...region, points: newPoints };
      });

      return newRegions;
    }
    function getTagWithIcon(tag){
        var icon = glyphs[tag.toLowerCase()] || glyphs._default
        return `${icon} ${tag}`;
    }
    function getObjectTagsFromMatrices(d){
        if(d.details.reason === 'motion'){
            return [getTagWithIcon(lang.Motion)]
        }else if(d.details.matrices){
            const matrices = d.details.matrices
            return [...new Set(matrices.map(matrix => getTagWithIcon(matrix.tag)))];
        }
        return [getTagWithIcon(d.details.reason)]
    }
    function getObjectTagNotifyText(d){
        const monitorId = d.mid || d.id
        const monitorName = s.group[d.ke].rawMonitorConfigurations[monitorId].name
        const tags = getObjectTagsFromMatrices(d)
        return `${tags.join(', ')} ${lang.detected} in ${monitorName}`
    }
    return {
        getObjectTagNotifyText,
        getObjectTagsFromMatrices,
        countObjects: countObjects,
        isAtleastOneMatrixInRegion,
        convertRegionPointsToNewDimensions,
        getLargestMatrix: getLargestMatrix,
        addToEventCounter: addToEventCounter,
        clearEventCounter: clearEventCounter,
        getEventsCounted: getEventsCounted,
        hasMatrices: hasMatrices,
        checkEventFilters: checkEventFilters,
        checkMotionLock: checkMotionLock,
        bindTagLegendForMonitors,
        runMultiEventBasedRecord,
        runEventExecutions: runEventExecutions,
        createEventBasedRecording: createEventBasedRecording,
        closeEventBasedRecording: closeEventBasedRecording,
        legacyFilterEvents: legacyFilterEvents,
        triggerEvent: triggerEvent,
        addEventDetailsToString: addEventDetailsToString,
        getEventBasedRecordingUponCompletion: getEventBasedRecordingUponCompletion,
    }
}
