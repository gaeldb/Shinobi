
var fs = require('fs');
var moment = require('moment');
var crypto = require('crypto');
var exec = require('child_process').exec;
var execSync = require('child_process').execSync;
module.exports = function(s,config,lang,io){
    const {
        scanForOrphanedVideos
    } = require('./video/utils.js')(s,config,lang)
    const {
        checkSubscription,
        checkAgainSubscription,
    } = require('./basic/utils.js')(process.cwd(),config)
    const {
        checkForStaticUsers
    } = require('./user/startup.js')(s,config,lang,io)
    return new Promise((resolve, reject) => {
        var checkedAdminUsers = {}
        console.log('FFmpeg version : '+s.ffmpegVersion)
        console.log('Node.js version : '+process.version)
        s.processReady = function(){
            s.timeReady = new Date()
            delete(checkedAdminUsers)
            resolve()
            s.systemLog(lang.startUpText5)
            s.onProcessReadyExtensions.forEach(function(extender){
                extender(true)
            })
            process.send('ready')
        }
        var checkForTerminalCommands = function(callback){
            var next = function(){
                if(callback)callback()
            }
            if(!s.isWin && s.packageJson.mainDirectory !== '.'){
                var etcPath = '/etc/shinobisystems/cctv.txt'
                fs.stat(etcPath,function(err,stat){
                    if(err || !stat){
                        exec('node '+ s.mainDirectory + '/INSTALL/terminalCommands.js',function(err){
                            if(err)console.log(err)
                        })
                    }
                    next()
                })
            }else{
                next()
            }
        }
        var loadedAccounts = []
        var foundMonitors = []
        var loadMonitors = async function(callback){
            for (let i = 0; i < s.beforeMonitorsLoadedOnStartupExtensions.length; i++) {
                await s.beforeMonitorsLoadedOnStartupExtensions[i]()
            }
            s.systemLog(lang.startUpText4)
            //preliminary monitor start
            s.knexQuery({
                action: "select",
                columns: "*",
                table: "Monitors",
            },function(err,monitors) {
                foundMonitors = monitors
                if(err){s.systemLog('Startup Error', err.toString())}
                if(monitors && monitors[0]){
                    var didNotLoad = 0
                    var loadCompleted = 0
                    var orphanedVideosForMonitors = {}
                    var loadMonitor = function(monitor){
                        const checkAnother = function(){
                            ++loadCompleted
                            if(monitors[loadCompleted]){
                                loadMonitor(monitors[loadCompleted])
                            }else{
                                if(didNotLoad > 0)console.log(`${didNotLoad} Monitor${didNotLoad === 1 ? '' : 's'} not loaded because Admin user does not exist for them. It may have been deleted.`);
                                callback()
                            }
                        }
                        if(checkedAdminUsers[monitor.ke]){
                            setTimeout(async function(){
                                if(!orphanedVideosForMonitors[monitor.ke])orphanedVideosForMonitors[monitor.ke] = {}
                                if(!orphanedVideosForMonitors[monitor.ke][monitor.mid])orphanedVideosForMonitors[monitor.ke][monitor.mid] = 0
                                s.initiateMonitorObject(monitor)
                                s.group[monitor.ke].rawMonitorConfigurations[monitor.mid] = monitor
                                s.sendMonitorStatus({
                                    id: monitor.mid,
                                    ke: monitor.ke,
                                    status: 'Stopped',
                                    code: 5
                                });
                                const monObj = Object.assign({},monitor,{id : monitor.mid})
                                await s.camera('stop',monObj);
                                if(!config.safeMode)await s.camera(monitor.mode,monObj);
                                checkAnother()
                            },1000)
                        }else{
                            ++didNotLoad
                            checkAnother()
                        }
                    }
                    loadMonitor(monitors[loadCompleted])
                }else{
                    callback()
                }
            })
        }
        var checkForOrphanedVideos = async function(callback){
            var monitors = foundMonitors
            if(monitors && monitors[0]){
                var loadCompleted = 0
                var orphanedVideosForMonitors = {}
                var checkForOrphanedVideosForMonitor = async function(monitor){
                    if(!orphanedVideosForMonitors[monitor.ke])orphanedVideosForMonitors[monitor.ke] = {}
                    if(!orphanedVideosForMonitors[monitor.ke][monitor.mid])orphanedVideosForMonitors[monitor.ke][monitor.mid] = 0
                    try{
                        await fs.promises.mkdir(s.getStreamsDirectory(monitor), { recursive: true })
                    }catch(err){
                        s.debugLog(err)
                    }
                    const { orphanedFilesCount } = await scanForOrphanedVideos(monitor,{forceCheck: true})
                    if(orphanedFilesCount){
                        orphanedVideosForMonitors[monitor.ke][monitor.mid] += orphanedFilesCount
                    }
                    if(orphanedVideosForMonitors[monitor.ke][monitor.mid] == 0)delete(orphanedVideosForMonitors[monitor.ke][monitor.mid]);
                    ++loadCompleted
                    if(monitors[loadCompleted]){
                        await checkForOrphanedVideosForMonitor(monitors[loadCompleted])
                    }else{
                        s.systemLog(lang.startUpText6, s.s(orphanedVideosForMonitors))
                        delete(foundMonitors)
                        callback()
                    }
                }
                await checkForOrphanedVideosForMonitor(monitors[loadCompleted])
            }else{
                callback()
            }
        }
        var loadDiskUseForUser = function(user,callback){
            s.systemLog(lang.startUpText0, user.mail)
            var userDetails = JSON.parse(user.details)
            s.group[user.ke].sizeLimit = parseFloat(userDetails.size) || 10000
            s.group[user.ke].sizeLimitVideoPercent = parseFloat(userDetails.size_video_percent) || 90
            s.group[user.ke].sizeLimitTimelapseFramesPercent = parseFloat(userDetails.size_timelapse_percent) || 5
            s.group[user.ke].sizeLimitFileBinPercent = parseFloat(userDetails.size_filebin_percent) || 5
            s.knexQuery({
                action: "select",
                columns: "*",
                table: "Videos",
                where: [
                    ['ke','=',user.ke],
                    ['status','!=',0],
                ]
            },function(err,videos) {
                s.knexQuery({
                    action: "select",
                    columns: "*",
                    table: "Timelapse Frames",
                    where: [
                        ['ke','=',user.ke],
                    ]
                },function(err,timelapseFrames) {
                    s.knexQuery({
                        action: "select",
                        columns: "*",
                        table: "Files",
                        where: [
                            ['ke','=',user.ke],
                        ]
                    },function(err,files) {
                        var usedSpaceVideos = 0
                        var usedSpaceTimelapseFrames = 0
                        var usedSpaceFilebin = 0
                        var addStorageData = {
                            files: [],
                            videos: [],
                            timelapseFrames: [],
                        }
                        if(videos && videos[0]){
                            videos.forEach(function(video){
                                video.details = s.parseJSON(video.details)
                                if(!video.details.dir){
                                    usedSpaceVideos += video.size
                                }else{
                                    addStorageData.videos.push(video)
                                }
                            })
                        }
                        if(timelapseFrames && timelapseFrames[0]){
                            timelapseFrames.forEach(function(frame){
                                frame.details = s.parseJSON(frame.details)
                                if(!frame.details.dir){
                                    usedSpaceTimelapseFrames += frame.size
                                }else{
                                    addStorageData.timelapseFrames.push(frame)
                                }
                            })
                        }
                        if(files && files[0]){
                            files.forEach(function(file){
                                file.details = s.parseJSON(file.details)
                                if(!file.details.dir){
                                    usedSpaceFilebin += file.size
                                }else{
                                    addStorageData.files.push(file)
                                }
                            })
                        }
                        s.group[user.ke].usedSpace = (usedSpaceVideos + usedSpaceTimelapseFrames + usedSpaceFilebin) / 1048576
                        s.group[user.ke].usedSpaceVideos = usedSpaceVideos / 1048576
                        s.group[user.ke].usedSpaceFilebin = usedSpaceFilebin / 1048576
                        s.group[user.ke].usedSpaceTimelapseFrames = usedSpaceTimelapseFrames / 1048576
                        loadAddStorageDiskUseForUser(user,addStorageData,function(){
                            callback()
                        })
                    })
                })
            })
        }
        var loadCloudDiskUseForUser = function(user,callback){
            var userDetails = JSON.parse(user.details)
            user.cloudDiskUse = {}
            user.size = 0
            user.limit = userDetails.size
            s.cloudDisksLoaded.forEach(function(storageType){
                user.cloudDiskUse[storageType] = {
                    usedSpace : 0,
                    firstCount : 0
                }
                if(s.cloudDiskUseStartupExtensions[storageType])s.cloudDiskUseStartupExtensions[storageType](user,userDetails)
            })
            var loadCloudVideos = function(callback){
                s.knexQuery({
                    action: "select",
                    columns: "*",
                    table: "Cloud Videos",
                    where: [
                        ['ke','=',user.ke],
                        ['status','!=',0],
                    ]
                },function(err,videos) {
                    if(videos && videos[0]){
                        videos.forEach(function(video){
                            var storageType = JSON.parse(video.details).type
                            if(!storageType)storageType = 's3'
                            var videoSize = video.size / 1048576
                            user.cloudDiskUse[storageType].usedSpace += videoSize
                            user.cloudDiskUse[storageType].usedSpaceVideos += videoSize
                            ++user.cloudDiskUse[storageType].firstCount
                        })
                        s.cloudDisksLoaded.forEach(function(storageType){
                            var firstCount = user.cloudDiskUse[storageType].firstCount
                            // s.systemLog(lang.startUpText1, user.mail+' : '+firstCount,storageType,user.cloudDiskUse[storageType].usedSpace)
                            delete(user.cloudDiskUse[storageType].firstCount)
                        })
                    }
                    callback()
                })
            }
            var loadCloudTimelapseFrames = function(callback){
                s.knexQuery({
                    action: "select",
                    columns: "*",
                    table: "Cloud Timelapse Frames",
                    where: [
                        ['ke','=',user.ke],
                    ]
                },function(err,frames) {
                    if(frames && frames[0]){
                        frames.forEach(function(frame){
                            try{
                                var storageType = JSON.parse(frame.details).type
                                if(!storageType)storageType = 's3'
                                var frameSize = frame.size / 1048576
                                user.cloudDiskUse[storageType].usedSpace += frameSize
                                user.cloudDiskUse[storageType].usedSpaceTimelapseFrames += frameSize
                            }catch(err){
                                s.debugLog(err)
                            }
                        })
                    }
                    callback()
                })
            }
            loadCloudVideos(function(){
                loadCloudTimelapseFrames(function(){
                    s.group[user.ke].cloudDiskUse = user.cloudDiskUse
                    callback()
                })
            })
        }
        var loadAddStorageDiskUseForUser = function(user,data,callback){
            var videos = data.videos
            var timelapseFrames = data.timelapseFrames
            var files = data.files
            var userDetails = JSON.parse(user.details)
            var userAddStorageData = s.parseJSON(userDetails.addStorage) || {}
            var currentStorageNumber = 0
            var readStorageArray = function(){
                var storage = s.listOfStorage[currentStorageNumber]
                if(!storage){
                    //done all checks, move on to next user
                    callback()
                    return
                }
                var path = storage.value
                if(path === ''){
                    ++currentStorageNumber
                    readStorageArray()
                    return
                }
                var storageId = path
                var storageData = userAddStorageData[storageId] || {}
                if(!s.group[user.ke].addStorageUse[storageId])s.group[user.ke].addStorageUse[storageId] = {}
                var storageIndex = s.group[user.ke].addStorageUse[storageId]
                storageIndex.name = storage.name
                storageIndex.path = path
                storageIndex.usedSpace = 0
                storageIndex.sizeLimit = parseFloat(storageData.limit) || parseFloat(userDetails.size) || 10000
                storageIndex.videoPercent = parseFloat(storageData.videoPercent) || parseFloat(userDetails.size_video_percent) || 95
                storageIndex.timelapsePercent = parseFloat(storageData.timelapsePercent) || parseFloat(userDetails.size_timelapse_percent) || 5
                var usedSpaceVideos = 0
                var usedSpaceTimelapseFrames = 0
                var usedSpaceFilebin = 0
                if(videos && videos[0]){
                    videos.forEach(function(video){
                        if(video.details.dir === storage.value){
                            usedSpaceVideos += video.size
                        }
                    })
                }
                if(timelapseFrames && timelapseFrames[0]){
                    timelapseFrames.forEach(function(frame){
                        if(frame.details.dir === storage.value){
                            usedSpaceTimelapseFrames += frame.size
                        }
                    })
                }
                if(files && files[0]){
                    files.forEach(function(file){
                        usedSpaceFilebin += file.size
                    })
                }
                storageIndex.usedSpace = (usedSpaceVideos + usedSpaceTimelapseFrames + usedSpaceFilebin) / 1048576
                storageIndex.usedSpaceVideos = usedSpaceVideos / 1048576
                storageIndex.usedSpaceFilebin = usedSpaceFilebin / 1048576
                storageIndex.usedSpaceTimelapseFrames = usedSpaceTimelapseFrames / 1048576
                // s.systemLog(user.mail+' : '+path+' : '+videos.length,storageIndex.usedSpace)
                ++currentStorageNumber
                readStorageArray()
            }
            readStorageArray()
        }
        var loadAdminUsers = function(callback){
            //get current disk used for each isolated account (admin user) on startup
            s.knexQuery({
                action: "select",
                columns: "*",
                table: "Users",
                where: [
                    ['details','NOT LIKE','%"sub"%']
                ]
            },function(err,users) {
                if(users && users[0]){
                    users.forEach(function(user){
                        checkedAdminUsers[user.ke] = user
                    })
                    var loadLocalDiskUse = function(callback){
                        var count = users.length
                        var countFinished = 0
                        users.forEach(function(user){
                            s.loadGroup(user)
                            s.loadGroupApps(user)
                            loadedAccounts.push(user.ke)
                            loadDiskUseForUser(user,function(){
                                ++countFinished
                                if(countFinished === count){
                                    callback()
                                }
                            })
                        })
                    }
                    var loadCloudDiskUse = function(callback){
                        var count = users.length
                        var countFinished = 0
                        users.forEach(function(user){
                            loadCloudDiskUseForUser(user,function(){
                                ++countFinished
                                if(countFinished === count){
                                    callback()
                                }
                            })
                        })
                    }
                    loadLocalDiskUse(function(){
                        loadCloudDiskUse(function(){
                            callback()
                        })
                    })
                }else{
                    s.processReady()
                }
            })
        }
        config.userHasSubscribed = false
        //check disk space every 20 minutes
        if(config.autoDropCache===true){
            setInterval(function(){
                exec('echo 3 > /proc/sys/vm/drop_caches',{detached: true})
            },60000*20)
        }
        if(config.childNodes.mode !== 'child'){
            //master node - startup functions
            //hourly check to see if sizePurge has failed to unlock
            //checks to see if request count is the number of monitors + 10
            s.checkForStalePurgeLocks()
            //run prerequsite queries, load users and monitors
            //sql/database connection with knex
            s.databaseEngine = require('knex')(s.databaseOptions)
            //run prerequsite queries
            s.preQueries().then(() => {
                setTimeout(async () => {
                    await checkForStaticUsers()
                    //check for subscription
                    checkSubscription(config.subscriptionId || config.peerConnectKey || config.p2pApiKey, function(hasSubcribed){
                        config.userHasSubscribed = hasSubcribed
                        //check terminal commander
                        checkForTerminalCommands(function(){
                            //load administrators (groups)
                            loadAdminUsers(function(){
                                s.runExtensionsForArray('onLoadedUsersAtStartup', null, [])
                                //load monitors (for groups)
                                loadMonitors(function(){
                                    //check for orphaned videos
                                    checkForOrphanedVideos(() => {
                                        s.processReady()
                                    })
                                })
                            })
                        })
                    })
                },1500);
                s.subscriptionIntervalCheck = checkAgainSubscription();
            })
        }
    })
}
