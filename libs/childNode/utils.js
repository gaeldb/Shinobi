const fs = require('fs');
module.exports = function(s,config,lang,app,io){
    const {
        postProcessCompletedMp4Video,
    } = require('../video/utils.js')(s,config,lang)
    const masterDoWorkToo = config.childNodes.masterDoWorkToo;
    const maxCpuPercent = config.childNodes.maxCpuPercent || 75;
    const maxRamPercent = config.childNodes.maxRamPercent || 75;
    function getIpAddress(req){
        return (req.headers['cf-connecting-ip'] ||
            req.headers["CF-Connecting-IP"] ||
            req.headers["'x-forwarded-for"] ||
            req.connection.remoteAddress).replace('::ffff:','');
    }
    function initiateDataConnection(client,req,options,connectionId){
        const ipAddress = getIpAddress(req)
        const webAddress = ipAddress + ':' + options.port
        client.ip = webAddress;
        client.shinobiChildAlreadyRegistered = true;
        client.sendJson = (data) => {
            client.send(JSON.stringify(data))
        }
        if(!s.childNodes[webAddress]){
            s.childNodes[webAddress] = {}
        };
        const activeNode = s.childNodes[webAddress];
        activeNode.dead = false
        activeNode.cnid = client.id
        activeNode.cpu = 0
        activeNode.ip = webAddress
        activeNode.activeCameras = {}
        activeNode.platform = options.platform
        activeNode.coreCount = options.coreCount
        activeNode.totalmem = options.totalmem
        options.availableHWAccels.forEach(function(accel){
            if(config.availableHWAccels.indexOf(accel) === -1)config.availableHWAccels.push(accel)
        })
        client.sendJson({
            f : 'init_success',
            childNodes : s.childNodes,
            connectionId: connectionId,
        })
        s.debugLog('Authenticated Child Node!',new Date(),webAddress)
        return webAddress
    }
    function onWebSocketDataFromChildNode(client,data){
        const activeMonitor = data.ke && data.mid && s.group[data.ke] ? s.group[data.ke].activeMonitors[data.mid] : null;
        const webAddress = client.ip;
        switch(data.f){
            case'cpu':
                s.childNodes[webAddress].cpuUsed = data.used;
                s.childNodes[webAddress].cpuPercent = data.percent;
            break;
            case'ram':
                s.childNodes[webAddress].ramUsed = data.used;
                s.childNodes[webAddress].ramPercent = data.percent;
            break;
            case'sql':
                s.sqlQuery(data.query,data.values,function(err,rows){
                    client.sendJson({f:'sqlCallback',rows:rows,err:err,callbackId:data.callbackId});
                });
            break;
            case'knex':
                s.knexQuery(data.options,function(err,rows){
                    client.sendJson({f:'sqlCallback',rows:rows,err:err,callbackId:data.callbackId});
                });
            break;
            case'clearCameraFromActiveList':
                if(s.childNodes[webAddress])delete(s.childNodes[webAddress].activeCameras[data.ke + data.id])
            break;
            case'camera':
                s.camera(data.mode,data.data)
            break;
            case's.tx':
                s.tx(data.data,data.to)
            break;
            case's.userLog':
                if(!data.mon || !data.data)return console.log('LOG DROPPED',data.mon,data.data);
                s.userLog(data.mon,data.data)
            break;
        }
    }
    function onDataConnectionDisconnect(client, req){
        const webAddress = client.ip;
        console.log('childNodeWebsocket.disconnect',webAddress)
        if(s.childNodes[webAddress]){
            var monitors = Object.values(s.childNodes[webAddress].activeCameras)
            if(monitors && monitors[0]){
                var loadCompleted = 0
                var loadMonitor = function(monitor){
                    setTimeout(function(){
                        var mode = monitor.mode + ''
                        var cleanMonitor = s.cleanMonitorObject(monitor)
                        s.camera('stop',Object.assign(cleanMonitor,{}))
                        delete(s.group[monitor.ke].activeMonitors[monitor.mid].childNode)
                        delete(s.group[monitor.ke].activeMonitors[monitor.mid].childNodeId)
                        setTimeout(function(){
                            s.camera(mode,cleanMonitor)
                            ++loadCompleted
                            if(monitors[loadCompleted]){
                                loadMonitor(monitors[loadCompleted])
                            }
                        },1000)
                    },2000)
                }
                loadMonitor(monitors[loadCompleted])
            }
            s.childNodes[webAddress].activeCameras = {}
            s.childNodes[webAddress].dead = true
        }
    }
    function initiateFileWriteFromChildNode(client,data,connectionId,onFinish){
        const response = {ok: true}
        const groupKey = data.ke
        const monitorId = data.mid
        const filename = data.filename
        const activeMonitor = s.group[groupKey].activeMonitors[monitorId]
        const writeDirectory = data.writeDirectory
        const fileWritePath = writeDirectory + filename
        const writeStream = fs.createWriteStream(fileWritePath)
        if (!fs.existsSync(writeDirectory)) {
            fs.mkdirSync(writeDirectory, {recursive: true}, (err) => {s.debugLog(err)})
        }
        activeMonitor.childNodeStreamWriters[filename] = writeStream
        client.on('message',(d) => {
            writeStream.write(d)
        })
        client.on('close',(d) => {
            setTimeout(() => {
                // response.fileWritePath = fileWritePath
                // response.writeData = data
                // response.childNodeId = connectionId
                try{
                    activeMonitor.childNodeStreamWriters[filename].end();
                }catch(err){

                }
                setTimeout(() => {
                    delete(activeMonitor.childNodeStreamWriters[filename])
                },100)
                onFinish(response)
            },2000)
        })
    }
    function initiateVideoWriteFromChildNode(client,data,connectionId){
        return new Promise((resolve,reject) => {
            const groupKey = data.ke
            const monitorId = data.mid
            const filename = data.filename
            const activeMonitor = s.group[groupKey].activeMonitors[monitorId]
            const monitorConfig = s.group[groupKey].rawMonitorConfigurations[monitorId]
            const videoDirectory = s.getVideoDirectory(monitorConfig)
            data.writeDirectory = videoDirectory
            initiateFileWriteFromChildNode(client,data,connectionId,(response) => {
                //delete video file from child node
                s.cx({
                    f: 'delete',
                    file: filename,
                    ke: data.ke,
                    mid: data.mid
                },connectionId)
                //
                s.txWithSubPermissions({
                    f:'video_build_success',
                    hrefNoAuth:'/videos/'+data.ke+'/'+data.mid+'/'+filename,
                    filename:filename,
                    mid:data.mid,
                    ke:data.ke,
                    time:data.time,
                    size:data.filesize,
                    end:data.end
                },'GRP_'+data.ke,'video_view')
                //save database row
                var insert = {
                    startTime : data.time,
                    filesize : data.filesize,
                    endTime : data.end,
                    dir : videoDirectory,
                    file : filename,
                    filename : filename,
                    filesizeMB : parseFloat((data.filesize/1048576).toFixed(2))
                }
                s.insertDatabaseRow(monitorConfig,insert,function(response){
                    postProcessCompletedMp4Video(response.insertQuery).then((isGood) => {
                        if(!isGood)return console.error(`FAILED VIDEO INSERT`);
                        s.insertCompletedVideoExtensions.forEach(function(extender){
                            extender(activeMonitor, monitorConfig, insert)
                        })
                        //purge over max
                        s.purgeDiskForGroup(data.ke)
                        //send new diskUsage values
                        s.setDiskUsedForGroup(data.ke,insert.filesizeMB)
                        clearTimeout(activeMonitor.recordingChecker)
                        clearTimeout(activeMonitor.streamChecker)
                        resolve(response)
                    })
                })
            })
        })
    }
    function initiateTimelapseFrameWriteFromChildNode(client,data,connectionId){
        return new Promise((resolve,reject) => {
            const groupKey = data.ke
            const monitorId = data.mid
            const filename = data.filename
            const currentDate = data.currentDate
            const activeMonitor = s.group[groupKey].activeMonitors[monitorId]
            const monitorConfig = s.group[groupKey].rawMonitorConfigurations[monitorId]
            const timelapseFrameDirectory = s.getTimelapseFrameDirectory(monitorConfig) + currentDate + `/`
            const fileWritePath = timelapseFrameDirectory + filename
            const writeStream = fs.createWriteStream(fileWritePath)
            data.writeDirectory = timelapseFrameDirectory
            initiateFileWriteFromChildNode(client,data,connectionId,(response) => {
                s.cx({
                    f: 'deleteTimelapseFrame',
                    file: filename,
                    currentDate: currentDate,
                    ke: groupKey,
                    mid: monitorId
                },connectionId)
                s.insertTimelapseFrameDatabaseRow({
                    ke: groupKey
                },data.queryInfo)
                resolve(response)
            })
        })
    }
    function getActiveCameraCount(){
        let theCount = 0
        Object.keys(s.group).forEach(function(groupKey){
            const theGroup = s.group[groupKey]
            Object.keys(theGroup.activeMonitors).forEach(function(groupKey){
                const activeMonitor = theGroup.activeMonitors[monitorId]
                if(
                    // watching
                    activeMonitor.statusCode === 2 ||
                    // recording
                    activeMonitor.statusCode === 3 ||
                    // starting
                    activeMonitor.statusCode === 1 ||
                    // started
                    activeMonitor.statusCode === 9
                    //// Idle, in memory
                    // activeMonitor.statusCode === 6
                ){
                    ++theCount
                }
            })
        })
        return theCount
    }
    function bindMonitorToChildNode(options){
        const groupKey = options.ke
        const monitorId = options.mid
        const childNodeSelected = options.childNodeId
        const theChildNode = s.childNodes[childNodeSelected]
        const activeMonitor = s.group[groupKey].activeMonitors[monitorId];
        const monitorConfig = Object.assign({},s.group[groupKey].rawMonitorConfigurations[monitorId])
        theChildNode.activeCameras[groupKey + monitorId] = monitorConfig;
        activeMonitor.childNode = childNodeSelected
        activeMonitor.childNodeId = theChildNode.cnid;
    }
    function getNodeWithHighestCpuAndRamUse(){
        var nodeWithLowestCpuUse = 0
        var nodeWithLowestRamUse = 0
        const childNodeList = Object.keys(s.childNodes)
        childNodeList.forEach(function(webAddress){
            const theChildNode = s.childNodes[webAddress]
            if(
                theChildNode.cpuUsed > nodeWithLowestCpuUse &&
                theChildNode.ramUsed > nodeWithLowestRamUse
            ){
                nodeWithLowestCpuUse = theChildNode.cpuUsed + 0.2
                nodeWithLowestRamUse = theChildNode.ramUsed + 50
            }
        })
        return {
            nodeWithLowestCpuUse,
            nodeWithLowestRamUse,
        }
    }
    async function selectNodeForOperation(options){
        const groupKey = options.ke
        const monitorId = options.mid
        const childNodeList = Object.keys(s.childNodes)
        if(childNodeList.length > 0){
            let childNodeFound = false
            let childNodeSelected = null;
            var nodeWithLowestActiveCamerasCount = 65535
            var nodeWithLowestActiveCameras = null
            let nodeWithLowestCpuPercent = 100
            let nodeWithLowestRamPercent = 100
            let {
                nodeWithLowestCpuUse,
                nodeWithLowestRamUse,
            } = getNodeWithHighestCpuAndRamUse();
            childNodeList.forEach(function(webAddress){
                const theChildNode = s.childNodes[webAddress]
                delete(theChildNode.activeCameras[groupKey + monitorId])
                const nodeCameraCount = Object.keys(theChildNode.activeCameras).length
                if(
                    // child node is connected and available
                    !theChildNode.dead &&
                    // // look for child node with least number of running cameras
                    // nodeCameraCount < nodeWithLowestActiveCamerasCount &&
                    // look for child node with CPU usage below 75% (default)
                    theChildNode.cpuUsed < nodeWithLowestCpuUse &&
                    theChildNode.cpuPercent < maxCpuPercent &&
                    theChildNode.cpuPercent < nodeWithLowestCpuPercent &&
                    // look for child node with RAM usage below 75% (default)
                    theChildNode.ramUsed < nodeWithLowestRamUse &&
                    theChildNode.ramPercent < maxRamPercent &&
                    theChildNode.ramPercent < nodeWithLowestRamPercent
                ){
                    // nodeWithLowestActiveCamerasCount = nodeCameraCount
                    childNodeSelected = `${webAddress}`
                    nodeWithLowestCpuUse = theChildNode.cpuUsed
                    nodeWithLowestCpuPercent = theChildNode.cpuPercent
                    nodeWithLowestRamUse = theChildNode.ramUsed
                    nodeWithLowestRamPercent = theChildNode.ramPercent
                }
            })
            if(childNodeSelected && masterDoWorkToo){
                // const nodeCameraCount = getActiveCameraCount()
                const masterNodeHw = await getHwUsage();
                if(
                    // nodeCameraCount < nodeWithLowestActiveCamerasCount &&
                    masterNodeHw.cpuUsed < nodeWithLowestCpuUse &&
                    masterNodeHw.cpuPercent < maxCpuPercent &&
                    masterNodeHw.cpuPercent < nodeWithLowestCpuPercent &&
                    // look for child node with RAM usage below 75% (default)
                    masterNodeHw.ramUsed < nodeWithLowestRamUse &&
                    masterNodeHw.ramPercent < maxRamPercent &&
                    masterNodeHw.ramPercent < nodeWithLowestRamPercent
                ){
                    // nodeWithLowestActiveCamerasCount = nodeCameraCount
                    // release child node selection and use master node
                    childNodeSelected = null
                }
            }
            return childNodeSelected;
        }
    }
    async function getHwUsage(){
        const percent = await s.cpuUsage();
        const use = s.coreCount * (percent / 100)
        const ram = await s.ramUsage()
        return {
            ramUsed: ram.used,
            ramPercent: ram.percent,
            cpuUsed: use,
            cpuPercent: percent,
        }
    }
    return {
        getIpAddress,
        initiateDataConnection,
        onWebSocketDataFromChildNode,
        onDataConnectionDisconnect,
        initiateVideoWriteFromChildNode,
        initiateTimelapseFrameWriteFromChildNode,
        selectNodeForOperation,
        bindMonitorToChildNode,
    }
}
