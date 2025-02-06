var express = require('express');
var fs = require('fs');
var bodyParser = require('body-parser');
var os = require('os');
var moment = require('moment');
var fetch = require('node-fetch');
var execSync = require('child_process').execSync;
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var httpProxy = require('http-proxy');
var cors = require('cors')
var proxy = httpProxy.createProxyServer({})
var ejs = require('ejs');
var fileupload = require("express-fileupload");
var fieldBuild = require('./fieldBuild');
module.exports = function(s,config,lang,app,io){
    const {
        ptzControl,
        setPresetForCurrentPosition
    } = require('./control/ptz.js')(s,config,lang,app,io)
    const {
        triggerEvent,
    } = require('./events/utils.js')(s,config,lang)
    const {
        basicAuth,
        superLogin,
        createTwoFactorAuth,
        twoFactorVerification,
        ldapLogin,
    } = require('./auth/utils.js')(s,config,lang)
    const {
        spawnSubstreamProcess,
        destroySubstreamProcess,
        removeSenstiveInfoFromMonitorConfig,
        sendSubstreamEvent,
    } = require('./monitor/utils.js')(s,config,lang)
    const {
        sliceVideo,
        archiveVideo,
        reEncodeVideoAndReplace,
        reEncodeVideoAndBinOriginalAddToQueue,
        getVideosBasedOnTagFoundInMatrixOfAssociatedEvent,
        mergeVideosAndBin,
    } = require('./video/utils.js')(s,config,lang)
    s.renderPage = function(req,res,paths,passables,callback){
        passables.window = {}
        passables.data = req.params
        passables.originalURL = s.getOriginalUrl(req)
        passables.baseUrl = req.protocol+'://'+req.hostname
        passables.config = s.getConfigWithBranding(req.hostname)
        passables.fieldBuild = fieldBuild
        res.render(paths,passables,callback)
    }
    //child node proxy check
    //params = parameters
    //cb = callback
    //res = response, only needed for express (http server)
    //request = request, only needed for express (http server)
    s.checkChildProxy = function(params,cb,res,req) {
        if(s.group[params.ke] && s.group[params.ke].activeMonitors && s.group[params.ke].activeMonitors[params.id] && s.group[params.ke].activeMonitors[params.id].childNode){
            var url = 'http://' + s.group[params.ke].activeMonitors[params.id].childNode// + req.originalUrl
            proxy.web(req, res, { target: url })
        }else{
            cb()
        }
    }
    s.closeJsonResponse = function(res,endData){
        res.setHeader('Content-Type', 'application/json')
        res.end(s.prettyPrint(endData))
    }
    //get post data
    s.getPostData = function(req,target,parseJSON){
        if(!target)target = 'data'
        if(!parseJSON)parseJSON = true
        var postData = false
        if(req.query && req.query[target]){
            postData = req.query[target]
        }else{
            postData = req.body[target]
        }
        if(parseJSON === true){
            postData = s.parseJSON(postData)
        }
        return postData
    }
    //get client ip address
    s.getClientIp = function(req){
        return req.headers['cf-connecting-ip']||req.headers["CF-Connecting-IP"]||req.headers["'x-forwarded-for"]||req.connection.remoteAddress;
    }
    ////Pages
    app.enable('trust proxy');
    if(config.webPaths.home !== '/'){
        app.use('/libs',express.static(s.mainDirectory + '/web/libs'))
    }
    [
        [config.webPaths.home,'libs','/web/libs'],
        [config.webPaths.super,'libs','/web/libs'],
        [config.webPaths.home,'assets','/web/assets'],
        [config.webPaths.super,'assets','/web/assets'],
    ].forEach((piece) => {
        app.use(s.checkCorrectPathEnding(piece[0])+piece[1],express.static(s.mainDirectory + piece[2]))
    })
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended: true}));
    app.use(cors());
    app.set('views', s.mainDirectory + '/web');
    app.set('view engine','ejs');
    //add template handler
    if(config.renderPaths.handler!==undefined){require(s.mainDirectory+'/web/'+config.renderPaths.handler+'.js').addHandlers(s,app,io,config)}

    /**
    * API : Logout
    */
    app.get(config.webPaths.apiPrefix+':auth/logout/:ke/:id', function (req,res){
        const groupKey = req.params.ke
        const userId = req.params.id
        const authToken = req.params.auth
        const user = s.group[groupKey] && s.group[groupKey].users[authToken] && s.group[groupKey].users[authToken].details ? s.group[groupKey].users[authToken] : null;
        if(user){
            const clientIp = s.getClientIp(req)
            const user = s.group[groupKey].users[authToken]
            s.onLogoutExtensions.forEach((extender) => {
                extender(user,groupKey,userId,clientIp)
            });
            delete(s.api[authToken]);
            delete(s.group[groupKey].users[authToken]);
            s.knexQuery({
                action: "update",
                table: "Users",
                update: {
                    auth: '',
                },
                where: [
                    ['auth','=',authToken],
                    ['ke','=',groupKey],
                    ['uid','=',userId],
                ]
            })
            res.end(s.prettyPrint({ok:true,msg:'You have been logged out, session key is now inactive.'}))
        }else{
            res.end(s.prettyPrint({ok:false,msg:'This group key does not exist or this user is not logged in.'}))
        }
    });
    /**
    * Page : Login Screen
    */
    app.get(config.webPaths.home, function (req,res){
        s.renderPage(req,res,config.renderPaths.index,{lang:lang,config: s.getConfigWithBranding(req.hostname),screen:'dashboard'})
    });
    /**
    * Page : Superuser Login Screen
    */
    app.get(config.webPaths.super, function (req,res){
        s.renderPage(req,res,config.renderPaths.index,{
            lang: lang,
            config: s.getConfigWithBranding(req.hostname),
            screen: 'super'
        })
    });
    /**
    * API : Get User Info
    */
    app.get(config.webPaths.apiPrefix+':auth/userInfo/:ke',function (req,res){
        var response = {ok:false};
        res.setHeader('Content-Type', 'application/json');
        s.auth(req.params, async function(user){
            response.ok = true
            const { rows } = await s.knexQueryPromise({
                action: "select",
                columns: "ke,uid,mail,details",
                table: "Users",
                where: [
                    ['ke','=', req.params.ke],
                    ['uid','=', user.uid],
                ]
            });
            const userInfo =  rows[0];
            userInfo.details = JSON.parse(userInfo.details)
            response.user = userInfo;
            res.end(s.prettyPrint(response));
        },res,req);
    })
    //login function
    s.deleteFactorAuth=function(r){
        delete(s.factorAuth[r.ke][r.uid])
        if(Object.keys(s.factorAuth[r.ke]).length===0){
            delete(s.factorAuth[r.ke])
        }
    }
    /**
    * Page : Admin page redirect to regular page now
    */
    app.get(config.webPaths.admin, function (req,res){
        res.redirect('/');
    });
    /**
    * API : Login handler. Dashboard, Streamer, Dashcam Administrator, Superuser
    */
    app.post([
        config.webPaths.home,
        config.webPaths.super,
        s.checkCorrectPathEnding(config.webPaths.home)+':screen',
        s.checkCorrectPathEnding(config.webPaths.super)+':screen',
    ],async function (req,res){
        var response = {ok: false};
        req.ip = s.getClientIp(req)
        const screenChooser = function(screen){
            var search = function(screen){
                if(req.url.indexOf(screen) > -1){
                    return true
                }
                return false
            }
            switch(true){
                // case search(config.webPaths.admin):
                //     return 'admin'
                // break;
                case search(config.webPaths.super):
                    return 'super'
                break;
                default:
                    return 'dashboard'
                break;
            }
        }
        // brute check
        if(s.failedLoginAttempts[req.body.mail] && s.failedLoginAttempts[req.body.mail].failCount >= 5){
            if(req.query.json=='true'){
                res.end(s.prettyPrint({ok:false}))
            }else{
                s.renderPage(req,res,config.renderPaths.index,{
                    failedLogin: true,
                    message: lang.failedLoginText1,
                    lang: s.copySystemDefaultLanguage(),
                    config: s.getConfigWithBranding(req.hostname),
                    screen: screenChooser(req.params.screen)
                })
            }
            return false
        }
        //
        const renderPage = function(focus,data){
            if(s.failedLoginAttempts[req.body.mail]){
                clearTimeout(s.failedLoginAttempts[req.body.mail].timeout)
                delete(s.failedLoginAttempts[req.body.mail])
            }
            if(req.query.json=='true'){
                delete(data.config);
                delete(data.__dirname);
                delete(data.customAutoLoad);
                delete(data.fs);
                data.timezone = config.timezone
                data.ok = true;
                res.setHeader('Content-Type', 'application/json');
                res.end(s.prettyPrint(data))
            }else{
                data.screen=req.params.screen
                s.renderPage(req,res,focus,data)
            }
        }
        const failedAuthentication = function(board,failIdentifier,failMessage){
            // brute protector
            if(!failIdentifier){
                s.renderPage(req,res,config.renderPaths.index,{
                    failedLogin: true,
                    message: failMessage || lang.failedLoginText2,
                    lang: s.copySystemDefaultLanguage(),
                    config: s.getConfigWithBranding(req.hostname),
                    screen: screenChooser(req.params.screen)
                })
                return
            }
            if(!s.failedLoginAttempts[failIdentifier]){
                s.failedLoginAttempts[failIdentifier] = {
                    failCount : 0,
                    ips : {}
                }
            }
            ++s.failedLoginAttempts[failIdentifier].failCount
            if(!s.failedLoginAttempts[failIdentifier].ips[req.ip]){
                s.failedLoginAttempts[failIdentifier].ips[req.ip] = 0
            }
            ++s.failedLoginAttempts[failIdentifier].ips[req.ip]
            clearTimeout(s.failedLoginAttempts[failIdentifier].timeout)
            s.failedLoginAttempts[failIdentifier].timeout = setTimeout(function(){
                delete(s.failedLoginAttempts[failIdentifier])
            },1000 * 60 * 15)
            // check if JSON
            if(req.query.json === 'true'){
                res.setHeader('Content-Type', 'application/json')
                res.end(s.prettyPrint({ok:false}))
            }else{
                s.renderPage(req,res,config.renderPaths.index,{
                    failedLogin: true,
                    message: failMessage || lang.failedLoginText2,
                    lang: s.copySystemDefaultLanguage(),
                    config: s.getConfigWithBranding(req.hostname),
                    screen: screenChooser(req.params.screen)
                })
            }
            var logTo = {
                ke: '$',
                mid: '$USER'
            }
            var logData = {
                type: lang['Authentication Failed'],
                msg: {
                    for: board,
                    mail: failIdentifier,
                    ip: req.ip
                }
            }
            if(board === 'super'){
                s.userLog(logTo,logData)
            }else{
                s.knexQuery({
                    action: "select",
                    columns: "ke,uid,details",
                    table: "Users",
                    where: [
                        ['mail','=',failIdentifier],
                    ]
                },(err,r) => {
                    if(r && r[0]){
                        r = r[0]
                        r.details = JSON.parse(r.details)
                        r.lang = s.getLanguageFile(r.details.lang)
                        logData.id = r.uid
                        logData.type = r.lang['Authentication Failed']
                        logTo.ke = r.ke
                    }
                    s.userLog(logTo,logData)
                })
            }
        }
        function checkRoute(pageTarget,userInfo){
            if(!userInfo.lang){
                userInfo.lang = s.getLanguageFile(userInfo.details.lang)
            }
            switch(pageTarget){
                case'cam':
                    renderPage(config.renderPaths.dashcam,{
                        // config: s.getConfigWithBranding(req.hostname),
                        $user: userInfo,
                        lang: userInfo.lang,
                        define: s.getDefinitonFile(userInfo.details.lang),
                        __dirname: s.mainDirectory,
                        customAutoLoad: s.customAutoLoadTree
                    })
                break;
                case'streamer':
                    renderPage(config.renderPaths.streamer,{
                        // config: s.getConfigWithBranding(req.hostname),
                        $user: userInfo,
                        lang: userInfo.lang,
                        define: s.getDefinitonFile(userInfo.details.lang),
                        __dirname: s.mainDirectory,
                        customAutoLoad: s.customAutoLoadTree
                    })
                break;
                case'admin':
                // dash
                default:
                    var chosenRender = 'home'
                    if(userInfo.details.sub && userInfo.details.landing_page && userInfo.details.landing_page !== '' && config.renderPaths[userInfo.details.landing_page]){
                        chosenRender = userInfo.details.landing_page
                    }
                    renderPage(config.renderPaths[chosenRender],{
                        $user: userInfo,
                        config: s.getConfigWithBranding(req.hostname),
                        lang: userInfo.lang,
                        define: s.getDefinitonFile(userInfo.details.lang),
                        addStorage: s.dir.addStorage,
                        fs: fs,
                        __dirname: s.mainDirectory,
                        customAutoLoad: s.customAutoLoadTree
                    })
                break;
            }
            s.userLog({
                ke: userInfo.ke,
                mid: '$USER'
            },{
                type: userInfo.lang['New Authentication Token'],
                msg: {
                    for: pageTarget,
                    mail: userInfo.mail,
                    id: userInfo.uid,
                    ip: req.ip
                }
            })
        }
        if(req.body.alternateLogin && s.alternateLogins[req.body.alternateLogin]){
            const alternateLogin = s.alternateLogins[req.body.alternateLogin]
            const alternateLoginResponse = await alternateLogin(req.body)
            if(alternateLoginResponse.ok && alternateLoginResponse.user){
                const user = alternateLoginResponse.user
                const sessionKey = s.md5(s.gid())
                user.auth = sessionKey
                s.knexQuery({
                    action: "update",
                    table: "Users",
                    update: {
                        auth: sessionKey
                    },
                    where: [
                        ['ke','=',user.ke],
                        ['uid','=',user.uid],
                    ]
                })
                checkRoute(req.body.function,{
                    ok: true,
                    auth_token: user.auth,
                    ke: user.ke,
                    uid: user.uid,
                    mail: user.mail,
                    details: user.details
                })
            }else{
                return failedAuthentication(req.body.function,req.body.mail,alternateLoginResponse.msg)
            }
        }else if(req.body.mail && req.body.pass){
            async function regularLogin(){
                const basicAuthResponse = await basicAuth(req.body.mail,req.body.pass)
                if(basicAuthResponse.user){
                    const user = basicAuthResponse.user;
                    const sessionKey = s.md5(s.gid())
                    user.auth = sessionKey
                    user.lang = s.getLanguageFile(user.details.lang)
                    s.knexQuery({
                        action: "update",
                        table: "Users",
                        update: {
                            auth: user.auth
                        },
                        where: [
                            ['ke','=',user.ke],
                            ['uid','=',user.uid],
                        ]
                    })
                    if(user.details.factorAuth === "1"){
                        const factorAuthCreationResponse = createTwoFactorAuth(
                            user,
                            req.body.machineID || s.md5(s.gid()),
                            req.body.function
                        );
                        if(!factorAuthCreationResponse.goToDashboard){
                            renderPage(config.renderPaths.factorAuth,{
                                $user:{
                                    ke: user.ke,
                                    uid: user.uid,
                                    mail: user.mail,
                                    details: {
                                        sub: user.details.sub
                                    }
                                },
                                lang: user.lang,
                            })
                            return;
                        }
                    }

                    checkRoute(req.body.function,{
                        ok: true,
                        auth_token: user.auth,
                        ke: user.ke,
                        uid: user.uid,
                        mail: user.mail,
                        details: user.details
                    })
                }else{
                    failedAuthentication(req.body.function,req.body.mail)
                }
            }
            if(req.body.function === 'super' && !config.superUserLoginDisabled){
                const superLoginResponse = await superLogin(req.body.mail,req.body.pass);
                if(superLoginResponse.ok){
                    renderPage(config.renderPaths.super,{
                        config: config,
                        lang: lang,
                        define: s.getDefinitonFile(config.language),
                        $user: superLoginResponse.user,
                        customAutoLoad: s.customAutoLoadTree,
                        currentVersion: s.currentVersion,
                    })
                }else{
                    failedAuthentication(req.body.function,req.body.mail)
                }
            }else{
                regularLogin()
            }
        }else if(
            req.body.machineID &&
            req.body.factorAuthKey &&
            s.factorAuth[req.body.ke] &&
            s.factorAuth[req.body.ke][req.body.id]
        ){
            const factorAuthObject = s.factorAuth[req.body.ke][req.body.id]
            const twoFactorVerificationResponse = twoFactorVerification({
                ke: req.body.ke,
                id: req.body.id,
                machineID: req.body.machineID,
                factorAuthKey: req.body.factorAuthKey,
            })
            if(twoFactorVerificationResponse.ok){
                checkRoute(twoFactorVerificationResponse.pageTarget,twoFactorVerificationResponse.info)
            }else{
                failedAuthentication(lang['2-Factor Authentication'],factorAuthObject.info.mail)
            }
        }else{
            failedAuthentication(lang['2-Factor Authentication'],req.body.mail)
        }
    })
    /**
    * API : Brute Protection Lock Reset by API
    */
    app.get([config.webPaths.apiPrefix+':auth/resetBruteProtection/:ke'], function (req,res){
        s.auth(req.params,function(user){
            if(s.failedLoginAttempts[user.mail]){
                clearTimeout(s.failedLoginAttempts[user.mail].timeout)
                delete(s.failedLoginAttempts[user.mail])
            }
            res.end(s.prettyPrint({ok:true}))
        })
    })
    /**
    * API : Get TV Channels (Monitor Streams) json
     */
    app.get([config.webPaths.apiPrefix+':auth/tvChannels/:ke',config.webPaths.apiPrefix+':auth/tvChannels/:ke/:id','/get.php'], function (req,res){
        var response = {ok:false};
        if(req.query.username&&req.query.password){
            req.params.username = req.query.username
            req.params.password = req.query.password
        }
        var output = ['h264','hls','mp4']
        if(
            req.query.output &&
            req.query.output !== ''
        ){
            output = req.query.output.split(',')
            output.forEach(function(type,n){
                if(type === 'ts'){
                    output[n] = 'h264'
                    if(output.indexOf('hls') === -1){
                        output.push('hls')
                    }
                }
            })
        }
        const isM3u8 = req.query.type === 'm3u8' || req.query.type === 'm3u_plus'
        s.auth(req.params,function(user){
            const groupKey = req.params.ke
            const monitorId = req.params.id
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
                isRestrictedApiKey && apiKeyPermissions.get_monitors_disallowed ||
                isRestricted && (
                    monitorId && !monitorPermissions[`${monitorId}_monitors`] ||
                    monitorRestrictions.length === 0
                )
            ){
                s.closeJsonResponse(res,[]);
                return
            }
            s.knexQuery({
                action: "select",
                columns: "*",
                table: "Monitors",
                where: [
                    ['ke','=',groupKey],
                    ['mode','!=','stop'],
                    monitorRestrictions
                ]
            },(err,r) => {
                var tvChannelMonitors = [];
                r.forEach(function(v,n){
                    var buildStreamURL = function(channelRow,type,channelNumber){
                        var streamURL
            			if(req.query.streamtype && req.query.streamtype != type){
            				return
            			}
                        if(channelNumber){channelNumber = '/' + channelNumber}else{channelNumber = ''}
                        switch(type){
                            case'mjpeg':
                                streamURL='/'+req.params.auth+'/mjpeg/'+v.ke+'/'+v.mid+channelNumber
                            break;
                            case'hls':
                                streamURL='/'+req.params.auth+'/hls/'+v.ke+'/'+v.mid+channelNumber+'/s.m3u8'
                            break;
                            case'h264':
                                streamURL='/'+req.params.auth+'/h264/'+v.ke+'/'+v.mid+channelNumber
                            break;
                            case'flv':
                                streamURL='/'+req.params.auth+'/flv/'+v.ke+'/'+v.mid+channelNumber+'/s.flv'
                            break;
                            case'mp4':
                                streamURL='/'+req.params.auth+'/mp4/'+v.ke+'/'+v.mid+channelNumber+'/s.ts'
                            break;
                        }
                        if(streamURL){
                            if(!channelRow.streamsSortedByType[type]){
                                channelRow.streamsSortedByType[type]=[]
                            }
                            channelRow.streamsSortedByType[type].push(streamURL)
                            channelRow.streams.push(streamURL)
                        }
                        return streamURL
                    }
                    var details = JSON.parse(r[n].details);
                    if(!details.tv_channel_id||details.tv_channel_id==='')details.tv_channel_id = 'temp_'+s.gid(5)
                    var channelRow = {
                        ke:v.ke,
                        mid:v.mid,
                        type:v.type,
                        groupTitle:details.tv_channel_group_title,
                        channel:details.tv_channel_id,
                    };
                    if(details.snap==='1'){
                        channelRow.snapshot = '/'+req.params.auth+'/jpeg/'+v.ke+'/'+v.mid+'/s.jpg'
                    }
                    channelRow.streams=[]
                    channelRow.streamsSortedByType={}
                    buildStreamURL(channelRow,details.stream_type)
                    if(details.stream_channels&&details.stream_channels!==''){
                        details.stream_channels=JSON.parse(details.stream_channels)
                        details.stream_channels.forEach(function(b,m){
                            buildStreamURL(channelRow,b.stream_type,m.toString())
                        })
                    }
                    if(details.tv_channel==='1'){
                        tvChannelMonitors.push(channelRow)
                    }
                })
                if(isM3u8){
                    var m3u8 = '#EXTM3U'+'\n'
                    tvChannelMonitors.forEach(function(channelRow,n){
                      output.forEach(function(type){
                        if(channelRow.streamsSortedByType[type]){
                            if(req.query.type === 'm3u_plus'){
                                m3u8 +='#EXTINF-1 tvg-id="'+channelRow.mid+'" tvg-name="'+channelRow.channel+'" tvg-logo="'+req.protocol+'://'+req.headers.host+channelRow.snapshot+'" group-title="'+channelRow.groupTitle+'",'+channelRow.channel+'\n'
                            }else{
                                m3u8 +='#EXTINF:-1,'+channelRow.channel+' ('+type.toUpperCase()+') \n'
                            }
                            m3u8 += req.protocol+'://'+req.headers.host+channelRow.streamsSortedByType[type][0]+'\n'
                        }
                      })
                    })
                    res.end(m3u8)
                }else{
                    if(tvChannelMonitors.length === 1)tvChannelMonitors=tvChannelMonitors[0];
                    s.closeJsonResponse(res,tvChannelMonitors)
                }
            })
        },res,req);
    });
    /**
    * API : Get Monitors
     */
    app.get([config.webPaths.apiPrefix+':auth/monitor/:ke',config.webPaths.apiPrefix+':auth/monitor/:ke/:id'], function (req,res){
        var response = {ok:false};
        res.setHeader('Content-Type', 'application/json');
        s.auth(req.params,(user) => {
            const groupKey = req.params.ke
            const monitorId = req.params.id
            const {
                monitorPermissions,
                monitorRestrictions,
            } = s.getMonitorsPermitted(user.details,monitorId)
            const {
                isRestricted,
                userPermissions,
                isRestrictedApiKey,
                apiKeyPermissions,
            } = s.checkPermission(user)
            if(
                isRestrictedApiKey && apiKeyPermissions.get_monitors_disallowed ||
                isRestricted && (
                    monitorId && !monitorPermissions[`${monitorId}_monitors`] ||
                    monitorRestrictions.length === 0
                )
            ){
                s.closeJsonResponse(res,[]);
                return
            }
            const cannotSeeImportantSettings = (isRestrictedApiKey && apiKeyPermissions.edit_monitors_disallowed) || userPermissions.monitor_create_disallowed;
            const whereQuery = [
                ['ke','=',groupKey],
                monitorRestrictions
            ];
            if(!!req.query.search){
                const searchQuery = req.query.search.split(',');
                const whereQuerySearch = []
                for(item of searchQuery){
                    if(item){
                        whereQuerySearch.push(
                            whereQuerySearch.length === 0 ? ['name','LIKE',`%${item.trim()}%`] : ['or', 'name','LIKE',`%${item}%`],
                            ['or','mid','LIKE',`%${item.trim()}%`]
                        );
                    }
                }
                whereQuery.push(whereQuerySearch)
            }
            s.knexQuery({
                action: "select",
                columns: "*",
                table: "Monitors",
                where: whereQuery
            },(err,r) => {
                r.forEach(function(v,n){
                    const monitorId = v.mid;
                    v.details = JSON.parse(v.details)
                    var details = v.details;
                    if(isRestricted && !monitorPermissions[`${monitorId}_monitor_edit`] || cannotSeeImportantSettings){
                        r[n] = removeSenstiveInfoFromMonitorConfig(v);
                    }
                    if(s.group[v.ke] && s.group[v.ke].activeMonitors[v.mid]){
                        const activeMonitor = s.group[v.ke].activeMonitors[v.mid]
                        r[n].currentlyWatching = Object.keys(activeMonitor.watch).length
                        r[n].currentCpuUsage = activeMonitor.currentCpuUsage
                        r[n].status = activeMonitor.monitorStatus
                        r[n].code = activeMonitor.monitorStatusCode
                        r[n].subStreamChannel = activeMonitor.subStreamChannel
                        r[n].subStreamActive = !!activeMonitor.subStreamProcess
                    }
                    function getStreamUrl(type,channelNumber){
                        var streamURL
                        if(channelNumber){channelNumber = '/'+channelNumber}else{channelNumber=''}
                        switch(type){
                            case'mjpeg':
                                streamURL='/'+req.params.auth+'/mjpeg/'+v.ke+'/'+v.mid+channelNumber
                            break;
                            case'hls':
                                streamURL='/'+req.params.auth+'/hls/'+v.ke+'/'+v.mid+channelNumber+'/s.m3u8'
                            break;
                            case'h264':
                                streamURL='/'+req.params.auth+'/h264/'+v.ke+'/'+v.mid+channelNumber
                            break;
                            case'flv':
                                streamURL='/'+req.params.auth+'/flv/'+v.ke+'/'+v.mid+channelNumber+'/s.flv'
                            break;
                            case'mp4':
                                streamURL='/'+req.params.auth+'/mp4/'+v.ke+'/'+v.mid+channelNumber+'/s.mp4'
                            break;
                            case'useSubstream':
                                try{
                                    const monitorConfig = s.group[v.ke].rawMonitorConfigurations[v.mid]
                                    const monitorDetails = monitorConfig.details
                                    const subStreamChannelNumber = 1 + (monitorDetails.stream_channels || []).length
                                    const subStreamType = monitorConfig.details.substream.output.stream_type
                                    streamURL = getStreamUrl(subStreamType,subStreamChannelNumber)
                                }catch(err){
                                    s.debugLog(err)
                                }
                            break;
                        }
                        return streamURL
                    }
                    var buildStreamURL = function(type,channelNumber){
                        var streamURL = getStreamUrl(type,channelNumber)
                        if(streamURL){
                            if(!r[n].streamsSortedByType[type]){
                                r[n].streamsSortedByType[type]=[]
                            }
                            r[n].streamsSortedByType[type].push(streamURL)
                            r[n].streams.push(streamURL)
                        }
                        return streamURL
                    }
                    if(!details.tv_channel_id||details.tv_channel_id==='')details.tv_channel_id = 'temp_'+s.gid(5)
                    if(details.snap==='1'){
                        r[n].snapshot = '/'+req.params.auth+'/jpeg/'+v.ke+'/'+v.mid+'/s.jpg'
                    }
                    r[n].streams=[]
                    r[n].streamsSortedByType={}
                    buildStreamURL(details.stream_type)
                    if(details.stream_channels&&details.stream_channels!==''){
                        details.stream_channels=s.parseJSON(details.stream_channels)
                        details.stream_channels.forEach(function(b,m){
                            buildStreamURL(b.stream_type,m.toString())
                        })
                    }
                })
                s.closeJsonResponse(res,r);
            })
        },res,req);
    });
    /**
    * API : Toggle Substream Process on and off
     */
    app.get(config.webPaths.apiPrefix+':auth/toggleSubstream/:ke/:id', function (req,res){
        const response = {ok: false};
        s.auth(req.params,async (user) => {
            const groupKey = req.params.ke
            const monitorId = req.params.id
            const {
                monitorPermissions,
                monitorRestrictions,
            } = s.getMonitorsPermitted(user.details,monitorId)
            const {
                isRestricted,
                userPermissions,
                apiKeyPermissions,
                isRestrictedApiKey,
            } = s.checkPermission(user)
            if(
                isRestrictedApiKey && apiKeyPermissions.control_monitors_disallowed ||
                isRestricted && !monitorPermissions[`${monitorId}_monitors`]
            ){
                response.msg = user.lang['Not Permitted']
            }else{
                const monitorConfig = s.group[groupKey].rawMonitorConfigurations[monitorId]
                const activeMonitor = s.group[groupKey].activeMonitors[monitorId]
                const substreamConfig = monitorConfig.details.substream
                const theAction = req.query.action
                if(
                    substreamConfig.output
                ){
                    switch(theAction){
                        case'status':
                            response.ok = true
                            response.isRunning = !!activeMonitor.subStreamProcess;
                            response.channel = activeMonitor.subStreamChannel;
                        break;
                        case'stop':
                            activeMonitor.allowDestroySubstream = true
                            await destroySubstreamProcess(activeMonitor)
                        break;
                        default:
                            if(!activeMonitor.subStreamProcess){
                                response.ok = true
                                activeMonitor.allowDestroySubstream = false;
                                spawnSubstreamProcess(monitorConfig)
                                response.channel = activeMonitor.subStreamChannel;
                            }else{
                                sendSubstreamEvent(groupKey, monitorId)
                            }
                        break;
                    }
                    // if(!activeMonitor.subStreamProcess){
                    //     response.ok = true
                    //     activeMonitor.allowDestroySubstream = false;
                    //     spawnSubstreamProcess(monitorConfig)
                    // }else{
                    //     activeMonitor.allowDestroySubstream = true
                    //     await destroySubstreamProcess(activeMonitor)
                    // }
                }else{
                    response.msg = lang['Invalid Settings']
                }
            }
            s.closeJsonResponse(res,response);
        },res,req);
    });
    /**
    * API : Get Active Event-Based Recording Info
     */
    app.get(config.webPaths.apiPrefix+':auth/eventRecordings/:ke/:id', function (req,res){
        const response = {ok: false};
        s.auth(req.params,async (user) => {
            const groupKey = req.params.ke
            const monitorId = req.params.id
            const {
                monitorPermissions,
                monitorRestrictions,
            } = s.getMonitorsPermitted(user.details,monitorId)
            const {
                isRestricted,
                userPermissions,
                apiKeyPermissions,
                isRestrictedApiKey,
            } = s.checkPermission(user)
            if(
                isRestrictedApiKey && apiKeyPermissions.control_monitors_disallowed ||
                isRestricted && !monitorPermissions[`${monitorId}_monitors`]
            ){
                response.msg = user.lang['Not Permitted']
            }else{
                const monitorConfig = s.group[groupKey].rawMonitorConfigurations[monitorId]
                const activeMonitor = s.group[groupKey].activeMonitors[monitorId]
                const fileTimes = Object.keys(activeMonitor.eventBasedRecording)
                response.fileTimes = fileTimes;
                response.ok = true;
            }
            s.closeJsonResponse(res,response);
        },res,req);
    });
    // /**
    // * API : Merge Recorded Videos into one file
    //  */
    //  app.get(config.webPaths.apiPrefix+':auth/videosMerge/:ke', function (req,res){
    //      var failed = function(resp){
    //          res.setHeader('Content-Type', 'application/json');
    //          res.end(s.prettyPrint(resp))
    //      }
    //      if(req.query.videos && req.query.videos !== ''){
    //          s.auth(req.params,function(user){
    //              var videosSelected = JSON.parse(req.query.videos)
    //              const whereQuery = []
    //              var didOne = false
    //              videosSelected.forEach(function(video){
    //                  var time = s.nameToTime(video.filename)
    //                  if(req.query.isUTC === 'true'){
    //                      time = s.utcToLocal(time)
    //                  }
    //                  if(didOne){
    //                      whereQuery.push(['or','ke','=',req.params.ke])
    //                  }else{
    //                      didOne = true
    //                      whereQuery.push(['ke','=',req.params.ke])
    //                  }
    //                  whereQuery.push(
    //                      ['mid','=',video.mid],
    //                      ['time','=',time],
    //                  )
    //
    //              })
    //              s.knexQuery({
    //                  action: "select",
    //                  columns: "*",
    //                  table: "Videos",
    //                  where: whereQuery
    //              },(err,r) => {
    //                  var resp = {ok: false}
    //                  if(r && r[0]){
    //                      s.mergeRecordedVideos(r,req.params.ke,function(fullPath,filename){
    //                          res.setHeader('Content-Disposition', 'attachment; filename="'+filename+'"')
    //                          var file = fs.createReadStream(fullPath)
    //                          file.on('close',function(){
    //                              setTimeout(function(){
    //                                  s.file('delete',fullPath)
    //                              },1000 * 60 * 3)
    //                              res.end()
    //                          })
    //                          file.pipe(res)
    //                      })
    //                  }else{
    //                      failed({ok:false,msg:'No Videos Found'})
    //                  }
    //              })
    //          },res,req);
    //      }else{
    //          failed({ok:false,msg:'"videos" query variable is missing from request.'})
    //      }
    // })
    /**
    * API : Get Videos
     */
    app.get([
        config.webPaths.apiPrefix+':auth/videos/:ke',
        config.webPaths.apiPrefix+':auth/videos/:ke/:id',
        config.webPaths.apiPrefix+':auth/cloudVideos/:ke',
        config.webPaths.apiPrefix+':auth/cloudVideos/:ke/:id'
    ], function (req,res){
        res.setHeader('Content-Type', 'application/json');
        s.auth(req.params,function(user){
            const monitorId = req.params.id
            const groupKey = req.params.ke
            const {
                monitorPermissions,
                monitorRestrictions,
            } = s.getMonitorsPermitted(user.details,monitorId,'video_view')
            const {
                isRestricted,
                isRestrictedApiKey,
                apiKeyPermissions,
            } = s.checkPermission(user);
            if(
                isRestrictedApiKey && apiKeyPermissions.watch_videos_disallowed ||
                isRestricted && (
                    monitorId && !monitorPermissions[`${monitorId}_video_view`] ||
                    monitorRestrictions.length === 0
                )
            ){
                s.closeJsonResponse(res,{ok: false, msg: lang['Not Authorized'], videos: []});
                return
            }
            var origURL = req.originalUrl.split('/')
            var videoParam = origURL[origURL.indexOf(req.params.auth) + 1]
            var videoSet = 'Videos'
            switch(videoParam){
                case'cloudVideos':
                    videoSet = 'Cloud Videos'
                break;
            }
            s.sqlQueryBetweenTimesWithPermissions({
                table: videoSet,
                user: user,
                noCount: true,
                groupKey: req.params.ke,
                monitorId: req.params.id,
                startTime: req.query.start,
                endTime: req.query.end,
                startTimeOperator: req.query.startOperator,
                endTimeOperator: req.query.endOperator,
                noLimit: req.query.noLimit,
                limit: req.query.limit,
                archived: req.query.archived,
                endIsStartTo: !!req.query.endIsStartTo,
                parseRowDetails: false,
                rowName: 'videos',
                monitorRestrictions: monitorRestrictions,
                preliminaryValidationFailed: false
            },(response) => {
                if(response && response.videos){
                    s.buildVideoLinks(response.videos,{
                        auth : req.params.auth,
                        videoParam : videoParam,
                        hideRemote : config.hideCloudSaveUrls,
                    })
                }
                res.end(s.prettyPrint(response))
            })
        },res,req);
    });
    /**
    * API : Get Videos
     */
    app.get([
        config.webPaths.apiPrefix+':auth/videosByEventTag/:ke',
        config.webPaths.apiPrefix+':auth/videosByEventTag/:ke/:id'
    ], function (req,res){
        res.setHeader('Content-Type', 'application/json');
        s.auth(req.params,function(user){
            const searchQuery = s.getPostData(req,'search')
            const andOnly = s.getPostData(req,'andOnly') == '1'
            const startTime = s.getPostData(req,'start')
            const endTime = s.getPostData(req,'end')
            const monitorId = req.params.id
            const groupKey = req.params.ke
            const {
                monitorPermissions,
                monitorRestrictions,
            } = s.getMonitorsPermitted(user.details,monitorId)
            const {
                isRestricted,
                isRestrictedApiKey,
                apiKeyPermissions,
            } = s.checkPermission(user);
            if(
                isRestrictedApiKey && apiKeyPermissions.watch_videos_disallowed ||
                isRestricted && (
                    monitorId && !monitorPermissions[`${monitorId}_video_view`] ||
                    monitorRestrictions.length === 0
                )
            ){
                s.closeJsonResponse(res,{ok: false, msg: lang['Not Authorized'], videos: []});
                return
            }
            getVideosBasedOnTagFoundInMatrixOfAssociatedEvent({
                groupKey,
                monitorId,
                startTime,
                endTime,
                searchQuery,
                monitorRestrictions,
                andOnly,
            }).then((response) => {
                if(response && response.rows){
                    s.buildVideoLinks(response.rows,{
                        auth : req.params.auth,
                        videoParam : 'videos',
                    })
                }
                s.closeJsonResponse(res,{
                    ok: true,
                    videos: response.rows,
                })
            })
        },res,req);
    });
    /**
    * Page : Get Wall Video View (Wall Timeline)
     */
    app.get(config.webPaths.apiPrefix+':auth/wallvideoview/:ke', function (req,res){
        s.auth(req.params,function(user){
            const authKey = req.params.auth
            const groupKey = req.params.ke
            if(
                user.permissions.watch_videos === "0"
                && user.details.allmonitors !== '1'
            ){
                res.end(user.lang['Not Permitted'])
                return
            }
            s.renderPage(req,res,config.renderPaths.wallvideoview,{
                forceUrlPrefix: req.query.host || '',
                data: req.params,
                protocol: req.protocol,
                baseUrl: req.protocol + '://' + req.hostname,
                config: s.getConfigWithBranding(req.hostname),
                define: s.getDefinitonFile(user.details ? user.details.lang : config.lang),
                lang: lang,
                $user: user,
                authKey: authKey,
                groupKey: groupKey,
                originalURL: s.getOriginalUrl(req)
            });
        },res,req);
    });
    /**
    * API : Get Events
     */
    app.get([
		config.webPaths.apiPrefix+':auth/events/:ke',
		config.webPaths.apiPrefix+':auth/events/:ke/:id'
	], function (req,res){
        res.setHeader('Content-Type', 'application/json');
        s.auth(req.params,function(user){
            const monitorId = req.params.id
            const groupKey = req.params.ke
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
                isRestrictedApiKey && apiKeyPermissions.watch_videos_disallowed ||
                isRestricted && (
                    monitorId && !monitorPermissions[`${monitorId}_video_view`] ||
                    monitorRestrictions.length === 0
                )
            ){
                s.closeJsonResponse(res,{ok: false, msg: lang['Not Authorized'], events: []});
                return
            }
            if(req.query.onlyCount === '1'){
                const response = {ok: true}
                s.knexQuery({
                    action: "count",
                    columns: "mid",
                    table: "Events",
                    where: [
                        ['ke','=',groupKey],
                        ['time','>=',req.query.start],
                        ['time','<=',req.query.end],
                        monitorRestrictions
                    ]
                },(err,r) => {
                    if(err){
                        s.debugLog(err)
                        response.ok = false
                    }else{
                        response.count = r[0]['count(`mid`)']
                    }
                    s.closeJsonResponse(res,response)
                })
            }else{
                s.sqlQueryBetweenTimesWithPermissions({
                    table: 'Events',
                    user: user,
                    groupKey: req.params.ke,
                    monitorId: req.params.id,
                    startTime: req.query.start,
                    endTime: req.query.end,
                    startTimeOperator: req.query.startOperator,
                    endTimeOperator: req.query.endOperator,
                    noLimit: req.query.noLimit,
                    limit: req.query.limit,
                    archived: req.query.archived,
                    endIsStartTo: true,
                    parseRowDetails: true,
                    noFormat: true,
                    noCount: true,
                    rowName: 'events',
                    preliminaryValidationFailed: false
                },(response) => {
                    res.end(s.prettyPrint(response))
                })
            }
        })
    })
    /**
    * API : Get Logs
     */
    app.get([
        config.webPaths.apiPrefix+':auth/logs/:ke',
        config.webPaths.apiPrefix+':auth/logs/:ke/:id'
    ], function (req,res){
        res.setHeader('Content-Type', 'application/json');
        s.auth(req.params,function(user){
            const groupKey = req.params.ke
            const monitorId = req.params.id
            const {
                isRestricted,
                isRestrictedApiKey,
                apiKeyPermissions,
                userPermissions,
            } = s.checkPermission(user)
            if(
                userPermissions.view_logs_disallowed ||
                isRestrictedApiKey && apiKeyPermissions.get_logs_disallowed
            ){
                s.closeJsonResponse(res,{ok: false, msg: lang['Not Authorized'], logs: []});
                return
            }
            s.sqlQueryBetweenTimesWithPermissions({
                table: 'Logs',
                user: user,
                groupKey: req.params.ke,
                monitorId: req.params.id,
                startTime: req.query.start,
                endTime: req.query.end,
                startTimeOperator: req.query.startOperator,
                endTimeOperator: req.query.endOperator,
                limit: req.query.limit || 50,
                endIsStartTo: true,
                noFormat: true,
                noCount: true,
                rowName: 'logs',
                preliminaryValidationFailed: false
            },(response) => {
                response.forEach(function(v,n){
                    v.info = JSON.parse(v.info)
                })
                res.end(s.prettyPrint(response))
            })
        },res,req)
    })
    /**
    * API : Monitor Mode Controller
     */
    app.get([config.webPaths.apiPrefix+':auth/monitor/:ke/:id/:f',config.webPaths.apiPrefix+':auth/monitor/:ke/:id/:f/:ff',config.webPaths.apiPrefix+':auth/monitor/:ke/:id/:f/:ff/:fff'], function (req,res){
        var response = {ok:false};
        res.setHeader('Content-Type', 'application/json');
        s.auth(req.params,function(user){
            const groupKey = req.params.ke
            const monitorId = req.params.id
            const {
                monitorPermissions,
                monitorRestrictions,
            } = s.getMonitorsPermitted(user.details,monitorId)
            const {
                isRestricted,
                isRestrictedApiKey,
                apiKeyPermissions,
                userPermissions,
            } = s.checkPermission(user)
            if(
                userPermissions.monitor_create_disallowed ||
                isRestrictedApiKey && apiKeyPermissions.control_monitors_disallowed ||
                isRestricted && !monitorPermissions[`${monitorId}_monitor_edit`]
            ){
                s.closeJsonResponse(res,{ok: false, msg: lang['Not Authorized']});
                return
            }
            if(req.params.f===''){response.msg = user.lang.monitorGetText1;res.end(s.prettyPrint(response));return}
            if(req.params.f!=='stop'&&req.params.f!=='start'&&req.params.f!=='record'){
                response.msg = 'Mode not recognized.';
                res.end(s.prettyPrint(response));
                return;
            }
            s.knexQuery({
                action: "select",
                columns: "*",
                table: "Monitors",
                where: [
                    ['ke','=',req.params.ke],
                    ['mid','=',req.params.id],
                ],
                limit: 1
            },async (err,r) => {
                if(r && r[0]){
                    r = r[0];
                    if(req.query.reset==='1'||(s.group[r.ke]&&s.group[r.ke].rawMonitorConfigurations[r.mid].mode!==req.params.f)||req.query.fps&&(!s.group[r.ke].activeMonitors[r.mid].currentState||!s.group[r.ke].activeMonitors[r.mid].currentState.trigger_on)){
                        if(req.query.reset!=='1'||!s.group[r.ke].activeMonitors[r.mid].trigger_timer){
                            if(!s.group[r.ke].activeMonitors[r.mid].currentState)s.group[r.ke].activeMonitors[r.mid].currentState={}
                            s.group[r.ke].activeMonitors[r.mid].currentState.mode=r.mode.toString()
                            s.group[r.ke].activeMonitors[r.mid].currentState.fps=r.fps.toString()
                            if(!s.group[r.ke].activeMonitors[r.mid].currentState.trigger_on){
                               s.group[r.ke].activeMonitors[r.mid].currentState.trigger_on=true
                            }else{
                                s.group[r.ke].activeMonitors[r.mid].currentState.trigger_on=false
                            }
                            r.mode=req.params.f;
                            try{r.details=JSON.parse(r.details);}catch(er){}
                            r.id=r.mid;
                            s.knexQuery({
                                action: "update",
                                table: "Monitors",
                                update: {
                                    mode: r.mode
                                },
                                where: [
                                    ['ke','=',r.ke],
                                    ['mid','=',r.mid],
                                ]
                            })
                            s.group[r.ke].rawMonitorConfigurations[r.mid]=r;
                            await s.camera('stop',s.cleanMonitorObject(r));
                            if(req.params.f!=='stop'){
                                await s.camera(req.params.f,s.cleanMonitorObject(r));
                            }
                            s.tx({f:'monitor_edit',mid:r.mid,ke:r.ke,mon:r},'GRP_'+r.ke);
                            s.tx({f:'monitor_edit',mid:r.mid,ke:r.ke,mon:r},'STR_'+r.ke);
                            response.msg = user.lang['Monitor mode changed']+' : '+req.params.f;
                        }else{
                            response.msg = user.lang['Reset Timer'];
                        }
                        response.cmd_at=s.formattedTime(new Date,'YYYY-MM-DD HH:mm:ss');
                        response.ok = true;
                        if(req.params.ff&&req.params.f!=='stop'){
                            req.params.ff=parseFloat(req.params.ff);
                            clearTimeout(s.group[r.ke].activeMonitors[r.mid].trigger_timer)
                            switch(req.params.fff){
                                case'day':case'days':
                                    req.timeout=req.params.ff*1000*60*60*24
                                break;
                                case'hr':case'hour':case'hours':
                                    req.timeout=req.params.ff*1000*60*60
                                break;
                                case'min':case'minute':case'minutes':
                                    req.timeout=req.params.ff*1000*60
                                break;
                                default://seconds
                                    req.timeout=req.params.ff*1000
                                break;
                            }
                            s.group[r.ke].activeMonitors[r.mid].trigger_timer=setTimeout(async function(){
                                delete(s.group[r.ke].activeMonitors[r.mid].trigger_timer)
                                s.knexQuery({
                                    action: "update",
                                    table: "Monitors",
                                    update: {
                                        mode: s.group[r.ke].activeMonitors[r.mid].currentState.mode
                                    },
                                    where: [
                                        ['ke','=',r.ke],
                                        ['mid','=',r.mid],
                                    ]
                                })
                                r.neglectTriggerTimer=1;
                                r.mode=s.group[r.ke].activeMonitors[r.mid].currentState.mode;
                                r.fps=s.group[r.ke].activeMonitors[r.mid].currentState.fps;
                                await s.camera('stop',s.cleanMonitorObject(r));
                                if(s.group[r.ke].activeMonitors[r.mid].currentState.mode!=='stop'){
                                    await s.camera(s.group[r.ke].activeMonitors[r.mid].currentState.mode,s.cleanMonitorObject(r));
                                }
                                s.group[r.ke].rawMonitorConfigurations[r.mid]=r;
                                s.tx({f:'monitor_edit',mid:r.mid,ke:r.ke,mon:r},'GRP_'+r.ke);
                                s.tx({f:'monitor_edit',mid:r.mid,ke:r.ke,mon:r},'STR_'+r.ke);
                            },req.timeout);
    //                        response.end_at=s.formattedTime(new Date,'YYYY-MM-DD HH:mm:ss').add(req.timeout,'milliseconds');
                        }
                     }else{
                        response.msg = user.lang['Monitor mode is already']+' : '+req.params.f;
                    }
                }else{
                    response.msg = user.lang['Monitor or Key does not exist.'];
                }
                res.end(s.prettyPrint(response));
            })
        },res,req);
    })
    /**
    * API : Get Cloud Video File (proxy)
     */
    app.get(config.webPaths.apiPrefix+':auth/cloudVideos/:ke/:id/:file', function (req,res){
        s.auth(req.params,function(user){
            const groupKey = req.params.ke
            const monitorId = req.params.id
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
                isRestrictedApiKey && apiKeyPermissions.watch_videos_disallowed ||
                isRestricted && !monitorPermissions[`${monitorId}_video_view`]
            ){
                s.closeJsonResponse(res,{ok: false, msg: lang['Not Authorized']});
                return
            }
            var time = s.nameToTime(req.params.file)
            if(req.query.isUTC === 'true'){
                time = s.utcToLocal(time)
            }
            time = new Date(time)
            s.knexQuery({
                action: "select",
                columns: "*",
                table: "Cloud Videos",
                where: [
                    ['ke','=',groupKey],
                    ['mid','=',req.params.id],
                    ['type','=', s.getPostData(req,'type') || 's3'],
                    ['time','=',time]
                ],
                limit: 1
            },(err,r) => {
                if(r&&r[0]){
                    r = r[0]
                    const videoDetails = JSON.parse(r.details)
                    const storageType = videoDetails.type || r.type
                    const onGetVideoData = s.cloudDiskUseOnGetVideoDataExtensions[storageType]
                    if(onGetVideoData){
                        onGetVideoData(r).then((dataPipe) => {
                            dataPipe.pipe(res)
                        }).catch((err) => {
                            console.error('onGetVideoData ERROR',err,videoDetails)
                            res.status(404)
                            res.end(user.lang['File Not Found in Database'])
                        })
                    }else{
                        fetch(r.href).then(actual => {
                            actual.headers.forEach((v, n) => res.setHeader(n, v));
                            actual.body.pipe(res);
                        })
                    }
                }else{
                    res.status(404)
                    res.end(user.lang['File Not Found in Database'])
                }
            })
        },res,req);
    });
    /**
    * API : Get Video File
     */
    const videoRowCaches = {}
    const videoRowCacheTimeouts = {}
    app.get(config.webPaths.apiPrefix+':auth/videos/:ke/:id/:file', function (req,res){
        s.auth(req.params,function(user){
            const groupKey = req.params.ke
            const monitorId = req.params.id
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
                isRestrictedApiKey && apiKeyPermissions.watch_videos_disallowed ||
                isRestricted && !monitorPermissions[`${monitorId}_video_view`]
            ){
                s.closeJsonResponse(res,{ok: false, msg: lang['Not Authorized']});
                return
            }
            var time = s.nameToTime(req.params.file)
            if(req.query.isUTC === 'true'){
                time = s.utcToLocal(time)
            }
            time = new Date(time)
            const cacheName = Object.values(req.params).join('_')
            const cacheVideoRow = (videoRow) => {
                videoRowCaches[cacheName] = videoRow
                clearTimeout(videoRowCacheTimeouts[cacheName])
                videoRowCacheTimeouts[cacheName] = setTimeout(() => {
                    delete(videoRowCaches[cacheName])
                },60000)
            }
            const sendVideo = (videoRow) => {
                cacheVideoRow(videoRow)
                const filePath = s.getVideoDirectory(videoRow) + req.params.file
                fs.stat(filePath,function(err,stats){
                    if (!err){
                        if(req.query.json === 'true'){
                            s.closeJsonResponse(res,videoRow)
                        }else{
                            s.streamMp4FileOverHttp(filePath,req,res,!!req.query.pureStream)
                        }
                        const clientIp = s.getClientIp(req)
                        s.onVideoAccessExtensions.forEach((extender) => {
                            extender(videoRow,user,groupKey,monitorId,clientIp)
                        })
                    }else{
                        s.closeJsonResponse(res,{
                            ok: false,
                            msg: lang['File Not Found in Filesystem'],
                            err: err
                        })
                    }
                })
            }
            if(videoRowCaches[cacheName]){
                sendVideo(videoRowCaches[cacheName])
            }else{
                s.knexQuery({
                    action: "select",
                    columns: "*",
                    table: "Videos",
                    where: [
                        ['ke','=',groupKey],
                        ['mid','=',req.params.id],
                        ['time','=',time]
                    ],
                    limit: 1
                },(err,r) => {
                    const videoRow = r[0]
                    if(videoRow){
                        sendVideo(videoRow)
                    }else{
                        res.status(404)
                        res.end(user.lang['File Not Found in Database'])
                    }
                })
            }
        },res,req);
    });
    /**
    * API : Motion Trigger via GET request
     */
     app.get(config.webPaths.apiPrefix+':auth/motion/:ke/:id', function (req,res){
         s.auth(req.params,function(user){
            const groupKey = req.params.ke
            const monitorId = req.params.id
            const monitorConfig = s.group[groupKey].rawMonitorConfigurations[monitorId]
            const {
                monitorPermissions,
                monitorRestrictions,
            } = s.getMonitorsPermitted(user.details,monitorId);
            const {
                isRestricted,
                isRestrictedApiKey,
                apiKeyPermissions,
            } = s.checkPermission(user);
            if(
                !monitorConfig ||
                isRestrictedApiKey && apiKeyPermissions.control_monitors_disallowed
            ){
                s.closeJsonResponse(res,{
                    ok: false,
                    msg: !monitorConfig ? user.lang['Monitor or Key does not exist.'] : lang['Not Authorized']
                });
                return
            }
            let simulatedEvent = {
                id: req.params.id,
                ke: req.params.ke
            }
             if(req.query.data){
                 try{
                     Object.assign(simulatedEvent, {details: s.parseJSON(req.query.data)});
                 }catch(err){
                     s.closeJsonResponse(res,{
                         ok: false,
                         msg: user.lang['Data Broken']
                     })
                     return
                 }
             }
             // fallback for cameras that doesn't support JSON in query parameters ( i.e Sercom ICamera1000 will fail to save HTTP_Notifications as invalid url)
             else if(req.query.plug && req.query.name && req.query.reason && req.query.confidence) {
                 const {
                     plug,
                     reason,
                     confidence,
                     name,
                 } = req.query;
                Object.assign(simulatedEvent,{
                    details: {
                        plug,
                        reason,
                        confidence,
                        name,
                    }
                });
             }
             else{
                 s.closeJsonResponse(res,{
                     ok: false,
                     msg: user.lang['No Data']
                 })
                 return
             }
             var details = s.group[groupKey].rawMonitorConfigurations[monitorId].details
             var detectorHttpApi = details.detector_http_api
             var detectorOn = (details.detector === '1')
             if(
                 detectorHttpApi === '0' ||
                 detectorHttpApi === '2' && !detectorOn ||
                 detectorHttpApi === '3' && detectorOn
             ){
                 s.closeJsonResponse(res,{
                     ok: false,
                     msg: user.lang['Trigger Blocked']
                 })
                 return;
             }
             triggerEvent(simulatedEvent)
             s.closeJsonResponse(res,{
                 ok: true,
                 msg: user.lang['Trigger Successful']
             })
         },res,req)
     })
    /**
    * API : WebHook Tester
     */
    app.get(config.webPaths.apiPrefix+':auth/hookTester/:ke/:id', function (req,res){
        res.setHeader('Content-Type', 'application/json');
        s.auth(req.params,function(user){
            s.userLog(req.params,{type:'Test',msg:'Hook Test'})
            res.end(s.prettyPrint({ok:true}))
        },res,req);
    })
    /**
    * API : Object Detection Counter Status
     */
    app.get(config.webPaths.apiPrefix+':auth/eventCountStatus/:ke/:id', function (req,res){
        res.setHeader('Content-Type', 'application/json');
        s.auth(req.params,function(user){
            const monitorId = req.params.id
            const groupKey = req.params.ke
            const {
                monitorPermissions,
                monitorRestrictions,
            } = s.getMonitorsPermitted(user.details,monitorId)
            const {
                isRestricted,
                isRestrictedApiKey,
                apiKeyPermissions,
            } = s.checkPermission(user);
            if(
                isRestrictedApiKey && apiKeyPermissions.watch_videos_disallowed ||
                isRestricted && (
                    monitorId && !monitorPermissions[`${monitorId}_video_view`] ||
                    monitorRestrictions.length === 0
                )
            ){
                s.closeJsonResponse(res,{ok: false, msg: lang['Not Authorized'], counted: 0, tags: []});
                return
            }
            var selectedObject = s.group[req.params.ke].activeMonitors[req.params.id].eventsCounted
            res.end(s.prettyPrint({
                ok: true,
                counted: Object.keys(selectedObject).length,
                tags: selectedObject,
            }))
        },res,req)
    })
    /**
    * API : Object Detection Counter Status
     */
    app.get([
        config.webPaths.apiPrefix+':auth/eventCounts/:ke',
        config.webPaths.apiPrefix+':auth/eventCounts/:ke/:id'
    ], function (req,res){
        res.setHeader('Content-Type', 'application/json')
        s.auth(req.params,function(user){
            const monitorId = req.params.id
            const groupKey = req.params.ke
            const {
                monitorPermissions,
                monitorRestrictions,
            } = s.getMonitorsPermitted(user.details,monitorId)
            const {
                isRestricted,
                isRestrictedApiKey,
                apiKeyPermissions,
            } = s.checkPermission(user);
            if(
                isRestrictedApiKey && apiKeyPermissions.watch_videos_disallowed ||
                isRestricted && (
                    monitorId && !monitorPermissions[`${monitorId}_video_view`] ||
                    monitorRestrictions.length === 0
                )
            ){
                s.closeJsonResponse(res,{ok: false, msg: lang['Not Authorized'], videos: []});
                return
            }
            s.sqlQueryBetweenTimesWithPermissions({
                table: 'Events Counts',
                user: user,
                noCount: true,
                groupKey: req.params.ke,
                monitorId: req.params.id,
                startTime: req.query.start,
                endTime: req.query.end,
                startTimeOperator: req.query.startOperator,
                endTimeOperator: req.query.endOperator,
                limit: req.query.limit,
                archived: req.query.archived,
                endIsStartTo: !!req.query.endIsStartTo,
                parseRowDetails: true,
                rowName: 'counts',
                preliminaryValidationFailed: false
            },(response) => {
                res.end(s.prettyPrint(response))
            })
        },res,req)
    })
    /**
    * API : Camera PTZ Controller
     */
    app.get(config.webPaths.apiPrefix+':auth/control/:ke/:id/:direction', function (req,res){
        res.setHeader('Content-Type', 'application/json');
        s.auth(req.params,function(user){
            if(req.params.direction === 'setHome'){
                setPresetForCurrentPosition({
                    id: req.params.id,
                    ke: req.params.ke,
                },(response) => {
                    res.end(s.prettyPrint(response))
                })
            }else{
                ptzControl(req.params,function(msg){
                    s.userLog({
                        id: req.params.id,
                        ke: req.params.ke,
                    },{
                        msg: msg,
                        direction: req.params.direction,
                    })
                    res.end(s.prettyPrint(msg))
                })
            }
        },res,req);
    })
    /**
    * API : Upload Video File
    * API : Add "streamIn" query string to Push to "Dashcam (Streamer v2)" FFMPEG Process
     */
    app.post(config.webPaths.apiPrefix+':auth/videos/:ke/:id',fileupload(), async (req,res) => {
        var response = {ok:false}
        res.setHeader('Content-Type', 'application/json');
        s.auth(req.params,function(user){
            const groupKey = req.params.ke
            const monitorId = req.params.id
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
                isRestrictedApiKey && apiKeyPermissions.delete_videos_disallowed ||
                isRestricted && !monitorPermissions[`${monitorId}_video_delete`]
            ){
                s.closeJsonResponse(res,{ok: false, msg: lang['Not Authorized']});
                return
            }
            // req.query.overwrite === '1'
            if(s.group[groupKey] && s.group[groupKey].activeMonitors && s.group[groupKey].activeMonitors[monitorId]){
                var monitor = s.group[groupKey].rawMonitorConfigurations[monitorId]
                try {
                    if(!req.files) {
                        res.send({
                            status: false,
                            message: 'No file uploaded'
                        });
                    } else {
                        let video = req.files.video;
                        var time = new Date(parseInt(video.name.split('.')[0]))
                        var filename = s.formattedTime(time) + '.' + monitor.ext
                        video.mv(s.getVideoDirectory(monitor) + filename,function(){
                            s.insertCompletedVideo(monitor,{
                                file: filename,
                                events: s.group[groupKey].activeMonitors[monitorId].detector_motion_count,
                                endTime: req.body.endTime.indexOf('-') > -1 ? s.nameToTime(req.body.endTime) : parseInt(req.body.endTime) || null,
                            },function(){
                                response.ok = true
                                response.filename = filename
                                res.end(s.prettyPrint({
                                    ok: true,
                                    message: 'File is uploaded',
                                    data: {
                                        name: video.name,
                                        mimetype: video.mimetype,
                                        size: video.size
                                    }
                                }))
                            })
                        });
                    }
                } catch (err) {
                    response.err = err
                    res.status(500).end(response)
                }
            }else{
                response.error = 'Non Existant Monitor'
                res.end(s.prettyPrint(response))
            }
        },res,req);
    })
    /**
    * API : Modify Video File
     */
    app.get([
        config.webPaths.apiPrefix+':auth/videos/:ke/:id/:file/:mode',
        config.webPaths.apiPrefix+':auth/videos/:ke/:id/:file/:mode/:f',
        config.webPaths.apiPrefix+':auth/cloudVideos/:ke/:id/:file/:mode',
        config.webPaths.apiPrefix+':auth/cloudVideos/:ke/:id/:file/:mode/:f'
    ], function (req,res){
        let response = { ok: false };
        res.setHeader('Content-Type', 'application/json');
        s.auth(req.params,function(user){
            const monitorId = req.params.id
            const groupKey = req.params.ke
            const {
                monitorPermissions,
                monitorRestrictions,
            } = s.getMonitorsPermitted(user.details,monitorId)
            const {
                isRestricted,
                isRestrictedApiKey,
                apiKeyPermissions,
            } = s.checkPermission(user);
            if(
                isRestrictedApiKey && apiKeyPermissions.delete_videos_disallowed ||
                isRestricted && !monitorPermissions[`${monitorId}_video_delete`]
            ){
                s.closeJsonResponse(res,{ok: false, msg: lang['Not Authorized']});
                return
            }
            var time = s.nameToTime(req.params.file)
            time = new Date(time)
            var origURL = req.originalUrl.split('/')
            var videoParam = origURL[origURL.indexOf(req.params.auth) + 1]
            var videoSet = 'Videos'
            switch(videoParam){
                case'cloudVideos':
                    videoSet = 'Cloud Videos'
                break;
            }
            const whereQuery = [
                ['ke','=',groupKey],
                ['mid','=',req.params.id],
                ['time','=',time]
            ]
            if(videoParam === 'cloudVideos')whereQuery.push(['type','=',s.getPostData(req,'type') || 's3']);
            s.knexQuery({
                action: "select",
                columns: "*",
                table: videoSet,
                where: whereQuery,
                limit: 1
            },async (err,r) => {
                if(r && r[0]){
                    r=r[0];
                    const originalFileName = `${s.formattedTime(r.time)+'.'+r.ext}`
                    var details = s.parseJSON(r.details) || {}
                    switch(req.params.mode){
                        case'slice':
                            const startTime = s.getPostData(req,'startTime');
                            const endTime = s.getPostData(req,'endTime');
                            const sliceResponse = await sliceVideo(r,{
                                startTime: startTime,
                                endTime: endTime,
                            });
                            response = sliceResponse
                        break;
                        case'archive':
                            response.ok = true
                            const unarchive = s.getPostData(req,'unarchive') == '1';
                            const archiveResponse = await archiveVideo(r,unarchive)
                            response.ok = archiveResponse.ok
                            response.archived = archiveResponse.archived
                        break;
                        case'fix':
                            await reEncodeVideoAndReplace(r)
                        break;
                        case'compress':
                            response.ok = true
                            reEncodeVideoAndBinOriginalAddToQueue({
                                video: r,
                                targetExtension: 'webm',
                                doSlowly: false
                            }).then((encodeResponse) => {
                                s.debugLog('Complete Compression',encodeResponse)
                            }).catch((err) => {
                                console.log(err)
                            })
                        break;
                        case'status':
                            r.f = 'video_edit'
                            switch(videoParam){
                                case'cloudVideos':
                                    r.f += '_cloud'
                                break;
                            }
                            r.status = parseInt(req.params.f)
                            if(isNaN(req.params.f)||req.params.f===0){
                                response.msg = 'Not a valid value.';
                            }else{
                                response.ok = true;
                                s.knexQuery({
                                    action: "update",
                                    table: videoSet,
                                    update: {
                                        status: req.params.f
                                    },
                                    where: [
                                        ['ke','=',groupKey],
                                        ['mid','=',req.params.id],
                                        ['time','=',time]
                                    ]
                                })
                                s.tx(r,'GRP_'+r.ke);
                            }
                        break;
                        case'delete':
                            response.ok = true;
                            switch(videoParam){
                                case'cloudVideos':
                                    s.deleteVideoFromCloud(r,details.type || r.type || 's3')
                                break;
                                default:
                                    s.deleteVideo(r)
                                break;
                            }
                        break;
                        default:
                            response.msg = user.lang.modifyVideoText1;
                        break;
                    }
                }else{
                    response.msg = user.lang['No such file'];
                }
                res.end(s.prettyPrint(response));
            })
        },res,req);
    });
    /**
    * API : Merge Videos and Bin it
     */
    app.post(config.webPaths.apiPrefix+':auth/mergeVideos/:ke/:id', function (req,res){
        s.auth(req.params, async function(user){
            const monitorId = req.params.id
            const groupKey = req.params.ke
            const {
                monitorPermissions,
                monitorRestrictions,
            } = s.getMonitorsPermitted(user.details,monitorId,'video_view')
            const {
                isRestricted,
                isRestrictedApiKey,
                apiKeyPermissions,
            } = s.checkPermission(user);
            if(
                isRestrictedApiKey && apiKeyPermissions.watch_videos_disallowed ||
                isRestricted && (
                    monitorId && !monitorPermissions[`${monitorId}_video_view`] ||
                    monitorRestrictions.length === 0
                )
            ){
                s.closeJsonResponse(res,{ok: false, msg: lang['Not Authorized'], videos: []});
                return
            }
            const response = { ok: false }
            const selectedVideos = s.getPostData(req,'videos');
            console.log('selected',selectedVideos)
            if(selectedVideos && selectedVideos.length > 1){
                const mergedFilePath = await mergeVideosAndBin(selectedVideos);
                response.ok = !!mergedFilePath;
                s.closeJsonResponse(res, response);
            }else{
                s.sqlQueryBetweenTimesWithPermissions({
                    table: 'Videos',
                    user: user,
                    noCount: true,
                    groupKey,
                    monitorId,
                    startTime: s.getPostData(req,'start'),
                    endTime: s.getPostData(req,'end'),
                    startTimeOperator: s.getPostData(req,'startOperator'),
                    endTimeOperator: s.getPostData(req,'endOperator'),
                    noLimit: s.getPostData(req,'noLimit'),
                    limit: s.getPostData(req,'limit'),
                    archived: s.getPostData(req,'archived'),
                    endIsStartTo: !!s.getPostData(req,'endIsStartTo'),
                    parseRowDetails: false,
                    rowName: 'videos',
                    monitorRestrictions: monitorRestrictions,
                    preliminaryValidationFailed: false
                }, async ({ videos }) => {
                    if(videos){
                        const mergedFilePath = await mergeVideosAndBin(videos);
                        response.ok = !!mergedFilePath;
                    }
                    s.closeJsonResponse(res, response);
                })
            }
        },res,req);
    });
    /**
    * API : Get Login Tokens
     */
    app.get(config.webPaths.apiPrefix+':auth/loginTokens/:ke', function (req,res){
        var response = {ok:false};
        res.setHeader('Content-Type', 'application/json');
        s.auth(req.params,(user) => {
            const groupKey = req.params.ke
            s.knexQuery({
                action: "select",
                columns: "*",
                table: "LoginTokens",
                where: [
                    ['ke','=',groupKey],
                    ['uid','=',user.uid],
                ]
            },(err,rows) => {
                response.ok = true
                response.rows = rows
                s.closeJsonResponse(res,response)
            })
        },res,req);
    });
    /**
    * API : Get Login Token
     */
    app.get(config.webPaths.apiPrefix+':auth/loginTokens/:ke/:loginId', function (req,res){
        var response = {ok:false};
        res.setHeader('Content-Type', 'application/json');
        s.auth(req.params,(user) => {
            const groupKey = req.params.ke
            s.knexQuery({
                action: "select",
                columns: "*",
                table: "LoginTokens",
                where: [
                    ['loginId','=',user.uid],
                    ['ke','=',groupKey],
                    ['uid','=',user.uid],
                ],
                limit: 1
            },(err,rows) => {
                response.ok = !!rows[0]
                response.row = rows[0]
                s.closeJsonResponse(res,response)
            })
        },res,req);
    });
    /**
    * API : Delete Login Token
     */
    app.get(config.webPaths.apiPrefix+':auth/loginTokens/:ke/:loginId/delete', function (req,res){
        var response = {ok:false};
        res.setHeader('Content-Type', 'application/json');
        s.auth(req.params,async (user) => {
            const loginId = req.params.loginId
            const groupKey = req.params.ke
            const deleteResponse = await s.knexQueryPromise({
                action: "delete",
                table: "LoginTokens",
                where: [
                    ['loginId','=',loginId],
                    ['ke','=',groupKey],
                    ['uid','=',user.uid],
                ]
            })
            response.ok = true
            s.closeJsonResponse(res,response)
        },res,req);
    });
    /**
    * API : Stream In to push data to ffmpeg by HTTP
     */
    app.all('/:auth/streamIn/:ke/:id', function (req, res) {
        s.auth(req.params,function(user){
            const ipAddress = s.getClientIp(req)
            const groupKey = req.params.ke
            const monitorId = req.params.id
            const timeStartedConnection = new Date();
            s.userLog({
                ke: groupKey,
                mid: monitorId,
            },{
                type: "HTTP streamIn Started",
                msg: {
                    ipAddress: ipAddress,
                }
            })
            res.connection.setTimeout(0);
            req.on('data', function(buffer){
                s.group[groupKey].activeMonitors[monitorId].spawn.stdin.write(buffer)
            });
            req.on('end',function(){
                s.userLog({
                    ke: groupKey,
                    mid: monitorId,
                },{
                    type: "HTTP streamIn Closed",
                    msg: {
                        timeStartedConnection: timeStartedConnection,
                        ipAddress: ipAddress,
                    }
                })
            });
        },res,req)
    })
    /**
    * API : Account Edit from Dashboard
     */
    app.all(config.webPaths.apiPrefix+':auth/accounts/:ke/edit',function (req,res){
        s.auth(req.params,function(user){
            var endData = {
                ok : false
            }
            var form = s.getPostData(req)
            if(form){
                endData.ok = true
                s.accountSettingsEdit({
                    ke: req.params.ke,
                    uid: user.uid,
                    form: form,
                    cnid: user.cnid
                })
            }else{
                endData.msg = lang.postDataBroken
            }
            s.closeJsonResponse(res,endData)
        },res,req)
    })
    /**
    * API : Get Definitions JSON
     */
    app.get(config.webPaths.apiPrefix+':auth/definitions/:ke',function (req,res){
        s.auth(req.params,function(user){
            var endData = {
                ok: true,
                definitions: s.getDefinitonFile(user.details.lang)
            }
            s.closeJsonResponse(res,endData)
        },res,req)
    })
    /**
    * API : Get Language JSON
     */
    app.get(config.webPaths.apiPrefix+':auth/language/:ke',function (req,res){
        s.auth(req.params,function(user){
            var endData = {
                ok: true,
                definitions: s.getLanguageFile(user.details.lang)
            }
            s.closeJsonResponse(res,endData)
        },res,req)
    })
    /**
    * API : Get Available Languages
     */
    app.get(config.webPaths.apiPrefix+':auth/languages/:ke',function (req,res){
        s.auth(req.params,function(user){
            var endData = {
                ok: true,
                list: s.listOfPossibleLanguages
            }
            s.closeJsonResponse(res,endData)
        },res,req)
    })
    /**
    * API : Get Storage Locations
     */
    app.get(config.webPaths.apiPrefix+':auth/storageLocations/:ke',function (req,res){
        s.auth(req.params,function(user){
            const endData = {
                ok: true,
                list: s.listOfStorage
            }
            s.closeJsonResponse(res,endData)
        },res,req)
    })
    /**
    * API : Get Hardware Acceleration choices
     */
    app.get(config.webPaths.apiPrefix+':auth/hardwareAccels/:ke',function (req,res){
        s.auth(req.params,function(user){
            const endData = {
                ok: true,
                list: s.listOfHwAccels
            }
            s.closeJsonResponse(res,endData)
        },res,req)
    })
    /**
    * API : Get Audio File choices
     */
    app.get(config.webPaths.apiPrefix+':auth/addStorage/:ke',function (req,res){
        s.auth(req.params,function(user){
            const endData = {
                ok: true,
                list: s.dir.addStorage
            }
            s.closeJsonResponse(res,endData)
        },res,req)
    })
    /**
    * API : Get Uploader choices
     */
    app.get(config.webPaths.apiPrefix+':auth/uploaderFields/:ke',function (req,res){
        s.auth(req.params,function(user){
            const fields = s.definitions["Account Settings"].blocks["Uploaders"];
            const endData = {
                ok: true,
                fields
            }
            s.closeJsonResponse(res,endData)
        },res,req)
    })
    /**
    * API : Get Admin API Prefix
     */
    app.get(config.webPaths.apiPrefix+':auth/getAdminApiPrefix/:ke',function (req,res){
        s.auth(req.params,function(user){
            const endData = {
                ok: true,
                adminApiPrefix: config.webPaths.adminApiPrefix
            }
            if(user.details.sub){
                endData.ok = false;
                endData.adminApiPrefix = null;
            }
            s.closeJsonResponse(res,endData)
        },res,req)
    })
    /**
    * Robots.txt
    */
    app.get('/robots.txt', function (req,res){
        res.on('finish',function(){
            res.end()
        })
        fs.createReadStream(s.mainDirectory + '/web/pages/robots.txt').pipe(res)
    })
}
