const { spawn } = require('child_process');
const { parentPort, workerData } = require('worker_threads');
process.on("uncaughtException", function(error) {
  console.error(error);
});
const activeTerminalCommands = {}
let config = workerData.config
let lang = workerData.lang
let sslInfo = config.ssl || {}
let remoteConnectionPort = config.easyRemotePort || (sslInfo && sslInfo.port && (sslInfo.enabled !== false) ? sslInfo.port : config.port || 8080)
const multipleSelected = config.p2pHostMultiSelected instanceof Array && config.p2pHostMultiSelected.length > 0;
const p2pApiKey = config.p2pApiKey;
const p2pServerList = config.p2pServerList;
const net = require("net")
const bson = require('bson')
const WebSocket = require('cws')
const s = {
    debugLog: (...args) => {
        parentPort.postMessage({
            f: 'debugLog',
            data: args
        })
    },
    systemLog: (...args) => {
        parentPort.postMessage({
            f: 'systemLog',
            data: args
        })
    },
}
parentPort.on('message',(data) => {
    switch(data.f){
        case'init':
            if(multipleSelected){
                for(aSelection of config.p2pHostMultiSelected){
                    clearAllTimeouts(aSelection)
                    initialize(aSelection)
                }
            }else{
                const singleSelection = config.p2pHostSelected;
                clearAllTimeouts(singleSelection)
                initialize(singleSelection)
            }
        break;
        case'exit':
            s.debugLog('Closing P2P Connection...')
            process.exit(0)
        break;
    }
})
var socketCheckTimer = {}
var heartbeatTimer = {}
var heartBeatCheckTimout = {}
var onClosedTimeout = {}
let stayDisconnected = {}
const requestConnections = {}
const requestConnectionsData = {}
function getRequestConnection(requestId){
    return requestConnections[requestId] || {
        write: () => {}
    }
}
function clearAllTimeouts(p2pServerAddress){
    clearInterval(heartbeatTimer[p2pServerAddress])
    clearTimeout(heartBeatCheckTimout[p2pServerAddress])
    clearTimeout(onClosedTimeout[p2pServerAddress])
}
function startConnection(p2pServerAddress,subscriptionId){
    let tunnelToP2P
    stayDisconnected[p2pServerAddress] = false
    const allMessageHandlers = []
    async function startWebsocketConnection(key,callback){
        s.debugLog(`startWebsocketConnection EXECUTE`,new Error())
        function createWebsocketConnection(){
            return new Promise((resolve,reject) => {
                try{
                    stayDisconnected[p2pServerAddress] = true
                    if(tunnelToP2P)tunnelToP2P.close()
                }catch(err){
                    console.log(err)
                }
                tunnelToP2P = new WebSocket(p2pServerAddress);
                console.log('P2P : Connecting to Konekta P2P Server :', p2pServerAddress)
                stayDisconnected[p2pServerAddress] = false;
                tunnelToP2P.on('open', function(){
                    resolve(tunnelToP2P)
                })
                tunnelToP2P.on('error', (err) => {
                    console.log(`P2P tunnelToP2P Error : `,err)
                    console.log(`P2P Restarting...`)
                    // disconnectedConnection()
                })
                tunnelToP2P.on('close', () => {
                    console.log(`P2P Connection Closed!`)
                    clearAllTimeouts(p2pServerAddress)
                    // onClosedTimeout = setTimeout(() => {
                    //     disconnectedConnection();
                    // },5000)
                });
                tunnelToP2P.onmessage = function(event){
                    const data = bson.deserialize(Buffer.from(event.data))
                    allMessageHandlers.forEach((handler) => {
                        if(data.f === handler.key){
                            handler.callback(data.data,data.rid)
                        }
                    })
                }

                clearInterval(socketCheckTimer[p2pServerAddress])
                socketCheckTimer[p2pServerAddress] = setInterval(() => {
                    // s.debugLog('Tunnel Ready State :',tunnelToP2P.readyState)
                    if(tunnelToP2P.readyState !== 1){
                        s.debugLog('Tunnel NOT Ready! Reconnecting...')
                        disconnectedConnection()
                    }
                },1000 * 60)
            })
        }
        function disconnectedConnection(code,reason){
            s.debugLog('stayDisconnected',stayDisconnected[p2pServerAddress])
            clearAllTimeouts()
            s.debugLog('DISCONNECTED!')
            if(stayDisconnected[p2pServerAddress])return;
            s.debugLog('RESTARTING!')
            setTimeout(() => {
                if(tunnelToP2P && tunnelToP2P.readyState !== 1)startWebsocketConnection()
            },2000)
        }
        s.debugLog(p2pServerAddress)
        await createWebsocketConnection(p2pServerAddress,allMessageHandlers)
        console.log('P2P : Connected! Authenticating...')
        sendDataToTunnel({
            subscriptionId: subscriptionId,
            restrictedTo: config.p2pRestrictedTo || [],
        })
        clearInterval(heartbeatTimer[p2pServerAddress])
        heartbeatTimer[p2pServerAddress] = setInterval(() => {
            sendDataToTunnel({
                f: 'ping',
            })
        }, 1000 * 10)
        setTimeout(() => {
            if(tunnelToP2P.readyState !== 1)refreshHeartBeatCheck()
        },5000)
    }
    function sendDataToTunnel(data){
        tunnelToP2P.send(
            bson.serialize(data)
        )
    }
    startWebsocketConnection()
    function onIncomingMessage(key,callback){
        allMessageHandlers.push({
            key: key,
            callback: callback,
        })
    }
    function outboundMessage(key,data,requestId){
        sendDataToTunnel({
            f: key,
            data: data,
            rid: requestId
        })
    }
    async function createRemoteSocket(host,port,requestId,initData){
        // if(requestConnections[requestId]){
        //     remotesocket.off('data')
        //     remotesocket.off('drain')
        //     remotesocket.off('close')
        //     requestConnections[requestId].end()
        // }
        const responseTunnel = await getResponseTunnel(requestId, p2pServerAddress)
        let remotesocket = new net.Socket();
        remotesocket.on('ready',() => {
            remotesocket.write(initData.buffer)
        })
        remotesocket.on('error',(err) => {
            s.debugLog('createRemoteSocket ERROR',err)
        })
        remotesocket.on('data', function(data) {
            requestConnectionsData[requestId] = data.toString()
            responseTunnel.send('data',data)
        })
        remotesocket.on('drain', function() {
            responseTunnel.send('resume',{})
        });
        remotesocket.on('close', function() {
            delete(requestConnectionsData[requestId])
            responseTunnel.send('end',{})
            setTimeout(() => {
                if(
                    responseTunnel &&
                    (responseTunnel.readyState === 0 || responseTunnel.readyState === 1)
                ){
                    responseTunnel.close()
                }
            },5000)
        });
        remotesocket.connect(port || remoteConnectionPort, host || 'localhost');
        requestConnections[requestId] = remotesocket
        return remotesocket
    }
    function writeToServer(data,requestId){
        var flushed = getRequestConnection(requestId).write(data.buffer)
        if (!flushed) {
            outboundMessage('pause',{},requestId)
        }
    }
    function refreshHeartBeatCheck(){
        clearTimeout(heartBeatCheckTimout[p2pServerAddress])
        heartBeatCheckTimout[p2pServerAddress] = setTimeout(() => {
            startWebsocketConnection()
        },1000 * 10 * 1.5)
    }
    if(config.p2pAllowNetworkAccess === true){
        onIncomingMessage('connect',async (data,requestId) => {
            const host = data.host || null;
            const port = data.port || null;
            s.debugLog('New Request Incoming', host, port, requestId);
            const socket = await createRemoteSocket(host, port, requestId, data.init)
        })
    }else{
        onIncomingMessage('connect',async (data,requestId) => {
            s.debugLog('New Request Incoming', requestId);
            const socket = await createRemoteSocket(null, null, requestId, data.init)
        })
    }
    onIncomingMessage('data',writeToServer)
    if(config.p2pShellAccess === true){
        onIncomingMessage('shell_exit',function(data,requestId){
            const shellId = data.shellId;
            if(activeTerminalCommands[shellId]){
                const theCommand = activeTerminalCommands[shellId]
                theCommand.stdin.pause();
                theCommand.kill();
            }
        })
        onIncomingMessage('shell',function(data,requestId){
            const shellId = data.shellId;
            if(activeTerminalCommands[shellId]){
                const theCommand = activeTerminalCommands[shellId]
                const commandRunAfterProcessStart = data.exec
                switch(commandRunAfterProcessStart){
                    case'^C':
                        theCommand.stdin.pause();
                        theCommand.kill();
                    break;
                    default:
                        theCommand.stdin.write(`${commandRunAfterProcessStart}\n`)
                    break;
                }
            }else{
                if(data.exec.startsWith('^')){
                    outboundMessage('shell_err',{
                        shellId,
                        err: "No process running to use this command."
                    },requestId)
                    return;
                }
                const newCommand = spawn('/bin/sh')
                activeTerminalCommands[shellId] = newCommand;
                newCommand.stdout.on('data',function(d){
                    const data = d.toString();
                    outboundMessage('shell_stdout',{
                        shellId,
                        data,
                    },requestId)
                })
                newCommand.stderr.on('data',function(d){
                    const data = d.toString();
                    outboundMessage('shell_stderr',{
                        shellId,
                        data,
                    },requestId)
                })
                newCommand.on('exit',function(){
                    outboundMessage('shell_exit',{
                        shellId,
                    },requestId)
                })
                newCommand.on('close',function(){
                    outboundMessage('shell_close',{
                        shellId,
                    },requestId)
                    delete(activeTerminalCommands[shellId])
                })
                newCommand.stdin.write(`${data.exec}\n`)
            }
        })
    }
    onIncomingMessage('resume',function(data,requestId){
        requestConnections[requestId].resume()
    })
    onIncomingMessage('pause',function(data,requestId){
        requestConnections[requestId].pause()
    })
    onIncomingMessage('pong',function(data,requestId){
        refreshHeartBeatCheck()
        // s.debugLog('Heartbeat')
    })
    onIncomingMessage('init',function(data,requestId){
        console.log(`P2P : Authenticated!`)
    })
    onIncomingMessage('end',function(data,requestId){
        try{
            requestConnections[requestId].end()
        }catch(err){
            s.debugLog(`Reqest Failed to END ${requestId}`)
            s.debugLog(`Failed Request ${requestConnectionsData[requestId]}`)
            delete(requestConnectionsData[requestId])
            s.debugLog(err)
            // console.log('requestConnections',requestConnections)
        }
    })
    onIncomingMessage('disconnect',function(data,requestId){
        console.log(`FAILED LICENSE CHECK ON P2P`)
        const retryLater = data && data.retryLater;
        stayDisconnected[p2pServerAddress] = !retryLater
        if(retryLater)console.log(`Retrying P2P Later...`)
    })
    return tunnelToP2P;
}
const responseTunnels = {}
async function getResponseTunnel(originalRequestId, p2pServerAddress){
    return responseTunnels[originalRequestId] || await createResponseTunnel(originalRequestId, p2pServerAddress)
}
function createResponseTunnel(originalRequestId, p2pServerAddress){
    const responseTunnelMessageHandlers = []
    function onMessage(key,callback){
        responseTunnelMessageHandlers.push({
            key: key,
            callback: callback,
        })
    }
    return new Promise((resolve,reject) => {
        const responseTunnel = new WebSocket(p2pServerAddress);
        function sendToResponseTunnel(data){
            responseTunnel.send(
                bson.serialize(data)
            )
        }
        function sendData(key,data){
            sendToResponseTunnel({
                f: key,
                data: data,
                rid: originalRequestId
            })
        }
        responseTunnel.on('error', (err) => {
            s.debugLog('responseTunnel ERROR',err)
        })
        responseTunnel.on('open', function(){
            sendToResponseTunnel({
                responseTunnel: originalRequestId,
                subscriptionId: config.p2pApiKey,
            })
        })
        responseTunnel.on('close', function(){
            delete(responseTunnels[originalRequestId])
        })
        onMessage('ready', function(){
            const finalData = {
                onMessage,
                send: sendData,
                sendRaw: sendToResponseTunnel,
                close: responseTunnel.close
            }
            responseTunnels[originalRequestId] = finalData;
            resolve(finalData)
        })
        responseTunnel.onmessage = function(event){
            const data = bson.deserialize(Buffer.from(event.data))
            responseTunnelMessageHandlers.forEach((handler) => {
                if(data.f === handler.key){
                    handler.callback(data.data,data.rid)
                }
            })
        }
    })
}
function closeResponseTunnel(originalRequestId){
    // also should be handled server side
    try{
        responseTunnels[originalRequestId].close()
    }catch(err){
        s.debugLog('closeResponseTunnel',err)
    }
}
function initialize(p2pHostSelected){
    const selectedP2PServerId = p2pServerList[p2pHostSelected] ? p2pHostSelected : Object.keys(p2pServerList)[0]
    const p2pServerDetails = p2pServerList[selectedP2PServerId]
    const selectedHost = `${p2pServerDetails.secure ? `wss` : 'ws'}://` + p2pServerDetails.host + ':' + p2pServerDetails.p2pPort
    startConnection(selectedHost,p2pApiKey)
}
