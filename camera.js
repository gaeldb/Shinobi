//
// Shinobi - Open Source Video Management System
// Copyright (C) 2020 Moe Alam, moeiscool
//
// # Supporting Shinobi Development
//
// If you would like to support Shinobi please consider subscribing to a Mobile License :)
// Subscribe : https://licenses.shinobi.video/subscribe?planSubscribe=plan_G31AZ9mknNCa6z
// PayPal : paypal@m03.ca
//
const io = new (require('socket.io').Server)()
//process handlers
const s = require('./libs/process.js')(process,__dirname)
//load extender functions
require('./libs/extenders.js')(s)
//configuration loader
var config = require('./libs/config.js')(s)
//basic functions
require('./libs/basic.js')(s,config)
//language loader
var lang = require('./libs/language.js')(s,config)
//working directories : videos, streams, fileBin..
require('./libs/folders.js')(s,config,lang)
//code test module
// require('./libs/codeTester.js')(s,config,lang)
//get version
require('./libs/version.js')(s,config,lang)
//video processing engine
require('./libs/ffmpeg.js')(s,config,lang, async () => {
    //database connection : mysql, sqlite3..
    require('./libs/sql.js')(s,config)
    //authenticator functions : API, dashboard login..
    require('./libs/auth.js')(s,config,lang)
    //express web server with ejs
    const app = require('./libs/webServer.js')(s,config,lang,io)
    //data port
    require('./libs/dataPort.js')(s,config,lang,app,io)
    //page layout load
    require('./libs/definitions.js')(s,config,lang,app,io)
    //web server routes : page handling..
    require('./libs/webServerPaths.js')(s,config,lang,app,io)
    //web server routes for streams : streams..
    require('./libs/webServerStreamPaths.js')(s,config,lang,app,io)
    //web server admin routes : create sub accounts, share monitors, share videos
    require('./libs/webServerAdminPaths.js')(s,config,lang,app,io)
    //web server superuser routes : create admin accounts and manage system functions
    require('./libs/webServerSuperPaths.js')(s,config,lang,app,io)
    //websocket connection handlers : login and streams..
    require('./libs/socketio.js')(s,config,lang,io)
    //user and group functions
    require('./libs/user.js')(s,config,lang)
    //timelapse functions
    require('./libs/timelapse.js')(s,config,lang,app,io)
    //fileBin functions
    require('./libs/fileBin.js')(s,config,lang,app,io)
    //monitor/camera handlers
    require('./libs/monitor.js')(s,config,lang)
    //event functions : motion, object matrix handler
    require('./libs/events.js')(s,config,lang)
    //recording functions
    require('./libs/videos.js')(s,config,lang)
    //plugins : websocket connected services..
    require('./libs/plugins.js')(s,config,lang,app,io)
    //health : cpu and ram trackers..
    require('./libs/health.js')(s,config,lang,io)
    //cluster module
    require('./libs/childNode.js')(s,config,lang,app,io)
    //cloud uploaders : amazon s3, webdav, backblaze b2..
    require('./libs/uploaders.js')(s,config,lang,app,io)
    //notifiers : discord..
    require('./libs/rtmpserver.js')(s,config,lang)
    //dropInEvents server (file manipulation to create event trigger)
    require('./libs/dropInEvents.js')(s,config,lang,app,io)
    //notifiers : discord..
    require('./libs/notification.js')(s,config,lang)
    //branding functions and config defaults
    require('./libs/branding.js')(s,config,lang,app,io)
    //custom module loader
    require('./libs/customAutoLoad.js')(s,config,lang,app,io)
    //scheduling engine
    require('./libs/shinobiHub.js')(s,config,lang,app,io)
    //onvif, ptz engine
    require('./libs/control.js')(s,config,lang,app,io)
    //ffprobe, onvif engine
    require('./libs/scanners.js')(s,config,lang,app,io)
    //scheduling engine
    require('./libs/scheduler.js')(s,config,lang,app,io)
    //onvif device manager
    require('./libs/onvifDeviceManager.js')(s,config,lang,app,io)
    //alternate logins
    require('./libs/auth/logins.js')(s,config,lang,app)
    //rally other Shinobi
    require('./libs/rally.js')(s,config,lang,app,io)
    //rally other Shinobi
    require('./libs/mountManager.js')(s,config,lang,app,io)
    // management server connect
    require('./libs/connectToManagementServer/index.js')(s,config,lang,app)
    //p2p, commander
    require('./libs/commander.js')(s,config,lang,app)
    //on-start actions, daemon(s) starter
    await require('./libs/startup.js')(s,config,lang)
    //cron
    require('./libs/cron.js')(s,config,lang)
    //video browser functions
    require('./libs/videoBrowser.js')(s,config,lang,app,io)
})
