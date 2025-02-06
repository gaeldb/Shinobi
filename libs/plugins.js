var socketIOclient = require('socket.io-client');
module.exports = function(s,config,lang,app,io){
    const currentPluginCpuUsage = {}
    const currentPluginGpuUsage = {}
    const currentPluginFrameProcessingCount = {}
    const pluginHandlersSet = {}
    const {
        triggerEvent,
    } = require('./events/utils.js')(s,config,lang)
    require('./plugins/superUser.js')(s,config,lang,app,io,{
        currentPluginCpuUsage: currentPluginCpuUsage,
        currentPluginGpuUsage: currentPluginGpuUsage,
        currentPluginFrameProcessingCount: currentPluginFrameProcessingCount,
        pluginHandlersSet: pluginHandlersSet,
    })
    //send data to detector plugin
    s.ocvTx = function(data){
        // chaining coming in future update
        s.sendToAllDetectors(data)
    }
    //function for receiving detector data
    s.pluginEventController = function(d){
        switch(d.f){
            case'trigger':
                triggerEvent(d)
            break;
            case's.tx':
                s.tx(d.data,d.to)
            break;
            case'log':
                s.systemLog('PLUGIN : '+d.plug+' : ',d)
            break;
            case's.sqlQuery':
                s.sqlQuery(d.query,d.values)
            break;
            case's.knexQuery':
                s.knexQuery(d.options)
            break;
        }
    }
    s.connectedPlugins = {}
    s.connectedDetectorPlugins = {}
    s.detectorPluginArray = []
    s.isAtleatOneDetectorPluginConnected = false
    s.addDetectorPlugin = function(name,d){
        const newDetector = {
            started: s.timeObject(),
            id: d.id,
            plug: d.plug,
            notice: d.notice,
            isClientPlugin: d.isClientPlugin,
            isHostPlugin: d.isHostPlugin,
            connectionType: d.connectionType
        };
        if(config.useOldPluginConnectionMethod === true){
            s.ocv = newDetector
        }
        s.connectedDetectorPlugins[d.plug] = newDetector
        s.resetDetectorPluginArray()
        s.runExtensionsForArray('onPluginConnected', null, [d.plug, newDetector])
    }
    s.removeDetectorPlugin = function(name){
        const theDetector = Object.assign({}, s.connectedDetectorPlugins[name])
        if(config.oldPluginConnectionMethod === true && s.ocv && s.ocv.plug === name){
            delete(s.ocv)
        }
        delete(s.connectedDetectorPlugins[name])
        s.resetDetectorPluginArray(name)
        s.runExtensionsForArray('onPluginDisconnected', null, [name, theDetector])
    }
    s.resetDetectorPluginArray = function(){
        pluginArray = []
        Object.keys(s.connectedPlugins).forEach(function(name){
            var plugin = s.connectedPlugins[name]
            if(plugin.plugged === true && plugin.type === 'detector'){
                pluginArray.push(name)
            }
        })
        if(pluginArray.length > 0){
            s.isAtleatOneDetectorPluginConnected = true
        }else{
            s.isAtleatOneDetectorPluginConnected = false
        }
        s.debugLog(`resetDetectorPluginArray : ${JSON.stringify(pluginArray)}`)
        s.detectorPluginArray = pluginArray
    }

    if(config.detectorPluginsCluster){
        if(config.clusterUseBasicFrameCount === undefined)config.clusterUseBasicFrameCount = true;
        if(config.clusterUseBasicFrameCount){
            // overAllProcessingCount
            var getPluginWithLowestUtilization = () => {
                var selectedPluginServer = null
                var lowestUsed = 1000
                s.detectorPluginArray.forEach((pluginName) => {
                    const processCount = currentPluginFrameProcessingCount[pluginName] || 0
                    if(processCount < lowestUsed){
                        selectedPluginServer = pluginName
                        lowestUsed = processCount
                    }
                })
                if(selectedPluginServer){
                    return s.connectedPlugins[selectedPluginServer]
                }else{
                    return {tx: () => {}}
                }
            }
        }else{

            if(config.clusterBasedOnGpu){
                var getPluginWithLowestUtilization = () => {
                    var selectedPluginServer = null
                    var lowestUsed = 1000
                    s.detectorPluginArray.forEach((pluginName) => {
                        var overAllPercent = 0
                        var gpus = currentPluginGpuUsage[pluginName]
                        gpus.forEach((gpu) => {
                            console.log(gpu)
                            const percent = gpu.utilization
                            overAllPercent += percent
                        })
                        if((overAllPercent / gpus.length) < lowestUsed){
                            selectedPluginServer = pluginName
                            lowestUsed = overAllPercent
                        }
                    })
                    if(selectedPluginServer){
                        return s.connectedPlugins[selectedPluginServer]
                    }else{
                        return {tx: () => {}}
                    }
                }
            }else{
                var getPluginWithLowestUtilization = () => {
                    var selectedPluginServer = null
                    var lowestUsed = 1000
                    s.detectorPluginArray.forEach((pluginName) => {
                        const percent = currentPluginCpuUsage[pluginName]
                        if(percent < lowestUsed){
                            selectedPluginServer = pluginName
                            lowestUsed = percent
                        }
                    })
                    if(selectedPluginServer){
                        return s.connectedPlugins[selectedPluginServer]
                    }else{
                        return {tx: () => {}}
                    }
                }
            }
        }
        s.debugLog(`Detector Plugins running in Cluster Mode`)
        s.sendToAllDetectors = function(data){
            getPluginWithLowestUtilization().tx(data)
        }
    }else{
        s.sendToAllDetectors = function(data){
            s.detectorPluginArray.forEach(function(name){
                s.connectedPlugins[name].tx(data)
            })
        }
    }
    s.sendToDetector = function(pluginName, data){
        const detector = s.connectedPlugins[pluginName];
        if(detector)detector.tx(data);
    }
    s.sendDetectorInfoToClient = function(data,txFunction){
        s.detectorPluginArray.forEach(function(name){
            var detectorData = Object.assign(data,{
                notice: s.connectedDetectorPlugins[name].notice,
                plug: name
            })
            txFunction(detectorData)
        })
    }
    // s.sendToDetectorsInChain = function(){
    //
    // }
    s.pluginInitiatorSuccess = function(mode,d,cn){
        s.systemLog('pluginInitiatorSuccess',d)
        if(!s.connectedPlugins[d.plug]){
            s.connectedPlugins[d.plug]={
                plug: d.plug,
                type: d.type
            }
        }
        s.connectedPlugins[d.plug].plugged = true
        if(mode==='client'){
            s.connectedPlugins[d.plug].tx = function(x){return cn.emit('f',x)}
            //is in client mode (camera.js is client)
            cn.pluginEngine = d.plug
            s.systemLog('Connected to plugin : Detector - '+d.plug+' - '+d.type)
            switch(d.type){
                default:case'detector':
                    if(config.oldPluginConnectionMethod)cn.ocv = 1
                    cn.detectorPlugin = d.plug
                    s.addDetectorPlugin(d.plug,{
                        id: cn.id,
                        plug: d.plug,
                        notice: d.notice,
                        isClientPlugin: true,
                        connectionType: d.connectionType
                    })
                    s.tx({f:'detector_plugged',plug:d.plug,notice:d.notice},'CPU')
                break;
            }
        }else{
            //is in host mode (camera.js is client)
            switch(d.type){
                default:case'detector':
                    s.addDetectorPlugin(d.plug,{
                        id: "host",
                        plug: d.plug,
                        notice: d.notice,
                        isHostPlugin: true,
                        connectionType: d.connectionType
                    })
                    s.tx({f:'detector_plugged',plug:d.plug,notice:d.notice},'CPU')
                break;
            }
        }
        s.tx({f:'readPlugins',ke:d.ke},'CPU')
    }
    s.pluginInitiatorFail=function(mode,d,cn){
        if(s.connectedPlugins[d.plug])s.connectedPlugins[d.plug].plugged=false
        if(mode==='client'){
            //is in client mode (camera.js is client)
            cn.disconnect()
        }else{
            //is in host mode (camera.js is client)
        }
    }
    if(config.plugins&&config.plugins.length>0){
        config.plugins.forEach(function(v){
            s.connectedPlugins[v.id]={
                plug: v.id,
                type: v.type
            }
            if(!v.enabled){return}
            if(v.mode==='host'){
                //is in host mode (camera.js is client)
                if(v.https===true){
                    v.https='https://'
                }else{
                    v.https='http://'
                }
                if(!v.port){
                    v.port=80
                }
                var socket = socketIOclient(v.https+v.host+':'+v.port)
                s.connectedPlugins[v.id].tx = function(x){return socket.emit('f',x)}
                socket.on('connect', function(cn){
                    s.systemLog('Connected to plugin (host) : '+v.id)
                    s.connectedPlugins[v.id].tx({f:'init_plugin_as_host',key:v.key})
                });
                socket.on('init',function(d){
                    s.systemLog('Initialize Plugin : Host',d)
                    if(d.ok === true){
                        s.pluginInitiatorSuccess("host",d)
                    }else{
                        s.pluginInitiatorFail("host",d)
                    }
                })
                socket.on('ocv',s.pluginEventController);
                socket.on('disconnect', function(){
                    s.connectedPlugins[v.id].plugged=false
                    if(v.type === 'detector'){
                        s.tx({f:'detector_unplugged',plug:v.id},'CPU')
                        s.removeDetectorPlugin(v.id)
                        s.sendDetectorInfoToClient({f:'detector_plugged'},function(data){
                            s.tx(data,'CPU')
                        })
                    }
                    s.systemLog('Plugin Disconnected : '+v.id)
                    s.connectedPlugins[v.id].reconnector = setInterval(function(){
                        if(socket.connected===true){
                            clearInterval(s.connectedPlugins[v.id].reconnector)
                        }else{
                            socket.connect()
                        }
                    },1000*2)
                });
                s.connectedPlugins[v.id].ws = socket;
            }
        })
    }
    var onWebSocketDisconnection = function(cn){
        if(cn.pluginEngine){
            s.connectedPlugins[cn.pluginEngine].plugged = false
            s.tx({f:'plugin_engine_unplugged',plug:cn.pluginEngine},'CPU')
        }
        if(cn.detectorPlugin){
            s.tx({f:'detector_unplugged',plug:cn.detectorPlugin},'CPU')
            s.removeDetectorPlugin(cn.detectorPlugin)
            s.sendDetectorInfoToClient({f:'detector_plugged'},function(data){
                s.tx(data,'CPU')
            })
        }
        if(cn.ocv && s.ocv){
            s.tx({f:'detector_unplugged',plug:s.ocv.plug},'CPU')
            delete(s.ocv);
            delete(pluginHandlersSet[pluginName])
        }
    }
    var onSocketAuthentication = function(r,cn,d,tx){
        if(s.isAtleatOneDetectorPluginConnected){
            s.sendDetectorInfoToClient({f:'detector_plugged'},tx)
            s.ocvTx({f:'readPlugins',ke:d.ke})
        }
        if(config.oldPluginConnectionMethod && s.ocv){
            tx({f:'detector_plugged',plug:s.ocv.plug,notice:s.ocv.notice})
        }
    }
    var addCpuUsageHandler = (cn,pluginName) => {
        if(pluginHandlersSet[pluginName])return;
        pluginHandlersSet[pluginName] = true
        cn.on('cpuUsage',function(percent){
            currentPluginCpuUsage[pluginName] = percent
        })
        cn.on('gpuUsage',function(gpus){
            currentPluginGpuUsage[pluginName] = gpus
        })
        cn.on('processCount',function(count){
            currentPluginFrameProcessingCount[pluginName] = count
        })
    }
    var onWebSocketConnection = function(cn){
        cn.on('ocv',function(d){
            if(!cn.pluginEngine && d.f === 'init'){
                if(config.pluginKeys[d.plug] === d.pluginKey){
                    s.pluginInitiatorSuccess("client",d,cn)
                    if(config.detectorPluginsCluster)addCpuUsageHandler(cn,d.plug)
                }else{
                    s.pluginInitiatorFail("client",d,cn)
                }
            }else{
                if(config.pluginKeys[d.plug] === d.pluginKey){
                    s.pluginEventController(d)
                    if(config.detectorPluginsCluster)addCpuUsageHandler(cn,d.plug)
                }else{
                    cn.disconnect()
                }
            }
        })
        cn.on('f',function(d){
            if((d.id || d.uid || d.mid) && cn.ke){
                switch(d.f){
                    case'ocv_in':
                        s.ocvTx(d.data)
                    break;
                }
            }
        })
    }
    if(config.oldPluginConnectionMethod === undefined)config.oldPluginConnectionMethod = false
    if(config.oldPluginConnectionMethod === true){
        s.ocvTx = function(data){
            if(!s.ocv){return}
            if(s.ocv.isClientPlugin === true){
                s.tx(data,s.ocv.id)
            }else{
                s.connectedPlugins[s.ocv.plug].tx(data)
            }
        }
    }
    function onMonitorUpdate(monitorConfig){
        // console.log('Sending Monitor Info to Plugin', monitorConfig.mid)
        s.sendToAllDetectors({ f: 'monitorUpdate', monitorConfig });
    }
    function sendCopyOfAllMonitorConfigs(){
        const groupKeys = Object.keys(s.group);
        for(groupKey of groupKeys){
            try{
                const monitorConfigs = Object.values(s.group[groupKey].rawMonitorConfigurations);
                for(monitorConfig of monitorConfigs){
                    onMonitorUpdate(monitorConfig)
                }
            }catch(err){
                s.debugLog(err)
            }
        }
    }
    /**
    * API : Get List of Connected Plugins
    */
    app.get(config.webPaths.apiPrefix+':auth/plugins/:ke/list', async (req,res) => {
        s.auth(req.params, async (resp) => {
            s.closeJsonResponse(res,{
                ok: true,
                plugins: s.connectedDetectorPlugins
            })
        },res,req)
    })
    s.onSocketAuthentication(onSocketAuthentication)
    s.onWebSocketDisconnection(onWebSocketDisconnection)
    s.onWebSocketConnection(onWebSocketConnection)
    s.onMonitorStart(onMonitorUpdate)
    s.onPluginConnected(sendCopyOfAllMonitorConfigs)
}
