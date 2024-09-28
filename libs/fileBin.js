var fs = require('fs')
var moment = require('moment')
module.exports = function(s,config,lang,app,io){
    const getFileBinDirectory = function(monitor){
        return s.dir.fileBin + monitor.ke + '/' + monitor.mid + '/'
    }
    const getFileBinEntry = (options) => {
        return new Promise((resolve, reject) => {
            s.knexQuery({
                action: "select",
                columns: "*",
                table: "Files",
                where: options
            },(err,rows) => {
                if(rows[0]){
                    resolve(rows[0])
                }else{
                    resolve()
                }
            })
        })
    }
    const getFileBinBuffer = (file) => {
        const filePath = getFileBinPath(file);
        return fs.promises.readFile(filePath)
    }
    const getFileBinPath = (file) => {
        return getFileBinDirectory(file) + file.name;
    }
    const getFileBinEntries = (options) => {
        return new Promise((resolve, reject) => {
            s.knexQuery({
                action: "select",
                columns: "*",
                table: "Files",
                where: options
            },(err,rows) => {
                if(rows){
                    resolve(rows)
                }else{
                    resolve([])
                }
            })
        })
    }
    const updateFileBinEntry = (options) => {
        return new Promise((resolve, reject) => {
            const groupKey = options.ke
            const monitorId = options.mid
            const filename = options.name
            const update = options.update
            if(!filename){
                resolve('No Filename')
                return
            }
            if(!update){
                resolve('No Update Options')
                return
            }
            s.knexQuery({
                action: "select",
                columns: "size",
                table: "Files",
                where: {
                    ke: groupKey,
                    mid: monitorId,
                    name: filename,
                }
            },(err,rows) => {
                if(rows[0]){
                    const fileSize = rows[0].size
                    s.knexQuery({
                        action: "update",
                        table: "Files",
                        where: {
                            ke: groupKey,
                            mid: monitorId,
                            name: filename,
                        },
                        update: update
                    },(err) => {
                        resolve()
                        if(update.size){
                            s.setDiskUsedForGroup(groupKey,-(fileSize/1048576),'fileBin')
                            s.setDiskUsedForGroup(groupKey,(update.size/1048576),'fileBin')
                            s.purgeDiskForGroup(groupKey)
                        }
                    })
                }else{
                    resolve()
                }
            })
        })
    }
    const deleteFileBinEntry = (options) => {
        return new Promise((resolve, reject) => {
            const groupKey = options.ke
            const monitorId = options.mid
            const filename = options.name
            const whereQuery = {
                ke: groupKey,
                mid: monitorId,
                name: filename,
            }
            if(!filename){
                resolve('No Filename')
                return
            }
            const deleteRow = (fileSize) => {
                s.knexQuery({
                    action: "delete",
                    table: "Files",
                    where: whereQuery
                },(err,r) => {
                    resolve()
                    s.file('delete',getFileBinDirectory(whereQuery) + filename)
                    s.setDiskUsedForGroup(groupKey,-(fileSize/1048576),'fileBin')
                    s.purgeDiskForGroup(groupKey)
                })
            }
            if(options.size){
                deleteRow(options.size)
            }else{
                s.knexQuery({
                    action: "select",
                    columns: "size",
                    table: "Files",
                    where: whereQuery
                },(err,rows) => {
                    if(rows[0]){
                        const fileSize = rows[0].size
                        deleteRow(fileSize)
                    }else{
                        resolve()
                    }
                })
            }
        })
    }
    const insertFileBinEntry = (options) => {
        return new Promise((resolve, reject) => {
            const groupKey = options.ke
            const monitorId = options.mid
            const filename = options.name
            if(!filename){
                resolve('No Filename')
                return
            }
            const monitorFileBinDirectory = getFileBinDirectory({ke: groupKey,mid: monitorId,})
            const fileSize = options.size || fs.lstatSync(monitorFileBinDirectory + filename).size
            const details = options.details instanceof Object ? JSON.stringify(options.details) : options.details
            const status = options.status || 0
            const time = options.time || new Date()
            s.knexQuery({
                action: "insert",
                table: "Files",
                insert: {
                    ke: groupKey,
                    mid: monitorId,
                    name: filename,
                    size: fileSize,
                    details: details,
                    status: status,
                    time: time,
                }
            },(err) => {
                resolve()
                s.setDiskUsedForGroup(groupKey,(fileSize/1048576),'fileBin')
                s.purgeDiskForGroup(groupKey)
            })
        })
    }
    function archiveFileBinEntry(file,unarchive){
        return new Promise((resolve) => {
            s.knexQuery({
                action: "update",
                table: 'Files',
                update: {
                    archive: unarchive ? '0' : 1
                },
                where: {
                    ke: file.ke,
                    mid: file.mid,
                    name: file.name,
                }
            },function(err){
                resolve({
                    ok: !err,
                    err: err,
                    archived: !unarchive
                })
            })
        })
    }
    s.notifyFileBinUploaded = function(fileBinInsertQuery){
        s.tx(Object.assign({
            f: 'fileBin_item_added',
        },fileBinInsertQuery),'GRP_'+fileBinInsertQuery.ke);
    }
    s.getFileBinDirectory = getFileBinDirectory
    s.getFileBinEntry = getFileBinEntry
    s.getFileBinBuffer = getFileBinBuffer
    s.getFileBinPath = getFileBinPath
    s.insertFileBinEntry = insertFileBinEntry
    s.updateFileBinEntry = updateFileBinEntry
    s.deleteFileBinEntry = deleteFileBinEntry
    s.archiveFileBinEntry = archiveFileBinEntry
    /**
    * API : Get fileBin file rows
     */
    app.get([config.webPaths.apiPrefix+':auth/fileBin/:ke',config.webPaths.apiPrefix+':auth/fileBin/:ke/:id'],async (req,res) => {
        s.auth(req.params,(user) => {
            const userDetails = user.details
            const monitorId = req.params.id
            const groupKey = req.params.ke
            const hasRestrictions = userDetails.sub && userDetails.allmonitors !== '1';
            s.sqlQueryBetweenTimesWithPermissions({
                table: 'Files',
                user: user,
                groupKey: req.params.ke,
                monitorId: req.params.id,
                startTime: req.query.start,
                endTime: req.query.end,
                startTimeOperator: req.query.startOperator,
                endTimeOperator: req.query.endOperator,
                limit: req.query.limit,
                archived: req.query.archived,
                endIsStartTo: true,
                noFormat: true,
                noCount: true,
                preliminaryValidationFailed: (
                    user.permissions.get_monitors === "0"
                )
            },(response) => {
                response.forEach(function(v){
                    v.details = s.parseJSON(v.details)
                    v.href = '/'+req.params.auth+'/fileBin/'+req.params.ke+'/'+req.params.id+'/'+v.name;
                })
                s.closeJsonResponse(res,{
                    ok: true,
                    files: response
                })
            })
        },res,req);
    });
    /**
    * API : Get fileBin file
     */
    app.get(config.webPaths.apiPrefix+':auth/fileBin/:ke/:id/:file', async (req,res) => {
        s.auth(req.params,function(user){
            var failed = function(){
                res.end(user.lang['File Not Found'])
            }
            const groupKey = req.params.ke
            const monitorId = req.params.id
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
                isRestrictedApiKey && apiKeyPermissions.watch_videos_disallowed ||
                isRestricted && !monitorPermissions[`${monitorId}_video_view`]
            ){
                s.closeJsonResponse(res,{ok: false, msg: lang['Not Authorized']});
                return
            }
            s.knexQuery({
                action: "select",
                columns: "*",
                table: "Files",
                where: [
                    ['ke','=',groupKey],
                    ['mid','=',req.params.id],
                    ['name','=',req.params.file],
                    monitorRestrictions
                ]
            },(err,r) => {
                if(r && r[0]){
                    r = r[0]
                    r.details = JSON.parse(r.details)
                    const filename = req.params.file
                    const filePath = s.dir.fileBin + req.params.ke + '/' + req.params.id + (r.details.year && r.details.month && r.details.day ? '/' + r.details.year + '/' + r.details.month + '/' + r.details.day : '') + '/' + filename;
                    fs.stat(filePath,function(err,stats){
                        if(!err){
                            if(filename.endsWith('.mp4')){
                                s.streamMp4FileOverHttp(filePath,req,res,!!req.query.pureStream)
                            }else{
                                res.on('finish',function(){res.end()})
                                fs.createReadStream(filePath).pipe(res)
                            }
                        }else{
                            failed()
                        }
                    })
                }else{
                    failed()
                }
            })
        },res,req);
    });
    /**
    * API : Modify fileBin File
     */
    app.get(config.webPaths.apiPrefix+':auth/fileBin/:ke/:id/:file/:mode', function (req,res){
        let response = { ok: false };
        res.setHeader('Content-Type', 'application/json');
        s.auth(req.params,function(user){
            const monitorId = req.params.id
            const groupKey = req.params.ke
            const filename = req.params.file
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
                isRestrictedApiKey && apiKeyPermissions.delete_videos_disallowed ||
                isRestricted && !monitorPermissions[`${monitorId}_video_delete`]
            ){
                s.closeJsonResponse(res,{ok: false, msg: lang['Not Authorized']});
                return
            }
            s.knexQuery({
                action: "select",
                columns: "*",
                table: 'Files',
                where: [
                    ['ke','=',groupKey],
                    ['mid','=',monitorId],
                    ['name','=',filename]
                ],
                limit: 1
            },async (err,r) => {
                if(r && r[0]){
                    const file = r[0];
                    var details = s.parseJSON(r.details) || {}
                    switch(req.params.mode){
                        case'archive':
                            response.ok = true
                            const unarchive = s.getPostData(req,'unarchive') == '1';
                            const archiveResponse = await archiveFileBinEntry(file,unarchive)
                            response.ok = archiveResponse.ok
                            response.archived = archiveResponse.archived
                        break;
                        case'delete':
                            response.ok = true;
                            await deleteFileBinEntry(file)
                        break;
                        default:
                            response.msg = user.lang.modifyVideoText1;
                        break;
                    }
                }else{
                    response.msg = user.lang['No such file'];
                }
                s.closeJsonResponse(res,response);
            })
        },res,req);
    })
}
