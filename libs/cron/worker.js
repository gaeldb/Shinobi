const fs = require('fs');
const path = require('path');
const moment = require('moment');
const exec = require('child_process').exec;
const spawn = require('child_process').spawn;
const { parentPort, isMainThread, workerData } = require('worker_threads');
const config = workerData;
process.on('uncaughtException', function (err) {
    errorLog('uncaughtException',err);
});
if(isMainThread){
    console.log(`Shinobi now runs cron.js as child process.`)
    console.error(`Shinobi now runs cron.js as child process.`)
    setInterval(() => {
        // console.log(`Please turn off cron.js process.`)
    },1000 * 60 * 60 * 24 * 7)
    return;
}
function setDefaultConfigOptions(){
    if(config.cron===undefined)config.cron={};
    if(config.cron.deleteOld===undefined)config.cron.deleteOld=true;
    if(config.cron.deleteOrphans===undefined)config.cron.deleteOrphans=false;
    if(config.cron.deleteNoVideo===undefined)config.cron.deleteNoVideo=true;
    if(config.cron.deleteNoVideoRecursion===undefined)config.cron.deleteNoVideoRecursion=false;
    if(config.cron.deleteOverMax===undefined)config.cron.deleteOverMax=true;
    if(config.cron.deleteLogs===undefined)config.cron.deleteLogs=true;
    if(config.cron.deleteTimelpaseFrames===undefined)config.cron.deleteTimelpaseFrames=true;
    if(config.cron.deleteEvents===undefined)config.cron.deleteEvents=true;
    if(config.cron.deleteFileBins===undefined)config.cron.deleteFileBins=true;
    if(config.cron.interval===undefined)config.cron.interval=1;
    if(config.databaseType===undefined){config.databaseType='mysql'}
    if(config.databaseLogs===undefined){config.databaseLogs=false}
    if(config.debugLog===undefined){config.debugLog=false}

    if(!config.ip||config.ip===''||config.ip.indexOf('0.0.0.0')>-1)config.ip='localhost';
    if(!config.videosDir)config.videosDir = process.cwd() + '/videos/';
    if(!config.binDir){config.binDir = process.cwd() + '/fileBin/'}
}
parentPort.on('message',(data) => {
    switch(data.f){
        case'init':
            setDefaultConfigOptions()
            beginProcessing()
        break;
        case'callback':
            if(pendingCallbacks[data.rid]){
                pendingCallbacks[data.rid](...data.args)
                // console.log(data.rid,typeof pendingCallbacks[data.rid])
                delete(pendingCallbacks[data.rid])
            }
        break;
        case'start':case'restart':
            setIntervalForCron()
        break;
        case'stop':
            clearCronInterval()
        break;
    }
})
function debugLog(...args){
    if(config.debugLog === true || config.logCronInfo === true){
        console.log(...([`CRON.js DEBUG LOG ${new Date()}`].concat(args)))
    }
}
function normalLog(...args){
    console.log(...([`CRON.js LOG ${new Date()}`].concat(args)))
}
function errorLog(...args){
    console.error(...([`CRON.js ERROR LOG ${new Date()}`].concat(args)))
}
const s = {
    debugLog,
}
const pendingCallbacks = {};
function beginProcessing(){
    normalLog(`Worker Processing!`)
    const {
        checkCorrectPathEnding,
        generateRandomId,
        formattedTime,
        localToUtc,
    } = require('../basic/utils.js')(process.cwd())
    const {
        sqlDate,
        initiateDatabaseEngine
    } = require('../sql/utils.js')(s,config)
    var theCronInterval = null
    const overlapLocks = {}
    const alreadyDeletedRowsWithNoVideosOnStart = {}
    const videoDirectory = checkCorrectPathEnding(config.videosDir)
    const fileBinDirectory = checkCorrectPathEnding(config.binDir)
    const postMessage = (data) => {
        parentPort.postMessage(data)
    }
    const sendToWebSocket = (x,y) => {
        //emulate master socket emitter
        postMessage({f:'s.tx',data:x,to:y})
    }
    const deleteVideo = (x) => {
        postMessage({f:'s.deleteVideo',file:x})
    }
    const deleteFileBinEntry = (x) => {
        postMessage({f:'s.deleteFileBinEntry',file:x})
    }
    const onCronGroupBeforeProcessed = (...args) => {
        postMessage({f:'s.onCronGroupBeforeProcessed', args: args})
    }
    const onCronGroupBeforeProcessedAwaited = (...args) => {
        postMessage({f:'s.onCronGroupBeforeProcessedAwaited', args: args})
    }
    const onCronGroupProcessed = (...args) => {
        postMessage({f:'s.onCronGroupProcessed', args: args})
    }
    const onCronGroupProcessedAwaited = (...args) => {
        postMessage({f:'s.onCronGroupProcessedAwaited', args: args})
    }
    const setDiskUsedForGroup = (groupKey,size,target,videoRow) => {
        postMessage({f:'s.setDiskUsedForGroup', ke: groupKey, size: size, target: target, videoRow: videoRow})
    }
    const knexQuery = (...args) => {
        const requestId = generateRandomId();
        const callback = args.pop();
        pendingCallbacks[requestId] = callback;
        postMessage({ f: 'knexQuery', args: args, rid: requestId })
    }
    const knexQueryPromise = (options) => {
        return new Promise((resolve,reject) => {
            knexQuery(options,(err,rows) => {
                resolve({
                    ok: !err,
                    err: err,
                    rows: rows,
                })
            })
        })
    }
    const getVideoDirectory = function(e){
        if(e.mid&&!e.id){e.id=e.mid};
        if(e.details&&(e.details instanceof Object)===false){
            try{e.details=JSON.parse(e.details)}catch(err){}
        }
        if(e.details.dir&&e.details.dir!==''){
            return checkCorrectPathEnding(e.details.dir)+e.ke+'/'+e.id+'/'
        }else{
            return videoDirectory + e.ke + '/' + e.id + '/'
        }
    }
    const getTimelapseFrameDirectory = function(e){
        if(e.mid&&!e.id){e.id=e.mid}
        if(e.details&&(e.details instanceof Object)===false){
            try{e.details=JSON.parse(e.details)}catch(err){}
        }
        if(e.details&&e.details.dir&&e.details.dir!==''){
            return checkCorrectPathEnding(e.details.dir)+e.ke+'/'+e.id+'_timelapse/'
        }else{
            return videoDirectory + e.ke + '/' + e.id + '_timelapse/'
        }
    }
    const getFileBinDirectory = function(e){
        if(e.mid && !e.id){e.id = e.mid}
        return fileBinDirectory + e.ke + '/' + e.id + '/'
    }
    //filters set by the user in their dashboard
    //deleting old videos is part of the filter - config.cron.deleteOld
    const checkFilterRules = function(v){
        return new Promise((resolve,reject) => {
            //filters
            v.d.filters = v.d.filters ? v.d.filters : {}
            debugLog('Checking Basic Filters...')
            var keys = Object.keys(v.d.filters)
            if(keys.length>0){
                keys.forEach(function(m,current){
                    // b = filter
                    var b = v.d.filters[m];
                    debugLog(b)
                    if(b.enabled==="1"){
                        const whereQuery = [
                            ['ke','=',v.ke],
                            ['status','!=',"0"],
                            ['archive','!=',`1`],
                        ]
                        b.where.forEach(function(condition){
                            if(condition.p1 === 'ke'){condition.p3 = v.ke}
                            whereQuery.push([condition.p1,condition.p2 || '=',condition.p3])
                        })
                        knexQuery({
                            action: "select",
                            columns: "*",
                            table: "Videos",
                            where: whereQuery,
                            orderBy: [b.sort_by,b.sort_by_direction.toLowerCase()],
                            limit: b.limit
                        },(err,r) => {
                             if(r && r[0]){
                                if(r.length > 0 || config.debugLog === true){
                                    postMessage({f:'filterMatch',msg:r.length+' SQL rows match "'+m+'"',ke:v.ke,time:'moment()'})
                                }
                                b.cx={
                                    f:'filters',
                                    name:b.name,
                                    videos:r,
                                    time:'moment()',
                                    ke:v.ke,
                                    id:b.id
                                };
                                if(b.archive==="1"){
                                    postMessage({f:'filters',ff:'archive',videos:r,time:'moment()',ke:v.ke,id:b.id});
                                }else if(b.delete==="1"){
                                    postMessage({f:'filters',ff:'delete',videos:r,time:'moment()',ke:v.ke,id:b.id});
                                }
                                if(b.email==="1"){
                                    b.cx.ff='email';
                                    b.cx.delete=b.delete;
                                    b.cx.mail=v.mail;
                                    b.cx.execute=b.execute;
                                    b.cx.query=b.sql;
                                    postMessage(b.cx);
                                }
                                if(b.execute&&b.execute!==""){
                                    postMessage({f:'filters',ff:'execute',execute:b.execute,time:'moment()'});
                                }
                            }
                        })

                    }
                    if(current===keys.length-1){
                        //last filter
                        resolve()
                    }
                })
            }else{
                //no filters
                resolve()
            }
        })
    }
    const deleteVideosByDays = async (v,days,addedQueries) => {
        const groupKey = v.ke;
        const whereQuery = [
            ['ke','=',v.ke],
            ['archive','!=',`1`],
            ['time','<', sqlDate(days+' DAY')],
            addedQueries
        ]
        const selectResponse = await knexQueryPromise({
            action: "select",
            columns: "*",
            table: "Videos",
            where: whereQuery
        })
        const videoRows = selectResponse.rows
        let affectedRows = 0
        if(videoRows.length > 0){
            let clearSize = 0;
            var i;
            for (i = 0; i < videoRows.length; i++) {
                const row = videoRows[i];
                const dir = getVideoDirectory(row)
                const filename = formattedTime(row.time) + '.' + row.ext
                try{
                    await fs.promises.unlink(dir + filename)
                    const fileSizeMB = row.size / 1048576;
                    setDiskUsedForGroup(groupKey,-fileSizeMB,null,row)
                    sendToWebSocket({
                        f: 'video_delete',
                        filename: filename + '.' + row.ext,
                        mid: row.mid,
                        ke: row.ke,
                        time: row.time,
                        end: formattedTime(new Date,'YYYY-MM-DD HH:mm:ss')
                    },'GRP_' + row.ke)
                }catch(err){
                    normalLog('Video Delete Error',row)
                    normalLog(err)
                }
            }
            const deleteResponse = await knexQueryPromise({
                action: "delete",
                table: "Videos",
                where: whereQuery
            })
            affectedRows = deleteResponse.rows || 0
        }
        return {
            ok: true,
            affectedRows: affectedRows,
        }
    }
    const deleteOldVideos = async (v) => {
        // v = group, admin user
        if(config.cron.deleteOld === true){
            const daysOldForDeletion = v.d.days && !isNaN(v.d.days) ? parseFloat(v.d.days) : 5
            const monitorsIgnored = []
            const monitorsResponse = await knexQueryPromise({
                action: "select",
                columns: "*",
                table: "Monitors",
                where: [
                    ['ke','=',v.ke],
                ]
            })
            const monitorRows = monitorsResponse.rows
            var i;
            for (i = 0; i < monitorRows.length; i++) {
                const monitor = monitorRows[i]
                const monitorId = monitor.mid
                const details = JSON.parse(monitor.details);
                const monitorsMaxDaysToKeep = !isNaN(details.max_keep_days) ? parseFloat(details.max_keep_days) : null
                if(monitorsMaxDaysToKeep){
                    const { affectedRows } = await deleteVideosByDays(v,monitorsMaxDaysToKeep,['mid','=',monitorId])
                    const hasDeletedRows = affectedRows && affectedRows.length > 0;
                    if(hasDeletedRows || config.debugLog === true){
                        postMessage({
                            f: 'deleteOldVideosByMonitorId',
                            msg: `${affectedRows} SQL rows older than ${monitorsMaxDaysToKeep} days deleted`,
                            ke: v.ke,
                            mid: monitorId,
                            time: 'moment()',
                        })
                    }
                    monitorsIgnored.push(['mid','!=',monitorId])
                }
            }
            const { affectedRows } = await deleteVideosByDays(v,daysOldForDeletion,monitorsIgnored)
            const hasDeletedRows = affectedRows && affectedRows.length > 0;
            if(hasDeletedRows || config.debugLog === true){
                postMessage({
                    f: 'deleteOldVideos',
                    msg: `${affectedRows} SQL rows older than ${daysOldForDeletion} days deleted`,
                    ke: v.ke,
                    time: 'moment()',
                })
            }
        }
    }
    //database rows with no videos in the filesystem
    const deleteRowsWithNoVideo = function(v){
        return new Promise((resolve,reject) => {
            if(
                config.cron.deleteNoVideo===true&&(
                    config.cron.deleteNoVideoRecursion===true||
                    (config.cron.deleteNoVideoRecursion===false&&!alreadyDeletedRowsWithNoVideosOnStart[v.ke])
                )
            ){
                alreadyDeletedRowsWithNoVideosOnStart[v.ke]=true;
                knexQuery({
                    action: "select",
                    columns: "*",
                    table: "Videos",
                    where: [
                        ['ke','=',v.ke],
                        ['status','!=','0'],
                        ['archive','!=',`1`],
                        ['time','<', sqlDate('10 MINUTE')],
                    ]
                },(err,evs) => {
                    if(evs && evs[0]){
                        const videosToDelete = [];
                        evs.forEach(function(ev){
                            var filename
                            var details
                            try{
                                details = JSON.parse(ev.details)
                            }catch(err){
                                if(details instanceof Object){
                                    details = ev.details
                                }else{
                                    details = {}
                                }
                            }
                            var dir = getVideoDirectory(ev)
                            filename = formattedTime(ev.time)+'.'+ev.ext
                            fileExists = fs.existsSync(dir+filename)
                            if(fileExists !== true){
                                deleteVideo(ev)
                                sendToWebSocket({f:'video_delete',filename:filename+'.'+ev.ext,mid:ev.mid,ke:ev.ke,time:ev.time,end: formattedTime(new Date,'YYYY-MM-DD HH:mm:ss')},'GRP_'+ev.ke);
                            }
                        });
                        if(videosToDelete.length > 0 || config.debugLog === true){
                            postMessage({f:'deleteNoVideo',msg:videosToDelete.length+' SQL rows with no file deleted',ke:v.ke,time:'moment()'})
                        }
                    }
                    setTimeout(function(){
                        resolve()
                    },3000)
                })
            }else{
                resolve()
            }
        })
    }
    //info about what the application is doing
    const deleteOldLogs = function(v){
        return new Promise((resolve,reject) => {
            const daysOldForDeletion = v.d.log_days && !isNaN(v.d.log_days) ? parseFloat(v.d.log_days) : 10
            if(config.cron.deleteLogs === true && daysOldForDeletion !== 0){
                knexQuery({
                    action: "delete",
                    table: "Logs",
                    where: [
                        ['ke','=',v.ke],
                        ['time','<', sqlDate(daysOldForDeletion + ' DAY')],
                    ]
                },(err,rrr) => {
                    resolve()
                    if(err)return errorLog(err);
                    if(rrr && rrr > 0 || config.debugLog === true){
                        postMessage({f:'deleteLogs',msg: rrr + ' SQL rows older than ' + daysOldForDeletion + ' days deleted',ke:v.ke,time:'moment()'})
                    }
                })
            }else{
                resolve()
            }
        })
    }
    //still images saved
    const deleteOldTimelapseFrames = async function(v){
        const daysOldForDeletion = v.d.timelapseFrames_days && !isNaN(v.d.timelapseFrames_days) ? parseFloat(v.d.timelapseFrames_days) : 60
        if(config.cron.deleteTimelpaseFrames === true && daysOldForDeletion !== 0){
            const groupKey = v.ke;
            const whereQuery = [
                ['ke','=',v.ke],
                ['archive','!=',`1`],
                ['time','<', sqlDate(daysOldForDeletion+' DAY')],
            ]
            const selectResponse = await knexQueryPromise({
                action: "select",
                columns: "*",
                table: "Timelapse Frames",
                where: whereQuery
            })
            const videoRows = selectResponse.rows
            let affectedRows = 0
            if(videoRows.length > 0){
                const foldersDeletedFrom = [];
                let clearSize = 0;
                var i;
                for (i = 0; i < videoRows.length; i++) {
                    const row = videoRows[i];
                    const dir = getTimelapseFrameDirectory(row)
                    const filename = row.filename
                    const theDate = filename.split('T')[0]
                    const enclosingFolder = `${dir}/${theDate}/`
                    try{
                        const fileSizeMB = row.size / 1048576;
                        setDiskUsedForGroup(groupKey,-fileSizeMB,null,row)
                        sendToWebSocket({
                            f: 'timelapse_frame_delete',
                            filename: filename,
                            mid: row.mid,
                            ke: groupKey,
                            time: row.time,
                            details: row.details,
                        },'GRP_' + groupKey)
                        await fs.promises.unlink(`${enclosingFolder}${filename}`)
                        if(foldersDeletedFrom.indexOf(enclosingFolder) === -1)foldersDeletedFrom.push(enclosingFolder);
                    }catch(err){
                        normalLog('Timelapse Frame Delete Error',row)
                        normalLog(err)
                    }
                }
                for (i = 0; i < foldersDeletedFrom.length; i++) {
                    const folderPath = foldersDeletedFrom[i];
                    const folderIsEmpty = (await fs.promises.readdir(folderPath)).filter(file => file.indexOf('.jpg') > -1).length === 0;
                    if(folderIsEmpty){
                        await fs.promises.rm(folderPath, { recursive: true, force: true })
                    }
                }
                const deleteResponse = await knexQueryPromise({
                    action: "delete",
                    table: "Timelapse Frames",
                    where: whereQuery
                })
                affectedRows = deleteResponse.rows || 0
            }
            return {
                ok: true,
                affectedRows: affectedRows,
            }
        }
        return {
            ok: false
        }
    }
    //events - motion, object, etc. detections
    const deleteOldEvents = function(v){
        return new Promise((resolve,reject) => {
            const daysOldForDeletion = v.d.event_days && !isNaN(v.d.event_days) ? parseFloat(v.d.event_days) : 10
            if(config.cron.deleteEvents === true && daysOldForDeletion !== 0){
                knexQuery({
                    action: "delete",
                    table: "Events",
                    where: [
                        ['ke','=',v.ke],
                        ['archive','!=',`1`],
                        ['time','<', sqlDate(daysOldForDeletion + ' DAY')],
                    ]
                },(err,rrr) => {
                    resolve()
                    if(err)return errorLog(err);
                    if(rrr && rrr > 0 || config.debugLog === true){
                        postMessage({f:'deleteEvents',msg:rrr + ' SQL rows older than ' + daysOldForDeletion + ' days deleted',ke:v.ke,time:'moment()'})
                    }
                })
            }else{
                resolve()
            }
        })
    }
    //event counts
    const deleteOldEventCounts = function(v){
        return new Promise((resolve,reject) => {
            const daysOldForDeletion = v.d.event_days && !isNaN(v.d.event_days) ? parseFloat(v.d.event_days) : 10
            if(config.cron.deleteEvents === true && daysOldForDeletion !== 0){
                knexQuery({
                    action: "delete",
                    table: "Events Counts",
                    where: [
                        ['ke','=',v.ke],
                        ['time','<', sqlDate(daysOldForDeletion + ' DAY')],
                    ]
                },(err,rrr) => {
                    resolve()
                    if(err && err.code !== 'ER_NO_SUCH_TABLE')return errorLog(err);
                    if(rrr && rrr > 0 || config.debugLog === true){
                        postMessage({f:'deleteEvents',msg:rrr + ' SQL rows older than ' + daysOldForDeletion + ' days deleted',ke:v.ke,time:'moment()'})
                    }
                })
            }else{
                resolve()
            }
        })
    }
    //check for temporary files (special archive)
    const deleteOldFileBins = function(v){
        return new Promise((resolve,reject) => {
            const daysOldForDeletion = v.d.fileBin_days && !isNaN(v.d.fileBin_days) ? parseFloat(v.d.fileBin_days) : 10
            if(config.cron.deleteFileBins === true && daysOldForDeletion !== 0){
                var fileBinQuery = " FROM Files WHERE ke=? AND `time` < ?";
                knexQuery({
                    action: "select",
                    columns: "*",
                    table: "Files",
                    where: [
                        ['ke','=',v.ke],
                        ['archive','!=',`1`],
                        ['time','<', sqlDate(daysOldForDeletion + ' DAY')],
                    ]
                },(err,files) => {
                    if(files && files[0]){
                        //delete the files
                        files.forEach(function(file){
                            deleteFileBinEntry(file)
                        })
                        if(config.debugLog === true){
                            postMessage({
                                f: 'deleteFileBins',
                                msg: files.length + ' files older than ' + daysOldForDeletion + ' days deleted',
                                ke: v.ke,
                                time: 'moment()'
                            })
                        }
                    }
                    resolve()
                })
            }else{
                resolve()
            }
        })
    }
    //user processing function
    const processUser = async (v) => {
        if(!v){
            //no user object given, end of group list
            return
        }
        debugLog(`Group Key : ${v.ke}`)
        debugLog(`Owner : ${v.mail}`)
        if(!overlapLocks[v.ke]){
            debugLog(`Checking...`)
            overlapLocks[v.ke] = true
            v.d = JSON.parse(v.details);
            try{
                debugLog('--- Running Pre Extenders')
                onCronGroupBeforeProcessed(v)
                onCronGroupBeforeProcessedAwaited(v)
                await deleteOldVideos(v)
                debugLog('--- deleteOldVideos Complete')
                await deleteOldTimelapseFrames(v)
                debugLog('--- deleteOldTimelapseFrames Complete')
                await deleteOldLogs(v)
                debugLog('--- deleteOldLogs Complete')
                await deleteOldFileBins(v)
                debugLog('--- deleteOldFileBins Complete')
                await deleteOldEvents(v)
                debugLog('--- deleteOldEvents Complete')
                await deleteOldEventCounts(v)
                debugLog('--- deleteOldEventCounts Complete')
                await checkFilterRules(v)
                debugLog('--- checkFilterRules Complete')
                await deleteRowsWithNoVideo(v)
                debugLog('--- deleteRowsWithNoVideo Complete')
                debugLog('--- Running Post Extenders')
                onCronGroupProcessed(v)
                onCronGroupProcessedAwaited(v)
            }catch(err){
                normalLog(`Failed to Complete User : ${v.mail}`)
                normalLog(err)
            }
            //done user, unlock current, and do next
            overlapLocks[v.ke] = false;
            debugLog(`Complete Checking... ${v.mail}`)
        }else{
            debugLog(`Locked, Skipped...`)
        }
    }
    //recursive function
    const setIntervalForCron = function(){
        clearCronInterval()
        // theCronInterval = setInterval(doCronJobs,1000 * 10)
        theCronInterval = setInterval(doCronJobs,parseFloat(config.cron.interval)*60000*60)
    }
    const clearCronInterval = function(){
        clearInterval(theCronInterval)
    }
    const doCronJobs = function(){
        postMessage({
            f: 'start',
            time: 'moment()'
        })
        knexQuery({
            action: "select",
            columns: "ke,uid,details,mail",
            table: "Users",
            where: [
                ['details','NOT LIKE','%"sub"%'],
            ]
        }, async (err,rows) => {
            if(err){
                errorLog(err)
            }
            if(rows.length > 0){
                var i;
                for (i = 0; i < rows.length; i++) {
                    await processUser(rows[i])
                }
            }
        })
    }
    initiateDatabaseEngine()
    setIntervalForCron()
    doCronJobs()
}
