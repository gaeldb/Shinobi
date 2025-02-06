const WebSocket = require('cws');
function createWebSocketServer(options){
    const theWebSocket = new WebSocket.Server(options ? options : {
        noServer: true
    });
    theWebSocket.broadcast = function(data) {
      theWebSocket.clients.forEach((client) => {
           try{
               client.sendData(data)
           }catch(err){
               // console.log(err)
           }
      })
    };
    return theWebSocket
}
function createWebSocketClient(connectionHost,options){
    const clientConnection = new WebSocket(connectionHost, options.engineOptions);
    if(options.onMessage){
        const onMessage = options.onMessage;
        clientConnection.on('message', message => {
            const data = JSON.parse(message);
            onMessage(data);
        });
    }
    return clientConnection
}

module.exports = {
    createWebSocketServer,
    createWebSocketClient,
}
