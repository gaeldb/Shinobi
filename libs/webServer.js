const fs = require('fs');
const url = require('url');
const http = require('http');
const https = require('https');
const express = require('express');
const app = express()
module.exports = function(s,config,lang,io){
    app.disable('x-powered-by');
    //get page URL
    if(!config.baseURL){
        config.baseURL = ""
    }else if(config.baseURL !== ''){
        config.baseURL = s.checkCorrectPathEnding(config.baseURL)
    }
    //Render Configurations - Web Paths
    if(config.webPaths === undefined){config.webPaths={}}
        //main access URI
        if(config.webPaths.home === undefined){config.webPaths.home='/'}
        //Super User URI
        if(config.webPaths.super === undefined){config.webPaths.super='/super'}
        //Admin URI
        if(config.webPaths.admin === undefined){config.webPaths.admin='/admin'}
        //Libraries URI
        if(config.webPaths.libs === undefined){config.webPaths.libs='/libs'}
        //API Prefix
        if(config.webPaths.apiPrefix === undefined){config.webPaths.apiPrefix = s.checkCorrectPathEnding(config.webPaths.home)}else{config.webPaths.apiPrefix = s.checkCorrectPathEnding(config.webPaths.apiPrefix)}
        //Admin API Prefix
        if(config.webPaths.adminApiPrefix === undefined){config.webPaths.adminApiPrefix=s.checkCorrectPathEnding(config.webPaths.admin)}else{config.webPaths.adminApiPrefix = s.checkCorrectPathEnding(config.webPaths.adminApiPrefix)}
        //Super API Prefix
        if(config.webPaths.superApiPrefix === undefined){config.webPaths.superApiPrefix=s.checkCorrectPathEnding(config.webPaths.super)}else{config.webPaths.superApiPrefix = s.checkCorrectPathEnding(config.webPaths.superApiPrefix)}
    //Render Configurations - Page Render Paths
    if(config.renderPaths === undefined){config.renderPaths={}}
        //login page
        if(config.renderPaths.index === undefined){config.renderPaths.index='pages/index'}
        //dashboard page
        if(config.renderPaths.home === undefined){config.renderPaths.home='pages/home'}
        //sub-account administration page
        if(config.renderPaths.admin === undefined){config.renderPaths.admin='pages/admin'}
        //superuser page
        if(config.renderPaths.super === undefined){config.renderPaths.super='pages/super'}
        //2-Factor Auth page
        if(config.renderPaths.factorAuth === undefined){config.renderPaths.factorAuth='pages/factor'}
        //Streamer v1 (Dashcam Prototype) page
        if(config.renderPaths.streamer === undefined){config.renderPaths.streamer='pages/streamer'}
        //Streamer v2 (Dashcam) page
        if(config.renderPaths.dashcam === undefined){config.renderPaths.dashcam='pages/dashcam'}
        //embeddable widget page
        if(config.renderPaths.embed === undefined){config.renderPaths.embed='pages/embed'}
        //timelapse page (not modal)
        if(config.renderPaths.timelapse === undefined){config.renderPaths.timelapse='pages/timelapse'}
        //mjpeg full screen page
        if(config.renderPaths.mjpeg === undefined){config.renderPaths.mjpeg='pages/mjpeg'}
        //gridstack only page
        if(config.renderPaths.grid === undefined){config.renderPaths.grid='pages/grid'}
        //slick.js (cycle) page
        if(config.renderPaths.cycle === undefined){config.renderPaths.cycle='pages/cycle'}
        //WallView page
        if(config.renderPaths.wallview === undefined){config.renderPaths.wallview='pages/wallview'}
        //WallVideoView page
        if(config.renderPaths.wallvideoview === undefined){config.renderPaths.wallvideoview='pages/wallvideoview'}
    // Use uws/cws
    if(config.useUWebsocketJs === undefined){config.useUWebsocketJs=true}
    if(config.webBlocksPreloaded === undefined){
        config.webBlocksPreloaded = [
            'home/initial',
            'home/videoPlayer',
            'home/monitorsList',
            'home/subAccountManager',
            'home/accountSettings',
            'home/apiKeys',
            'home/monitorSettings',
            'home/schedules',
            'home/monitorStates',
            'home/liveGrid',
            'home/regionEditor',
            'home/timelapseViewer',
            'home/eventFilters',
            'home/cameraProbe',
            'home/onvifScanner',
            'home/onvifDeviceManager',
            'home/configFinder',
            'home/logViewer',
            'home/calendar',
            'home/eventListWithPics',
            'home/fileBin',
            'home/videosTable',
            'home/studio',
            'home/monitorMap',
            'home/timeline',
            'confirm',
            'home/help',
        ]
    }
    //SSL options
    var wellKnownDirectory = s.mainDirectory + '/web/.well-known'
    if(fs.existsSync(wellKnownDirectory))app.use('/.well-known',express.static(wellKnownDirectory))
    config.sslEnabled = false
    const sslInfo = config.ssl
    if(sslInfo && sslInfo.key && sslInfo.cert){
        try{
            sslInfo.key = fs.readFileSync(s.checkRelativePath(sslInfo.key),'utf8')
            sslInfo.cert = fs.readFileSync(s.checkRelativePath(sslInfo.cert),'utf8')
            sslInfo.port = sslInfo.port || 443
            sslInfo.bindip = sslInfo.bindip || config.bindip
            if(sslInfo.ca && sslInfo.ca instanceof Array){
                sslInfo.ca.forEach(function(v,n){
                    sslInfo.ca[n] = fs.readFileSync(s.checkRelativePath(v),'utf8')
                })
            }
            var serverHTTPS = https.createServer(sslInfo,app);
            serverHTTPS.listen(sslInfo.port,config.bindip,function(){
                console.log('SSL '+lang.Shinobi+' : SSL Web Server Listening on '+sslInfo.port);
            });
            if(config.webPaths.home !== '/'){
                io.attach(serverHTTPS,{
                    path:'/socket.io',
                    transports: ['websocket']
                })
            }
            io.attach(serverHTTPS,{
                path:s.checkCorrectPathEnding(config.webPaths.home)+'socket.io',
                transports: ['websocket']
            })
            io.attach(serverHTTPS,{
                path:s.checkCorrectPathEnding(config.webPaths.admin)+'socket.io',
                transports: ['websocket']
            })
            io.attach(serverHTTPS,{
                path:s.checkCorrectPathEnding(config.webPaths.super)+'socket.io',
                transports: ['websocket']
            })
            if(sslInfo.autoRedirect === true){
                app.use(function(req, res, next) {
                  if(!req.secure) {
                      return res.redirect(['https://', req.hostname,":",sslInfo.port, req.url].join(''));
                  }
                  next();
                })
            }
            config.sslEnabled = true
        }catch(err){
            console.error(err)
        }
    }
    //start HTTP
    const onHttpRequestUpgradeExtensions = s.onHttpRequestUpgradeExtensions;
    var server = http.createServer(app);
    server.listen(config.port,config.bindip,function(){
        console.log(lang.Shinobi+' : Web Server Listening on '+config.port);
    });
    server.on('upgrade', function upgrade(request, socket, head) {
        const pathname = url.parse(request.url).pathname;
        if(typeof onHttpRequestUpgradeExtensions[pathname] === 'function'){
            onHttpRequestUpgradeExtensions[pathname](request, socket, head)
        } else if (pathname.indexOf('/socket.io') > -1) {
            return;
        } else {
            socket.destroy();
        }
    });
    if(config.webPaths.home !== '/'){
        io.attach(server,{
            path:'/socket.io',
            transports: ['websocket']
        })
    }
    io.attach(server,{
        path:s.checkCorrectPathEnding(config.webPaths.home)+'socket.io',
        transports: ['websocket']
    })
    io.attach(server,{
        path:s.checkCorrectPathEnding(config.webPaths.admin)+'socket.io',
        transports: ['websocket']
    })
    io.attach(server,{
        path:s.checkCorrectPathEnding(config.webPaths.super)+'socket.io',
        transports: ['websocket']
    })
    if(config.useUWebsocketJs === true){
        io.engine.ws = new (require('cws').Server)({
            noServer: true,
            perMessageDeflate: false
        })
    }
    return app
}
