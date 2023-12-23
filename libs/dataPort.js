const { createWebSocketServer } = require('./basic/websocketTools.js')
module.exports = function(s,config,lang,app,io){
    const {
        triggerEvent,
    } = require('./events/utils.js')(s,config,lang)
    s.dataPortTokens = {}
    const theWebSocket = createWebSocketServer()
    s.dataPortServer = theWebSocket;
    function setClientKillTimerIfNotAuthenticatedInTime(client){
        client.killTimer = setTimeout(function(){
            client.terminate()
        },10000)
    }
    function clearKillTimer(client){
        clearTimeout(client.killTimer)
    }
    theWebSocket.on('connection',(client) => {
        // client.send(someDataToSendAsStringOrBinary)
        setClientKillTimerIfNotAuthenticatedInTime(client)
        function onAuthenticate(data){
            clearKillTimer(client)
            if(data in s.dataPortTokens){
                client.removeListener('message', onAuthenticate);
                client.on('message', onAuthenticatedData)
                delete(s.dataPortTokens[data]);
            }else{
                client.terminate()
            }
        }
        function onAuthenticatedData(jsonData){
            const data = JSON.parse(jsonData);
            switch(data.f){
                case'trigger':
                    triggerEvent(data)
                break;
                case's.tx':
                    s.tx(data.data,data.to)
                break;
                case'debugLog':
                    s.debugLog(data.data)
                break;
                default:
                    console.log(`No Data Port Handler!`)
                    console.log(`here's what we got :`)
                    console.log(data)
                break;
            }
            s.onDataPortMessageExtensions.forEach(function(extender){
                extender(data)
            })
        }
        client.on('message', onAuthenticate)
        client.on('close', () => {
            clearTimeout(client.killTimer)
        })
        client.on('disconnect', () => {
            clearTimeout(client.killTimer)
        })
    })
    s.onHttpRequestUpgrade('/dataPort',(request, socket, head) => {
        theWebSocket.handleUpgrade(request, socket, head, function done(ws) {
            theWebSocket.emit('connection', ws, request)
        })
    })
}
