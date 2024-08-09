const fs = require('fs')
const { spawn } = require('child_process')
const async = require('async');
module.exports = (s,config,lang) => {
    const {
        ffprobe,
        splitForFFMPEG,
    } = require('../ffmpeg/utils.js')(s,config,lang)
    const {
        copyFile,
        hmsToSeconds,
    } = require('../basic/utils.js')(process.cwd(),config)
    // orphanedVideoCheck : new function
    const checkIfVideoIsOrphaned = (monitor,videosDirectory,filename) => {
        const response = {ok: true}
        return new Promise((resolve,reject) => {
            fs.stat(videosDirectory + filename,(err,stats) => {
                if(!err && stats.size > 10){
                    s.knexQuery({
                        action: "select",
                        columns: "*",
                        table: "Videos",
                        where: [
                            ['ke','=',monitor.ke],
                            ['mid','=',monitor.mid],
                            ['time','=',s.nameToTime(filename)],
                        ],
                        limit: 1
                    },(err,rows) => {
                        if(!err && (!rows || !rows[0])){
                            //row does not exist, create one for video
                            var video = rows[0]
                            s.insertCompletedVideo(monitor,{
                                file : filename
                            },() => {
                                response.status = 2
                                resolve(response)
                            })
                        }else{
                            //row exists, no errors
                            response.status = 1
                            resolve(response)
                        }
                    })
                }else{
                    response.status = 0
                    resolve(response)
                }
            })
        })
    }
    const scanForOrphanedVideos = (monitor,options) => {
        // const options = {
        //     checkMax: 2
        // }
        options = options ? options : {}
        return new Promise((resolve,reject) => {
            const response = {ok: false}
            if(options.forceCheck === true || config.insertOrphans === true){
                if(!options.checkMax){
                    options.checkMax = config.orphanedVideoCheckMax || 2
                }
                let finished = false
                let orphanedFilesCount = 0;
                let videosFound = 0;
                const videosDirectory = s.getVideoDirectory(monitor)
                const tempDirectory = s.getStreamsDirectory(monitor)
                // const findCmd = [videosDirectory].concat(options.flags || ['-maxdepth','1'])
                try{
                    fs.writeFileSync(
                        tempDirectory + 'orphanCheck.sh',
                        `find "${s.checkCorrectPathEnding(videosDirectory,true)}" -maxdepth 1 -type f -exec stat -c "%n" {} + | sort -r | head -n ${options.checkMax}`
                    );
                }catch(err){
                    console.log('Failed scanForOrphanedVideos', monitor.ke, monitor.mid)
                    response.err = err.toString()
                    resolve(response)
                    return
                }
                let listing = spawn('sh',[tempDirectory + 'orphanCheck.sh'])
                // const onData = options.onData ? options.onData : () => {}
                const onError = options.onError ? options.onError : s.systemLog
                const onExit = async () => {
                    try{
                        listing.kill('SIGTERM')
                        await fs.promises.rm(tempDirectory + 'orphanCheck.sh')
                    }catch(err){
                        s.debugLog(err)
                    }
                    delete(listing)
                }
                const onFinish = () => {
                    if(!finished){
                        finished = true
                        response.ok = true
                        response.orphanedFilesCount = orphanedFilesCount
                        resolve(response)
                        onExit()
                    }
                }
                const processLine = async (filePath) => {
                    let filename = filePath.split('/')
                    filename = `${filename[filename.length - 1]}`.trim()
                    if(filename && filename.indexOf('-') > -1 && filename.indexOf('.') > -1){
                        const { status } = await checkIfVideoIsOrphaned(monitor,videosDirectory,filename)
                        if(status === 2){
                            ++orphanedFilesCount
                        }
                        ++videosFound
                        if(videosFound === options.checkMax){
                            onFinish()
                        }
                    }
                }
                listing.stdout.on('data', async (d) => {
                    const filePathLines = d.toString().split('\n')
                    var i;
                    for (i = 0; i < filePathLines.length; i++) {
                        await processLine(filePathLines[i])
                    }
                })
                listing.stderr.on('data', d=>onError(d.toString()))
                listing.on('close', (code) => {
                    // s.debugLog(`findOrphanedVideos ${monitor.ke} : ${monitor.mid} process exited with code ${code}`);
                    setTimeout(() => {
                        onFinish()
                    },1000)
                });
            }else{
                resolve(response)
            }
        })
    }
    // orphanedVideoCheck : old function
    const orphanedVideoCheck = (monitor,checkMax,callback,forceCheck) => {
        var finish = function(orphanedFilesCount){
            if(callback)callback(orphanedFilesCount)
        }
        if(forceCheck === true || config.insertOrphans === true){
            if(!checkMax){
                checkMax = config.orphanedVideoCheckMax || 2
            }

            var videosDirectory = s.getVideoDirectory(monitor)// + s.formattedTime(video.time) + '.' + video.ext
            fs.readdir(videosDirectory,function(err,files){
                if(files && files.length > 0){
                    var fiveRecentFiles = files.slice(files.length - checkMax,files.length)
                    var completedFile = 0
                    var orphanedFilesCount = 0
                    var fileComplete = function(){
                        ++completedFile
                        if(fiveRecentFiles.length === completedFile){
                            finish(orphanedFilesCount)
                        }
                    }
                    fiveRecentFiles.forEach(function(filename){
                        if(/T[0-9][0-9]-[0-9][0-9]-[0-9][0-9]./.test(filename)){
                            fs.stat(videosDirectory + filename,(err,stats) => {
                                if(!err && stats.size > 10){
                                    s.knexQuery({
                                        action: "select",
                                        columns: "*",
                                        table: "Videos",
                                        where: [
                                            ['ke','=',monitor.ke],
                                            ['mid','=',monitor.mid],
                                            ['time','=',s.nameToTime(filename)],
                                        ],
                                        limit: 1
                                    },(err,rows) => {
                                        if(!err && (!rows || !rows[0])){
                                            ++orphanedFilesCount
                                            var video = rows[0]
                                            s.insertCompletedVideo(monitor,{
                                                file : filename
                                            },() => {
                                                fileComplete()
                                            })
                                        }else{
                                            fileComplete()
                                        }
                                    })
                                }
                            })
                        }
                    })
                }else{
                    finish()
                }
            })
        }else{
            finish()
        }
    }
    function cutVideoLength(options){
        return new Promise((resolve,reject) => {
            const response = {ok: false}
            const inputFilePath = options.filePath
            const monitorId = options.mid
            const groupKey = options.ke
            const cutLength = options.cutLength || 10
            const startTime = options.startTime
            const tempDirectory = s.getStreamsDirectory(options)
            let fileExt = inputFilePath.split('.')
            fileExt = fileExt[fileExt.length -1]
            const filename = `${s.gid(10)}.${fileExt}`
            const videoOutPath = `${tempDirectory}${filename}`
            const ffmpegCmd = ['-loglevel','warning','-i', inputFilePath, '-c','copy','-t',`${cutLength}`,videoOutPath]
            if(startTime){
                ffmpegCmd.splice(2, 0, "-ss")
                ffmpegCmd.splice(3, 0, `${startTime}`)
                s.debugLog(`cutVideoLength ffmpegCmd with startTime`,ffmpegCmd)
            }
            const cuttingProcess = spawn(config.ffmpegDir,ffmpegCmd)
            cuttingProcess.stderr.on('data',(data) => {
                const err = data.toString()
                s.debugLog('cutVideoLength STDERR',options,err)
            })
            cuttingProcess.on('close',(data) => {
                fs.stat(videoOutPath,(err) => {
                    if(!err){
                        response.ok = true
                        response.filename = filename
                        response.filePath = videoOutPath
                        setTimeout(() => {
                            s.file('delete',videoOutPath)
                        },1000 * 60 * 3)
                    }else{
                        s.debugLog('cutVideoLength:readFile',options,err)
                    }
                    resolve(response)
                })
            })
        })
    }
    async function getVideosBasedOnTagFoundInMatrixOfAssociatedEvent({
        groupKey,
        monitorId,
        startTime,
        endTime,
        searchQuery,
        monitorRestrictions
    }){
        const initialEventQuery = [
            ['ke','=',groupKey],
            ['objects','LIKE',`%${searchQuery}%`],
        ]
        if(monitorId)initialEventQuery.push(['mid','=',monitorId]);
        if(startTime)initialEventQuery.push(['time','>',startTime]);
        if(endTime)initialEventQuery.push(['end','<',endTime]);
        if(monitorRestrictions)initialEventQuery.push(monitorRestrictions);
        const videoSelectResponse = await s.knexQueryPromise({
            action: "select",
            columns: "*",
            table: "Videos",
            orderBy: ['time','desc'],
            where: initialEventQuery
        });
        return videoSelectResponse
    }
    async function stitchMp4Files(options){
        return new Promise((resolve,reject) => {
            const concatListFile = options.listFile
            const finalMp4OutputLocation = options.output
            const commandString = `-y -threads 1 -f concat -safe 0 -i "${concatListFile}" -c:v copy -an -preset ultrafast "${finalMp4OutputLocation}"`
            s.debugLog("stitchMp4Files",commandString)
            const videoBuildProcess = spawn(config.ffmpegDir,splitForFFMPEG(commandString))
            videoBuildProcess.stdout.on('data',function(data){
                s.debugLog('stdout',finalMp4OutputLocation,data.toString())
            })
            videoBuildProcess.stderr.on('data',function(data){
                s.debugLog('stderr',finalMp4OutputLocation,data.toString())
            })
            videoBuildProcess.on('exit',async function(data){
                resolve()
            })
        })
    }
    const fixingAlready = {}
    function reEncodeVideoAndReplace(videoRow){
        return new Promise((resolve,reject) => {
            const response = {ok: true}
            const fixingId = `${videoRow.ke}${videoRow.mid}${videoRow.time}`
            if(fixingAlready[fixingId]){
                response.ok = false
                response.msg = lang['Already Processing']
                resolve(response)
            }else{
                const filename = s.formattedTime(videoRow.time)+'.'+videoRow.ext
                const tempFilename = s.formattedTime(videoRow.time)+'.reencoding.'+videoRow.ext
                const videoFolder = s.getVideoDirectory(videoRow)
                const inputFilePath = `${videoFolder}${filename}`
                const outputFilePath = `${videoFolder}${tempFilename}`
                const commandString = `-y -threads 1 -re -i "${inputFilePath}" -c:v copy -c:a copy -preset ultrafast "${outputFilePath}"`
                fixingAlready[fixingId] = true
                const videoBuildProcess = spawn(config.ffmpegDir,splitForFFMPEG(commandString))
                videoBuildProcess.stdout.on('data',function(data){
                    s.debugLog('stdout',outputFilePath,data.toString())
                })
                videoBuildProcess.stderr.on('data',function(data){
                    s.debugLog('stderr',outputFilePath,data.toString())
                })
                videoBuildProcess.on('exit',async function(data){
                    fixingAlready[fixingId] = false
                    try{
                        function failed(err){
                            response.ok = false
                            response.err = err
                            resolve(response)
                        }
                        const newFileStats = await fs.promises.stat(outputFilePath)
                        await fs.promises.rm(inputFilePath)
                        let readStream = fs.createReadStream(outputFilePath);
                        let writeStream = fs.createWriteStream(inputFilePath);
                        readStream.pipe(writeStream);
                        writeStream.on('finish', async () => {
                            resolve(response)
                            await fs.promises.rm(outputFilePath)
                        });
                        writeStream.on('error', failed);
                        readStream.on('error', failed);
                    }catch(err){
                        failed()
                    }
                })
            }
        })
    }
    const reEncodeVideoAndBinOriginalQueue = {}
    function reEncodeVideoAndBinOriginalAddToQueue(data){
        const groupKey = data.video.ke
        if(!reEncodeVideoAndBinOriginalQueue[groupKey]){
            reEncodeVideoAndBinOriginalQueue[groupKey] = async.queue(function(data, callback) {
                reEncodeVideoAndBinOriginal(data).then((response) => {
                    callback(response)
                })
            }, 1);
        }
        return new Promise((resolve) => {
            reEncodeVideoAndBinOriginalQueue[groupKey].push(data, function(response){
                resolve(response)
            })
        })
    }
    function reEncodeVideoAndBinOriginal({
        video,
        targetVideoCodec,
        targetAudioCodec,
        targetQuality,
        targetExtension,
        doSlowly,
        onPercentChange,
        automated,
    }){
        targetVideoCodec = targetVideoCodec || `copy`
        targetAudioCodec = targetAudioCodec || `copy`
        targetQuality = targetQuality || ``
        onPercentChange = onPercentChange || function(){};
        if(!targetVideoCodec || !targetAudioCodec || !targetQuality){
            switch(targetExtension){
                case'mp4':
                    targetVideoCodec = `libx264`
                    targetAudioCodec = `aac -strict -2`
                    targetQuality = `-crf 1`
                break;
                case'webm':
                case'mkv':
                    targetVideoCodec = `vp9`
                    targetAudioCodec = `libopus`
                    targetQuality = `-q:v 1 -b:a 96K`
                break;
            }
        }
        const response = {ok: true}
        const groupKey = video.ke
        const monitorId = video.mid
        const filename = s.formattedTime(video.time)+'.'+video.ext
        const tempFilename = s.formattedTime(video.time)+'.reencoding.'+ targetExtension
        const finalFilename = s.formattedTime(video.time)+'.'+ targetExtension
        const tempFolder = s.getStreamsDirectory(video)
        const videoFolder = s.getVideoDirectory(video)
        const fileBinFolder = s.getFileBinDirectory(video)
        const inputFilePath = `${videoFolder}${filename}`
        const fileBinFilePath = `${fileBinFolder}${filename}`
        const outputFilePath = `${tempFolder}${tempFilename}`
        const finalFilePath = `${videoFolder}${finalFilename}`
        const fixingId = `${video.ke}${video.mid}${video.time}`
        return new Promise(async (resolve,reject) => {
            function completeResolve(data){
                s.tx({
                    f: 'video_compress_completed',
                    ke: groupKey,
                    mid: monitorId,
                    oldName: filename,
                    name: finalFilename,
                    automated: !!automated,
                    success: !!data.ok,
                },'GRP_'+groupKey);
                resolve(data)
            }
            try{
                if(fixingAlready[fixingId]){
                    response.ok = false
                    response.msg = lang['Already Processing']
                    resolve(response)
                }else{
                    const inputFileStats = await fs.promises.stat(inputFilePath)
                    const originalFileInfo = (await ffprobe(inputFilePath,inputFilePath)).result
                    const videoDuration = originalFileInfo.format.duration
                    const commandString = `-y ${doSlowly ? `-re -threads 1` : ''} -i "${inputFilePath}" -c:v ${targetVideoCodec} -c:a ${targetAudioCodec} ${targetQuality} "${outputFilePath}"`
                    fixingAlready[fixingId] = true
                    s.tx({
                        f: 'video_compress_started',
                        ke: groupKey,
                        mid: monitorId,
                        oldName: filename,
                        name: finalFilename,
                    },'GRP_'+groupKey);
                    const videoBuildProcess = spawn(config.ffmpegDir,splitForFFMPEG(commandString))
                    videoBuildProcess.stdout.on('data',function(data){
                        s.debugLog('stdout',outputFilePath,data.toString())
                    })
                    videoBuildProcess.stderr.on('data',function(data){
                        const text = data.toString()
                        if(text.includes('frame=')){
                            const durationSoFar = hmsToSeconds(text.split('time=')[1].trim().split(/(\s+)/)[0])
                            const percent = (durationSoFar / videoDuration * 100).toFixed(1)
                            s.tx({
                                f: 'video_compress_percent',
                                ke: groupKey,
                                mid: monitorId,
                                oldName: filename,
                                name: finalFilename,
                                percent: percent,
                            },'GRP_'+groupKey);
                            onPercentChange(percent)
                            s.debugLog('stderr',outputFilePath,`${percent}%`)
                        }else{
                            s.debugLog('stderr',lang['Compression Info'],text)
                        }
                    })
                    videoBuildProcess.on('exit',async function(data){
                        fixingAlready[fixingId] = false
                        try{
                            // check that new file is existing
                            const newFileStats = await fs.promises.stat(outputFilePath)
                            // move old file to fileBin
                            await copyFile(inputFilePath,fileBinFilePath)
                            const fileBinInsertQuery = {
                                ke: video.ke,
                                mid: video.mid,
                                name: filename,
                                size: video.size,
                                details: video.details,
                                status: video.status,
                                time: video.time,
                            }
                            await s.insertFileBinEntry(fileBinInsertQuery)
                            // delete original
                            await s.deleteVideo(video)
                            // copy temp file to final path
                            await copyFile(outputFilePath,finalFilePath)
                            await fs.promises.rm(outputFilePath)
                            s.insertCompletedVideo({
                                id: video.mid,
                                mid: video.mid,
                                ke: video.ke,
                                ext: targetExtension,
                            },{
                                file: finalFilename,
                                objects: video.objects,
                                endTime: video.end,
                                ext: targetExtension,
                            },function(){
                                completeResolve({
                                    ok: true,
                                    path: finalFilePath,
                                    time: video.time,
                                    fileBin: fileBinInsertQuery,
                                    videoCodec: targetVideoCodec,
                                    audioCodec: targetAudioCodec,
                                    videoQuality: targetQuality,
                                })
                            })
                        }catch(err){
                            response.ok = false
                            response.err = err
                            completeResolve(response)
                        }
                    })
                }
            }catch(err){
                response.ok = false
                response.err = err
                completeResolve(response)
            }
        })
    }
    function archiveVideo(video,unarchive){
        return new Promise((resolve) => {
            s.knexQuery({
                action: "update",
                table: 'Videos',
                update: {
                    archive: unarchive ? '0' : 1
                },
                where: {
                    ke: video.ke,
                    mid: video.mid,
                    time: video.time,
                }
            },function(errVideos){
                s.knexQuery({
                    action: "update",
                    table: 'Events',
                    update: {
                        archive: unarchive ? '0' : 1
                    },
                    where: [
                        ['ke','=',video.ke],
                        ['mid','=',video.mid],
                        ['time','>=',video.time],
                        ['time','<=',video.end],
                    ]
                },function(errEvents){
                    s.knexQuery({
                        action: "update",
                        table: 'Timelapse Frames',
                        update: {
                            archive: unarchive ? '0' : 1
                        },
                        limit: 1,
                        where: [
                            ['ke','=',video.ke],
                            ['mid','=',video.mid],
                            ['time','>=',video.time],
                            ['time','<=',video.end],
                        ]
                    },function(errTimelapseFrames){
                        resolve({
                            ok: !errVideos && !errEvents && !errTimelapseFrames,
                            err: errVideos || errEvents || errTimelapseFrames ? {
                                errVideos,
                                errEvents,
                                errTimelapseFrames,
                            } : undefined,
                            archived: !unarchive
                        })
                    })
                })
            })
        })
    }
    async function sliceVideo(video,{
        startTime,
        endTime,
    }){
        const response = {ok: false}
        if(!startTime || !endTime){
            response.msg = 'Missing startTime or endTime!'
            return response
        }
        try{
            const groupKey = video.ke
            const monitorId = video.mid
            const filename = s.formattedTime(video.time) + '.' + video.ext
            const finalFilename = s.formattedTime(video.time) + `-sliced-${s.gid(5)}.` + video.ext
            const videoFolder = s.getVideoDirectory(video)
            const fileBinFolder = s.getFileBinDirectory(video)
            const inputFilePath = `${videoFolder}${filename}`
            const fileBinFilePath = `${fileBinFolder}${finalFilename}`
            const cutLength = parseFloat(endTime) - parseFloat(startTime);
            s.debugLog(`sliceVideo start slice...`)
            const cutProcessResponse = await cutVideoLength({
                ke: groupKey,
                mid: monitorId,
                cutLength,
                startTime,
                filePath: inputFilePath,
            });
            s.debugLog(`sliceVideo cutProcessResponse`,cutProcessResponse)
            const newFilePath = cutProcessResponse.filePath
            const copyResponse = await copyFile(newFilePath,fileBinFilePath)
            const fileSize = (await fs.promises.stat(fileBinFilePath)).size
            s.debugLog(`sliceVideo copyResponse`,copyResponse)
            const fileBinInsertQuery = {
                ke: groupKey,
                mid: monitorId,
                name: finalFilename,
                size: fileSize,
                details: video.details,
                status: 1,
                time: video.time,
            }
            await s.insertFileBinEntry(fileBinInsertQuery)
            s.tx(Object.assign({
                f: 'fileBin_item_added',
                slicedVideo: true,
            },fileBinInsertQuery),'GRP_'+video.ke);
            response.ok = true
        }catch(err){
            response.err = err
            s.debugLog('sliceVideo ERROR',err)
        }
        return response
    }
    return {
        reEncodeVideoAndReplace,
        stitchMp4Files,
        orphanedVideoCheck,
        scanForOrphanedVideos,
        cutVideoLength,
        getVideosBasedOnTagFoundInMatrixOfAssociatedEvent,
        reEncodeVideoAndBinOriginal,
        reEncodeVideoAndBinOriginalAddToQueue,
        archiveVideo,
        sliceVideo,
    }
}
