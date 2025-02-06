const fs = require('fs').promises
const { Worker } = require('worker_threads')
const testMode = process.argv[2] === 'test'
let passedJSON = false
let passedConfig = {}
const moduleName = 'connectToManagementServer'
module.exports = (s,config,lang,app) => {
    if(!config.enableMgmtConnect){
        return;
    }
    const { modifyConfiguration, getConfiguration } = require('../system/utils.js')(config)
    require('./libs/centralConnect.js')(s,config,lang)
    require('./libs/pairServer.js')(s,config)

    /**
    * API : Superuser : Save Management Server Settings
    */
    app.post(config.webPaths.superApiPrefix+':auth/mgmt/save', function (req,res){
        s.superAuth(req.params,async (resp) => {
            // for saving :
            // form.peerConnectKey
            // form.managementServer
            const response = {ok: true};
            const form = s.getPostData(req,'data',true);
            config = Object.assign(config,form)
            const currentConfig = await getConfiguration()
            const configError = await modifyConfiguration(Object.assign(currentConfig,form))
            if(configError)s.systemLog(configError)
            try{
                s.restartCentralManagement()
            }catch(err){
                s.debugLog(err)
            }
            s.closeJsonResponse(res,response)
        },res,req)
    })

    /**
    * API : Delete Management Server Settings
    */
    app.post(config.webPaths.superApiPrefix+':auth/mgmt/disconnect', async function (req,res){
        s.superAuth(req.params,async (resp) => {
            const response = {ok: true};
            const peerConnectKey = s.getPostData(req,'peerConnectKey');
            const currentConfig = await getConfiguration()
            if(currentConfig.peerConnectKey === peerConnectKey){
                delete(config.managementServer);
                delete(currentConfig.managementServer);
                const configError = await modifyConfiguration(currentConfig);
                if(configError)s.systemLog(configError);
                try{
                    s.restartCentralManagement()
                }catch(err){
                    s.debugLog(err)
                }
            }else{
                response.ok = false;
                response.msg = 'Peer Connect Key not matching! Cannot disconnect.';
            }
            s.closeJsonResponse(res,response)
        },res,req)
    })
}
