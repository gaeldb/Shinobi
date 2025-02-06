var express = require('express');
var fs = require('fs');
var bodyParser = require('body-parser');
var os = require('os');
var moment = require('moment');
var execSync = require('child_process').execSync;
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var httpProxy = require('http-proxy');
var proxy = httpProxy.createProxyServer({})
var ejs = require('ejs');
module.exports = function(s,config,lang,app){
    const { getAdminUser } = require('./user/utils.js')(s,config,lang);
    function cantLiveStreamPermission(user,monitorId,permission){
        const {
            monitorPermissions,
            monitorRestrictions,
        } = s.getMonitorsPermitted(user.details,monitorId)
        const {
            isRestricted,
            isRestrictedApiKey,
            apiKeyPermissions,
        } = s.checkPermission(user)
        if(
            isRestrictedApiKey && apiKeyPermissions[`${permission}_disallowed`] ||
            isRestricted && !monitorPermissions[`${monitorId}_monitors`]
        ){
            return true
        }
        return false
    }
    var noCache = function(res){
        res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate')
        res.setHeader('Expires', '-1')
        res.setHeader('Pragma', 'no-cache')
    }
    /**
    * Page : Get Embed Stream
     */
    app.get([config.webPaths.apiPrefix+':auth/embed/:ke/:id',config.webPaths.apiPrefix+':auth/embed/:ke/:id/:addon'], function (req,res){
        req.params.protocol=req.protocol;
        s.auth(req.params,function(user){
            const authKey = req.params.auth
            const groupKey = req.params.ke
            const monitorId = req.params.id
            if(cantLiveStreamPermission(user,monitorId,'watch_stream')){
                s.closeJsonResponse(res,{ok: false, msg: lang['Not Authorized']});
                return;
            }
            if(user.permissions.watch_stream==="0"||user.details.sub&&user.details.allmonitors!=='1'&&user.details.monitors.indexOf(req.params.id)===-1){
                res.end(user.lang['Not Permitted'])
                return
            }
            if(s.group[req.params.ke]&&s.group[req.params.ke].activeMonitors[req.params.id]){
                if(s.group[req.params.ke].activeMonitors[req.params.id].isStarted === true){
                    req.params.uid=user.uid;
                    var $user = {
                        auth_token: authKey,
                        ke: groupKey,
                        uid: user.uid,
                        mail: user.mail,
                        details: {},
                    };
                    s.renderPage(req,res,config.renderPaths.embed,{
                        forceUrlPrefix: req.query.host || '',
                        data: req.params,
                        protocol: req.protocol,
                        baseUrl: req.protocol+'://'+req.hostname,
                        config: s.getConfigWithBranding(req.hostname),
                        define: s.getDefinitonFile(user.details ? user.details.lang : config.lang),
                        lang: lang,
                        $user: $user,
                        mon: Object.assign({},s.group[req.params.ke].rawMonitorConfigurations[req.params.id]),
                        originalURL: s.getOriginalUrl(req)
                    });
                }else{
                    res.end(user.lang['Cannot watch a monitor that isn\'t running.'])
                }
            }else{
                res.end(user.lang['No Monitor Exists with this ID.'])
            }
        },res,req);
    });
    /**
    * API : Get Poseidon MP4 Stream
     */
    app.get([config.webPaths.apiPrefix+':auth/mp4/:ke/:id/:channel/s.mp4',config.webPaths.apiPrefix+':auth/mp4/:ke/:id/s.mp4',config.webPaths.apiPrefix+':auth/mp4/:ke/:id/:channel/s.ts',config.webPaths.apiPrefix+':auth/mp4/:ke/:id/s.ts'], function (req, res) {
        s.auth(req.params,function(user){
            const monitorId = req.params.id
            if(cantLiveStreamPermission(user,monitorId,'watch_stream')){
                s.closeJsonResponse(res,{ok: false, msg: lang['Not Authorized']});
                return;
            }
            if(!s.group[req.params.ke] || !s.group[req.params.ke].activeMonitors[req.params.id]){
                res.status(404);
                res.end('404 : Monitor not found');
                return
            }
            s.checkChildProxy(req.params,function(){
                    var Channel = 'MAIN'
                    if(req.params.channel){
                        Channel = parseInt(req.params.channel)+config.pipeAddition
                    }
                    var mp4frag = s.group[req.params.ke].activeMonitors[req.params.id].mp4frag[Channel];
                    var errorMessage = 'MP4 Stream is not enabled'
                    if(!mp4frag){
                        res.status(503);
                        res.end('503 : initialization : '+errorMessage);
                    }else{
                        var init = mp4frag.initialization;
                        if (!init) {
                            res.status(503);
                            res.end('404 : Not Found : '+errorMessage);
                        } else {
                            res.locals.mp4frag = mp4frag
                            res.set('Connection', 'close')
                            res.set('Cache-Control', 'private, no-cache, no-store, must-revalidate')
                            res.set('Expires', '-1')
                            res.set('Pragma', 'no-cache')
                            res.set('Content-Type', 'video/mp4')
                            res.status(200);
                            res.write(init);
                            mp4frag.pipe(res);
                            var ip = s.getClientIp(req)
                            s.camera('watch_on',{
                                id : req.params.id,
                                ke : req.params.ke
                            },{
                                id : req.params.auth + ip + req.headers['user-agent']
                            })
                            res.on('close', () => {
                                try{
                                    mp4frag.unpipe(res)
                                }catch(err){}
                                s.camera('watch_off',{
                                    id : req.params.id,
                                    ke : req.params.ke
                                },{
                                    id : req.params.auth + ip + req.headers['user-agent']
                                })
                            })
                        }
                    }
            },res,req);
        },res,req);
    });
    /**
    * API and Page : Get MJPEG Stream or Page
     * @param {string} full - if `true` page will load the MJPEG iframe page
     */
    app.get([config.webPaths.apiPrefix+':auth/mjpeg/:ke/:id',config.webPaths.apiPrefix+':auth/mjpeg/:ke/:id/:channel'], function(req,res) {
        if(req.query.full=='true'){
            s.renderPage(req,res,config.renderPaths.mjpeg,{url:config.webPaths.apiPrefix + req.params.auth+'/mjpeg/'+req.params.ke+'/'+req.params.id,originalURL:s.getOriginalUrl(req)});
            res.end()
        }else{
            s.auth(req.params,function(user){
                const monitorId = req.params.id
                if(cantLiveStreamPermission(user,monitorId,'watch_stream')){
                    s.closeJsonResponse(res,{ok: false, msg: lang['Not Authorized']});
                    return;
                }
                s.checkChildProxy(req.params,function(){
                    if(s.group[req.params.ke]&&s.group[req.params.ke].activeMonitors&&s.group[req.params.ke].activeMonitors[req.params.id]){
                        if(user.permissions.watch_stream==="0"||user.details.sub&&user.details.allmonitors!=='1'&&user.details.monitors.indexOf(req.params.id)===-1){
                            res.end(user.lang['Not Permitted'])
                            return
                        }

                        var Emitter
                        const chosenChannel = parseInt(req.params.channel) + config.pipeAddition
                        if(!req.params.channel){
                            Emitter = s.group[req.params.ke].activeMonitors[req.params.id].emitter
                        }else{
                            Emitter = s.group[req.params.ke].activeMonitors[req.params.id].emitterChannel[chosenChannel]
                        }
                        res.writeHead(200, {
                            'Content-Type': 'multipart/x-mixed-replace; boundary=shinobi',
                            'Cache-Control': 'no-cache',
                            'Connection': 'keep-alive',
                            'Pragma': 'no-cache'
                        });
                        var contentWriter
                        fs.readFile(config.defaultMjpeg,'binary',function(err,content){
                            res.write("--shinobi\r\n");
                            res.write("Content-Type: image/jpeg\r\n");
                            res.write("Content-Length: " + content.length + "\r\n");
                            res.write("\r\n");
                            res.write(content,'binary');
                            res.write("\r\n");
                            if(!Emitter){
                                res.end();
                                return;
                            }
                            var ip = s.getClientIp(req)
                            s.camera('watch_on',{
                                id : req.params.id,
                                ke : req.params.ke
                            },{
                                id : req.params.auth + ip + req.headers['user-agent']
                            })
                            Emitter.on('data',contentWriter=function(d){
                                content = d;
                                res.write(content,'binary');
                            })
                            res.on('close', function () {
                                Emitter.removeListener('data',contentWriter)
                                s.camera('watch_off',{
                                    id : req.params.id,
                                    ke : req.params.ke
                                },{
                                    id : req.params.auth + ip + req.headers['user-agent']
                                })
                            })
                        })
                    }else{
                        res.end();
                    }
                },res,req);
            },res,req);
        }
    });
    /**
    * API : Get HLS Stream
    */
    app.get([config.webPaths.apiPrefix+':auth/hls/:ke/:id/:file',config.webPaths.apiPrefix+':auth/hls/:ke/:id/:channel/:file'], function (req,res){
        s.auth(req.params,function(user){
            const monitorId = req.params.id
            if(cantLiveStreamPermission(user,monitorId,'watch_stream')){
                s.closeJsonResponse(res,{ok: false, msg: lang['Not Authorized']});
                return;
            }
            s.checkChildProxy(req.params,function(){
                noCache(res)
                if(user.permissions.watch_stream==="0"||user.details.sub&&user.details.allmonitors!=='1'&&user.details.monitors.indexOf(req.params.id)===-1){
                    res.end(user.lang['Not Permitted'])
                    return
                }
                req.dir=s.dir.streams+req.params.ke+'/'+req.params.id+'/'
                if(req.params.channel){
                    req.dir+='channel'+(parseInt(req.params.channel)+config.pipeAddition)+'/'+req.params.file;
                }else{
                    req.dir+=req.params.file;
                }
                res.on('finish',function(){res.end();});
                if (fs.existsSync(req.dir)){
                    fs.createReadStream(req.dir).pipe(res);
                }else{
                    res.end(lang['File Not Found'])
                }
            },res,req)
        },res,req);
    })
    /**
    * API : Get JPEG Snapshot
    */
    app.get(config.webPaths.apiPrefix+':auth/jpeg/:ke/:id/s.jpg', function(req,res){
        s.auth(req.params,function(user){
            const monitorId = req.params.id
            if(cantLiveStreamPermission(user,monitorId,'watch_snapshot')){
                s.closeJsonResponse(res,{ok: false, msg: lang['Not Authorized']});
                return;
            }
            s.checkChildProxy(req.params,function(){
                noCache(res)
                if(user.details.sub&&user.details.allmonitors!=='1'&&user.details.monitors&&user.details.monitors.indexOf(req.params.id)===-1){
                    res.end(user.lang['Not Permitted'])
                    return
                }
                req.dir=s.dir.streams+req.params.ke+'/'+req.params.id+'/s.jpg';
                    res.writeHead(200, {
                    'Content-Type': 'image/jpeg',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                    });
                res.on('finish',function(){res.end();});
                if (fs.existsSync(req.dir)){
                    fs.createReadStream(req.dir).pipe(res);
                }else{
                    fs.createReadStream(config.defaultMjpeg).pipe(res);
                }
            },res,req);
        },res,req);
    });
    /**
    * API : Get JPEG Snapshot
    */
    app.get(config.webPaths.apiPrefix+':auth/icon/:ke/:id', function(req,res){
        s.auth(req.params,async (user) => {
            const monitorId = req.params.id
            if(cantLiveStreamPermission(user,monitorId,'watch_snapshot')){
                s.closeJsonResponse(res,{ok: false, msg: lang['Not Authorized']});
                return;
            }
            const flags = req.query.noflags ? '' : req.query.flags || '-s 200x200'
            res.writeHead(200, {
                'Content-Type': 'image/jpeg',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            });
            res.end(await s.getCameraSnapshot({
                ke: req.params.ke,
                mid: req.params.id,
            },{
                useIcon: true,
                flags: flags
            }))
        },res,req);
    });
    /**
    * API : Get FLV Stream
    */
    app.get([config.webPaths.apiPrefix+':auth/flv/:ke/:id/s.flv',config.webPaths.apiPrefix+':auth/flv/:ke/:id/:channel/s.flv'], function(req,res) {
        s.auth(req.params,function(user){
            if(cantLiveStreamPermission(user,monitorId,'watch_stream')){
                s.closeJsonResponse(res,{ok: false, msg: lang['Not Authorized']});
                return;
            }
            s.checkChildProxy(req.params,function(){
                noCache(res)
                var Emitter,chunkChannel
                if(!req.params.channel){
                    Emitter = s.group[req.params.ke].activeMonitors[req.params.id].emitter
                    chunkChannel = 'MAIN'
                }else{
                    Emitter = s.group[req.params.ke].activeMonitors[req.params.id].emitterChannel[parseInt(req.params.channel)+config.pipeAddition]
                    chunkChannel = parseInt(req.params.channel)+config.pipeAddition
                }
                if(s.group[req.params.ke].activeMonitors[req.params.id].firstStreamChunk[chunkChannel]){
                    //variable name of contentWriter
                    var contentWriter
                    //set headers
                    res.setHeader('Content-Type', 'video/x-flv');
                    //write first frame on stream
                    res.write(s.group[req.params.ke].activeMonitors[req.params.id].firstStreamChunk[chunkChannel])
                    var ip = s.getClientIp(req)
                    s.camera('watch_on',{
                        id : req.params.id,
                        ke : req.params.ke
                    },{
                        id : req.params.auth + ip + req.headers['user-agent']
                    })
                    //write new frames as they happen
                    Emitter.on('data',contentWriter=function(buffer){
                        res.write(buffer)
                    })
                    //remove contentWriter when client leaves
                    res.on('close', function () {
                        Emitter.removeListener('data',contentWriter)
                        s.camera('watch_off',{
                            id : req.params.id,
                            ke : req.params.ke
                        },{
                            id : req.params.auth + ip + req.headers['user-agent']
                        })
                    })
                }else{
                    res.setHeader('Content-Type', 'application/json');
                    res.end(s.prettyPrint({ok:false,msg:'FLV not started or not ready'}))
                }
            },res,req)
        },res,req)
    })
    /**
    * API : Get H.264 over HTTP
     */
    app.get([
        config.webPaths.apiPrefix+':auth/mpegts/:ke/:id/:feed/:file',
        config.webPaths.apiPrefix+':auth/mpegts/:ke/:id/:feed/',
        config.webPaths.apiPrefix+':auth/h264/:ke/:id/:feed/:file',
        config.webPaths.apiPrefix+':auth/h264/:ke/:id/:feed',
        config.webPaths.apiPrefix+':auth/h264/:ke/:id'
    ], function (req, res) {
        s.auth(req.params,function(user){
            if(cantLiveStreamPermission(user,monitorId,'watch_stream')){
                s.closeJsonResponse(res,{ok: false, msg: lang['Not Authorized']});
                return;
            }
            s.checkChildProxy(req.params,function(){
                noCache(res)
                if(!req.query.feed){req.query.feed='1'}
                var Emitter
                if(!req.params.feed){
                    Emitter = s.group[req.params.ke].activeMonitors[req.params.id].streamIn[req.query.feed]
                }else{
                    Emitter = s.group[req.params.ke].activeMonitors[req.params.id].emitterChannel[parseInt(req.params.feed)+config.pipeAddition]
                }
                var contentWriter
                var date = new Date();
                res.writeHead(200, {
                    'Date': date.toUTCString(),
                    'Connection': 'keep-alive',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'Content-Type': 'video/mp4',
                    'Server': 'Shinobi H.264 Test Stream',
                })
                var ip = s.getClientIp(req)
                s.camera('watch_on',{
                    id : req.params.id,
                    ke : req.params.ke
                },{
                    id : req.params.auth + ip + req.headers['user-agent']
                })
                Emitter.on('data',contentWriter=function(buffer){
                    res.write(buffer)
                })
                res.on('close', function () {
                    Emitter.removeListener('data',contentWriter)
                    s.camera('watch_off',{
                        id : req.params.id,
                        ke : req.params.ke
                    },{
                        id : req.params.auth + ip + req.headers['user-agent']
                    })
                })
            },res,req);
        },res,req);
    });
    /**
    * Page : Get WallView
     */
    app.get(config.webPaths.apiPrefix+':auth/wallview/:ke', function (req,res){
        s.auth(req.params, async function(user){
            const authKey = req.params.auth
            const groupKey = req.params.ke
            if(
                user.permissions.watch_stream === "0"
                && user.details.allmonitors !== '1'
            ){
                res.end(user.lang['Not Permitted'])
                return
            }
            const $user = await getAdminUser(groupKey, user.uid);
            s.renderPage(req,res,config.renderPaths.wallview,{
                forceUrlPrefix: req.query.host || '',
                data: req.params,
                protocol: req.protocol,
                baseUrl: req.protocol + '://' + req.hostname,
                config: s.getConfigWithBranding(req.hostname),
                define: s.getDefinitonFile(user.details ? user.details.lang : config.lang),
                lang: lang,
                $user,
                authKey: authKey,
                groupKey: groupKey,
                originalURL: s.getOriginalUrl(req)
            });
        },res,req);
    });
}
