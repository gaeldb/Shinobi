var moment = require('moment');
var execSync = require('child_process').execSync;
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var jsonfile = require("jsonfile");
const {
    stringToSqlTime,
} = require('./common.js')
module.exports = function(s,config,lang,io){
    const {
        ptzControl
    } = require('./control/ptz.js')(s,config,lang)
    const {
        legacyFilterEvents
    } = require('./events/utils.js')(s,config,lang)
    s.clientSocketConnection = {}
    //send data to socket client function
    s.tx = function(z,y,x){
      s.onWebsocketMessageSendExtensions.forEach(function(extender){
          extender(z,y,x)
      })
      if(x){
        return x.broadcast.to(y).emit('f',z)
      };
      io.to(y).emit('f',z);
    }
    s.txToDashcamUsers = function(data,groupKey){
        if(s.group[groupKey] && s.group[groupKey].dashcamUsers){
            Object.keys(s.group[groupKey].dashcamUsers).forEach(function(auth){
                s.tx(data,s.group[groupKey].dashcamUsers[auth].cnid)
            })
        }
    }
    s.txWithSubPermissions = function(z,y,permissionChoices){
        if(typeof permissionChoices==='string'){
            permissionChoices=[permissionChoices]
        }
        if(s.group[z.ke]){
            Object.keys(s.group[z.ke].users).forEach(function(v){
                var user = s.group[z.ke].users[v]
                if(user.details.sub){
                    if(user.details.allmonitors!=='1'){
                        var valid=0
                        var checked=permissionChoices.length
                        permissionChoices.forEach(function(b){
                            if(user.details[b] && user.details[b].indexOf(z.mid)!==-1){
                                ++valid
                            }
                        })
                        if(valid===checked){
                           s.tx(z,user.cnid)
                        }
                    }else{
                        s.tx(z,user.cnid)
                    }
                }else{
                    s.tx(z,user.cnid)
                }
            })
        }
    }

    const streamConnectionAuthentication = (options,ipAddress) => {
        return new Promise( (resolve,reject) => {
            var isInternal = false
            if(ipAddress.indexOf('localhost') > -1 || ipAddress.indexOf('127.0.0.1') > -1){
                isInternal = true
            }
            const baseWheres = [
                ['ke','=',options.ke],
                ['uid','=',options.uid],
            ]
            s.knexQuery({
                action: "select",
                columns: "ke,uid,auth,mail,details",
                table: "Users",
                where: baseWheres.concat(!isInternal ? [['auth','=',options.auth]] : [])
            },(err,r) => {
                if(r&&r[0]){
                    resolve(r)
                }else{
                    s.knexQuery({
                        action: "select",
                        columns: "*",
                        table: "API",
                        where: baseWheres.concat(!isInternal ? [['code','=',options.auth]] : [])
                    },(err,r) => {
                        if(r && r[0]){
                            r = r[0]
                            r.details = JSON.parse(r.details)
                            if(r.details.auth_socket === '1'){
                                s.knexQuery({
                                    action: "select",
                                    columns: "ke,uid,auth,mail,details",
                                    table: "Users",
                                    where: [
                                        ['ke','=',options.ke],
                                        ['uid','=',options.uid],
                                    ]
                                },(err,r) => {
                                    if(r && r[0]){
                                        resolve(r)
                                    }else{
                                        reject('User not found')
                                    }
                                })
                            }else{
                                reject('Permissions for this key do not allow authentication with Websocket')
                            }
                        }else{
                            reject('Not an API key')
                        }
                    })
                }
            })
        })
    }

    const validatedAndBindAuthenticationToSocketConnection = (cn,d,removeListenerOnDisconnect) => {
        if(!d.channel)d.channel = 'MAIN';
        cn.ke = d.ke,
        cn.uid = d.uid,
        cn.auth = d.auth;
        cn.channel = d.channel;
        cn.removeListenerOnDisconnect = removeListenerOnDisconnect;
        cn.socketVideoStream = d.id;
    }

    const createStreamEmitter = (d,cn) => {
        var Emitter,chunkChannel
        if(!d.channel){
            Emitter = s.group[d.ke].activeMonitors[d.id].emitter
            chunkChannel = 'MAIN'
        }else{
            Emitter = s.group[d.ke].activeMonitors[d.id].emitterChannel[parseInt(d.channel)+config.pipeAddition]
            chunkChannel = parseInt(d.channel)+config.pipeAddition
        }
        if(!Emitter){
            cn.disconnect();return;
        }
        return Emitter
    }

    ////socket controller
    io.on('connection', function (cn) {
        var tx;
        //unique Base64 socket stream
        cn.on('Base64',function(d){
            if(!s.group[d.ke]||!s.group[d.ke].activeMonitors||!s.group[d.ke].activeMonitors[d.id]){
                cn.disconnect();return;
            }
            cn.ip=cn.request.connection.remoteAddress;
            var toUTC = function(){
                return new Date().toISOString();
            }
            var tx=function(z){cn.emit('data',z);}
            const onFail = (msg) => {
                tx({f:'stop_reconnect',msg:msg,token_used:d.auth,ke:d.ke});
                cn.disconnect();
            }
            const onSuccess = (r) => {
                r = r[0];
                const Emitter = createStreamEmitter(d,cn)
                validatedAndBindAuthenticationToSocketConnection(cn,d,true)
                var contentWriter
                cn.closeSocketVideoStream = function(){
                    Emitter.removeListener('data', contentWriter);
                }
                Emitter.on('data',contentWriter = function(base64){
                    tx(base64)
                })
             }
            //check if auth key is user's temporary session key
            if(s.group[d.ke]&&s.group[d.ke].users&&s.group[d.ke].users[d.auth]){
                onSuccess(s.group[d.ke].users[d.auth]);
            }else{
                streamConnectionAuthentication(d,cn.ip).then(onSuccess).catch(onFail)
            }
        })
        //unique FLV socket stream
        cn.on('FLV',function(d){
            if(!s.group[d.ke]||!s.group[d.ke].activeMonitors||!s.group[d.ke].activeMonitors[d.id]){
                cn.disconnect();return;
            }
            cn.ip=cn.request.connection.remoteAddress;
            var toUTC = function(){
                return new Date().toISOString();
            }
            var tx=function(z){cn.emit('data',z);}
            const onFail = (msg) => {
                tx({f:'stop_reconnect',msg:msg,token_used:d.auth,ke:d.ke});
                cn.disconnect();
            }
            const onSuccess = (r) => {
                r=r[0];
                const Emitter = createStreamEmitter(d,cn)
                validatedAndBindAuthenticationToSocketConnection(cn,d,true)
                var contentWriter
                cn.closeSocketVideoStream = function(){
                    Emitter.removeListener('data', contentWriter);
                }
                tx({time:toUTC(),buffer:s.group[d.ke].activeMonitors[d.id].firstStreamChunk[chunkChannel]})
                Emitter.on('data',contentWriter = function(buffer){
                    tx({time:toUTC(),buffer:buffer})
                })
             }
            if(s.group[d.ke] && s.group[d.ke].users && s.group[d.ke].users[d.auth]){
                onSuccess(s.group[d.ke].users[d.auth]);
            }else{
                streamConnectionAuthentication(d,cn.ip).then(onSuccess).catch(onFail)
            }
        })
        //unique MP4 socket stream
        cn.on('MP4',function(d, cb){
            if(!s.group[d.ke]||!s.group[d.ke].activeMonitors||!s.group[d.ke].activeMonitors[d.id]){
                cn.disconnect();return;
            }
            cn.ip=cn.request.connection.remoteAddress;
            var toUTC = function(){
                return new Date().toISOString();
            }
            var tx=function(z){cn.emit('data',z);}
            const onFail = (msg) => {
                tx({f:'stop_reconnect',msg:msg,token_used:d.auth,ke:d.ke});
                cn.disconnect();
            }
            const onSuccess = (r) => {
                r = r[0];
                validatedAndBindAuthenticationToSocketConnection(cn,d)
                var mp4frag = s.group[d.ke].activeMonitors[d.id].mp4frag[d.channel];
                var onInitialized = () => {
                    cn.emit('mime', mp4frag.mime);
                    mp4frag.removeListener('initialized', onInitialized);
                };
                //event listener
                var onSegment = function(data){
                    cn.emit('segment', data);
                };
                cn.closeSocketVideoStream = function(){
                    if(mp4frag){
                        mp4frag.removeListener('segment', onSegment)
                        mp4frag.removeListener('initialized', onInitialized)
                    }
                }
                if (cb) cb(null, true);
                cn.on('MP4Command',function(msg){
                    try{
                        switch (msg) {
                            case 'mime' ://client is requesting mime
                                var mime = mp4frag.mime;
                                if (mime) {
                                    cn.emit('mime', mime);
                                } else {
                                    mp4frag.on('initialized', onInitialized);
                                }
                            break;
                            case 'initialization' ://client is requesting initialization segment
                                cn.emit('initialization', mp4frag.initialization);
                            break;
                            case 'segment' ://client is requesting a SINGLE segment
                                var segment = mp4frag.segment;
                                if (segment) {
                                    cn.emit('segment', segment);
                                } else {
                                    mp4frag.once('segment', onSegment);
                                }
                            break;
                            case 'segments' ://client is requesting ALL segments
                                //send current segment first to start video asap
                                var segment = mp4frag.segment;
                                if (segment) {
                                    cn.emit('segment', segment);
                                }
                                //add listener for segments being dispatched by mp4frag
                                mp4frag.on('segment', onSegment);
                            break;
                            case 'pause' :
                                mp4frag.removeListener('segment', onSegment);
                            break;
                            case 'resume' :
                                mp4frag.on('segment', onSegment);
                            break;
                            case 'stop' ://client requesting to stop receiving segments
                                cn.closeSocketVideoStream()
                            break;
                        }
                    }catch(err){
                        onFail(err)
                    }
                })
            }
            if(s.group[d.ke]&&s.group[d.ke].users&&s.group[d.ke].users[d.auth]){
                onSuccess(s.group[d.ke].users[d.auth]);
            }else{
                streamConnectionAuthentication(d,cn.ip).then(onSuccess).catch(onFail)
            }
        })
        //main socket control functions
        cn.on('f',function(d){
            if(!cn.ke&&d.f==='init'){//socket login
                const ipAddress = cn.request.connection.remoteAddress
                cn.ip = (ipAddress.indexOf('127.0.0.1') > -1 || ipAddress.indexOf('localhost') > -1) && d.ipAddress ?  d.ipAddress : ipAddress;
                tx=function(z){if(!z.ke){z.ke=cn.ke;};cn.emit('f',z);}
                const onFail = (msg) => {
                    tx({ok:false,msg:'Not Authorized',token_used:d.auth,ke:d.ke});cn.disconnect();
                }
                const onSuccess = (r) => {
                    r = r[0];
                    cn.join('GRP_'+d.ke);cn.join('CPU');
                    cn.ke=d.ke,
                    cn.uid=d.uid,
                    cn.auth=d.auth;
                    if(!s.group[d.ke])s.group[d.ke]={};
    //                    if(!s.group[d.ke].vid)s.group[d.ke].vid={};
                    if(!s.group[d.ke].users)s.group[d.ke].users={};
    //                    s.group[d.ke].vid[cn.id]={uid:d.uid};
                    s.group[d.ke].users[d.auth] = {
                        cnid: cn.id,
                        uid: r.uid,
                        mail: r.mail,
                        details: JSON.parse(r.details),
                        logged_in_at: s.timeObject(new Date).format(),
                        login_type: 'Dashboard'
                    }
                    s.clientSocketConnection[cn.id] = cn
                    try{s.group[d.ke].users[d.auth].details=JSON.parse(r.details)}catch(er){}
                    if(s.group[d.ke].users[d.auth].details.get_server_log!=='0'){
                        cn.join('GRPLOG_'+d.ke)
                    }
                    s.group[d.ke].users[d.auth].lang = s.getLanguageFile(s.group[d.ke].users[d.auth].details.lang)
                    s.userLog({ke:d.ke,mid:'$USER'},{type:s.group[d.ke].users[d.auth].lang['Websocket Connected'],msg:{mail:r.mail,id:d.uid,ip:cn.ip}})
                    if(!s.group[d.ke].activeMonitors){
                        s.group[d.ke].activeMonitors={}
                        if(!s.group[d.ke].activeMonitors){s.group[d.ke].activeMonitors={}}
                    }
                    tx({f:'users_online',users:s.group[d.ke].users})
                    s.tx({f:'user_status_change',ke:d.ke,uid:cn.uid,status:1,user:s.group[d.ke].users[d.auth]},'GRP_'+d.ke)
                    s.sendDiskUsedAmountToClients(d.ke)
                    s.sendCloudDiskUsedAmountToClients(d.ke)
                    tx({
                        f:'init_success',
                        users:s.group[d.ke].vid,
                        os:{
                            platform:s.platform,
                            cpuCount:s.coreCount,
                            totalmem:s.totalmem
                        }
                    })
                    try{
                        (s.group[d.ke] ? Object.values(s.group[d.ke].rawMonitorConfigurations) : []).forEach((monitor) => {
                            s.cameraSendSnapshot({
                                mid: monitor.mid,
                                ke: monitor.ke,
                                mon: monitor
                            },{
                                useIcon: true
                            })
                        })
                    }catch(err){
                        s.debugLog(err)
                    }
                    s.onSocketAuthenticationExtensions.forEach(function(extender){
                        extender(r,cn,d,tx)
                    })
                }
                streamConnectionAuthentication(d,cn.ip).then(onSuccess).catch(onFail)
                return;
            }
            if((d.id||d.uid||d.mid)&&cn.ke){
            try{
                d.callbackResponse = {ok: true}
                switch(d.f){
                    case'monitorOrder':
                        if(d.monitorOrder && d.monitorOrder instanceof Object){
                            s.knexQuery({
                                action: "select",
                                columns: "*",
                                table: "Users",
                                where: [
                                    ['ke','=',cn.ke],
                                    ['uid','=',cn.uid]
                                ]
                            },(err,r) => {
                                if(r && r[0]){
                                    details = JSON.parse(r[0].details)
                                    details.monitorOrder = d.monitorOrder
                                    s.knexQuery({
                                        action: "update",
                                        table: "Users",
                                        update: {
                                            details: s.s(details)
                                        },
                                        where: [
                                            ['ke','=',cn.ke],
                                            ['uid','=',cn.uid]
                                        ]
                                    })
                                }
                            })
                        }
                    break;
                    case'monitorListOrder':
                        if(d.monitorListOrder && d.monitorListOrder instanceof Object){
                            s.knexQuery({
                                action: "select",
                                columns: "details",
                                table: "Users",
                                where: [
                                    ['ke','=',cn.ke],
                                    ['uid','=',cn.uid],
                                ]
                            },(err,r) => {
                                if(r && r[0]){
                                    const monitorListOrder = {}
                                    const orderKeys = Object.keys(d.monitorListOrder)
                                    details = JSON.parse(r[0].details)
                                    orderKeys.forEach((orderKey) => {
                                        const monitorIds = d.monitorListOrder[orderKey]
                                        const uniqueList = {}
                                        monitorIds.forEach((monitorId) => {
                                            uniqueList[monitorId] = 1
                                        })
                                        monitorListOrder[orderKey] = Object.keys(uniqueList)
                                    })
                                    details.monitorListOrder = monitorListOrder
                                    s.knexQuery({
                                        action: "update",
                                        table: "Users",
                                        update: {
                                            details: s.s(details)
                                        },
                                        where: [
                                            ['ke','=',cn.ke],
                                            ['uid','=',cn.uid],
                                        ]
                                    })
                                }
                            })
                        }
                    break;
                    case'settings':
                        switch(d.ff){
                            case'filters':
                                switch(d.fff){
                                    case'save':case'delete':
                                        s.knexQuery({
                                            action: "select",
                                            columns: "details",
                                            table: "Users",
                                            where: [
                                                ['ke','=',cn.ke],
                                                ['uid','=',cn.uid],
                                            ],
                                            limit: 1
                                        },(err,r) => {
                                            if(r && r[0]){
                                                r = r[0];
                                                d.d=JSON.parse(r.details);
                                                if(d.form.id===''){d.form.id=s.gid(5)}
                                                if(!d.d.filters)d.d.filters={};
                                                //save/modify or delete
                                                if(d.fff==='save'){
                                                    d.d.filters[d.form.id]=d.form;
                                                }else{
                                                    delete(d.d.filters[d.form.id]);
                                                }
                                                s.knexQuery({
                                                    action: "update",
                                                    table: "Users",
                                                    update: {
                                                        details: JSON.stringify(d.d)
                                                    },
                                                    where: [
                                                        ['ke','=',cn.ke],
                                                        ['uid','=',cn.uid],
                                                    ]
                                                },(err) => {
                                                    tx({f:'filters_change',uid:d.uid,ke:d.ke,filters:d.d.filters});
                                                })
                                            }
                                        })
                                    break;
                                }
                            break;
                            case'edit':
                                d.cnid = cn.id
                                s.accountSettingsEdit(d)
                            break;
                        }
                    break;
                    case'monitor':
                        switch(d.ff){
                            case'get':
                                switch(d.fff){
                                    case'videos&events':
                                        const videoSet = d.videoSet
                                        if(!d.eventLimit){
                                            d.eventLimit = 500
                                        }else{
                                            d.eventLimit = parseInt(d.eventLimit);
                                        }
                                        if(!d.eventStartDate&&d.startDate){
                                            d.eventStartDate = stringToSqlTime(d.startDate)
                                        }
                                        if(!d.eventEndDate&&d.endDate){
                                            d.eventEndDate = stringToSqlTime(d.endDate)
                                        }
                                        var monitorRestrictions = []
                                        var permissions = s.group[d.ke].users[cn.auth].details;
                                        if(!d.mid){
                                            if(permissions.sub && permissions.monitors && permissions.allmonitors !== '1'){
                                                try{
                                                    permissions.monitors = JSON.parse(permissions.monitors);
                                                    permissions.monitors.forEach(function(v,n){
                                                        if(n === 0){
                                                            monitorRestrictions.push(['mid','=',v])
                                                        }else{
                                                            monitorRestrictions.push(['or','mid','=',v])
                                                        }
                                                    })
                                                }catch(er){
                                                    console.log(er)
                                                }
                                            }
                                        }else if(!permissions.sub||permissions.allmonitors!=='0'||permissions.monitors.indexOf(d.mid)>-1){
                                            monitorRestrictions.push(['mid','=',d.mid])
                                        }
                                        var getEvents = function(callback){
                                            var eventWhereQuery = [
                                                ['ke','=',cn.ke],
                                            ]
                                            if(d.eventStartDate&&d.eventStartDate!==''){
                                                if(d.eventEndDate&&d.eventEndDate!==''){
                                                    eventWhereQuery.push(['time','>=',d.eventStartDate])
                                                    eventWhereQuery.push(['time','<=',d.eventEndDate])
                                                }else{
                                                    eventWhereQuery.push(['time','>=',d.eventStartDate])
                                                }
                                            }
                                            if(monitorRestrictions.length > 0){
                                                eventWhereQuery.push(monitorRestrictions)
                                            }
                                            s.knexQuery({
                                                action: "select",
                                                columns: "*",
                                                table: "Events",
                                                where: eventWhereQuery,
                                                orderBy: ['time','desc'],
                                                limit: d.eventLimit
                                            },(err,r) => {
                                                if(err){
                                                    console.error(err)
                                                    callback([])
                                                }else{
                                                    if(!r){r=[]}
                                                    r.forEach(function(v,n){
                                                        r[n].details=JSON.parse(v.details);
                                                    })
                                                    callback(r)
                                                }
                                            })
                                        }
                                        if(!d.videoLimit&&d.limit){
                                            d.videoLimit=d.limit
                                        }
                                        if(!d.videoStartDate&&d.startDate){
                                            d.videoStartDate = stringToSqlTime(d.startDate)
                                        }
                                        if(!d.videoEndDate&&d.endDate){
                                            d.videoEndDate = stringToSqlTime(d.endDate)
                                        }
					var getVideos = function(callback) {
					    var videoWhereQuery = [
					        ['ke','=',cn.ke],
					    ];

				    	// Add filtering logic here (startDate, endDate, etc.)
					if(d.videoStartDate || d.videoEndDate) {
				        if(!d.videoStartDateOperator || d.videoStartDateOperator == '') {
				            d.videoStartDateOperator = '>='
				        }
				        if(!d.videoEndDateOperator || d.videoEndDateOperator == '') {
				            d.videoEndDateOperator = '<='
				        }
				        switch(true) {
				            case(d.videoStartDate && d.videoStartDate !== '' && d.videoEndDate && d.videoEndDate !== ''):
				                videoWhereQuery.push(['time', d.videoStartDateOperator, d.videoStartDate])
				                videoWhereQuery.push(['end', d.videoEndDateOperator, d.videoEndDate])
				                break;
				            case(d.videoStartDate && d.videoStartDate !== ''):
				                videoWhereQuery.push(['time', d.videoStartDateOperator, d.videoStartDate])
				                break;
				            case(d.videoEndDate && d.videoEndDate !== ''):
				                videoWhereQuery.push(['end', d.videoEndDateOperator, d.videoEndDate])
				                break;
					        }
					    }
					    if(monitorRestrictions.length > 0) {
					        videoWhereQuery.push(monitorRestrictions)
					    }

					    // Implementing pagination
					    var pageSize = parseInt(d.pageSize) || 10; // Default page size
					    var currentPage = parseInt(d.currentPage) || 1; // Default to page 1
					    var offset = (currentPage - 1) * pageSize;

					    s.knexQuery({
					        action: "select",
					        columns: "*",
					        table: videoSet === 'cloud' ? `Cloud Videos` : "Videos",
					        where: videoWhereQuery,
					        orderBy: ['time','desc'],
					        limit: pageSize,  // Limiting the number of rows returned
					        offset: offset    // Skipping the previous pages' rows
					    },(err,r) => {
					        if(err) {
					            console.log(err)
					            setTimeout(function(){
					                callback({total:0, limit:pageSize, videos:[]})
					            },2000)
					        } else {
					            s.buildVideoLinks(r,{
					                videoParam: videoSet === 'cloud' ? `cloudVideos` : "videos",
					                auth: cn.auth
					            })
					            callback({total: r.length, limit: pageSize, videos: r})
					        }
					    })
					}
                                        getVideos(function(videos){
                                            getEvents(function(events){
                                                tx({
                                                    f: 'videos&events',
                                                    id: d.mid,
                                                    videos: videos,
                                                    events: events
                                                })
                                            })
                                        })
                                    break;
                                }
                            break;
                            case'jpeg_off':
                              delete(cn.jpeg_on);
                                if(cn.monitorsCurrentlyWatching){
                                  Object.keys(cn.monitorsCurrentlyWatching).forEach(function(n,v){
                                      v=cn.monitorsCurrentlyWatching[n];
                                      cn.join('MON_STREAM_'+n);
                                  });
                                }
                                tx({f:'mode_jpeg_off'})
                            break;
                            case'jpeg_on':
                              cn.jpeg_on=true;
                                if(cn.monitorsCurrentlyWatching){
                                  Object.keys(cn.monitorsCurrentlyWatching).forEach(function(n,v){
                                      v=cn.monitorsCurrentlyWatching[n];
                                      cn.leave('MON_STREAM_'+n);
                                  })
                                }
                              tx({f:'mode_jpeg_on'})
                            break;
                            case'watch_on':
                                if(!d.ke){d.ke=cn.ke}
                                s.initiateMonitorObject({mid:d.id,ke:d.ke});
                                if(!s.group[d.ke]||!s.group[d.ke].activeMonitors[d.id]||s.group[d.ke].activeMonitors[d.id].isStarted === false){return false}
                                cn.join('MON_'+d.ke+d.id);
                                cn.join('DETECTOR_'+d.ke+d.id);
                                if(cn.jpeg_on !== true){
                                    cn.join('MON_STREAM_'+d.ke+d.id);
                                }
                                tx({
                                    f: 'monitor_watch_on',
                                    id: d.id,
                                    ke: d.ke,
                                    subStreamChannel: s.group[d.ke].activeMonitors[d.id].subStreamChannel,
                                    warnings: s.group[d.ke].activeMonitors[d.id].warnings || []
                                })
                                s.camera('watch_on',d,cn)
                            break;
                            case'watch_off':
                                if(!d.ke){d.ke=cn.ke;};
                                cn.leave('MON_'+d.ke+d.id);
                                s.camera('watch_off',d,cn);
                                tx({f:'monitor_watch_off',ke:d.ke,id:d.id,cnid:cn.id})
                            break;
                            case'start':case'stop':
                                s.knexQuery({
                                    action: "select",
                                    columns: "*",
                                    table: "Monitors",
                                    where: [
                                        ['ke','=',cn.ke],
                                        ['mid','=',d.id],
                                    ],
                                    limit: 1
                                },(err,r) => {
                                    if(r && r[0]){
                                        r = r[0]
                                        s.camera(d.ff,{type:r.type,url:s.buildMonitorUrl(r),id:d.id,mode:d.ff,ke:cn.ke});
                                    }
                                })
                            break;
                        }
                    break;
                    default:
                        s.onOtherWebSocketMessagesExtensions.forEach(function(extender){
                            extender(d,cn,tx)
                        })
                    break;
                }
                if(d.callbackId && !d.hasResponded){
                    tx({
                        f:'callback',
                        callbackId: d.callbackId,
                        args: [d.callbackResponse]
                    })
                }
            }catch(er){
                s.systemLog('ERROR CATCH 1',er)
            }
            }else{
                cn.emit('f',{
                    ok: false,
                    msg: lang.NotAuthorizedText1
                });
            }
        });
        // super page socket functions
        cn.on('super',function(d){
            if(!cn.init&&d.f=='init'){
                d.ok=s.superAuth(d.auth ? { auth: d.auth } : {mail:d.mail,pass:d.pass},function(data){
                    cn.mail = data.$user.mail
                    cn.join('$');
                    var tempSessionKey = d.auth || s.gid(30)
                    cn.superSessionKey = tempSessionKey
                    s.superUsersApi[tempSessionKey] = data
                    s.superUsersApi[tempSessionKey].cnid = cn.id
                    cn.ip=cn.request.connection.remoteAddress
                    s.userLog({ke:'$',mid:'$USER'},{type:lang['Websocket Connected'],msg:{for:lang['Superuser'],id:cn.mail,ip:cn.ip}})
                    cn.init='super';
                    s.tx({f:'init_success',mail:cn.mail,superSessionKey:tempSessionKey},cn.id);
                })
                if(d.ok===false){
                    cn.disconnect();
                }
            }else if(cn.mail&&cn.init=='super'){
                switch(d.f){
                    case'logs':
                        switch(d.ff){
                            case'delete':
                                s.knexQuery({
                                    action: "delete",
                                    table: "Logs",
                                    where: {
                                        ke: d.ke,
                                    }
                                })
                            break;
                        }
                    break;
                    case'system':
                        switch(d.ff){
                            case'update':
                                s.ffmpegKill()
                                s.systemLog('Shinobi ordered to update',{
                                    by:cn.mail,
                                    ip:cn.ip
                                })
                                var updateProcess = spawn('sh',(s.mainDirectory+'/UPDATE.sh').split(' '),{detached: true})
                                updateProcess.stderr.on('data',function(data){
                                    s.systemLog('Update Info',data.toString())
                                })
                                updateProcess.stdout.on('data',function(data){
                                    s.systemLog('Update Info',data.toString())
                                })
                            break;
                            case'restart':
                                //config.webPaths.superApiPrefix+':auth/restart/:script'
                                d.check=function(x){return d.target.indexOf(x)>-1}
                                if(d.check('system')){
                                    s.systemLog('Shinobi ordered to restart',{by:cn.mail,ip:cn.ip})
                                    s.ffmpegKill()
                                    exec('pm2 restart '+s.mainDirectory+'/camera.js')
                                }
                                if(d.check('cron')){
                                    s.systemLog('Shinobi CRON ordered to restart',{by:cn.mail,ip:cn.ip})
                                    exec('pm2 restart '+s.mainDirectory+'/cron.js')
                                }
                                if(d.check('logs')){
                                    s.systemLog('Flush PM2 Logs',{by:cn.mail,ip:cn.ip})
                                    exec('pm2 flush')
                                }
                            break;
                            case'configure':
                                s.systemLog('conf.json Modified',{by:cn.mail,ip:cn.ip,old:jsonfile.readFileSync(s.location.config)})
                                jsonfile.writeFile(s.location.config,d.data,{spaces: 2},function(){
                                    s.tx({f:'save_configuration'},cn.id)
                                })
                            break;
                        }
                    break;
                }
            }
        })
        // admin page socket functions
        cn.on('a',function(d){
            if(!cn.init && d.f == 'init'){
                s.knexQuery({
                    action: "select",
                    columns: "*",
                    table: "Users",
                    where: [
                        ['auth','=',d.auth],
                        ['uid','=',d.uid],
                    ],
                    limit: 1
                },(err,r) => {
                    if(r && r[0]){
                        r = r[0];
                        if(!s.group[d.ke]){s.group[d.ke]={users:{}}}
                        if(!s.group[d.ke].users[d.auth]){s.group[d.ke].users[d.auth]={cnid:cn.id,uid:d.uid,ke:d.ke,auth:d.auth}}
                        try{s.group[d.ke].users[d.auth].details=JSON.parse(r.details)}catch(er){}
                        cn.join('ADM_'+d.ke);
                        cn.ke=d.ke;
                        cn.uid=d.uid;
                        cn.auth=d.auth;
                        cn.init='admin';
                    }else{
                        cn.disconnect()
                    }
                })
            }else{
                cn.disconnect()
            }
        })
        //functions for webcam recorder
        cn.on('r',function(d){
            if(!cn.ke&&d.f==='init'){
                s.knexQuery({
                    action: "select",
                    columns: "ke,uid,auth,mail,details",
                    table: "Users",
                    where: [
                        ['ke','=',d.ke],
                        ['auth','=',d.auth],
                        ['uid','=',d.uid],
                    ],
                    limit: 1
                },(err,r) => {
                    if(r && r[0]){
                        r = r[0]
                        cn.ke=d.ke,cn.uid=d.uid,cn.auth=d.auth;
                        if(!s.group[d.ke])s.group[d.ke]={};
                        if(!s.group[d.ke].users)s.group[d.ke].users={};
                        if(!s.group[d.ke].dashcamUsers)s.group[d.ke].dashcamUsers={};
                        s.group[d.ke].users[d.auth]={
                            cnid: cn.id,
                            ke : d.ke,
                            uid:r.uid,
                            mail:r.mail,
                            details:JSON.parse(r.details),
                            logged_in_at:s.timeObject(new Date).format(),
                            login_type:'Streamer'
                        }
                        s.group[d.ke].dashcamUsers[d.auth] = s.group[d.ke].users[d.auth]
                        if(s.group[d.ke].activeMonitors){
                            Object.keys(s.group[d.ke].activeMonitors).forEach(function(monitorId){
                                var dataToClient = {
                                    f : 'disable_stream',
                                    mid : monitorId,
                                    ke : d.ke
                                }
                                var mon = s.group[d.ke].activeMonitors[monitorId]
                                if(s.group[d.ke].rawMonitorConfigurations[monitorId].type === 'dashcam'){
                                    if(mon.allowStdinWrite === true){
                                        dataToClient.f = 'enable_stream'
                                    }
                                    s.tx(dataToClient,cn.id)
                                }
                            })
                        }
                    }
                })
            }else{
                if(s.group[d.ke] && s.group[d.ke].activeMonitors[d.mid]){
                    if(s.group[d.ke].activeMonitors[d.mid].allowStdinWrite === true){
                        switch(d.f){
                            case'monitor_b64':
                                console.log(d)
                            break;
                            case'monitor_chunk':
                                if(s.group[d.ke].activeMonitors[d.mid].isStarted !== true || !s.group[d.ke].activeMonitors[d.mid].spawn || !s.group[d.ke].activeMonitors[d.mid].spawn.stdin){
                                    s.tx({error:'Not Started'},cn.id);
                                    return false
                                };
                                s.group[d.ke].activeMonitors[d.mid].spawn.stdin.write(new Buffer(d.chunk, "binary"));
                            break;
                            case'monitor_frame':
                                if(s.group[d.ke].activeMonitors[d.mid].isStarted !== true){
                                    s.tx({error:'Not Started'},cn.id);
                                    return false
                                };
                                s.group[d.ke].activeMonitors[d.mid].spawn.stdin.write(d.frame);
                            break;
                        }
                    }else{
                        s.tx({error:'Cannot Write Yet'},cn.id)
                    }
                }else{
                    s.tx({error:'Non Existant Monitor'},cn.id)
                }
            }
        })
        cn.on('gps',(d) => {
            s.tx({
                f: 'gps',
                gps: d.data,
                mid: d.mid
            },`MON_STREAM_${cn.ke}${d.mid}`)
        })
        //embed functions
        cn.on('e', function (d) {
            tx=function(z){if(!z.ke){z.ke=cn.ke;};cn.emit('f',z);}
            switch(d.f){
                case'init':
                        if(!s.group[d.ke]||!s.group[d.ke].activeMonitors[d.id]||s.group[d.ke].activeMonitors[d.id].isStarted === false){return false}
                    s.auth({auth:d.auth,ke:d.ke,id:d.id,ip:cn.request.connection.remoteAddress},function(user){
                        cn.embedded=1;
                        cn.ke=d.ke;
                        if(!cn.mid){cn.mid={}}
                        cn.mid[d.id]={};
    //                    if(!s.group[d.ke].embed){s.group[d.ke].embed={}}
    //                    if(!s.group[d.ke].embed[d.mid]){s.group[d.ke].embed[d.mid]={}}
    //                    s.group[d.ke].embed[d.mid][cn.id]={}

                        s.camera('watch_on',d,cn,tx)
                        cn.join('MON_'+d.ke+d.id);
                        cn.join('MON_STREAM_'+d.ke+d.id);
                        cn.join('DETECTOR_'+d.ke+d.id);
                        cn.join('STR_'+d.ke);
                        if(s.group[d.ke]&&s.group[d.ke].activeMonitors[d.id]&&s.group[d.ke].activeMonitors[d.id].watch){

                            tx({f:'monitor_watch_on',id:d.id,ke:d.ke},'MON_'+d.ke+d.id)
                            s.tx({viewers:Object.keys(s.group[d.ke].activeMonitors[d.id].watch).length,ke:d.ke,id:d.id},'MON_'+d.ke+d.id)
                       }
                    });
                break;
            }
        })
         //functions for retrieving cron announcements
        cn.on('disconnect', function () {
            if(cn.socketVideoStream){
                cn.closeSocketVideoStream()
                return
            }
            if(cn.ke){
                if(cn.monitorsCurrentlyWatching){
                    cn.monitor_count=Object.keys(cn.monitorsCurrentlyWatching)
                    if(cn.monitor_count.length>0){
                        cn.monitor_count.forEach(function(v){
                            s.camera('watch_off',{id:v,ke:cn.monitorsCurrentlyWatching[v].ke},{id:cn.id,ke:cn.ke,uid:cn.uid})
                        })
                    }
                }else if(!cn.embedded){
                    if(s.group[cn.ke].users[cn.auth]){
                        s.tx({f:'user_status_change',ke:cn.ke,uid:cn.uid,status:0})
                        s.userLog({ke:cn.ke,mid:'$USER'},{type:lang['Websocket Disconnected'],msg:{mail:s.group[cn.ke].users[cn.auth].mail,id:cn.uid,ip:cn.ip}})
                        delete(s.group[cn.ke].users[cn.auth]);
                    }
                    if(s.group[cn.ke].dashcamUsers && s.group[cn.ke].dashcamUsers[cn.auth])delete(s.group[cn.ke].dashcamUsers[cn.auth]);
                }
            }
            if(cn.cron){
                delete(s.cron);
            }
            if(cn.superSessionKey){
                delete(s.superUsersApi[cn.superSessionKey])
            }
            s.onWebSocketDisconnectionExtensions.forEach(function(extender){
                extender(cn)
            })
            delete(s.clientSocketConnection[cn.id])
        })
        s.onWebSocketConnectionExtensions.forEach(function(extender){
            extender(cn,validatedAndBindAuthenticationToSocketConnection,createStreamEmitter)
        })
    });
}
