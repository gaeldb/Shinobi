const fs = require('fs')
const { spawn } = require('child_process')
const async = require('async');
const path = require('path');
const moment = require('moment');
const fsP = require('fs').promises;
module.exports = (s,config,lang) => {
    const {
        ffprobe,
        splitForFFMPEG,
    } = require('../ffmpeg/utils.js')(s,config,lang)
    const {
        copyFile,
        hmsToSeconds,
        moveFile,
    } = require('../basic/utils.js')(process.cwd(),config)
    const chunkReadSize = 4096;
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
    const scanForOrphanedVideos = (monitor, options) => {
        options = options || {}
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

                // Write the `sh` script
                try{
                    fs.writeFileSync(
                        tempDirectory + 'orphanCheck.sh',
                        `find "${s.checkCorrectPathEnding(videosDirectory,true)}" -maxdepth 1 -type f -exec stat -c "%n" {} + | sort -r | head -n ${options.checkMax}`
                    );
                } catch(err) {
                    console.log('Failed scanForOrphanedVideos', monitor.ke, monitor.mid)
                    response.err = err.toString()
                    return resolve(response)
                }

                let listing = spawn('sh',[tempDirectory + 'orphanCheck.sh'])
                const onError = options.onError ? options.onError : s.systemLog

                const onExit = async () => {
                    try {
                        listing.kill('SIGTERM')
                        await fs.promises.rm(tempDirectory + 'orphanCheck.sh')
                    } catch(err) {
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
                    let filename = filePath.split('/').pop().trim()
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

                // ------------------------------------------------------------------------------
                // Inactivity logic: if no data has arrived for 10 seconds, kill the process
                // ------------------------------------------------------------------------------
                let lastDataTimestamp = Date.now()
                const INACTIVITY_TIMEOUT = 10000

                const checkInactivity = () => {
                    if(finished) return // If we've already finished, do nothing
                    const now = Date.now()
                    if(now - lastDataTimestamp >= INACTIVITY_TIMEOUT){
                        // It's been more than 10 seconds since the last data event
                        onFinish()
                    } else {
                        // Check again in 1 second
                        setTimeout(checkInactivity, 1000)
                    }
                }
                // Start the inactivity checker
                setTimeout(checkInactivity, 1000)
                // ------------------------------------------------------------------------------

                listing.stdout.on('data', async (d) => {
                    // Reset the inactivity timer
                    lastDataTimestamp = Date.now()

                    const filePathLines = d.toString().split('\n')
                    for (let i = 0; i < filePathLines.length; i++) {
                        await processLine(filePathLines[i])
                    }
                })
                listing.stderr.on('data', d => onError(d.toString()))
                listing.on('close', (code) => {
                    setTimeout(() => {
                        onFinish()
                    },1000)
                });
            } else {
                // If we are not going to check for orphans, just resolve
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
        monitorRestrictions,
        andOnly
    }){
        const theSearches = searchQuery.split(',').map(query => ['objects','LIKE',`%${query.trim()}%`]);
        const lastIndex = theSearches.length - 1;
        if(!andOnly){
            theSearches.forEach(function(item, n){
                if(n !== 0)theSearches[n] = ['or', ...item];
            });
        }
        const initialEventQuery = [
            ['ke','=',groupKey],
        ];
        if(monitorId)initialEventQuery.push(['mid','=',monitorId]);
        if(startTime)initialEventQuery.push(['time','>',startTime]);
        if(endTime)initialEventQuery.push(['end','<',endTime]);
        if(monitorRestrictions.length > 0)initialEventQuery.push(monitorRestrictions);
        initialEventQuery.push([...theSearches]);
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
            s.notifyFileBinUploaded(fileBinInsertQuery)
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
    const mergingVideos = {};
    const mergeVideos = async function({
        groupKey,
        monitorId,
        filePaths,
        outputFilePath,
        videoCodec = 'libx265',
        audioCodec = 'aac',
        onStdout = (data) => {s.systemLog(`${data}`)},
        onStderr = (data) => {s.systemLog(`${data}`)},
    }) {
        if (!Array.isArray(filePaths) || filePaths.length === 0) {
            throw new Error('First parameter must be a non-empty array of absolute file paths.');
        }
        if(mergingVideos[outputFilePath])return;
        const currentDate = new Date();
        const fileExtensions = filePaths.map(file => path.extname(file).toLowerCase());
        const allSameExtension = fileExtensions.every(ext => ext === fileExtensions[0]);
        const fileList = filePaths.map(file => `file '${file}'`).join('\n');
        const tempFileListPath = path.join(s.dir.streams, groupKey, monitorId, `video_merge_${currentDate}.txt`);
        mergingVideos[outputFilePath] = currentDate;
        try {
            await fsP.writeFile(tempFileListPath, fileList);
            let ffmpegArgs;
            // if (allSameExtension) {
            //     ffmpegArgs = [
            //         '-f', 'concat',
            //         '-safe', '0',
            //         '-i', tempFileListPath,
            //         '-c', 'copy',
            //         '-y',
            //         outputFilePath
            //     ];
            // } else {
                ffmpegArgs = [
                    '-loglevel', 'warning',
                    '-f', 'concat',
                    '-safe', '0',
                    '-i', tempFileListPath,
                    '-c:v', videoCodec,
                    '-c:a', audioCodec,
                    '-strict', '-2',
                    '-crf', '1',
                    '-y',
                    outputFilePath
                ];
            // }
            s.debugLog(fileList)
            s.debugLog(ffmpegArgs)

            await new Promise((resolve, reject) => {
                const ffmpegProcess = spawn(config.ffmpegDir, ffmpegArgs);
                ffmpegProcess.stdout.on('data', onStdout);
                ffmpegProcess.stderr.on('data', onStderr);
                ffmpegProcess.on('close', (code) => {
                    delete(mergingVideos[outputFilePath]);
                    if (code === 0) {
                        console.log(`FFmpeg process exited with code ${code}`);
                        resolve();
                    } else {
                        reject(new Error(`FFmpeg process exited with code ${code}`));
                    }
                });
                ffmpegProcess.on('error', (err) => {
                    reject(new Error(`FFmpeg error: ${err}`));
                });
            });
        } finally {
            await fsP.unlink(tempFileListPath);
        }
    };
    async function mergeVideosAndBin(videos){
        const currentTime = new Date();
        const firstVideo = videos[0];
        const lastVideo = videos[videos.length - 1];
        const groupKey = firstVideo.ke;
        const monitorId = firstVideo.mid;
        const logTarget = { ke: groupKey, mid: '$USER' };
        try{
            try{
                await fsP.stat(outputFilePath)
                return outputFilePath
            }catch(err){

            }
            const filePaths = videos.map(video => {
                const monitorConfig = s.group[video.ke].rawMonitorConfigurations[video.mid];
                const filePath = path.join(s.getVideoDirectory(video), `${s.formattedTime(video.time)}.mp4`);
                return filePath
            });
            const filename = `${s.formattedTime(firstVideo.time)}-${s.formattedTime(lastVideo.time)}-${filePaths.length}.mp4`
            const fileBinFolder = s.getFileBinDirectory(firstVideo);
            const outputFilePath = path.join(fileBinFolder, filename);

            s.userLog(logTarget,{
                type: 'mergeVideos ffmpeg START',
                msg: {
                    monitorId,
                    numberOfVideos: filePaths.length,
                }
            });
            await mergeVideos({
                groupKey,
                monitorId,
                filePaths,
                outputFilePath,
                onStdout: (data) => {
                    s.debugLog(data.toString())
                    s.userLog(logTarget,{
                        type: 'mergeVideos ffmpeg LOG',
                        msg: `${data}`
                    });
                },
                onStderr: (data) => {
                    s.debugLog(data.toString())
                    s.userLog(logTarget,{
                        type: 'mergeVideos ffmpeg ERROR',
                        msg: `${data}`
                    });
                },
            });
            const fileSize = (await fsP.stat(outputFilePath)).size;
            const fileBinInsertQuery = {
                ke: groupKey,
                mid: monitorId,
                name: filename,
                size: fileSize,
                details: {},
                status: 1,
                time: currentTime,
            }
            await s.insertFileBinEntry(fileBinInsertQuery);
            s.notifyFileBinUploaded(fileBinInsertQuery);
            return outputFilePath
        }catch(err){
            console.log('mergeVideos process ERROR', err)
            s.userLog(logTarget,{
                type: 'mergeVideos process ERROR',
                msg: `${err.toString()}`
            });
            return null;
        }
    }

    async function readChunkForMoov(filePath, start, end) {
        const stream = fs.createReadStream(filePath, { start, end });
        let hasMoov = false;

        for await (const chunk of stream) {
            if (chunk.includes('moov')) {
                hasMoov = true;
                break;
            }
        }

        return hasMoov;
    }

    async function checkMoovAtBeginning(filePath) {
        return await readChunkForMoov(filePath, 0, chunkReadSize - 1);
    }

    async function checkMoovAtEnd(filePath) {
        const stats = await fs.promises.stat(filePath);
        const fileSize = stats.size;
        return await readChunkForMoov(filePath, fileSize - chunkReadSize, fileSize - 1);
    }

    async function hasMoovAtom(filePath) {
        const foundAtBeginning = await checkMoovAtBeginning(filePath);

        if (foundAtBeginning) {
            return true;
        }

        const foundAtEnd = await checkMoovAtEnd(filePath);
        return foundAtEnd;
    }
    const addMoovAtom = async (inputFilePath, outputFilePath, videoCodec = 'libx264', audioCodec = 'aac') => {
        try {
            const ffmpegArgs = [
                '-i', inputFilePath,
                '-c:v', videoCodec,
            ];
            if(audioCodec){
                ffmpegArgs.push('-c:a', audioCodec, '-strict', '-2')
            }else{
                ffmpegArgs.push('-an')
            }
            ffmpegArgs.push(
                '-movflags', '+faststart',
                '-crf', '0',
                '-q:a', '0',
                outputFilePath
            );
            console.log(config.ffmpegDir + ' ' + ffmpegArgs.join(' '))
            return new Promise((resolve, reject) => {
                const ffmpegProcess = spawn(config.ffmpegDir, ffmpegArgs);

                ffmpegProcess.stdout.on('data', (data) => {
                    console.log(`FFmpeg stdout: ${data}`);
                });

                ffmpegProcess.stderr.on('data', (data) => {
                    console.error(`FFmpeg stderr: ${data}`);
                });

                ffmpegProcess.on('close', (code) => {
                    if (code === 0) {
                        resolve(outputFilePath);
                    } else {
                        reject(new Error(`FFmpeg process exited with code ${code}`));
                    }
                });

                ffmpegProcess.on('error', (err) => {
                    reject(err);
                });
            });
        } catch (error) {
            throw new Error(`Failed to re-encode file: ${error.message}`);
        }
    };
    async function getVideoFrameAsJpeg(filePath, seconds = 7){
        return new Promise((resolve, reject) => {
            const ffmpegArgs = [
                '-loglevel', 'warning',
                '-ss', seconds.toString(),
                '-i', filePath,
                '-frames:v', '1',
                '-q:v', '2',
                '-f', 'image2pipe',
                '-vcodec', 'mjpeg',
                'pipe:1'
            ];
            const ffmpegProcess = spawn(config.ffmpegDir, ffmpegArgs);
            let buffer = Buffer.alloc(0);
            ffmpegProcess.stdout.on('data', (data) => {
                buffer = Buffer.concat([buffer, data]);
            });

            ffmpegProcess.stderr.on('data', (data) => {
                s.debugLog(`getVideoFrameAsJpeg FFmpeg stderr: ${data}`);
            });

            ffmpegProcess.on('close', (code) => {
                if(code === 0){
                    resolve(buffer);
                }else{
                    reject(new Error(`FFmpeg process exited with code ${code}`));
                }
            });

            ffmpegProcess.on('error', (err) => {
                reject(err);
            });
        });
    };
    function getVideoPath(video){
        const videoPath = path.join(s.getVideoDirectory(video), `${s.formattedTime(video.time)}.${video.ext}`);
        return videoPath
    }
    async function saveVideoFrameToTimelapse(video, secondsIn = 7){
        // console.error(video)
        const monitorConfig = s.group[video.ke].rawMonitorConfigurations[video.mid];
        const activeMonitor = s.group[video.ke].activeMonitors[video.mid];
        const frameTime = moment(video.time).add(secondsIn, 'seconds');
        const frameDate = s.formattedTime(frameTime,'YYYY-MM-DD');
        const timelapseRecordingDirectory = s.getTimelapseFrameDirectory(monitorConfig);
        const videoPath = getVideoPath(video);
        const frameFilename = s.formattedTime(frameTime) + '.jpg';
        const location = timelapseRecordingDirectory + frameDate + '/';
        const framePath = path.join(location, frameFilename);
        try{
            await fsP.stat(framePath)
        }catch(err){
            try{
                const frameBuffer = await getVideoFrameAsJpeg(videoPath, secondsIn);
                await fsP.mkdir(location, { recursive: true })
                await fsP.writeFile(framePath, frameBuffer)
                await s.createTimelapseFrameAndInsert(activeMonitor,location,frameFilename, frameTime._d)
            }catch(err){
                s.debugLog(err)
            }
        }
        // console.error('Completed Saving Frame from New Video!', framePath)
    }
    function getVideoCodecsFromMonitorConfig(video){
        const monitorConfig = s.group[video.ke].rawMonitorConfigurations[video.mid];
        const modeIsRecord = monitorConfig.mode === 'record'
        let eventBasedVideoCodec = monitorConfig.details.detector_buffer_vcodec
        let eventBasedAudioCodec = monitorConfig.details.detector_buffer_acodec
        let recordingVideoCodec = monitorConfig.details.vcodec
        let recordingAudioCodec = monitorConfig.details.acodec
        switch(eventBasedVideoCodec){
            case null:case '':case undefined:case'auto':
                eventBasedVideoCodec = 'libx264'
            break;
        }
        switch(eventBasedAudioCodec){
            case null:case '':case undefined:case'auto':
                eventBasedAudioCodec = 'aac'
            break;
            case'no':
                eventBasedAudioCodec = null
            break;
        }
        switch(recordingVideoCodec){
            case null:case '':case undefined:case'auto':case'default':case'copy':
                recordingVideoCodec = 'libx264'
            break;
        }
        switch(recordingAudioCodec){
            case null:case '':case undefined:case'auto':case'copy':
                recordingAudioCodec = 'aac'
            break;
            case'no':
                recordingAudioCodec = null
            break;
        }
        return {
            videoCodec: modeIsRecord ? recordingVideoCodec : eventBasedVideoCodec,
            audioCodec: modeIsRecord ? recordingAudioCodec : eventBasedAudioCodec,
            recordingVideoCodec,
            recordingAudioCodec,
            eventBasedVideoCodec,
            eventBasedAudioCodec,
        }
    }
    async function postProcessCompletedMp4Video(chosenVideo){
        try {
            const video = Object.assign({
                ext: 'mp4'
            },chosenVideo);
            const videoPath = getVideoPath(video);
            // const moovExists = await hasMoovAtom(videoPath);
            // if (moovExists) {
            //     s.debugLog('The file already has a moov atom.');
            // } else {
            //     return true;
            //     // const { videoCodec, audioCodec } = getVideoCodecsFromMonitorConfig(video);
            //     // const tempPath = path.join(s.getVideoDirectory(video), `TEMP_${s.formattedTime(video.time)}.${video.ext}`);
            //     // await addMoovAtom(videoPath, tempPath, videoCodec, audioCodec);
            //     // await moveFile(tempPath, videoPath)
            //     // const newFileSize = (await fsP.stat(videoPath)).size;
            //     // const updateResponse = await s.knexQueryPromise({
            //     //     action: "update",
            //     //     table: "Videos",
            //     //     update: {
            //     //         size: newFileSize
            //     //     },
            //     //     where: [
            //     //         ['ke','=',video.ke],
            //     //         ['mid','=',video.mid],
            //     //         ['time','=',video.time],
            //     //         ['end','=',video.end],
            //     //         ['ext','=',video.ext],
            //     //     ]
            //     // });
            // }
            // await saveVideoFrameToTimelapse(video, 0)
            await saveVideoFrameToTimelapse(video, 7)
            return true;
        } catch (error) {
            console.error('Error processing MP4 file:', error);
            return false;
        }
    };
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
        mergeVideos,
        mergeVideosAndBin,
        saveVideoFrameToTimelapse,
        postProcessCompletedMp4Video,
        readChunkForMoov,
        checkMoovAtBeginning,
        checkMoovAtEnd,
        hasMoovAtom
    }
}
