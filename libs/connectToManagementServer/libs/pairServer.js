const http = require('http');
const express = require('express');
const app = express();
var cors = require('cors');
var bodyParser = require('body-parser');
module.exports = (s,config) => {
    const { modifyConfiguration, getConfiguration } = require('../../system/utils.js')(config)
    const pairPort = config.pairPort || 8091
    const bindIp = config.bindip
    const server = http.createServer(app);
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended: true}));
    app.use(cors());

    server.listen(pairPort, bindIp, function(){
        console.log('Management Pair Server Listening on '+pairPort);
    });

    /**
    * API : Superuser : Save Management Server Settings
    */
    app.post('/mgmt/connect', async function (req,res){
        // form.managementServer
        // Example of Shinobi and MGMT on same server
        // ws://127.0.0.1:8663
        const response = {ok: true};
        if(!config.managementServer){
            const managementServer = s.getPostData(req,'managementServer');
            const peerConnectKey = s.getPostData(req,'peerConnectKey');
            if(peerConnectKey){
                config = Object.assign(config, { managementServer, peerConnectKey })
                const currentConfig = await getConfiguration()
                if(peerConnectKey){
                    currentConfig.peerConnectKey = peerConnectKey
                }
                // else if(!currentConfig.peerConnectKey){
                //     currentConfig.peerConnectKey = `bihan${s.gid(20)}`
                // }
                const configError = await modifyConfiguration(Object.assign(currentConfig, { managementServer }))
                if(configError)s.systemLog(configError)
                try{
                    s.centralManagementWorker.terminate()
                }catch(err){
                    s.debugLog(err)
                }
            }else{
                response.ok = false;
                response.msg = 'No P2P API Key Provided';
            }
        }else{
            response.ok = false;
            response.msg = 'Already Configured';
        }
        s.closeJsonResponse(res,response)
    })
}
