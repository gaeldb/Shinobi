var fs = require('fs');
module.exports = (s,config,lang) => {
    const deleteSetOfVideos = function(options,callback){
        const groupKey = options.groupKey
        const err = options.err
        const videos = options.videos
        const storageIndex = options.storageIndex
        const reRunCheck = options.reRunCheck
        var completedCheck = 0
        var whereGroup = []
        var whereQuery = [
            ['ke','=',groupKey],
        ]
        if(videos){
            videos.forEach(function(video){
                video.dir = s.getVideoDirectory(video) + s.formattedTime(video.time) + '.' + video.ext
                const queryGroup = {
                    mid: video.mid,
                    time: video.time,
                }
                if(whereGroup.length > 0)queryGroup.__separator = 'or'
                whereGroup.push(queryGroup)
                fs.rm(video.dir,function(err){
                    ++completedCheck
                    if(err){
                        fs.stat(video.dir,function(err){
                            if(!err){
                                fs.unlink(video.dir)
                            }
                        })
                    }
                    const whereGroupLength = whereGroup.length
                    if(whereGroupLength > 0 && whereGroupLength === completedCheck){
                        whereQuery[1] = whereGroup
                        s.knexQuery({
                            action: "delete",
                            table: "Videos",
                            where: whereQuery
                        },(err,info) => {
                            setTimeout(reRunCheck,1000)
                        })
                    }
                })
                if(storageIndex){
                    s.setDiskUsedForGroupAddStorage(groupKey,{
                        size: -(video.size/1048576),
                        storageIndex: storageIndex
                    })
                }else{
                    s.setDiskUsedForGroup(groupKey,-(video.size/1048576))
                }
                s.tx({
                    f: 'video_delete',
                    ff: 'over_max',
                    filename: s.formattedTime(video.time)+'.'+video.ext,
                    mid: video.mid,
                    ke: video.ke,
                    time: video.time,
                    end: s.formattedTime(new Date,'YYYY-MM-DD HH:mm:ss')
                },'GRP_'+groupKey)
            })
        }else{
            console.log(err)
        }
        if(whereGroup.length === 0){
            if(callback)callback()
        }
    }
    const deleteSetOfTimelapseFrames = function(options,callback){
        const groupKey = options.groupKey
        const err = options.err
        const frames = options.frames
        const storageIndex = options.storageIndex
        var whereGroup = []
        var whereQuery = [
            ['ke','=',groupKey],
            []
        ]
        var completedCheck = 0
        if(frames){
            frames.forEach(function(frame){
                const details = s.parseJSON(frame.details)
                var selectedDate = frame.filename.split('T')[0]
                var dir = s.getTimelapseFrameDirectory(frame)
                var timeFolder = s.formattedTime(new Date(frame.time),'YYYY-MM-DD')
                var fileLocationMid = `${dir}${timeFolder}/` + frame.filename
                const queryGroup = {
                    mid: frame.mid,
                    time: frame.time,
                }
                if(whereGroup.length > 0)queryGroup.__separator = 'or'
                whereGroup.push(queryGroup)
                fs.rm(fileLocationMid,function(err){
                    ++completedCheck
                    const whereGroupLength = whereGroup.length
                    if(whereGroupLength > 0 && whereGroupLength === completedCheck){
                        whereQuery[1] = whereGroup
                        s.knexQuery({
                            action: "delete",
                            table: "Timelapse Frames",
                            where: whereQuery
                        },() => {
                            deleteTimelapseFrames(groupKey,callback)
                        })
                    }
                })
                if(storageIndex){
                    s.setDiskUsedForGroupAddStorage(groupKey,{
                        size: -(frame.size/1048576),
                        storageIndex: storageIndex
                    },'timelapseFrames')
                }else{
                    s.setDiskUsedForGroup(groupKey,-(frame.size/1048576),'timelapseFrames')
                }
                // s.tx({
                //     f: 'timelapse_frame_delete',
                //     ff: 'over_max',
                //     filename: s.formattedTime(video.time)+'.'+video.ext,
                //     mid: video.mid,
                //     ke: video.ke,
                //     time: video.time,
                //     end: s.formattedTime(new Date,'YYYY-MM-DD HH:mm:ss')
                // },'GRP_'+groupKey)
            })
        }else{
            console.log(err)
        }
        if(whereGroup.length === 0){
            if(callback)callback()
        }
    }
    const deleteSetOfFileBinFiles = function(options,callback){
        const groupKey = options.groupKey
        const err = options.err
        const files = options.files
        var whereGroup = []
        var whereQuery = [
            ['ke','=',groupKey],
            []
        ]
        var completedCheck = 0
        if(files){
            files.forEach(function(file){
                var dir = s.getFileBinDirectory(file)
                s.debugLog(`deleting FileBin File`,`${file}`,dir)
                var fileLocationMid = `${dir}` + file.name
                const queryGroup = {
                    mid: file.mid,
                    name: file.name,
                }
                if(whereGroup.length > 0)queryGroup.__separator = 'or'
                whereGroup.push(queryGroup)
                fs.rm(fileLocationMid,function(err){
                    ++completedCheck
                    if(err){
                        fs.stat(fileLocationMid,function(err){
                            if(!err){
                                fs.unlink(fileLocationMid)
                            }
                        })
                    }
                    const whereGroupLength = whereGroup.length
                    if(whereGroupLength > 0 && whereGroupLength === completedCheck){
                        whereQuery[1] = whereGroup
                        s.knexQuery({
                            action: "delete",
                            table: "Files",
                            where: whereQuery
                        },() => {
                            deleteFileBinFiles(groupKey,callback)
                        })
                    }
                })
                s.setDiskUsedForGroup(groupKey,-(file.size/1048576),'fileBin')
            })
        }else{
            console.log(err)
        }
        if(whereGroup.length === 0){
            if(callback)callback()
        }
    }
    const deleteAddStorageVideos = function(groupKey,callback){
        reRunCheck = function(){
            s.debugLog('deleteAddStorageVideos')
            return deleteAddStorageVideos(groupKey,callback)
        }
        var currentStorageNumber = 0
        function readStorageArray(){
            const theGroup = s.group[groupKey]
            setTimeout(function(){
                reRunCheck = readStorageArray
                var storage = s.listOfStorage[currentStorageNumber]
                if(!storage){
                    //done all checks, move on to next user
                    callback()
                    return
                }
                var storageId = storage.value
                if(storageId === '' || !theGroup.addStorageUse[storageId]){
                    ++currentStorageNumber
                    readStorageArray()
                    return
                }
                var storageIndex = theGroup.addStorageUse[storageId]
                //run purge command
                const maxSize = (storageIndex.sizeLimit * (storageIndex.videoPercent / 100) * config.cron.deleteOverMaxOffset);
                if(storageIndex.usedSpaceVideos > maxSize){
                    s.knexQuery({
                        action: "select",
                        columns: "*",
                        table: "Videos",
                        where: [
                            ['ke','=',groupKey],
                            ['status','!=','0'],
                            ['archive','!=',`1`],
                            ['details','LIKE',`%"dir":"${storage.value}"%`],
                        ],
                        orderBy: ['time','asc'],
                        limit: 3
                    },(err,rows) => {
                        deleteSetOfVideos({
                            groupKey: groupKey,
                            err: err,
                            videos: rows,
                            storageIndex: storageIndex,
                            reRunCheck: () => {
                                return readStorageArray()
                            }
                        },callback)
                    })
                }else{
                    ++currentStorageNumber
                    readStorageArray()
                }
            })
        }
        readStorageArray()
    }
    const deleteAddStorageTimelapseFrames = function(groupKey,callback){
        const theGroup = s.group[groupKey]
        reRunCheck = function(){
            s.debugLog('deleteAddStorageTimelapseFrames')
            return deleteAddStorageTimelapseFrames(groupKey,callback)
        }
        var currentStorageNumber = 0
        function readStorageArray(){
            setTimeout(function(){
                reRunCheck = readStorageArray
                var storage = s.listOfStorage[currentStorageNumber]
                if(!storage){
                    //done all checks, move on to next user
                    callback()
                    return
                }
                var storageId = storage.value
                if(storageId === '' || !theGroup.addStorageUse[storageId]){
                    ++currentStorageNumber
                    readStorageArray()
                    return
                }
                var storageIndex = theGroup.addStorageUse[storageId]
                //run purge command
                const maxSize = (storageIndex.sizeLimit * (storageIndex.timelapsePercent / 100) * config.cron.deleteOverMaxOffset);
                if(storageIndex.usedSpaceTimelapseFrames > maxSize){
                    s.knexQuery({
                        action: "select",
                        columns: "*",
                        table: "Timelapse Frames",
                        where: [
                            ['ke','=',groupKey],
                            ['details','LIKE',`%"dir":"${storage.value}"%`],
                        ],
                        orderBy: ['time','asc'],
                        limit: 3
                    },(err,frames) => {
                        deleteSetOfTimelapseFrames({
                            groupKey: groupKey,
                            err: err,
                            frames: frames,
                            storageIndex: storageIndex,
                            reRunCheck: () => {
                                return readStorageArray()
                            }
                        },callback)
                    })
                }else{
                    ++currentStorageNumber
                    readStorageArray()
                }
            })
        }
        readStorageArray()
    }
    const deleteMainVideos = function(groupKey,callback){
        if(s.group[groupKey].usedSpaceVideos > (s.group[groupKey].sizeLimit * (s.group[groupKey].sizeLimitVideoPercent / 100) * config.cron.deleteOverMaxOffset)){
            s.knexQuery({
                action: "select",
                columns: "*",
                table: "Videos",
                where: [
                    ['ke','=',groupKey],
                    ['status','!=','0'],
                    ['archive','!=',`1`],
                    ['details','NOT LIKE',`%"dir"%`],
                ],
                orderBy: ['time','asc'],
                limit: 3
            },(err,rows) => {
                deleteSetOfVideos({
                    groupKey: groupKey,
                    err: err,
                    videos: rows,
                    storageIndex: null,
                    reRunCheck: () => {
                        return deleteMainVideos(groupKey,callback)
                    }
                },callback)
            })
        }else{
            callback()
        }
    }
    const deleteTimelapseFrames = function(groupKey,callback){
        //run purge command
        const maxSize = (s.group[groupKey].sizeLimit * (s.group[groupKey].sizeLimitTimelapseFramesPercent / 100) * config.cron.deleteOverMaxOffset);
        const currentlyUsedSize = s.group[groupKey].usedSpaceTimelapseFrames
        s.debugLog(`deleteTimelapseFrames`,`${currentlyUsedSize}/${maxSize}`)
        if(currentlyUsedSize > maxSize){
            s.knexQuery({
                action: "select",
                columns: "*",
                table: "Timelapse Frames",
                where: [
                    ['ke','=',groupKey],
                    ['details','NOT LIKE',`%"dir"%`],
                ],
                orderBy: ['time','asc'],
                limit: 3
            },(err,frames) => {
                deleteSetOfTimelapseFrames({
                    groupKey: groupKey,
                    err: err,
                    frames: frames,
                    storageIndex: null
                },callback)
            })
        }else{
            callback()
        }
    }
    const deleteFileBinFiles = function(groupKey,callback){
        if(config.deleteFileBinsOverMax === true){
            const maxSize = (s.group[groupKey].sizeLimit * (s.group[groupKey].sizeLimitFileBinPercent / 100) * config.cron.deleteOverMaxOffset);
            const currentlyUsedSize = s.group[groupKey].usedSpaceFilebin
            s.debugLog(`deleteFileBinFiles`,`${currentlyUsedSize}/${maxSize}`)
            if(currentlyUsedSize > maxSize){
                s.knexQuery({
                    action: "select",
                    columns: "*",
                    table: "Files",
                    where: [
                        ['ke','=',groupKey],
                        ['archive','!=',`1`],
                    ],
                    orderBy: ['time','asc'],
                    limit: 1
                },(err,files) => {
                    deleteSetOfFileBinFiles({
                        groupKey: groupKey,
                        err: err,
                        files: files,
                    },callback)
                })
            }else{
                callback()
            }
        }else{
            callback()
        }
    }
    const deleteCloudVideos = function(groupKey,storageType,storagePoint,callback){
        const whereGroup = []
        const cloudDisk = s.group[groupKey].cloudDiskUse[storageType]
        //run purge command
        if(cloudDisk.sizeLimitCheck && cloudDisk.usedSpace > (cloudDisk.sizeLimit * config.cron.deleteOverMaxOffset)){
            s.knexQuery({
                action: "select",
                columns: "*",
                table: "Cloud Videos",
                where: [
                    ['status','!=','0'],
                    ['ke','=',groupKey],
                    ['type','=',storageType],
                ],
                orderBy: ['time','asc'],
                limit: 2
            },function(err,videos) {
                if(!videos)return console.log(err)
                var whereQuery = [
                    ['ke','=',groupKey],
                ]
                var didOne = false
                videos.forEach(function(video){
                    video.dir = s.getVideoDirectory(video) + s.formattedTime(video.time) + '.' + video.ext
                    const queryGroup = {
                        mid: video.mid,
                        time: video.time,
                    }
                    if(whereGroup.length > 0)queryGroup.__separator = 'or'
                    whereGroup.push(queryGroup)
                    s.setCloudDiskUsedForGroup(groupKey,{
                        amount : -(video.size/1048576),
                        storageType : storageType
                    })
                    s.deleteVideoFromCloudExtensionsRunner({ke: groupKey},storageType,video)
                })
                const whereGroupLength = whereGroup.length
                if(whereGroupLength > 0){
                    whereQuery[1] = whereGroup
                    s.knexQuery({
                        action: "delete",
                        table: "Cloud Videos",
                        where: whereQuery
                    },() => {
                        deleteCloudVideos(groupKey,storageType,storagePoint,callback)
                    })
                }else{
                    callback()
                }
            })
        }else{
            callback()
        }
    }
    const deleteCloudTimelapseFrames = function(groupKey,storageType,storagePoint,callback){
        const whereGroup = []
        var cloudDisk = s.group[groupKey].cloudDiskUse[storageType]
        //run purge command
        if(cloudDisk.usedSpaceTimelapseFrames > (cloudDisk.sizeLimit * (s.group[groupKey].sizeLimitTimelapseFramesPercent / 100) * config.cron.deleteOverMaxOffset)){
            s.knexQuery({
                action: "select",
                columns: "*",
                table: "Cloud Timelapse Frames",
                where: [
                    ['ke','=',groupKey],
                ],
                orderBy: ['time','asc'],
                limit: 3
            },(err,frames) => {
                if(!frames)return console.log(err)
                var whereQuery = [
                    ['ke','=',groupKey],
                ]
                frames.forEach(function(frame){
                    frame.dir = s.getVideoDirectory(frame) + s.formattedTime(frame.time) + '.' + frame.ext
                    const queryGroup = {
                        mid: frame.mid,
                        time: frame.time,
                    }
                    if(whereGroup.length > 0)queryGroup.__separator = 'or'
                    whereGroup.push(queryGroup)
                    s.setCloudDiskUsedForGroup(groupKey,{
                        amount : -(frame.size/1048576),
                        storageType : storageType
                    })
                    // s.deleteVideoFromCloudExtensionsRunner({ke: groupKey},storageType,frame)
                })
                const whereGroupLength = whereGroup.length
                if(whereGroupLength > 0){
                    whereQuery[1] = whereGroup
                    s.knexQuery({
                        action: "delete",
                        table: "Cloud Timelapse Frames",
                        where: whereQuery
                    },() => {
                        deleteCloudTimelapseFrames(groupKey,storageType,storagePoint,callback)
                    })
                }else{
                    callback()
                }
            })
        }else{
            callback()
        }
    }
    function resetAllStorageCounters(groupKey){
        var storageIndexes = Object.keys(s.group[groupKey].addStorageUse)
        storageIndexes.forEach((storageIndex) => {
            s.setDiskUsedForGroupAddStorage(groupKey,{
                size: 0,
                storageIndex: storageIndex
            })
        })
        s.setDiskUsedForGroup(groupKey,0)
    }
    function createAdminUser(user){
        return new Promise((resolve,reject) => {
            const detailsColumn = Object.assign({
                "factorAuth":"0",
                "size": user.diskLimit || user.size || '',
                "days":"",
                "event_days":"",
                "log_days":"",
                "max_camera": user.cameraLimit || user.max_camera || '',
                "permissions":"all",
                "edit_size":"1",
                "edit_days":"1",
                "edit_event_days":"1",
                "edit_log_days":"1",
                "use_admin":"1",
                "use_aws_s3":"1",
                "use_whcs":"1",
                "use_sftp":"1",
                "use_webdav":"1",
                "use_discordbot":"1",
                "use_ldap":"1",
                "aws_use_global":"0",
                "b2_use_global":"0",
                "webdav_use_global":"0"
            },s.parseJSON(user.details) || {});
            const insertQuery = {
                ke: user.ke || s.gid(7),
                uid: user.uid || s.gid(6),
                mail: user.mail,
                pass: s.createHash(user.initialPassword || user.pass || s.gid()),
                details: JSON.stringify(detailsColumn)
            }
            s.knexQuery({
                action: "insert",
                table: "Users",
                insert: insertQuery
            },function(err,users) {
                resolve({
                    ok: !err,
                    inserted: !err ? insertQuery : undefined,
                    err: err
                })
            })
        })
    }
    async function getAdminUser(groupKey, uid){
        const { rows } = await s.knexQueryPromise({
            action: "select",
            columns: "ke,uid,details,mail",
            table: "Users",
            where: [
                ['uid','=', uid],
                ['ke','=', groupKey],
            ],
            limit: 1,
        });
        try{
            const user = rows[0];
            user.details = JSON.parse(user.details)
            return user
        }catch(err){
            s.systemLog(err)
            return null;
        }
    }
    return {
        getAdminUser,
        deleteSetOfVideos: deleteSetOfVideos,
        deleteSetOfTimelapseFrames: deleteSetOfTimelapseFrames,
        deleteSetOfFileBinFiles: deleteSetOfFileBinFiles,
        deleteAddStorageVideos: deleteAddStorageVideos,
        deleteMainVideos: deleteMainVideos,
        deleteTimelapseFrames: deleteTimelapseFrames,
        deleteAddStorageTimelapseFrames,
        deleteFileBinFiles: deleteFileBinFiles,
        deleteCloudVideos: deleteCloudVideos,
        deleteCloudTimelapseFrames: deleteCloudTimelapseFrames,
        resetAllStorageCounters: resetAllStorageCounters,
        createAdminUser: createAdminUser,
    }
}
