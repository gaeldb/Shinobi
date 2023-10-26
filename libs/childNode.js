const fs = require('fs');
const url = require('url');
const http = require('http');
const https = require('https');
const express = require('express');
const { createWebSocketServer, createWebSocketClient } = require('./basic/websocketTools.js')
module.exports = function(s,config,lang,app,io){
    //setup Master for childNodes
    if(
        config.childNodes.enabled === true &&
        config.childNodes.mode === 'master'
    ){
        const {
            getIpAddress,
            initiateDataConnection,
            initiateVideoTransferConnection,
            onWebSocketDataFromChildNode,
            onDataConnectionDisconnect,
            initiateVideoWriteFromChildNode,
            initiateTimelapseFrameWriteFromChildNode,
        } = require('./childNode/utils.js')(s,config,lang,app,io)
        s.childNodes = {};
        const childNodesConnectionIndex = {};
        const childNodeHTTP = express();
        const childNodeServer = http.createServer(app);
        const childNodeWebsocket = createWebSocketServer();
        const childNodeFileRelay = createWebSocketServer();
        childNodeServer.on('upgrade', function upgrade(request, socket, head) {
            const pathname = url.parse(request.url).pathname;
            if (pathname === '/childNode') {
                childNodeWebsocket.handleUpgrade(request, socket, head, function done(ws) {
                    childNodeWebsocket.emit('connection', ws, request)
                })
            } else if (pathname === '/childNodeFileRelay') {
                childNodeFileRelay.handleUpgrade(request, socket, head, function done(ws) {
                    childNodeFileRelay.emit('connection', ws, request)
                })
            } else {
                socket.destroy();
            }
        });
        const childNodeBindIP = config.childNodes.ip || config.bindip;
        childNodeServer.listen(config.childNodes.port,childNodeBindIP,function(){
            console.log(lang.Shinobi+' - CHILD NODE SERVER : ' + config.childNodes.port);
        });
        //send data to child node function
        s.cx = function(data,connectionId){
            childNodesConnectionIndex[connectionId].sendJson(data)
        }
        //child Node Websocket
        childNodeWebsocket.on('connection', function (client, req) {
            //functions for dispersing work to child servers;
            const ipAddress = getIpAddress(req)
            const connectionId = s.gid(10);
            s.debugLog('Child Node Connection!',new Date(),ipAddress)
            client.id = connectionId;
            function onAuthenticate(d){
                const data = JSON.parse(d);
                const childNodeKeyAccepted = config.childNodes.key.indexOf(data.socketKey) > -1;
                if(!client.shinobiChildAlreadyRegistered && data.f === 'init' && childNodeKeyAccepted){
                    initiateDataConnection(client,req,data,connectionId);
                    childNodesConnectionIndex[connectionId] = client;
                    client.removeListener('message',onAuthenticate)
                    client.on('message',(d) => {
                        const data = JSON.parse(d);
                        onWebSocketDataFromChildNode(client,data)
                    })
                }else{
                    s.debugLog('Child Node Force Disconnected!',new Date(),ipAddress)
                    client.disconnect()
                }
            }
            client.on('message',onAuthenticate)
            client.on('close',() => {
                onDataConnectionDisconnect(client, req)
            })
        })
        childNodeFileRelay.on('connection', function (client, req) {
            function onAuthenticate(d){
                const data = JSON.parse(d);
                const childNodeKeyAccepted = config.childNodes.key.indexOf(data.socketKey) > -1;
                if(!client.alreadyInitiated && data.fileType && childNodeKeyAccepted){
                    client.alreadyInitiated = true;
                    client.removeListener('message',onAuthenticate)
                    switch(data.fileType){
                        case'video':
                            initiateVideoWriteFromChildNode(client,data.options,data.connectionId)
                        break;
                        case'timelapseFrame':
                            initiateTimelapseFrameWriteFromChildNode(client,data.options,data.connectionId)
                        break;
                    }
                }else{
                    client.destroy()
                }
            }
            client.on('message',onAuthenticate)
        })
    }else
    //setup Child for childNodes
    if(
        config.childNodes.enabled === true &&
        config.childNodes.mode === 'child' &&
        config.childNodes.host
    ){
        const {
            initiateConnectionToMasterNode,
            onDisconnectFromMasterNode,
            onDataFromMasterNode,
        } = require('./childNode/childUtils.js')(s,config,lang,app,io)
        s.connectedToMasterNode = false;
        let childIO;
        function createChildNodeConnection(){
            childIO = createWebSocketClient('ws://'+config.childNodes.host + '/childNode',{
                onMessage: onDataFromMasterNode
            })
            childIO.on('open', function(){
                console.error(new Date(),'Child Nodes : Connected to Master Node! Authenticating...');
                initiateConnectionToMasterNode()
            })
            childIO.on('close',function(){
                onDisconnectFromMasterNode()
                setTimeout(() => {
                    console.error(new Date(),'Child Nodes : Connection to Master Node Closed. Attempting Reconnect...');
                    createChildNodeConnection()
                },3000)
            })
            childIO.on('error',function(err){
                console.error(new Date(),'Child Nodes ERROR : ', err.message);
                childIO.close()
            })
        }
        createChildNodeConnection()
        function sendDataToMasterNode(data){
            childIO.send(JSON.stringify(data))
        }
        s.cx = sendDataToMasterNode;
        // replace internal functions with bridges to master node
        s.tx = function(x,y){
            sendDataToMasterNode({f:'s.tx',data:x,to:y})
        }
        s.userLog = function(x,y){
            sendDataToMasterNode({f:'s.userLog',mon:x,data:y})
        }
        s.queuedSqlCallbacks = {}
        s.sqlQuery = function(query,values,onMoveOn){
            var callbackId = s.gid()
            if(!values){values=[]}
            if(typeof values === 'function'){
                var onMoveOn = values;
                var values = [];
            }
            if(typeof onMoveOn === 'function')s.queuedSqlCallbacks[callbackId] = onMoveOn;
            sendDataToMasterNode({f:'sql',query:query,values:values,callbackId:callbackId});
        }
        s.knexQuery = function(options,onMoveOn){
            var callbackId = s.gid()
            if(typeof onMoveOn === 'function')s.queuedSqlCallbacks[callbackId] = onMoveOn;
            sendDataToMasterNode({f:'knex',options:options,callbackId:callbackId});
        }
    }
}
