module.exports = function(s,config,lang,app,io){
    const {
        ffprobe,
    } = require('./ffmpeg/utils.js')(s,config,lang)
    const {
        runOnvifScanner,
    } = require('./scanners/utils.js')(s,config,lang)
    const onWebSocketConnection = async (cn) => {
        const tx = function(z){if(!z.ke){z.ke=cn.ke;};cn.emit('f',z);}
        cn.on('f',(d) => {
            switch(d.f){
                case'onvif':
                    runOnvifScanner(d,tx)
                break;
            }
        })
    }
    s.onWebSocketConnection(onWebSocketConnection)
    /**
    * API : FFprobe
     */
    app.get(config.webPaths.apiPrefix+':auth/probe/:ke',function (req,res){
        s.auth(req.params,function(user){
            const {
                isRestricted,
                isRestrictedApiKey,
                apiKeyPermissions,
            } = s.checkPermission(user);
            if(
                isRestrictedApiKey && apiKeyPermissions.control_monitors_disallowed
            ){
                s.closeJsonResponse(res,{
                    ok: false,
                    msg: lang['Not Authorized']
                });
                return
            }
            ffprobe(req.query.url,req.params.auth,(endData) => {
                s.closeJsonResponse(res,endData)
            })
        },res,req);
    })
}
