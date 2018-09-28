var moment = require('moment');
var execSync = require('child_process').execSync;
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var request = require('request');
module.exports = function(s,config,lang){
    s.filterEvents=function(x,d){
        switch(x){
            case'archive':
                d.videos.forEach(function(v,n){
                    s.video('archive',v)
                })
            break;
            case'email':
                if(d.videos&&d.videos.length>0){
                    d.videos.forEach(function(v,n){

                    })
                    d.mailOptions = {
                        from: config.mail.from, // sender address
                        to: d.mail, // list of receivers
                        subject: lang['Filter Matches']+' : '+d.name, // Subject line
                        html: lang.FilterMatchesText1+' '+d.videos.length+' '+lang.FilterMatchesText2,
                    };
                    if(d.execute&&d.execute!==''){
                        d.mailOptions.html+='<div><b>'+lang.Executed+' :</b> '+d.execute+'</div>'
                    }
                    if(d.delete==='1'){
                        d.mailOptions.html+='<div><b>'+lang.Deleted+' :</b> '+lang.Yes+'</div>'
                    }
                    d.mailOptions.html+='<div><b>'+lang.Query+' :</b> '+d.query+'</div>'
                    d.mailOptions.html+='<div><b>'+lang['Filter ID']+' :</b> '+d.id+'</div>'
                    nodemailer.sendMail(d.mailOptions, (error, info) => {
                        if (error) {
                            s.tx({f:'error',ff:'filter_mail',ke:d.ke,error:error},'GRP_'+d.ke);
                            return ;
                        }
                        s.tx({f:'filter_mail',ke:d.ke,info:info},'GRP_'+d.ke);
                    });
                }
            break;
            case'delete':
                d.videos.forEach(function(v,n){
                    s.video('delete',v)
                })
            break;
            case'execute':
                exec(d.execute,{detached: true})
            break;
        }
    }
    s.event = function(x,e,cn){
        switch(x){
            case'trigger':
                var d = e;
                var filter = {
                    halt : false,
                    addToMotionCounter : true,
                    useLock : true,
                    save : true,
                    discord : true,
                    webhook : true,
                    command : true,
                    mail : true,
                    record : true,
                    indifference : false
                }
                if(s.group[d.ke].mon[d.id].open){
                    d.details.videoTime = s.group[d.ke].mon[d.id].open;
                }
                var detailString = JSON.stringify(d.details);
                if(!s.group[d.ke]||!s.group[d.ke].mon[d.id]){
                    return s.systemLog(lang['No Monitor Found, Ignoring Request'])
                }
                d.mon=s.group[d.ke].mon_conf[d.id];
                var currentConfig = s.group[d.ke].mon[d.id].details
                //read filters
                if(
                    currentConfig.use_detector_filters === '1' &&
                    ((currentConfig.use_detector_filters_object === '1' && d.details.matrices) ||
                    currentConfig.use_detector_filters_object !== '1')
                ){
                    var parseValue = function(key,val){
                        var newVal
                        switch(val){
                            case'':
                                newVal = filter[key]
                            break;
                            case'0':
                                newVal = false
                            break;
                            case'1':
                                newVal = true
                            break;
                            default:
                                newVal = val
                            break;
                        }
                        return newVal
                    }
                    var filters = currentConfig.detector_filters
                    Object.keys(filters).forEach(function(key){
                        var conditionChain = {}
                        var dFilter = filters[key]
                        dFilter.where.forEach(function(condition,place){
                            conditionChain[place] = {ok:false,next:condition.p4,matrixCount:0}
                            if(d.details.matrices)conditionChain[place].matrixCount = d.details.matrices.length
                            var modifyFilters = function(toCheck,matrixPosition){
                                var param = toCheck[condition.p1]
                                var pass = function(){
                                    if(matrixPosition && dFilter.actions.halt === '1'){
                                        delete(d.details.matrices[matrixPosition])
                                    }else{
                                        conditionChain[place].ok = true
                                    }
                                }
                                switch(condition.p2){
                                    case'indexOf':
                                        if(param.indexOf(condition.p3) > -1){
                                            pass()
                                        }
                                    break;
                                    case'!indexOf':
                                        if(param.indexOf(condition.p3) === -1){
                                            pass()
                                        }
                                    break;
                                    default:
                                        if(eval('param '+condition.p2+' "'+condition.p3.replace(/"/g,'\\"')+'"')){
                                            pass()
                                        }
                                    break;
                                }
                            }
                            switch(condition.p1){
                                case'tag':
                                case'x':
                                case'y':
                                case'height':
                                case'width':
                                    if(d.details.matrices){
                                        d.details.matrices.forEach(function(matrix,position){
                                            modifyFilters(matrix,position)
                                        })
                                    }
                                break;
                                case'time':
                                    var timeNow = new Date()
                                    var timeCondition = new Date()
                                    var doAtTime = condition.p3.split(':')
                                    var atHour = parseInt(doAtTime[0]) - 1
                                    var atHourNow = timeNow.getHours()
                                    var atMinuteNow = timeNow.getMinutes()
                                    var atSecondNow = timeNow.getSeconds()
                                    if(atHour){
                                        var atMinute = parseInt(doAtTime[1]) - 1 || timeNow.getMinutes()
                                        var atSecond = parseInt(doAtTime[2]) - 1 || timeNow.getSeconds()
                                        var nowAddedInSeconds = atHourNow * 60 * 60 + atMinuteNow * 60 + atSecondNow
                                        var conditionAddedInSeconds = atHour * 60 * 60 + atMinute * 60 + atSecond
                                        if(eval('nowAddedInSeconds '+condition.p2+' conditionAddedInSeconds')){
                                            conditionChain[place].ok = true
                                        }
                                    }
                                break;
                                default:
                                    modifyFilters(d.details)
                                break;
                            }
                        })
                        var conditionArray = Object.values(conditionChain)
                        var validationString = ''
                        conditionArray.forEach(function(condition,number){
                            validationString += condition.ok+' '
                            if(conditionArray.length-1 !== number){
                                validationString += condition.next+' '
                            }
                        })
                        if(eval(validationString)){
                            if(dFilter.actions.halt !== '1'){
                                delete(dFilter.actions.halt)
                                Object.keys(dFilter.actions).forEach(function(key){
                                    var value = dFilter.actions[key]
                                    filter[key] = parseValue(key,value)
                                })
                            }else{
                                filter.halt = true
                            }
                        }
                    })
                    if(d.details.matrices && d.details.matrices.length === 0 || filter.halt === true){
                        return
                    }else if(d.details.matrices && d.details.matrices.length > 0){
                        var reviewedMatrix = []
                        d.details.matrices.forEach(function(matrix){
                            if(matrix)reviewedMatrix.push(matrix)
                        })
                        d.details.matrices = reviewedMatrix
                    }
                }
                //motion counter
                if(filter.addToMotionCounter && filter.record){
                    if(!s.group[d.ke].mon[d.id].detector_motion_count){
                        s.group[d.ke].mon[d.id].detector_motion_count=0
                    }
                    s.group[d.ke].mon[d.id].detector_motion_count+=1
                }
                if(filter.useLock){
                    if(s.group[d.ke].mon[d.id].motion_lock){
                        return
                    }
                    var detector_lock_timeout
                    if(!currentConfig.detector_lock_timeout||currentConfig.detector_lock_timeout===''){
                        detector_lock_timeout = 2000
                    }
                    detector_lock_timeout = parseFloat(currentConfig.detector_lock_timeout);
                    if(!s.group[d.ke].mon[d.id].detector_lock_timeout){
                        s.group[d.ke].mon[d.id].detector_lock_timeout=setTimeout(function(){
                            clearTimeout(s.group[d.ke].mon[d.id].detector_lock_timeout)
                            delete(s.group[d.ke].mon[d.id].detector_lock_timeout)
                        },detector_lock_timeout)
                    }else{
                        return
                    }
                }
                // check modified indifference
                if(filter.indifference !== false && d.details.confidence < parseFloat(filter.indifference)){
                    // fails indifference check for modified indifference
                    return
                }
                //
                if(d.doObjectDetection === true){
                    s.ocvTx({
                        f : 'frame',
                        mon : s.group[e.ke].mon_conf[e.id].details,
                        ke : e.ke,
                        id : e.id,
                        time : s.formattedTime(),
                        frame : s.group[e.ke].mon[e.id].lastJpegDetectorFrame
                    })
                }else{
                    //save this detection result in SQL, only coords. not image.
                    if(filter.save && currentConfig.detector_save==='1'){
                        s.sqlQuery('INSERT INTO Events (ke,mid,details) VALUES (?,?,?)',[d.ke,d.id,detailString])
                    }
                    if(currentConfig.detector_notrigger=='1'){
                        var detector_notrigger_timeout
                        if(!currentConfig.detector_notrigger_timeout||currentConfig.detector_notrigger_timeout===''){
                            detector_notrigger_timeout = 10
                        }
                        detector_notrigger_timeout = parseFloat(currentConfig.detector_notrigger_timeout)*1000*60;
                        s.group[e.ke].mon[e.id].detector_notrigger_timeout = detector_notrigger_timeout;
                        clearInterval(s.group[d.ke].mon[d.id].detector_notrigger_timeout)
                        s.group[d.ke].mon[d.id].detector_notrigger_timeout = setInterval(s.group[d.ke].mon[d.id].detector_notrigger_timeout_function,detector_notrigger_timeout)
                    }
                    if(filter.webhook && currentConfig.detector_webhook=='1'){
                        var detector_webhook_url = currentConfig.detector_webhook_url
                            .replace(/{{TIME}}/g,s.timeObject(new Date).format())
                            .replace(/{{REGION_NAME}}/g,d.details.name)
                            .replace(/{{SNAP_PATH}}/g,s.dir.streams+'/'+d.ke+'/'+d.id+'/s.jpg')
                            .replace(/{{MONITOR_ID}}/g,d.id)
                            .replace(/{{GROUP_KEY}}/g,d.ke)
                            .replace(/{{DETAILS}}/g,detailString)
                            if(d.details.confidence){
                                detector_webhook_url = detector_webhook_url
                                .replace(/{{CONFIDENCE}}/g,d.details.confidence)
                            }

                        request({url:detector_webhook_url,method:'GET',encoding:null},function(err,data){
                            if(err){
                                s.log(d,{type:lang["Event Webhook Error"],msg:{error:err,data:data}})
                            }
                        })
                    }
                    var detector_timeout
                    if(!currentConfig.detector_timeout||currentConfig.detector_timeout===''){
                        detector_timeout = 10
                    }else{
                        detector_timeout = parseFloat(currentConfig.detector_timeout)
                    }
                    if(filter.record && d.mon.mode=='start'&&currentConfig.detector_trigger==='1'&&currentConfig.detector_record_method==='sip'){
                        //s.group[d.ke].mon[d.id].eventBasedRecording.timeout
        //                clearTimeout(s.group[d.ke].mon[d.id].eventBasedRecording.timeout)
                        s.group[d.ke].mon[d.id].eventBasedRecording.timeout = setTimeout(function(){
                            s.group[d.ke].mon[d.id].eventBasedRecording.allowEnd=true;
                        },detector_timeout * 950 * 60)
                        if(!s.group[d.ke].mon[d.id].eventBasedRecording.process){
                            if(!d.auth){
                                d.auth=s.gid();
                            }
                            if(!s.group[d.ke].users[d.auth]){
                                s.group[d.ke].users[d.auth]={system:1,details:{},lang:lang}
                            }
                            s.group[d.ke].mon[d.id].eventBasedRecording.allowEnd = false;
                            var runRecord = function(){
                                var filename = s.formattedTime()+'.mp4'
                                s.log(d,{type:"Traditional Recording",msg:"Started"})
                                //-t 00:'+s.timeObject(new Date(detector_timeout * 1000 * 60)).format('mm:ss')+'
                                s.group[d.ke].mon[d.id].eventBasedRecording.process = spawn(config.ffmpegDir,s.splitForFFPMEG(('-loglevel warning -analyzeduration 1000000 -probesize 1000000 -re -i http://'+config.ip+':'+config.port+'/'+d.auth+'/hls/'+d.ke+'/'+d.id+'/detectorStream.m3u8 -t 00:'+s.timeObject(new Date(detector_timeout * 1000 * 60)).format('mm:ss')+' -c:v copy -strftime 1 "'+s.video('getDir',d.mon) + filename + '"').replace(/\s+/g,' ').trim()))
                                var ffmpegError='';
                                var error
                                s.group[d.ke].mon[d.id].eventBasedRecording.process.stderr.on('data',function(data){
                                    s.log(d,{type:"Traditional Recording",msg:data.toString()})
                                })
                                s.group[d.ke].mon[d.id].eventBasedRecording.process.on('close',function(){
                                    if(!s.group[d.ke].mon[d.id].eventBasedRecording.allowEnd){
                                        s.log(d,{type:"Traditional Recording",msg:"Detector Recording Process Exited Prematurely. Restarting."})
                                        runRecord()
                                        return
                                    }
                                    s.video('insertCompleted',d.mon,{
                                        file : filename
                                    })
                                    s.log(d,{type:"Traditional Recording",msg:"Detector Recording Complete"})
                                    delete(s.group[d.ke].users[d.auth])
                                    s.log(d,{type:"Traditional Recording",msg:'Clear Recorder Process'})
                                    delete(s.group[d.ke].mon[d.id].eventBasedRecording.process)
                                    delete(s.group[d.ke].mon[d.id].eventBasedRecording.timeout)
                                    clearTimeout(s.group[d.ke].mon[d.id].checker)
                                })
                            }
                            runRecord()
                        }
                    }else if(filter.record && d.mon.mode!=='stop'&&currentConfig.detector_trigger=='1'&&currentConfig.detector_record_method==='hot'){
                        if(!d.auth){
                            d.auth=s.gid();
                        }
                        if(!s.group[d.ke].users[d.auth]){
                            s.group[d.ke].users[d.auth]={system:1,details:{},lang:lang}
                        }
                        d.urlQuery=[]
                        d.url='http://'+config.ip+':'+config.port+'/'+d.auth+'/monitor/'+d.ke+'/'+d.id+'/record/'+detector_timeout+'/min';
                        if(currentConfig.watchdog_reset!=='0'){
                            d.urlQuery.push('reset=1')
                        }
                        if(currentConfig.detector_trigger_record_fps&&currentConfig.detector_trigger_record_fps!==''&&currentConfig.detector_trigger_record_fps!=='0'){
                            d.urlQuery.push('fps='+currentConfig.detector_trigger_record_fps)
                        }
                        if(d.urlQuery.length>0){
                            d.url+='?'+d.urlQuery.join('&')
                        }
                        http.get(d.url, function(data) {
                            data.setEncoding('utf8');
                            var chunks='';
                            data.on('data', (chunk) => {
                                chunks+=chunk;
                            });
                            data.on('end', () => {
                                delete(s.group[d.ke].users[d.auth])
                                d.cx.f='detector_record_engaged';
                                d.cx.msg=JSON.parse(chunks);
                                s.tx(d.cx,'GRP_'+d.ke);
                            });

                        }).on('error', function(e) {

                        }).end();
                    }
                    var currentTime = new Date()
                    var currentTimestamp = s.timeObject(currentTime).format()
                    var screenshotName = 'Motion_'+(d.mon.name.replace(/[^\w\s]/gi,''))+'_'+d.id+'_'+d.ke+'_'+s.formattedTime()
                    var screenshotBuffer = null

                    //discord bot
                    if(filter.discord && currentConfig.detector_discordbot === '1' && !s.group[d.ke].mon[d.id].detector_discordbot){
                        var detector_discordbot_timeout
                        if(!currentConfig.detector_discordbot_timeout||currentConfig.detector_discordbot_timeout===''){
                            detector_discordbot_timeout = 1000*60*10;
                        }else{
                            detector_discordbot_timeout = parseFloat(currentConfig.detector_discordbot_timeout)*1000*60;
                        }
                        //lock mailer so you don't get emailed on EVERY trigger event.
                        s.group[d.ke].mon[d.id].detector_discordbot=setTimeout(function(){
                            //unlock so you can mail again.
                            clearTimeout(s.group[d.ke].mon[d.id].detector_discordbot);
                            delete(s.group[d.ke].mon[d.id].detector_discordbot);
                        },detector_discordbot_timeout);
                        var files = []
                        var sendAlert = function(){
                            s.discordMsg({
                                author: {
                                  name: s.group[d.ke].mon_conf[d.id].name,
                                  icon_url: config.iconURL
                                },
                                title: lang.Event+' - '+screenshotName,
                                description: lang.EventText1+' '+currentTimestamp,
                                fields: [],
                                timestamp: currentTime,
                                footer: {
                                  icon_url: config.iconURL,
                                  text: "Shinobi Systems"
                                }
                            },files,d.ke)
                        }
                        if(currentConfig.detector_discordbot_send_video === '1'){
                            s.mergeDetectorBufferChunks(d,function(mergedFilepath,filename){
                                s.discordMsg({
                                    author: {
                                      name: s.group[d.ke].mon_conf[d.id].name,
                                      icon_url: config.iconURL
                                    },
                                    title: filename,
                                    fields: [],
                                    timestamp: currentTime,
                                    footer: {
                                      icon_url: config.iconURL,
                                      text: "Shinobi Systems"
                                    }
                                },[
                                    {
                                        attachment: mergedFilepath,
                                        name: filename
                                    }
                                ],d.ke)
                            })
                        }
                        s.getRawSnapshotFromMonitor(e.mon,function(data){
                            if((data[data.length-2] === 0xFF && data[data.length-1] === 0xD9)){
                                screenshotBuffer = data
                                files.push({
                                    attachment: screenshotBuffer,
                                    name: screenshotName+'.jpg'
                                })
                            }
                            sendAlert()
                        })
                    }
                    //mailer
                    if(filter.mail && config.mail && !s.group[d.ke].mon[d.id].detector_mail && currentConfig.detector_mail === '1'){
                        s.sqlQuery('SELECT mail FROM Users WHERE ke=? AND details NOT LIKE ?',[d.ke,'%"sub"%'],function(err,r){
                            r=r[0];
                            var detector_mail_timeout
                            if(!currentConfig.detector_mail_timeout||currentConfig.detector_mail_timeout===''){
                                detector_mail_timeout = 1000*60*10;
                            }else{
                                detector_mail_timeout = parseFloat(currentConfig.detector_mail_timeout)*1000*60;
                            }
                            //lock mailer so you don't get emailed on EVERY trigger event.
                            s.group[d.ke].mon[d.id].detector_mail=setTimeout(function(){
                                //unlock so you can mail again.
                                clearTimeout(s.group[d.ke].mon[d.id].detector_mail);
                                delete(s.group[d.ke].mon[d.id].detector_mail);
                            },detector_mail_timeout);
                            var files = []
                            var mailOptions = {
                                from: config.mail.from, // sender address
                                to: r.mail, // list of receivers
                                subject: lang.Event+' - '+screenshotName, // Subject line
                                html: '<i>'+lang.EventText1+' '+currentTimestamp+'.</i>',
                                attachments: files
                            }
                            var sendMail = function(){
                                Object.keys(d.details).forEach(function(v,n){
                                    mailOptions.html+='<div><b>'+v+'</b> : '+d.details[v]+'</div>'
                                })
                                s.nodemailer.sendMail(mailOptions, (error, info) => {
                                    if (error) {
                                        s.systemLog(lang.MailError,error)
                                        return false;
                                    }
                                })
                            }
                            if(currentConfig.detector_mail_send_video === '1'){
                                s.mergeDetectorBufferChunks(d,function(mergedFilepath,filename){
                                    s.nodemailer.sendMail({
                                        from: config.mail.from,
                                        to: r.mail,
                                        subject: filename,
                                        html: '',
                                        attachments: [
                                            {
                                                filename: filename,
                                                content: fs.readFileSync(mergedFilepath)
                                            }
                                        ]
                                    }, (error, info) => {
                                        if (error) {
                                            s.systemLog(lang.MailError,error)
                                            return false;
                                        }
                                    })
                                })
                            }
                            if(screenshotBuffer){
                                files.push({
                                    filename: screenshotName+'.jpg',
                                    content: screenshotBuffer
                                })
                                sendMail()
                            }else{
                                s.getRawSnapshotFromMonitor(e.mon,function(data){
                                    screenshotBuffer = data
                                    files.push({
                                        filename: screenshotName+'.jpg',
                                        content: data
                                    })
                                    sendMail()
                                })
                            }
                        });
                    }
                    if(filter.command && currentConfig.detector_command_enable==='1'&&!s.group[d.ke].mon[d.id].detector_command){
                        var detector_command_timeout
                        if(!currentConfig.detector_command_timeout||currentConfig.detector_command_timeout===''){
                            detector_command_timeout = 1000*60*10;
                        }else{
                            detector_command_timeout = parseFloat(currentConfig.detector_command_timeout)*1000*60;
                        }
                        s.group[d.ke].mon[d.id].detector_command=setTimeout(function(){
                            clearTimeout(s.group[d.ke].mon[d.id].detector_command);
                            delete(s.group[d.ke].mon[d.id].detector_command);

                        },detector_command_timeout);
                        var detector_command = currentConfig.detector_command
                            .replace(/{{TIME}}/g,currentTimestamp)
                            .replace(/{{REGION_NAME}}/g,d.details.name)
                            .replace(/{{SNAP_PATH}}/g,s.dir.streams+'/'+d.ke+'/'+d.id+'/s.jpg')
                            .replace(/{{MONITOR_ID}}/g,d.id)
                            .replace(/{{GROUP_KEY}}/g,d.ke)
                            .replace(/{{DETAILS}}/g,detailString)
                            if(d.details.confidence){
                                detector_command = detector_command
                                .replace(/{{CONFIDENCE}}/g,d.details.confidence)
                            }
                        exec(detector_command,{detached: true})
                    }
                }
                //show client machines the event
                d.cx={f:'detector_trigger',id:d.id,ke:d.ke,details:d.details,doObjectDetection:d.doObjectDetection};
                s.tx(d.cx,'DETECTOR_'+d.ke+d.id);
            break;
        }
        if(typeof cn==='function'){setTimeout(function(){cn()},1000);}
    }
}
