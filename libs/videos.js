var fs = require('fs');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
module.exports = function(s,config,lang){
    const {
        sendVideoToMasterNode,
    } = require('./childNode/childUtils.js')(s,config,lang)
    const {
        postProcessCompletedMp4Video,
    } = require('./video/utils.js')(s,config,lang)
    /**
     * Gets the video directory of the supplied video or monitor database row.
     * @constructor
     * @param {object} e - Monitor object or Video object. Object is a database row.
     */
    s.getVideoDirectory = function(e){
        if(e.mid&&!e.id){e.id=e.mid};
        s.checkDetails(e)
        if(e.details&&e.details.dir&&e.details.dir!==''){
            return s.checkCorrectPathEnding(e.details.dir)+e.ke+'/'+e.id+'/'
        }else{
            return s.dir.videos+e.ke+'/'+e.id+'/';
        }
    }
    /**
     * Creates available API based URLs for streaming
     * @constructor
     * @param {object} videos - Array of video objects
     * @param {object} options - Contains middle parameter of URL and auth key
     * @param [options.auth] {string} - API Key
     * @param [options.videoParam] {string} - currently only `videos` and `cloudVideos` available.
     */
    s.buildVideoLinks = function(videos,options){
        videos.forEach(function(v){
            var details = s.parseJSON(v.details)
            var queryString = []
            if(details.isUTC === true){
                queryString.push('isUTC=true')
            }else{
                v.time = s.utcToLocal(v.time)
                v.end = s.utcToLocal(v.end)
            }
            if(queryString.length > 0){
                queryString = '?'+queryString.join('&')
            }else{
                queryString = ''
            }
            if(details.type === 'googd'){
                v.ext = v.ext ? v.ext : 'mp4'
                v.href = undefined
            }else if(!v.ext && v.href){
                v.ext = v.href.split('.')
                v.ext = v.ext[v.ext.length - 1]
            }
            v.filename = s.formattedTime(v.time)+'.'+v.ext;
            if(!options.videoParam)options.videoParam = 'videos'
            var href = s.checkCorrectPathEnding(config.webPaths.apiPrefix) + options.auth+'/'+options.videoParam+'/'+v.ke+'/'+v.mid+'/'+v.filename;
            v.actionUrl = href
            v.links = {
                deleteVideo : href+'/delete' + queryString,
                changeToUnread : href+'/status/1' + queryString,
                changeToRead : href+'/status/2' + queryString
            }
            if(!v.href || options.hideRemote === true)v.href = href + queryString
            v.details = details
        })
    }
    s.insertDatabaseRow = function(e,k,callback){
        return new Promise((resolve) => {
            s.checkDetails(e)
            //save database row
            if(!k.details)k.details = {}
            if(e.details && e.details.dir && e.details.dir !== ''){
                k.details.dir = e.details.dir
            }
            const insertQuery = {
                ke: e.ke,
                mid: e.mid,
                time: k.startTime,
                ext: k.ext || e.ext,
                status: 1,
                details: s.s(k.details),
                objects: k.objects || '',
                size: k.filesize,
                end: k.endTime,
            }
            s.knexQuery({
                action: "insert",
                table: "Videos",
                insert: insertQuery
            },(err) => {
                const response = {
                    ok: !err,
                    err: err,
                    insertQuery: insertQuery,
                }
                if(callback)callback(err,response)
                resolve(response)
            })
        })
    }
    //on video completion
    s.insertCompletedVideo = function(e,k,callback){
        //e = monitor object
        //k = video insertion object
        s.checkDetails(e)
        if(!k)k={};
        e.dir = s.getVideoDirectory(e)
        k.dir = e.dir.toString()
        const activeMonitor = s.group[e.ke].activeMonitors[e.id]
        //get file directory
        k.fileExists = fs.existsSync(k.dir+k.file)
        if(k.fileExists!==true){
            k.dir = s.dir.videos+'/'+e.ke+'/'+e.id+'/'
            k.fileExists = fs.existsSync(k.dir+k.file)
            if(k.fileExists !== true){
                s.dir.addStorage.forEach(function(v){
                    if(k.fileExists !== true){
                        k.dir = s.checkCorrectPathEnding(v.path)+e.ke+'/'+e.id+'/'
                        k.fileExists = fs.existsSync(k.dir+k.file)
                    }
                })
            }
        }
        if(k.fileExists === true){
            //close video row
            k.details = k.details && k.details instanceof Object ? k.details : {}
            var listOEvents = activeMonitor.detector_motion_count || []
            var listOTags = listOEvents.filter(row => row.details.reason === 'object').map(row => row.details.matrices.map(matrix => matrix.tag).join(',')).join(',').split(',')
            if(listOTags && !k.objects){
                k.objects = [...new Set(listOTags)].filter(item => !!item).join(',');
            }else if(k.objects[0] instanceof Object){
                k.objects = k.objects.map(matrix => matrix.tag).join(',').split(',').filter(item => !!item).join(',')
            }
            k.filename = k.filename || k.file
            k.ext = k.ext || e.ext || k.filename.split('.')[1]
            k.stat = fs.statSync(k.dir+k.file)
            k.filesize = k.stat.size
            k.filesizeMB = parseFloat((k.filesize/1048576).toFixed(2))
            k.startTime = new Date(s.nameToTime(k.file))
            k.endTime = new Date(k.endTime || k.stat.mtime)
            //send event for completed recording
            if(config.childNodes.enabled === true && config.childNodes.mode === 'child' && config.childNodes.host){
                const response = {
                    mid: e.mid,
                    ke: e.ke,
                    filename: k.filename,
                    ext: k.ext,
                    size: k.filesize,
                    filesize: k.filesize,
                    objects: k.objects.substring(0, 510),
                    time: s.timeObject(k.startTime).format('YYYY-MM-DD HH:mm:ss'),
                    end: s.timeObject(k.endTime).format('YYYY-MM-DD HH:mm:ss')
                }
                var filePath = k.dir + k.filename;
                sendVideoToMasterNode(filePath,response)
            }else{
                var href = '/videos/'+e.ke+'/'+e.mid+'/'+k.filename

                const monitorEventsCounted = activeMonitor.detector_motion_count
                s.txWithSubPermissions({
                    f: 'video_build_success',
                    hrefNoAuth: href,
                    filename: k.filename,
                    mid: e.mid,
                    ke: e.ke,
                    ext: k.ext,
                    time: k.startTime,
                    size: k.filesize,
                    end: k.endTime,
                    objects: k.objects,
                    events: monitorEventsCounted && monitorEventsCounted.length > 0 ? monitorEventsCounted : null
                },'GRP_'+e.ke,'video_view')
                //purge over max
                s.purgeDiskForGroup(e.ke)
                //send new diskUsage values
                var storageIndex = s.getVideoStorageIndex(e)
                if(storageIndex){
                    s.setDiskUsedForGroupAddStorage(e.ke,{
                        size: k.filesizeMB,
                        storageIndex: storageIndex
                    })
                }else{
                    s.setDiskUsedForGroup(e.ke,k.filesizeMB)
                }
                s.onBeforeInsertCompletedVideoExtensions.forEach(function(extender){
                    extender(e,k)
                })
                s.insertDatabaseRow(e,k,(err,response) => {
                    if(callback)callback(err,response);
                    postProcessCompletedMp4Video(response.insertQuery).then((isGood) => {
                        if(!isGood)return console.error(`FAILED VIDEO INSERT`);
                        s.insertCompletedVideoExtensions.forEach(function(extender){
                            extender(e,k,response.insertQuery,response)
                        })
                    })
                })
            }
        }
        s.group[e.ke].activeMonitors[e.mid].detector_motion_count = []
    }
    s.deleteVideo = function(e){
        return new Promise((resolve) => {
            //e = video object
            s.checkDetails(e)
            e.dir = s.getVideoDirectory(e)
            if(!e.filename && e.time){
                e.filename = s.formattedTime(e.time)
            }
            var filename,
                time
            if(e.filename.indexOf('.')>-1){
                filename = e.filename
            }else{
                filename = e.filename+'.'+e.ext
            }
            if(e.filename && !e.time){
                time = s.nameToTime(filename)
            }else{
                time = e.time
            }
            time = new Date(time)
            const whereQuery = {
                ke: e.ke,
                mid: e.id,
                time: time,
            }
            s.knexQuery({
                action: "select",
                columns: "*",
                table: "Videos",
                where: whereQuery
            },(err,r) => {
                if(r && r[0]){
                    r = r[0]
                    s.tx({
                        f: 'video_delete',
                        filename: filename,
                        mid: e.id,
                        ke: e.ke,
                        time: new Date(s.nameToTime(filename)),
                        end: s.formattedTime(new Date,'YYYY-MM-DD HH:mm:ss')
                    },'GRP_'+e.ke);
                    var storageIndex = s.getVideoStorageIndex(e)
                    if(storageIndex){
                        s.setDiskUsedForGroupAddStorage(e.ke,{
                            size: -(r.size / 1048576),
                            storageIndex: storageIndex
                        })
                    }else{
                        s.setDiskUsedForGroup(e.ke,-(r.size / 1048576))
                    }
                    s.knexQuery({
                        action: "delete",
                        table: "Videos",
                        where: whereQuery
                    },(err) => {
                        if(err){
                            s.systemLog(lang['File Delete Error'] + ' : '+e.ke+' : '+' : '+e.id,err)
                        }
                    })
                    fs.rm(e.dir+filename,function(err){
                        resolve()
                    })
                }else{
                    console.log(lang['Database row does not exist'],whereQuery)
                    resolve()
                }
            })
        })
    }
    s.deleteListOfVideos = function(videos){
        var deleteSetOfVideos = function(videos){
            const whereQuery = []
            var didOne = false;
            videos.forEach(function(video){
                s.checkDetails(video)
                //e = video object
                video.dir = s.getVideoDirectory(video)
                if(!video.filename && video.time){
                    video.filename = s.formattedTime(video.time)
                }
                var filename,
                    time
                if(video.filename.indexOf('.')>-1){
                    filename = video.filename
                }else{
                    filename = video.filename+'.'+video.ext
                }
                if(video.filename && !video.time){
                    time = s.nameToTime(filename)
                }else{
                    time = video.time
                }
                time = new Date(time)
                s.tx({
                    f: 'video_delete',
                    filename: filename,
                    mid: video.mid,
                    ke: video.ke,
                    time: s.nameToTime(filename),
                    end: s.formattedTime(new Date,'YYYY-MM-DD HH:mm:ss')
                },'GRP_'+video.ke);
                var storageIndex = s.getVideoStorageIndex(video)
                if(storageIndex){
                    s.setDiskUsedForGroupAddStorage(video.ke,{
                        size: -(video.size / 1048576),
                        storageIndex: storageIndex
                    })
                }else{
                    s.setDiskUsedForGroup(video.ke,-(video.size / 1048576))
                }
                s.file('delete',video.dir + filename)
                const queryGroup = {
                    ke: video.ke,
                    mid: video.mid,
                    time: time,
                }
                if(whereQuery.length > 0)queryGroup.__separator = 'or'
                whereQuery.push(queryGroup)
            })
            s.knexQuery({
                action: "delete",
                table: "Videos",
                where: whereQuery
            },(err) => {
                if(err){
                    s.systemLog(lang['List of Videos Delete Error'],err)
                }
            })
        }
        videos.chunk(100).forEach(function(videosChunk){
            deleteSetOfVideos(videosChunk)
        })
    }
    s.deleteVideoFromCloudExtensions = {}
    s.deleteVideoFromCloudExtensionsRunner = function(e,storageType,video){
        // e = user
        if(!storageType){
            var videoDetails = JSON.parse(video.details)
            videoDetails.type = videoDetails.type || 's3'
        }
        if(s.deleteVideoFromCloudExtensions[storageType]){
            s.deleteVideoFromCloudExtensions[storageType](e,video,function(){
                s.tx(Object.assign({
                    f: 'video_delete_cloud',
                },video),'GRP_'+e.ke);
            })
        }
    }
    s.deleteVideoFromCloud = function(e,cloudType){
        // e = video object
        const whereQuery = {
            ke: e.ke,
            mid: e.mid,
            type: cloudType,
            time: new Date(e.time),
        }
        s.knexQuery({
            action: "select",
            columns: "*",
            table: "Cloud Videos",
            where: whereQuery
        },(err,r) => {
            if(r&&r[0]){
                r = r[0]
                var details = s.parseJSON(r.details) || {}
                s.knexQuery({
                    action: "delete",
                    table: "Cloud Videos",
                    where: whereQuery
                },(err) => {
                    s.deleteVideoFromCloudExtensionsRunner(e,details.type || r.type || 's3',r)
                })
            }else{
//                    console.log('Delete Failed',e)
//                    console.error(err)
            }
        })
    }
    s.orphanedVideoCheck = function(monitor,checkMax,callback,forceCheck){
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
    s.streamMp4FileOverHttp = function(filePath,req,res,pureStream){
        var ext = filePath.split('.')
        ext = ext[ext.length - 1]
        var total = fs.statSync(filePath).size;
        if (req.headers['range'] && !pureStream) {
            try{
                var range = req.headers.range;
                var parts = range.replace(/bytes=/, "").split("-");
                var partialstart = parts[0];
                var partialend = parts[1];
                var start = parseInt(partialstart, 10);
                var end = partialend ? parseInt(partialend, 10) : total-1;
                var chunksize = (end-start)+1;
                var file = fs.createReadStream(filePath, {start: start, end: end});
                req.headerWrite={ 'Content-Range': 'bytes ' + start + '-' + end + '/' + total, 'Accept-Ranges': 'bytes', 'Content-Length': chunksize, 'Content-Type': 'video/'+ext }
                req.writeCode=206
            }catch(err){
                req.headerWrite={ 'Content-Length': total, 'Content-Type': 'video/'+ext};
                var file = fs.createReadStream(filePath)
                req.writeCode=200
            }
        } else {
            req.headerWrite={ 'Content-Length': total, 'Content-Type': 'video/'+ext};
            var file = fs.createReadStream(filePath)
            req.writeCode=200
        }
        if(req.query.downloadName){
            req.headerWrite['content-disposition']='attachment; filename="'+req.query.downloadName+'"';
        }
        res.writeHead(req.writeCode,req.headerWrite);
        res.on('finish', () => {
           file.close();
        });

        res.on('close', () => {
           file.close();
        });

        res.on('disconnect', () => {
           file.close();
        });

        file.on('close',function(){
            res.end()
        });
        file.pipe(res)
        return file
    }
    s.getVideoStorageIndex = function(video){
        try{
            const monitorId = video.id || video.mid
            const details = s.parseJSON(video.details) || {}
            let storageId = details.storageId
            const activeMonitor = s.group[video.ke] && s.group[video.ke].activeMonitors[monitorId] ? s.group[video.ke].activeMonitors[monitorId] : null;
            if(activeMonitor && activeMonitor.addStorageId)storageId = activeMonitor.addStorageId;
            if(storageId){
                return s.group[video.ke].addStorageUse[storageId]
            }
        }catch(err){
            s.debugLog(err)
        }
        return null
    }
}
