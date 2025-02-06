var fs = require('fs');
var events = require('events');
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var async = require("async");
const { createQueueAwaited } = require('./common.js')
module.exports = function(s,config,lang){
    const {
        deleteSetOfVideos,
        deleteSetOfTimelapseFrames,
        deleteSetOfFileBinFiles,
        deleteAddStorageVideos,
        deleteMainVideos,
        deleteTimelapseFrames,
        deleteAddStorageTimelapseFrames,
        deleteFileBinFiles,
        deleteCloudVideos,
        deleteCloudTimelapseFrames,
        resetAllStorageCounters,
    } = require("./user/utils.js")(s,config,lang);
    require("./user/logger.js")(s,config,lang)
    let purgeDiskGroup = () => {}
    const runQuery = async.queue(function(groupKey, callback) {
        purgeDiskGroup(groupKey,callback)
    }, 1);
    if(config.cron.deleteOverMax === true){
        purgeDiskGroup = (groupKey,callback) => {
            if(s.group[groupKey]){
                if(s.group[groupKey].sizePurging !== true){
                    s.group[groupKey].sizePurging = true
                    s.debugLog(`${groupKey} deleteMainVideos`)
                    deleteMainVideos(groupKey,() => {
                        s.debugLog(`${groupKey} deleteTimelapseFrames`)
                        deleteTimelapseFrames(groupKey,() => {
                            s.debugLog(`${groupKey} deleteAddStorageTimelapseFrames`)
                            deleteAddStorageTimelapseFrames(groupKey,() => {
                                s.debugLog(`${groupKey} deleteFileBinFiles`)
                                deleteFileBinFiles(groupKey,() => {
                                    s.debugLog(`${groupKey} deleteAddStorageVideos`)
                                    deleteAddStorageVideos(groupKey,() => {
                                        s.group[groupKey].sizePurging = false
                                        s.sendDiskUsedAmountToClients(groupKey)
                                        callback();
                                    })
                                })
                            })
                        })
                    })
                }else{
                    s.sendDiskUsedAmountToClients(groupKey)
                }
            }
        }
    }
    s.purgeDiskForGroup = (groupKey) => {
        return runQuery.push(groupKey,function(){
            //...
        })
    }
    s.setDiskUsedForGroup = function(groupKey,bytes,storagePoint){
        //`bytes` will be used as the value to add or substract
        if(s.group[groupKey] && s.group[groupKey].diskUsedEmitter){
            s.group[groupKey].diskUsedEmitter.emit('set',bytes,storagePoint)
        }
    }
    s.setDiskUsedForGroupAddStorage = function(groupKey,data,storagePoint){
        if(s.group[groupKey] && s.group[groupKey].diskUsedEmitter){
            s.group[groupKey].diskUsedEmitter.emit('setAddStorage',data,storagePoint)
        }
    }
    s.purgeCloudDiskForGroup = function(e,storageType,storagePoint){
        if(s.group[e.ke].diskUsedEmitter){
            s.group[e.ke].diskUsedEmitter.emit('purgeCloud',storageType,storagePoint)
        }
    }
    s.setCloudDiskUsedForGroup = function(groupKey,usage,storagePoint){
        //`usage` will be used as the value to add or substract
        if(s.group[groupKey].diskUsedEmitter){
            s.group[groupKey].diskUsedEmitter.emit('setCloud',usage,storagePoint)
        }
    }
    s.sendDiskUsedAmountToClients = function(groupKey){
        //send the amount used disk space to connected users
        if(s.group[groupKey]&&s.group[groupKey].init){
            s.tx({
                f: 'diskUsed',
                size: s.group[groupKey].usedSpace,
                usedSpace: s.group[groupKey].usedSpace,
                usedSpaceVideos: s.group[groupKey].usedSpaceVideos,
                usedSpaceFilebin: s.group[groupKey].usedSpaceFilebin,
                usedSpaceTimelapseFrames: s.group[groupKey].usedSpaceTimelapseFrames,
                limit: s.group[groupKey].sizeLimit,
                addStorage: s.group[groupKey].addStorageUse,
            },'GRP_'+groupKey);
        }
    }
    s.sendCloudDiskUsedAmountToClients = function(groupKey){
        //send the amount used disk space to connected users
        if(s.group[groupKey]&&s.group[groupKey].init){
            s.tx({
                f: 'cloudDiskUsed',
                cloudDisks: s.group[groupKey].cloudDiskUse,
            },'GRP_'+groupKey);
        }
    }
    //user log
    s.userLog = function(e,x){
        if(e.id && !e.mid)e.mid = e.id
        if(!x||!e.mid){return}
        if(
            (e.details && e.details.sqllog === '1') ||
            e.mid.indexOf('$') > -1
        ){
            s.knexQuery({
                action: "insert",
                table: "Logs",
                insert: {
                    ke: e.ke,
                    mid: e.mid,
                    info: s.s(x),
                }
            })
        }
        const logEvent = {
            f: 'log',
            ke: e.ke,
            mid: e.mid,
            log: x,
            time: s.timeObject()
        }
        s.tx(logEvent,'GRPLOG_'+e.ke);
        s.onUserLogExtensions.forEach(function(extender){
            extender(logEvent)
        })
    }
    s.loadGroup = function(e){
        s.loadGroupExtensions.forEach(function(extender){
            extender(e)
        })
        if(!s.group[e.ke]){
            s.group[e.ke]={}
        }
        if(!s.group[e.ke].init){
            s.group[e.ke].init={}
        }
        const theGroup = s.group[e.ke]
        if(!theGroup.addStorageUse){theGroup.addStorageUse={}};
        if(!theGroup.fileBin){theGroup.fileBin={}};
        if(!theGroup.users){theGroup.users={}}
        if(!theGroup.dashcamUsers){theGroup.dashcamUsers={}}
        if(!theGroup.sizePurgeQueue){theGroup.sizePurgeQueue=[]}
        if(!theGroup.addStorageUse){theGroup.addStorageUse = {}}
        if(!e.limit||e.limit===''){e.limit=10000}else{e.limit=parseFloat(e.limit)}
        //save global space limit for group key (mb)
        theGroup.sizeLimit = e.limit || theGroup.sizeLimit || 10000
        theGroup.sizeLimitVideoPercent = parseFloat(theGroup.init.size_video_percent) || 90
        theGroup.sizeLimitTimelapseFramesPercent = parseFloat(theGroup.init.size_timelapse_percent) || 5
        theGroup.sizeLimitFileBinPercent = parseFloat(theGroup.init.size_filebin_percent) || 5
        //save global used space as megabyte value
        theGroup.usedSpace = theGroup.usedSpace || ((e.size || 0) / 1048576)
        //emit the changes to connected users
        s.sendDiskUsedAmountToClients(e.ke)
        s.sendCloudDiskUsedAmountToClients(e.ke)
        // create monitor management queue
        theGroup.startMonitorInQueue = createQueueAwaited(0.5, 1)
    }
    s.loadGroupApps = function(e){
        // e = user
        if(!s.group[e.ke].init){
            s.group[e.ke].init={};
        }
        s.knexQuery({
            action: "select",
            columns: "*",
            table: "Users",
            where: [
                ['ke','=',e.ke],
                ['details','NOT LIKE',`%"sub"%`],
            ],
            limit: 1
        },(err,r) => {
            if(r && r[0]){
                r = r[0];
                const details = JSON.parse(r.details);
                //load extenders
                s.loadGroupAppExtensions.forEach(function(extender){
                    extender(r,details)
                })
                //disk Used Emitter
                if(!s.group[e.ke].diskUsedEmitter){
                    s.group[e.ke].diskUsedEmitter = new events.EventEmitter()
                    s.group[e.ke].diskUsedEmitter.on('setCloud',function(currentChange,storagePoint){
                        var amount = currentChange.amount
                        var storageType = currentChange.storageType
                        var cloudDisk = s.group[e.ke].cloudDiskUse[storageType]
                        //validate current values
                        if(!cloudDisk.usedSpace){
                            cloudDisk.usedSpace = 0
                        }else{
                            cloudDisk.usedSpace = parseFloat(cloudDisk.usedSpace)
                        }
                        if(cloudDisk.usedSpace < 0 || isNaN(cloudDisk.usedSpace)){
                            cloudDisk.usedSpace = 0
                        }
                        //change global size value
                        cloudDisk.usedSpace = cloudDisk.usedSpace + amount
                        switch(storagePoint){
                            case'timelapseFrames':
                                cloudDisk.usedSpaceTimelapseFrames += amount
                            break;
                            case'fileBin':
                                cloudDisk.usedSpaceFilebin += amount
                            break;
                            default:
                                cloudDisk.usedSpaceVideos += amount
                            break;
                        }
                        s.sendCloudDiskUsedAmountToClients(e.ke)
                    })
                    if(config.cron.deleteOverMax === true){
                        s.group[e.ke].diskUsedEmitter.on('purgeCloud',function(storageType,storagePoint){
                            deleteCloudVideos(e.ke,storageType,storagePoint,function(){
                                deleteCloudTimelapseFrames(e.ke,storageType,storagePoint,function(){

                                })
                            })
                        })
                    }
                    //s.setDiskUsedForGroup
                    s.group[e.ke].diskUsedEmitter.on('set',function(currentChange,storageType){
                        //validate current values
                        if(!s.group[e.ke].usedSpace){
                            s.group[e.ke].usedSpace=0
                        }else{
                            s.group[e.ke].usedSpace=parseFloat(s.group[e.ke].usedSpace)
                        }
                        if(s.group[e.ke].usedSpace<0||isNaN(s.group[e.ke].usedSpace)){
                            s.group[e.ke].usedSpace=0
                        }
                        //change global size value
                        s.group[e.ke].usedSpace += currentChange
                        s.group[e.ke].usedSpace = s.group[e.ke].usedSpace < 0 ? 0 : s.group[e.ke].usedSpace
                        switch(storageType){
                            case'timelapseFrames':
                                s.group[e.ke].usedSpaceTimelapseFrames += currentChange
                                s.group[e.ke].usedSpaceTimelapseFrames = s.group[e.ke].usedSpaceTimelapseFrames < 0 ? 0 : s.group[e.ke].usedSpaceTimelapseFrames
                            break;
                            case'fileBin':
                                s.group[e.ke].usedSpaceFilebin += currentChange
                                s.group[e.ke].usedSpaceFilebin = s.group[e.ke].usedSpaceFilebin < 0 ? 0 : s.group[e.ke].usedSpaceFilebin
                            break;
                            default:
                                s.group[e.ke].usedSpaceVideos += currentChange
                                s.group[e.ke].usedSpaceVideos = s.group[e.ke].usedSpaceVideos < 0 ? 0 : s.group[e.ke].usedSpaceVideos
                            break;
                        }
                        //remove value just used from queue
                        s.sendDiskUsedAmountToClients(e.ke)
                    })
                    s.group[e.ke].diskUsedEmitter.on('setAddStorage',function(data,storageType){
                        var currentSize = data.size
                        var storageIndex = data.storageIndex
                        //validate current values
                        if(!storageIndex.usedSpace){
                            storageIndex.usedSpace = 0
                        }else{
                            storageIndex.usedSpace = parseFloat(storageIndex.usedSpace)
                        }
                        if(storageIndex.usedSpace < 0 || isNaN(storageIndex.usedSpace)){
                            storageIndex.usedSpace = 0
                        }
                        //change global size value
                        storageIndex.usedSpace += currentSize
                        switch(storageType){
                            case'timelapseFrames':
                                storageIndex.usedSpaceTimelapseFrames += currentSize
                            break;
                            case'fileBin':
                                storageIndex.usedSpaceFilebin += currentSize
                            break;
                            default:
                                storageIndex.usedSpaceVideos += currentSize
                            break;
                        }
                        //remove value just used from queue
                        s.sendDiskUsedAmountToClients(e.ke)
                    })
                }
                Object.keys(details).forEach(function(v){
                    s.group[e.ke].init[v] = details[v]
                })
            }
        })
    }
    function filterMonitorListOrder(groupKey,details){
        const loadedMonitors = s.group[groupKey].rawMonitorConfigurations
        var monitorListOrder = (details.monitorListOrder && details.monitorListOrder[0] ? details.monitorListOrder[0] : []).filter(monitorId => !!loadedMonitors[monitorId]);
        monitorListOrder = [...new Set(monitorListOrder)];
        return monitorListOrder
    }
    s.accountSettingsEdit = function(d,dontRunExtensions){
        s.knexQuery({
            action: "select",
            columns: "details",
            table: "Users",
            where: [
                ['ke','=',d.ke],
                ['uid','=',d.uid],
            ]
        },(err,r) => {
            if(r && r[0]){
                r = r[0];
                const details = JSON.parse(r.details);
                if(!details.sub || details.user_change !== "0"){
                    if(d.cnid){
                        if(details.get_server_log === '1'){
                            s.clientSocketConnection[d.cnid].join('GRPLOG_'+d.ke)
                        }else{
                            s.clientSocketConnection[d.cnid].leave('GRPLOG_'+d.ke)
                        }
                    }
                    ///unchangeable from client side, so reset them in case they did.
                    var form = d.form
                    var formDetails = s.parseJSON(form.details,{})
                    if(!dontRunExtensions){
                        s.beforeAccountSaveExtensions.forEach(function(extender){
                            extender({
                                form: form,
                                formDetails: formDetails,
                                d: details
                            })
                        })
                    }
                    //admin permissions
                    formDetails.permissions = details.permissions
                    formDetails.max_camera = details.max_camera
                    formDetails.edit_size = details.edit_size
                    formDetails.edit_days = details.edit_days
                    formDetails.use_admin = details.use_admin
                    formDetails.use_ldap = details.use_ldap
                    formDetails.landing_page = details.landing_page
                    //check
                    if(details.edit_days == "0"){
                        formDetails.days = details.days;
                    }
                    if(details.edit_size == "0"){
                        formDetails.size = details.size;
                        formDetails.addStorage = details.addStorage;
                    }
                    if(details.sub){
                        formDetails.sub = details.sub;
                        if(details.monitors){formDetails.monitors = details.monitors;}
                        if(details.allmonitors){formDetails.allmonitors = details.allmonitors;}
                        if(details.monitor_create){formDetails.monitor_create = details.monitor_create;}
                        if(details.video_delete){formDetails.video_delete = details.video_delete;}
                        if(details.video_view){formDetails.video_view = details.video_view;}
                        if(details.monitor_edit){formDetails.monitor_edit = details.monitor_edit;}
                        if(details.size){formDetails.size = details.size;}
                        if(details.days){formDetails.days = details.days;}
                    }
                    const theGroup = s.group[d.ke]
                    var newSize = parseFloat(formDetails.size) || 10000
                    //load addStorageUse
                    var currentStorageNumber = 0
                    var readStorageArray = function(){
                        var storage = s.listOfStorage[currentStorageNumber]
                        if(!storage){
                            //done all checks, move on to next user
                            return
                        }
                        var path = storage.value
                        if(path === ''){
                            ++currentStorageNumber
                            readStorageArray()
                            return
                        }
                        var detailContainer = formDetails || s.group[r.ke].init
                        var storageId = path
                        var detailsContainerAddStorage = s.parseJSON(detailContainer.addStorage)
                        if(!s.group[d.ke].addStorageUse[storageId])s.group[d.ke].addStorageUse[storageId] = {}
                        var storageIndex = s.group[d.ke].addStorageUse[storageId]
                        storageIndex.name = storage.name
                        storageIndex.path = path
                        storageIndex.usedSpace = storageIndex.usedSpace || 0
                        const storageInfoToSave = detailsContainerAddStorage && detailsContainerAddStorage[path] ? detailsContainerAddStorage[path] : {}
                        storageIndex.sizeLimit = parseFloat(storageInfoToSave.limit) || newSize
                        storageIndex.videoPercent = parseFloat(storageInfoToSave.videoPercent) || theGroup.sizeLimitVideoPercent
                        storageIndex.timelapsePercent = parseFloat(storageInfoToSave.timelapsePercent) || theGroup.sizeLimitTimelapseFramesPercent
                    }
                    readStorageArray()
                    ///
                    formDetails = s.mergeDeep(details,formDetails)
                    if(formDetails.monitorListOrder)formDetails.monitorListOrder[0] = filterMonitorListOrder(d.ke,formDetails);
                    formDetailsString = JSON.stringify(s.mergeDeep(details,formDetails))
                    ///
                    const updateQuery = {}
                    if(form.pass && form.pass !== ''){
                        form.pass = s.createHash(form.pass)
                    }else{
                        delete(form.pass)
                    }
                    delete(form.password_again)
                    Object.keys(form).forEach(function(key){
                        const value = form[key]
                        updateQuery[key] = value
                    })
                    updateQuery.details = formDetailsString
                    s.knexQuery({
                        action: "update",
                        table: "Users",
                        update: updateQuery,
                        where: [
                            ['ke','=',d.ke],
                            ['uid','=',d.uid],
                        ]
                    },() => {
                        const user = Object.assign({ke : d.ke},form)
                        if(!details.sub){
                            s.group[d.ke].sizeLimit = parseFloat(newSize)
                            resetAllStorageCounters(d.ke)
                            if(!dontRunExtensions){
                                s.unloadGroupAppExtensions.forEach(function(extender){
                                    extender(user)
                                })
                                s.loadGroupApps(d)
                            }
                        }
                        s.onAccountSaveExtensions.forEach(function(extender){
                            extender(s.group[d.ke],formDetails,user)
                        })
                        if(d.cnid)s.tx({f:'user_settings_change',uid:d.uid,ke:d.ke,form:form},d.cnid)
                    })
                }
            }
        })
    }
    s.findPreset = function(presetQueryVals,callback){
        //presetQueryVals = [ke, type, name]
        s.knexQuery({
            action: "select",
            columns: "*",
            table: "Presets",
            where: [
                ['ke','=',presetQueryVals[0]],
                ['type','=',presetQueryVals[1]],
                ['name','=',presetQueryVals[2]],
            ],
            limit: 1
        },function(err,presets) {
            var preset
            var notFound = false
            if(presets && presets[0]){
                preset = presets[0]
                s.checkDetails(preset)
            }else{
                notFound = true
            }
            callback(notFound,preset)
        })
    }
    s.checkUserPurgeLock = function(groupKey){
        var userGroup = s.group[groupKey]
        if(s.group[groupKey].usedSpace > s.group[groupKey].sizeLimit){
            s.group[groupKey].sizePurgeQueue = []
            s.group[groupKey].sizePurging = false
            s.systemLog(lang.sizePurgeLockedText + ' : ' + groupKey)
            s.onStalePurgeLockExtensions.forEach(function(extender){
                extender(groupKey,s.group[groupKey].usedSpace,s.group[groupKey].sizeLimit)
            })
        }
    }
    if(config.cron.deleteOverMax === true){
        s.checkForStalePurgeLocks = function(){
            var doCheck = function(){
                Object.keys(s.group).forEach(function(groupKey){
                    s.checkUserPurgeLock(groupKey)
                })
            }
            clearTimeout(s.checkForStalePurgeLocksInterval)
            s.checkForStalePurgeLocksInterval = setInterval(function(){
                doCheck()
            },1000 * 60 * 60)
            doCheck()
        }
    }else{
        s.checkForStalePurgeLocks = function(){}
    }
}
