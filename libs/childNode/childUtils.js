const fs = require('fs');
const { createWebSocketClient } = require('../basic/websocketTools.js')
module.exports = function(s,config,lang,app,io){
    const { cameraDestroy } = require('../monitor/utils.js')(s,config,lang)
    var checkHwInterval = null;
    async function onDataFromMasterNode(d) {
        switch(d.f){
            case'sqlCallback':
                const callbackId = d.callbackId;
                if(s.queuedSqlCallbacks[callbackId]){
                    s.queuedSqlCallbacks[callbackId](d.err,d.rows)
                    delete(s.queuedSqlCallbacks[callbackId])
                }
            break;
            case'init_success':
                console.error(new Date(),'Child Nodes : Authenticated with Master Node!');
                s.connectedToMasterNode = true;
                s.other_helpers = d.child_helpers;
                s.childNodeIdOnMasterNode = d.connectionId
            break;
            case'kill':
                s.initiateMonitorObject(d.d);
                await cameraDestroy(d.d);
            break;
            case'sync':
                s.initiateMonitorObject(d.sync);
                Object.keys(d.sync).forEach(function(v){
                    s.group[d.sync.ke].activeMonitors[d.sync.mid][v]=d.sync[v];
                });
            break;
            case'delete'://delete video
                s.file('delete',s.dir.videos+d.ke+'/'+d.mid+'/'+d.file)
            break;
            case'deleteTimelapseFrame'://delete timelapse frame
                var filePath = s.getTimelapseFrameDirectory(d) + `${d.currentDate}/` + d.file
                s.file('delete',filePath)
            break;
            case'cameraStop'://stop camera
                // s.group[d.d.ke].activeMonitors[d.d.mid].masterSaysToStop = true
                await s.camera('stop',d.d)
            break;
            case'cameraStart'://start or record camera
                try{
                    await s.camera(d.d.mode,d.d)
                    let activeMonitor = s.group[d.d.ke].activeMonitors[d.d.mid]
                    // activeMonitor.masterSaysToStop = false
                    clearTimeout(activeMonitor.recordingChecker);
                    clearTimeout(activeMonitor.streamChecker);
                }catch(err){
                    s.debugLog(err)
                }
            break;
        }
    }
    function initiateConnectionToMasterNode(){
        s.cx({
            f: 'init',
            port: config.port,
            platform: s.platform,
            coreCount: s.coreCount,
            totalmem: s.totalmem / 1048576,
            availableHWAccels: config.availableHWAccels,
            socketKey: config.childNodes.key
        })
        clearInterval(checkHwInterval)
        checkHwInterval = setInterval(() => {
            sendCurrentCpuUsage()
            sendCurrentRamUsage()
        },5000)
    }
    function onDisconnectFromMasterNode(){
        s.connectedToMasterNode = false;
        destroyAllMonitorProcesses()
        clearInterval(checkHwInterval)
    }
    function destroyAllMonitorProcesses(){
        var groupKeys = Object.keys(s.group)
        groupKeys.forEach(function(groupKey){
            var activeMonitorKeys = Object.keys(s.group[groupKey].activeMonitors)
            activeMonitorKeys.forEach(function(monitorKey){
                var activeMonitor = s.group[groupKey].activeMonitors[monitorKey]
                if(activeMonitor && activeMonitor.spawn && activeMonitor.spawn.close)activeMonitor.spawn.close()
                if(activeMonitor && activeMonitor.spawn && activeMonitor.spawn.kill)activeMonitor.spawn.kill()
            })
        })
    }
    async function sendCurrentCpuUsage(){
        const percent = await s.cpuUsage();
        const use = s.coreCount * (percent / 100)
        s.cx({
            f: 'cpu',
            used: use,
            percent: percent
        })
    }
    async function sendCurrentRamUsage(){
        const ram = await s.ramUsage()
        s.cx({
            f: 'ram',
            used: ram.used,
            percent: ram.percent,
        })
    }
    function createFileTransferToMasterNode(filePath,transferInfo,fileType){
        const response = {ok: true}
        return new Promise((resolve,reject) => {
            const fileTransferConnection = createWebSocketClient('ws://'+config.childNodes.host + '/childNodeFileRelay',{
                onMessage: () => {}
            })
            fileTransferConnection.on('open', function(){
                fileTransferConnection.send(JSON.stringify({
                    fileType: fileType || 'video',
                    options: transferInfo,
                    socketKey: config.childNodes.key,
                    connectionId: s.childNodeIdOnMasterNode,
                }))
                setTimeout(() => {
                    fs.createReadStream(filePath)
                    .on('data',function(data){
                        fileTransferConnection.send(data)
                    })
                    .on('close',function(){
                        fileTransferConnection.close()
                        resolve(response)
                    })
                },2000)
            })
        })
    }
    async function sendVideoToMasterNode(filePath,options){
        const groupKey = options.ke
        const monitorId = options.mid
        const activeMonitor = s.group[groupKey].activeMonitors[monitorId]
        const response = await createFileTransferToMasterNode(filePath,options,'video');
        clearTimeout(activeMonitor.recordingChecker);
        clearTimeout(activeMonitor.streamChecker);
        return response;
    }
    async function sendTimelapseFrameToMasterNode(filePath,options){
        const response = await createFileTransferToMasterNode(filePath,options,'timelapseFrame');
        return response;
    }
    return {
        onDataFromMasterNode,
        initiateConnectionToMasterNode,
        onDisconnectFromMasterNode,
        destroyAllMonitorProcesses,
        sendCurrentCpuUsage,
        sendCurrentRamUsage,
        sendVideoToMasterNode,
        sendTimelapseFrameToMasterNode,
    }
}
