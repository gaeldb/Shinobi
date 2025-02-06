const { spawn } = require('child_process');
const { parentPort, workerData } = require('worker_threads');
process.on("uncaughtException", function(error) {
  console.error(error);
});
const activeTerminalCommands = {}
let config = workerData.config
let lang = workerData.lang
let sslInfo = config.ssl || {}
const expectedConfigPath = `./conf.json`
const hostPeerServer = config.managementServer;
const peerConnectKey = config.peerConnectKey;
if(!peerConnectKey || !hostPeerServer){
    console.log(`Management Server Connection Not Configured!`)
    setInterval(() => {

    }, 1000 * 60 * 60 * 24)
    return;
}
const fs = require("fs").promises
const net = require("net")
const bson = require('bson')
const WebSocket = require('cws')
const os = require('os');
const { EventEmitter } = require('node:events');
const internalEvents = new EventEmitter();
const s = {
    debugLog: () => {},
    systemLog: (...args) => {
        parentPort.postMessage({
            f: 'systemLog',
            data: args
        })
    },
}
console.log('hostPeerServer',hostPeerServer)
if(config.debugLog){
    s.debugLog = (...args) => {
        parentPort.postMessage({
            f: 'debugLog',
            data: args
        })
    }
}
parentPort.on('message',(data) => {
    switch(data.f){
        case'init':
            initialize()
        break;
        case'connectDetails':
            data.connectDetails.peerConnectKey = peerConnectKey;
            internalEvents.emit('connectDetails', data.connectDetails);
            // outboundMessage('connectDetailsForManagement', data.connectDetails, '1');
        break;
        case'exit':
            s.debugLog('Closing Central Connection...')
            process.exit(0)
        break;
    }
})
let outboundMessage = null
var socketCheckTimer = null
var heartbeatTimer = null
var heartBeatCheckTimout = null
var onClosedTimeout = null
let stayDisconnected = false
const requestConnections = {}
const requestConnectionsData = {}
function getServerIPAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (let interfaceName in interfaces) {
    for (let i = 0; i < interfaces[interfaceName].length; i++) {
      const iface = interfaces[interfaceName][i];
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}
function getRequestConnection(requestId){
    return requestConnections[requestId] || {
        write: () => {}
    }
}
function clearAllTimeouts(){
    clearInterval(heartbeatTimer)
    clearTimeout(heartBeatCheckTimout)
    clearTimeout(onClosedTimeout)
}
function getConnectionDetails(){
    return new Promise((resolve) => {
        internalEvents.once('connectDetails' ,(data) => {
            resolve(data)
        })
        parentPort.postMessage({ f: 'connectDetailsRequest' })
    })
}
function requestConnectionDetails(){
}
function startConnection(){
    let tunnelToP2P
    stayDisconnected = false
    const allMessageHandlers = []
    async function startWebsocketConnection(key,callback){
        s.debugLog(`startWebsocketConnection EXECUTE`,new Error())
        console.log('Central : Connecting to Central Server...')
        function createWebsocketConnection(){
            clearAllTimeouts()
            return new Promise((resolve,reject) => {
                try{
                    stayDisconnected = true
                    if(tunnelToP2P)tunnelToP2P.close()
                }catch(err){
                    console.log(err)
                }
                tunnelToP2P = new WebSocket(hostPeerServer);
                stayDisconnected = false;
                tunnelToP2P.on('open', function(){
                    resolve(tunnelToP2P)
                })
                tunnelToP2P.on('error', (err) => {
                    console.log(`Central tunnelToCentral Error : `,err)
                    console.log(`Central Restarting...`)
                    // disconnectedConnection()
                })
                tunnelToP2P.on('close', () => {
                    console.log(`Central Connection Closed!`)
                    clearAllTimeouts()
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

                clearInterval(socketCheckTimer)
                socketCheckTimer = setInterval(() => {
                    // s.debugLog('Tunnel Ready State :',tunnelToP2P.readyState)
                    if(tunnelToP2P.readyState !== 1){
                        s.debugLog('Tunnel NOT Ready! Reconnecting...')
                        disconnectedConnection()
                    }
                },1000 * 20)
            })
        }
        function disconnectedConnection(code,reason){
            s.debugLog('stayDisconnected',stayDisconnected)
            clearAllTimeouts()
            s.debugLog('DISCONNECTED!')
            if(stayDisconnected)return;
            s.debugLog('RESTARTING!')
            setTimeout(() => {
                if(tunnelToP2P && tunnelToP2P.readyState !== 1)startWebsocketConnection()
            },2000)
        }
        s.debugLog(hostPeerServer)
        await createWebsocketConnection(hostPeerServer,allMessageHandlers)
        console.log('Central : Connected! Authenticating...')
        const connectDetails = await getConnectionDetails()
        sendDataToTunnel({
            isShinobi: !!config.passwordType,
            peerConnectKey,
            connectDetails,
            ipAddresses: getServerIPAddresses(),
            config: JSON.parse(await fs.readFile(expectedConfigPath,'utf8')),
        })
        clearInterval(heartbeatTimer)
        heartbeatTimer = setInterval(() => {
            sendDataToTunnel({
                f: 'ping',
            })
        }, 1000 * 10)
        setTimeout(() => {
            if(tunnelToP2P.readyState !== 1)refreshHeartBeatCheck()
        },5000)
    }
    function sendDataToTunnel(data){
        tunnelToP2P.send(bson.serialize(data))
    }
    startWebsocketConnection()
    function onIncomingMessage(key,callback){
        allMessageHandlers.push({
            key: key,
            callback: callback,
        })
    }
    outboundMessage = (key,data,requestId) => {
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
        const responseTunnel = await getResponseTunnel(requestId)
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
        remotesocket.connect(port, host || 'localhost');
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
        clearTimeout(heartBeatCheckTimout)
        heartBeatCheckTimout = setTimeout(() => {
            startWebsocketConnection()
        },1000 * 10 * 1.5)
    }
    onIncomingMessage('connect',async (data,requestId) => {
        s.debugLog('New Request Incoming', 'localhost', config.port, requestId);
        const socket = await createRemoteSocket('localhost', config.port, requestId, data.init)
    })
    onIncomingMessage('data',writeToServer)

    onIncomingMessage('resume',function(data,requestId){
        requestConnections[requestId].resume()
    })
    onIncomingMessage('pause',function(data,requestId){
        requestConnections[requestId].pause()
    })
    onIncomingMessage('pong',function(data,requestId){
        refreshHeartBeatCheck()
    })
    onIncomingMessage('init',function(data,requestId){
        console.log(`Central : Authenticated!`)
    })
    onIncomingMessage('modifyConfiguration',function(data,requestId){
        parentPort.postMessage({
            f: 'modifyConfiguration',
            data: data
        })
    })
    onIncomingMessage('getConfiguration',function(data, requestId){
        outboundMessage('getConfigurationResponse', Object.assign({}, config), requestId)
    })
    onIncomingMessage('restart',function(data,requestId){
        parentPort.postMessage({ f: 'restart' })
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
        stayDisconnected = !retryLater
        if(retryLater)console.log(`Retrying Central Later...`)
    })
}
const responseTunnels = {}
async function getResponseTunnel(originalRequestId){
    return responseTunnels[originalRequestId] || await createResponseTunnel(originalRequestId)
}
function createResponseTunnel(originalRequestId){
    const responseTunnelMessageHandlers = []
    function onMessage(key,callback){
        responseTunnelMessageHandlers.push({
            key: key,
            callback: callback,
        })
    }
    return new Promise((resolve,reject) => {
        const responseTunnel = new WebSocket(hostPeerServer);
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
                peerConnectKey,
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
startConnection()
