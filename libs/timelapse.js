const fs = require('fs')
const moment = require('moment')
const express = require('express')
const exec = require('child_process').exec;
const spawn = require('child_process').spawn;
const events = require('events');
module.exports = function(s,config,lang,app,io){
    const {
        sendTimelapseFrameToMasterNode,
    } = require('./childNode/childUtils.js')(s,config,lang)
    const {
        splitForFFMPEG,
    } = require('./ffmpeg/utils.js')(s,config,lang)
    const {
        getFileDirectory,
    } = require('./basic/utils.js')(process.cwd(),config)
    const {
        processKill,
    } = require('./monitor/utils.js')(s,config,lang)
    const {
        stitchMp4Files,
    } = require('./video/utils.js')(s,config,lang)
    const timelapseFramesCache = {}
    const timelapseFramesCacheTimeouts = {}
    s.getTimelapseFrameDirectory = function(e){
        if(e.mid&&!e.id){e.id=e.mid}
        s.checkDetails(e)
        if(e.details&&e.details.dir&&e.details.dir!==''){
            return s.checkCorrectPathEnding(e.details.dir)+e.ke+'/'+e.id+'_timelapse/'
        }else{
            return s.dir.videos+e.ke+'/'+e.id+'_timelapse/';
        }
    }
    s.createTimelapseFrameAndInsert = function(e,location,filename,eventTime,frameDetails){
        //e = monitor object
        //location = file location
        var monitorId = e.id || e.mid;
        var filePath = location + filename
        var fileStats = fs.statSync(filePath)
        var details = Object.assign({},frameDetails || {})
        if(e.details && e.details.dir && e.details.dir !== ''){
            details.dir = e.details.dir
        }
        const timeNow = eventTime || new Date()
        const queryInfo = {
            ke: e.ke,
            mid: monitorId,
            details: s.s(details),
            filename: filename,
            size: fileStats.size,
            time: timeNow
        }
        if(config.childNodes.enabled === true && config.childNodes.mode === 'child' && config.childNodes.host && config.dropTimeLapseFrames != true){
            var currentDate = s.formattedTime(timeNow,'YYYY-MM-DD')
            const childNodeData = {
                ke: e.ke,
                mid: monitorId,
                time: currentDate,
                filename: filename,
                currentDate: currentDate,
                queryInfo: queryInfo
            }
            sendTimelapseFrameToMasterNode(filePath,childNodeData)
        }else if (config.dropTimeLapseFrames != true ){
            s.insertTimelapseFrameDatabaseRow(e,queryInfo,filePath)
        }
    }
    s.insertTimelapseFrameDatabaseRow = function(e,queryInfo,filePath){
        const groupKey = e.ke
        const theGroup = s.group[groupKey]
        const frameDetails = Object.assign({},s.parseJSON(queryInfo.details) || {})
        const storageId = e.details.dir
        const storageIndex = theGroup.addStorageUse[storageId]
        const fileSize = queryInfo.size / 1048576
        s.knexQuery({
            action: "insert",
            table: "Timelapse Frames",
            insert: queryInfo
        })
        if(storageIndex){
            s.setDiskUsedForGroupAddStorage(groupKey,{
                size: fileSize,
                storageIndex: storageIndex
            },'timelapseFrames')
        }else{
            s.setDiskUsedForGroup(groupKey, fileSize, 'timelapseFrames')
        }
        s.purgeDiskForGroup(e.ke)
        s.onInsertTimelapseFrameExtensions.forEach(function(extender){
            extender(e,queryInfo,filePath)
        })
    }
    s.onDeleteTimelapseFrameFromCloudExtensions = {}
    s.onDeleteTimelapseFrameFromCloudExtensionsRunner = function(e,storageType,video){
        // e = user
        if(!storageType){
            var videoDetails = JSON.parse(r.details)
            videoDetails.type = videoDetails.type || 's3'
        }
        if(s.onDeleteTimelapseFrameFromCloudExtensions[storageType]){
            s.onDeleteTimelapseFrameFromCloudExtensions[storageType](e,video,function(){
                s.tx({
                    f: 'timelapse_frame_delete_cloud',
                    mid: e.mid,
                    ke: e.ke,
                    time: e.time,
                    end: e.end
                },'GRP_'+e.ke);
            })
        }
    }
    s.deleteTimelapseFrameFromCloud = function(e,cloudType){
        // e = video object
        var frameSelector = {
            ke: e.ke,
            mid: e.id,
            type: cloudType,
            time: new Date(e.time),
        }
        s.knexQuery({
            action: "select",
            columns: "*",
            table: "Cloud Timelapse Frames",
            where: frameSelector,
            limit: 1
        },function(err,r){
            if(r && r[0]){
                r = r[0]
                s.knexQuery({
                    action: "delete",
                    table: "Cloud Timelapse Frames",
                    where: frameSelector,
                    limit: 1
                },function(){
                    s.onDeleteTimelapseFrameFromCloudExtensionsRunner(e,details.type || r.type || 's3',r)
                })
            }else{
//                    console.log('Delete Failed',e)
//                    console.error(err)
            }
        })
    }
    const deleteTimelapseFrame = function(e){
        // e = video object
        s.checkDetails(e)
        var frameSelector = {
            ke: e.ke,
            mid: e.mid,
            filename: e.filename,
        }
        s.knexQuery({
            action: "select",
            columns: "*",
            table: "Timelapse Frames",
            where: frameSelector,
            limit: 1
        },function(err,r){
            if(r && r[0]){
                r = r[0]
                s.knexQuery({
                    action: "delete",
                    table: "Timelapse Frames",
                    where: frameSelector,
                    limit: 1
                },async function(){
                    s.setDiskUsedForGroup(e.ke,-(r.size / 1048576),'timelapseFrames')
                    await s.file('delete', e.fileLocation);
                    const fileDirectory = getFileDirectory(e.fileLocation);
                    const folderIsEmpty = (await fs.promises.readdir(fileDirectory)).filter(file => file.indexOf('.jpg') > -1).length === 0;
                    if(folderIsEmpty){
                        await fs.rm(fileDirectory, { recursive: true })
                    }
                })
            }else{
//                    console.log('Delete Failed',e)
//                    console.error(err)
            }
        })
    }
    function splitArrayIntoMultiple(bigarray,size){
        size = size || 80;
        var arrayOfArrays = [];
        for (var i=0; i<bigarray.length; i+=size) {
             arrayOfArrays.push(bigarray.slice(i,i+size));
        }
        return arrayOfArrays
    }
    async function createTemporaryInputFile(frames,concatListFile){
        const concatFiles = []
        const fileList = []
        frames.forEach(function(frame,frameNumber){
            var selectedDate = frame.filename.split('T')[0]
            var fileLocationMid = `${frame.ke}/${frame.mid}_timelapse/${selectedDate}/`
            frame.details = s.parseJSON(frame.details)
            var fileLocation
            if(frame.details.dir){
                fileLocation = `${s.checkCorrectPathEnding(frame.details.dir)}`
            }else{
                fileLocation = `${s.dir.videos}`
            }
            fileLocation = `${fileLocation}${fileLocationMid}${frame.filename}`
            try{
                fs.statSync(fileLocation)
                concatFiles.push(`file '${fileLocation}'`)
                fileList.push(`${fileLocation}`)
            }catch(err){
                s.debugLog(`Failed to read frame for Timelapse build`)
            }
        })
        await fs.promises.writeFile(concatListFile,concatFiles.join('\n'))
        return fileList
    }
    async function createTemporaryInputFileForStitched(videosPathsList,concatListFile){
        const concatFiles = []
        const fileList = []
        videosPathsList.forEach(function(videoPath){
            try{
                fs.statSync(videoPath)
                concatFiles.push(`file '${videoPath}'`)
                fileList.push(`${videoPath}`)
            }catch(err){
                s.debugLog(`Failed to read segment for Timelapse build`)
            }
        })
        s.debugLog(concatFiles)
        await fs.promises.writeFile(concatListFile,concatFiles.join('\n'))
        return fileList
    }
    function buildVideoSegmentFromFrames(options){
        return new Promise((resolve,reject) => {
            const frames = options.frames
            const ke = frames[0].ke
            const mid = frames[0].mid
            const concatListFile = options.listFile
            createTemporaryInputFile(frames,concatListFile).then((framesAccepted) => {
                var completionTimeout
                const framesPerSecond = options.fps
                const finalMp4OutputLocation = options.output
                const onPercentChange = options.onPercentChange
                const numberOfFrames = framesAccepted.length
                const commandString = `-y -threads 1 -re -f concat -safe 0 -r ${framesPerSecond} -i "${concatListFile}" -q:v 1 -c:v libx264 -preset ultrafast -r ${framesPerSecond} "${finalMp4OutputLocation}"`
                s.debugLog("ffmpeg",commandString)
                const videoBuildProcess = spawn(config.ffmpegDir,splitForFFMPEG(commandString))
                videoBuildProcess.stdout.on('data',function(data){
                    s.debugLog('stdout',finalMp4OutputLocation,data.toString())
                })
                videoBuildProcess.stderr.on('data',function(data){
                    const text = data.toString()
                    if(text.startsWith('frame=')){
                        const currentFrame = parseInt(text.split(/(\s+)/)[2])
                        const percent = (currentFrame / numberOfFrames * 100).toFixed(1)
                        onPercentChange(percent,currentFrame)
                    }
                    clearTimeout(completionTimeout)
                    completionTimeout = setTimeout(function(){
                        s.debugLog('videoBuildProcess completionTimeout',finalMp4OutputLocation)
                        processKill(videoBuildProcess)
                    },20000)
                })
                videoBuildProcess.on('exit',async function(data){
                    clearTimeout(completionTimeout)
                    resolve()
                    await fs.promises.unlink(concatListFile)
                })
            })
        })
    }
    async function chunkFramesAndBuildMultipleVideosThenSticth(options){
        // a single video with too many frames makes the video unplayable, this is the fix.
        const frames = options.frames
        const ke = frames[0].ke
        const mid = frames[0].mid
        const finalFileName = options.finalFileName
        const concatListFile = options.listFile
        const framesPerSecond = options.fps
        const finalMp4OutputLocation = options.output
        const onPercentChange = options.onPercentChange
        const frameChunks = splitArrayIntoMultiple(frames,80)
        const numberOfSets = frameChunks.length
        const filePathsList = []
        for (let i = 0; i < numberOfSets; i++) {
            var frameSet = frameChunks[i]
            var numberOfFrames = frameSet.length
            var segmentFileOutput = `${s.dir.streams}${ke}/${mid}/${s.gid(10)}.mp4`
            filePathsList.push(segmentFileOutput)
            await buildVideoSegmentFromFrames({
                frames: frameSet,
                listFile: `${concatListFile}${i}`,
                fps: framesPerSecond,
                output: segmentFileOutput,
                onPercentChange: (percent,currentFrame) => {
                    const overallPercent = ((percent / numberOfSets) + (i * (100 / numberOfSets))).toFixed(1);
                    s.tx({
                        f: 'timelapse_build_percent',
                        ke: ke,
                        mid: mid,
                        name: finalFileName,
                        percent: overallPercent,
                    },'GRP_'+ke);
                    if(percent == 100){
                        s.debugLog('videoBuildProcess 100%',finalMp4OutputLocation)
                    }
                    s.debugLog(`Piece ${i}`,`${currentFrame} / ${numberOfFrames}`,`${percent}%`)
                },
            })
        }
        s.debugLog('videoBuildProcess Stitching...',finalMp4OutputLocation)
        await createTemporaryInputFileForStitched(filePathsList,concatListFile)
        await stitchMp4Files({
            listFile: concatListFile,
            output: finalMp4OutputLocation,
        })
        await fs.promises.rm(concatListFile)
        for (let i = 0; i < filePathsList.length; i++) {
            var segmentFileOutput = filePathsList[i]
            await fs.promises.rm(segmentFileOutput)
        }
        s.debugLog('videoBuildProcess Stitching Complete!',finalMp4OutputLocation)
    }
    async function createVideoFromTimelapse(timelapseFrames,framesPerSecond){
        s.debugLog("Building Timelapse Frames Video",timelapseFrames.length)
        framesPerSecond = !isNaN(framesPerSecond) ? framesPerSecond : parseInt(framesPerSecond) || 2
        const frames = timelapseFrames.reverse()
        const numberOfFrames = timelapseFrames.length
        const ke = frames[0].ke
        const mid = frames[0].mid
        const activeMonitor = s.group[ke].activeMonitors[mid]
        const finalFileName = `${s.md5(JSON.stringify(frames))}-${framesPerSecond}fps.mp4`
        const finalMp4OutputLocation = `${s.dir.fileBin}${ke}/${mid}/${finalFileName}`
        const finalFileAlreadyExist = fs.existsSync(finalMp4OutputLocation)
        const concatListFile = `${s.dir.streams}${ke}/${mid}/mergeJpegs_${finalFileName}.txt`
        const response = {
            ok: false,
            ke: ke,
            mid: mid,
            name: finalFileName,
        }
        s.debugLog("activeMonitor.buildingTimelapseVideo",!!activeMonitor.buildingTimelapseVideo)
        if(activeMonitor.buildingTimelapseVideo){
            s.debugLog("Timelapse Frames Video Building Already",finalMp4OutputLocation)
            return activeMonitor.buildingTimelapseVideo
        }
        s.debugLog("finalFileAlreadyExist",finalFileAlreadyExist)
        if(finalFileAlreadyExist){
            s.debugLog("Timelapse Frames Video finalFileAlreadyExist",finalMp4OutputLocation)
            response.fileExists = true
            response.msg = lang['Already exists']
            return response
        }
        if(frames.length < framesPerSecond){
            response.msg = lang.notEnoughFramesText1
            return response
        }
        activeMonitor.buildingTimelapseVideo = response
        chunkFramesAndBuildMultipleVideosThenSticth({
            frames: frames,
            listFile: concatListFile,
            fps: framesPerSecond,
            output: finalMp4OutputLocation,
            finalFileName: finalFileName
        }).then(async () => {
            // videoBuildProcess exit
            s.debugLog('videoBuildProcess exit',finalMp4OutputLocation)
            const timeNow = new Date()
            const fileStats = await fs.promises.stat(finalMp4OutputLocation)
            const details = {
                start: frames[0].time,
                end: frames[frames.length - 1].time,
            }
            s.knexQuery({
                action: "insert",
                table: "Files",
                insert: {
                    ke: ke,
                    mid: mid,
                    details: s.s(details),
                    name: finalFileName,
                    size: fileStats.size,
                    time: timeNow,
                }
            })
            s.setDiskUsedForGroup(ke,fileStats.size / 1048576,'fileBin')
            s.purgeDiskForGroup(ke)
            s.tx({
                f: 'fileBin_item_added',
                ke: ke,
                mid: mid,
                details: details,
                name: finalFileName,
                size: fileStats.size,
                time: timeNow,
                timelapseVideo: true,
            },'GRP_'+ke);
            delete(activeMonitor.buildingTimelapseVideo)
            s.debugLog("Timelapse Frames Video Done!",finalMp4OutputLocation)
        })
        response.ok = true
        response.msg = `${lang.Building}... ${lang['Please Wait...']}`
        return response
    }
    function initiateTimelapseVideoBuild({
        groupKey,
        monitorId,
        framesPerSecond,
        framesPosted,
    }){
        return new Promise((resolve,reject) => {
            let response = {ok: false}
            if(!monitorId){
                response.msg = lang['No Monitor Found, Ignoring Request']
                resolve(response)
            }else{
                const frames = []
                var n = 0
                framesPosted.forEach((frame) => {
                    var firstParam = [['ke','=',groupKey],['mid','=',monitorId],['filename','=',frame.filename]]
                    if(n !== 0)firstParam[0] = (['or']).concat(firstParam[0])
                    frames.push(...firstParam)
                    ++n
                })
                s.knexQuery({
                    action: "select",
                    columns: "*",
                    table: "Timelapse Frames",
                    where: frames
                },async (err,r) => {
                    if(r.length > 0){
                        response = await createVideoFromTimelapse(r.reverse(),framesPerSecond)
                    }
                    resolve(response)
                })
            }
        })
    }
    // Web Paths
    // // // // //
    /**
    * API : Get Timelapse images
     */
    app.get([
        config.webPaths.apiPrefix+':auth/timelapse/:ke',
        config.webPaths.apiPrefix+':auth/timelapse/:ke/:id',
        config.webPaths.apiPrefix+':auth/timelapse/:ke/:id/:date',
        config.webPaths.apiPrefix+':auth/cloudTimelapse/:ke',
        config.webPaths.apiPrefix+':auth/cloudTimelapse/:ke/:id',
        config.webPaths.apiPrefix+':auth/cloudTimelapse/:ke/:id/:date',
    ], function (req,res){
        res.setHeader('Content-Type', 'application/json');
        s.auth(req.params,function(user){
            const monitorId = req.params.id
            const groupKey = req.params.ke
            const {
                monitorPermissions,
                monitorRestrictions,
            } = s.getMonitorsPermitted(user.details,monitorId)
            const {
                isRestricted,
                isRestrictedApiKey,
                apiKeyPermissions,
            } = s.checkPermission(user);
            if(
                isRestrictedApiKey && apiKeyPermissions.watch_videos_disallowed ||
                isRestricted && (
                    monitorId && !monitorPermissions[`${monitorId}_video_view`] ||
                    monitorRestrictions.length === 0
                )
            ){
                s.closeJsonResponse(res,{ok: false, msg: lang['Not Authorized'], frames: []});
                return
            }
            var origURL = req.originalUrl.split('/')
            var videoParam = origURL[origURL.indexOf(req.params.auth) + 1]
            var dataSet = 'Timelapse Frames'
            switch(videoParam){
                case'cloudTimelapse':
                    dataSet = 'Cloud Timelapse Frames'
                break;
            }
            s.getDatabaseRows({
                monitorRestrictions: monitorRestrictions,
                table: dataSet,
                groupKey: req.params.ke,
                date: req.query.date,
                startDate: req.query.start,
                endDate: req.query.end,
                startOperator: req.query.startOperator,
                endOperator: req.query.endOperator,
                noLimit: req.query.noLimit,
                limit: req.query.limit,
                archived: req.query.archived,
                rowType: 'frames',
                endIsStartTo: true
            },(response) => {
                s.closeJsonResponse(res,response.frames)
            })
        },res,req);
    });
    /**
    * API : Build MP4 File
     */
    app.post([
        config.webPaths.apiPrefix+':auth/timelapseBuildVideo/:ke',
        config.webPaths.apiPrefix+':auth/timelapseBuildVideo/:ke/:id',
    ], function (req,res){
        res.setHeader('Content-Type', 'application/json');
        s.auth(req.params,function(user){
            const groupKey = req.params.ke
            const monitorId = req.params.id
            const actionParameter = !!req.params.action
            const {
                monitorPermissions,
                monitorRestrictions,
            } = s.getMonitorsPermitted(user.details,monitorId)
            const {
                isRestricted,
                isRestrictedApiKey,
                apiKeyPermissions,
            } = s.checkPermission(user)
            if(
                isRestrictedApiKey && apiKeyPermissions.delete_videos_disallowed ||
                isRestricted && !monitorPermissions[`${monitorId}_video_delete`]
            ){
                s.closeJsonResponse(res,{ok: false, msg: lang['Not Authorized']});
                return
            }
            const framesPerSecond = s.getPostData(req, 'fps')
            const framesPosted = s.getPostData(req, 'frames', true) || []
            initiateTimelapseVideoBuild({
                groupKey,
                monitorId,
                framesPosted,
                framesPerSecond,
            }).then((buildResponse) => {
                s.closeJsonResponse(res,buildResponse)
            })
        },res,req);
    });
    /**
    * API : Get Timelapse images
     */
    app.get([
        config.webPaths.apiPrefix+':auth/timelapse/:ke/:id/:date/:filename',
        config.webPaths.apiPrefix+':auth/timelapse/:ke/:id/:date/:filename/:action',
    ], function (req,res){
        res.setHeader('Content-Type', 'application/json');
        s.auth(req.params,function(user){
            const groupKey = req.params.ke
            const monitorId = req.params.id
            const actionParameter = !!req.params.action
            const {
                monitorPermissions,
                monitorRestrictions,
            } = s.getMonitorsPermitted(user.details,monitorId)
            const {
                isRestricted,
                isRestrictedApiKey,
                apiKeyPermissions,
            } = s.checkPermission(user)
            if(
                actionParameter && (
                    isRestrictedApiKey && apiKeyPermissions.delete_videos_disallowed ||
                    isRestricted && !monitorPermissions[`${monitorId}_video_delete`]
                ) || !actionParameter && (
                    isRestrictedApiKey && apiKeyPermissions.watch_videos_disallowed ||
                    isRestricted && monitorId && !monitorPermissions[`${monitorId}_video_view`]
                )
            ){
                s.closeJsonResponse(res,{ok: false, msg: lang['Not Authorized']});
                return
            }
            const cacheKey = req.params.ke + req.params.id + req.params.filename
            const processFrame = (frame) => {
                var fileLocation
                if(frame.details.dir){
                    fileLocation = `${s.checkCorrectPathEnding(frame.details.dir)}`
                }else{
                    fileLocation = `${s.dir.videos}`
                }
                var selectedDate = req.params.date
                if(selectedDate.indexOf('-') === -1){
                    selectedDate = req.params.filename.split('T')[0]
                }
                fileLocation = `${fileLocation}${frame.ke}/${frame.mid}_timelapse/${selectedDate}/${req.params.filename}`
                if(actionParameter === 'delete'){
                    deleteTimelapseFrame({
                        ke: frame.ke,
                        mid: frame.mid,
                        filename: req.params.filename,
                        fileLocation: fileLocation,
                    })
                    delete(timelapseFramesCache[cacheKey])
                    s.closeJsonResponse(res,{ok: true})
                }else{
                    fs.stat(fileLocation,function(err,stats){
                        if(!err){
                            res.contentType('image/jpeg')
                            res.on('finish',function(){res.end()})
                            fs.createReadStream(fileLocation).pipe(res)
                        }else{
                            s.closeJsonResponse(res,{ok: false, msg: lang[`Nothing exists`]})
                        }
                    })
                }
            }
            if(timelapseFramesCache[cacheKey]){
                processFrame(timelapseFramesCache[cacheKey])
            }else{
                s.getDatabaseRows({
                    monitorRestrictions: monitorRestrictions,
                    table: 'Timelapse Frames',
                    groupKey: req.params.ke,
                    archived: req.query.archived,
                    filename: req.params.filename,
                    limit: 1,
                    rowType: 'frames',
                    endIsStartTo: true
                },(response) => {
                    var frame = response.frames[0]
                    if(frame){
                        timelapseFramesCache[cacheKey] = frame
                        timelapseFramesCacheTimeouts[cacheKey] = setTimeout(function(){
                            delete(timelapseFramesCache[cacheKey])
                        },1000 * 60 * 10)
                        processFrame(frame)
                    }else{
                        s.closeJsonResponse(res,{ok: false, msg: lang[`Nothing exists`]})
                    }
                })
            }
        },res,req);
    });
    /**
    * Page : Get Timelapse Page (Not Modal)
     */
    app.get(config.webPaths.apiPrefix+':auth/timelapsePage/:ke', function (req,res){
        req.params.protocol=req.protocol;
        s.auth(req.params,function(user){
            // if(user.permissions.watch_stream==="0"||user.details.sub&&user.details.allmonitors!=='1'&&user.details.monitors.indexOf(req.params.id)===-1){
            //     res.end(user.lang['Not Permitted'])
            //     return
            // }
            req.params.uid = user.uid
            s.renderPage(req,res,config.renderPaths.timelapse,{
                $user: user,
                data: req.params,
                config: s.getConfigWithBranding(req.hostname),
                lang: user.lang,
                originalURL: s.getOriginalUrl(req)
            })
        },res,req);
    });
    s.onOtherWebSocketMessages((d,connection) => {
        switch(d.f){
            case'timelapseVideoBuild':
                initiateTimelapseVideoBuild({
                    groupKey: d.ke,
                    monitorId: d.mid,
                    framesPosted: d.frames,
                    framesPerSecond: d.fps,
                }).then((buildResponse) => {
                    s.tx({
                        f: 'timelapse_build_requested',
                        ke: d.ke,
                        mid: d.mid,
                        buildResponse: buildResponse,
                    },'GRP_'+d.ke);
                })
            break;
        }
    })
    function buildTimelapseVideos(){
        return new Promise((resolve,reject) => {
            var dateNow = new Date()
            var hoursNow = dateNow.getHours()
            if(hoursNow === 1){
                var dateNowMoment = moment(dateNow).utc().format('YYYY-MM-DDTHH:mm:ss')
                var dateMinusOneDay = moment(dateNow).utc().subtract(1, 'days').format('YYYY-MM-DDTHH:mm:ss')
                s.knexQuery({
                    action: "select",
                    columns: "*",
                    table: "Timelapse Frames",
                    where: [
                        ['time','=>',dateMinusOneDay],
                        ['time','=<',dateNowMoment],
                    ]
                },async function(err,frames) {
                    var groups = {}
                    frames.forEach(function(frame){
                        if(groups[frame.ke])groups[frame.ke] = {}
                        if(groups[frame.ke][frame.mid])groups[frame.ke][frame.mid] = []
                        groups[frame.ke][frame.mid].push(frame)
                    })
                    const groupKeys = Object.keys(groups);
                    for (let i = 0; i < groupKeys.length; i++) {
                        const groupKey = groupKeys[i]
                        const monitorIds = Object.keys(groups[groupKey]);
                        for (let ii = 0; ii < monitorIds.length; ii++) {
                            const monitorId = monitorIds[ii]
                            const frameSet = groups[groupKey][monitorId]
                            await createVideoFromTimelapse(frameSet,30)
                        }
                    }
                    resolve()
                })
            }else{
                resolve()
            }
        })
    }
    // Auto Build Timelapse Videos
    if(config.autoBuildTimelapseVideosDaily === true){
        setInterval(buildTimelapseVideos,1000 * 60 * 60 * 0.75)//every 45 minutes
        buildTimelapseVideos()
    }
}
