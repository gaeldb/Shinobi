var mainSocket = {}
var websocketPath = checkCorrectPathEnding(location.pathname) + 'socket.io'
var websocketQuery = {}
if(location.search === '?p2p=1'){
    window.machineId = location.pathname.split('/')[2]
    websocketPath = '/socket.io'
    websocketQuery.machineId = machineId
}
var onInitWebsocketFunctions = []
function onInitWebsocket(theAction){
    onInitWebsocketFunctions.push(theAction)
}
var onWebSocketEventFunctions = []
function onWebSocketEvent(theAction){
    onWebSocketEventFunctions.push(theAction)
}
var queuedCallbacks = {}
function createWebsocket(theURL,thePath){
    mainSocket = io(theURL || location.origin, thePath instanceof Object ? thePath : {
        path: thePath || websocketPath,
        query: websocketQuery,
    })
    mainSocket.f = function(data,callback){
        if(!data.ke)data.ke = $user.ke;
        if(!data.uid)data.uid = $user.uid;
        if(callback){
            var callbackId = generateId();
            data.callbackId = callbackId
            queuedCallbacks[callbackId] = callback
        }
        // console.log('Sending Data',data)
        return mainSocket.emit('f',data)
    }
    mainSocket.on('ping', function(){
        mainSocket.emit('pong',{beat:1})
    })
    mainSocket.on('connect',function (d){
        console.log('Connected to Websocket!')
        mainSocket.f({
            f: 'init',
            ke: $user.ke,
            auth: $user.auth_token,
            uid: $user.uid
        })
    })
    mainSocket.on('f',function (d){
        switch(d.f){
            case'init_success':
                console.log('Authenticated to Websocket!')
                $.each(onInitWebsocketFunctions,function(n,theAction){
                    theAction(d)
                })
            break;
            case'callback':
                console.log('Callback from Websocket Request',d)
                queuedCallbacks[d.callbackId](...d.args)
            break;
        }
        $.each(onWebSocketEventFunctions,function(n,theAction){
            theAction(d)
        })
    })
}
