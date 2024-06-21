module.exports = function(s,config,lang,app,io){
    const {
        scanStatus,
        runOnvifScanner,
        stopOnvifScanner,
    } = require('./scanners/utils.js')(s,config,lang)
    const {
        ffprobe,
    } = require('./ffmpeg/utils.js')(s,config,lang)
    const onWebSocketConnection = async (cn) => {
        const tx = function(z){if(!z.ke){z.ke=cn.ke;};cn.emit('f',z);}
        cn.on('f',(d) => {
            switch(d.f){
                case'onvif_scan_reconnect':
                    tx({f: 'onvif_scan_current', devices: Object.values(scanStatus.allSuccessful), isScanning: scanStatus.isActive})
                break;
                case'onvif_stop':
                    stopOnvifScanner()
                    tx({f: 'onvif_scan_stopped'})
                break;
                case'onvif':
                    const groupKey = `${cn.ke}`
                    runOnvifScanner(d, (data) => {
                        const response = { f: 'onvif', ...data }
                        s.tx(response, 'GRP_' + cn.ke)
                    }, (data) => {
                        const response = { f: 'onvif', ff: 'failed_capture', ...data }
                        s.tx(response, 'GRP_' + cn.ke)
                    }).then((responseList) => {
                        s.tx({ f: 'onvif_scan_complete' }, 'GRP_' + cn.ke)
                    })
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
