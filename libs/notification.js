var fs = require("fs")
module.exports = function(s,config,lang){
    async function getSnapshot(d,monitorConfig){
        d.screenshotBuffer = d.screenshotBuffer || d.frame
        if(!d.screenshotBuffer || (monitorConfig.details.notify_useRawSnapshot === '1' && !d.usingRawSnapshotBuffer)){
            d.usingRawSnapshotBuffer = true
            const { screenShot, isStaticFile } = await s.getRawSnapshotFromMonitor(monitorConfig,{
                secondsInward: monitorConfig.details.snap_seconds_inward
            })
            d.screenshotBuffer = screenShot
        }
    }
    if(
        config.mail &&
        config.mail.auth &&
        config.mail.auth.user !== 'your_email@gmail.com' &&
        config.mail.auth.pass !== 'your_password_or_app_specific_password'
    ){
        require('./notifications/email.js')(s,config,lang,getSnapshot)
    }
    require('./notifications/webhook.js')(s,config,lang,getSnapshot)
    require('./notifications/emailByUser.js')(s,config,lang,getSnapshot)
    require('./notifications/discordBot.js')(s,config,lang,getSnapshot)
    require('./notifications/telegram.js')(s,config,lang,getSnapshot)
    require('./notifications/pushover.js')(s,config,lang,getSnapshot)
    require('./notifications/mqtt.js')(s,config,lang,getSnapshot)
    require('./notifications/matrix.js')(s,config,lang,getSnapshot)
}
