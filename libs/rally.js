const {
    ShinobiAPI,
    formatDateTime,
    getCameraTemplate,
    cleanStringForMonitorId,
} = require('node-shinobi');

module.exports = (s,config,lang,app,io) => {
    function getServerInfo(){}
    async function getMonitors({ host, groupKey, apiKey }){
        const shinobi = new ShinobiAPI(host, apiKey, groupKey);
        const monitors = await shinobi.getMonitor();
        return monitors
    }
    /**
    * API : Get Monitors
     */
    app.post(config.webPaths.apiPrefix+':auth/rally/:ke/getMonitors', function (req,res){
        s.auth(req.params, async function(user){
            const groupKey = req.params.ke
            const asis = s.getPostData(req,'asis') === '1'
            const connectionInfo = s.getPostData(req,'connectionInfo',true) || {}
            const {
                isRestricted,
                isRestrictedApiKey,
                apiKeyPermissions,
                userPermissions,
            } = s.checkPermission(user)
            if(
                isRestrictedApiKey && apiKeyPermissions.get_monitors_disallowed
            ){
                s.closeJsonResponse(res,[]);
                return
            }
            if(!connectionInfo.host || !connectionInfo.groupKey || !connectionInfo.apiKey){
                s.closeJsonResponse(res,{ok: false, msg: lang['No Data']});
                return
            }
            const monitors = await getMonitors(connectionInfo) || [];
            s.closeJsonResponse(res, monitors);
        },res,req);
    });

    // page structure
    config.webBlocksPreloaded.push(`home/rally`);
}
