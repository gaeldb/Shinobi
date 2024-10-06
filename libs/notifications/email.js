var fs = require("fs")
const {
    template,
    checkEmail,
} = require("./emailUtils.js")
module.exports = function(s,config,lang,getSnapshot){
    const {
        getEventBasedRecordingUponCompletion,
    } = require('../events/utils.js')(s,config,lang)
    // mailing with nodemailer
    try{
        if(config.mail){
            if(config.mail.from === undefined){config.mail.from = '"ShinobiCCTV" <no-reply@shinobi.video>'}
            s.nodemailer = require('nodemailer').createTransport(config.mail);
        }
        const sendMessage = (...args) => {
            return s.nodemailer.sendMail(...args)
        }
        const onDetectorNoTriggerTimeoutForEmail = function(e){
            //e = monitor object
            if(config.mail && e.details.detector_notrigger_mail === '1'){
                s.knexQuery({
                    action: "select",
                    columns: "mail",
                    table: "Users",
                    where: [
                        ['ke','=',e.ke],
                        ['details','NOT LIKE','%"sub"%'],
                    ]
                },(err,r) => {
                    r = r[0]
                    var mailOptions = {
                        from: config.mail.from, // sender address
                        to: checkEmail(r.mail), // list of receivers
                        subject: lang.NoMotionEmailText1+' '+e.name+' ('+e.id+')', // Subject line
                        html: '<i>'+lang.NoMotionEmailText2+' ' + (e.details.detector_notrigger_timeout || 10) + ' '+lang.minutes+'.</i>',
                    }
                    mailOptions.html+='<div><b>'+lang['Monitor Name']+' </b> : '+e.name+'</div>'
                    mailOptions.html+='<div><b>'+lang['Monitor ID']+' </b> : '+e.id+'</div>'
                    sendMessage(mailOptions, (error, info) => {
                        if (error) {
                            s.systemLog('detector:notrigger:sendMail',error)
                            s.tx({f:'error',ff:'detector_notrigger_mail',id:e.id,ke:e.ke,error:error},'GRP_'+e.ke);
                            return ;
                        }
                        s.tx({f:'detector_notrigger_mail',id:e.id,ke:e.ke,info:info},'GRP_'+e.ke);
                    })
                })
            }
        }
        const onTwoFactorAuthCodeNotificationForEmail = function(r){
            // r = user object
            if(r.details.factor_mail !== '0'){
                sendMessage({
                    from: config.mail.from,
                    to: checkEmail(r.mail),
                    subject: r.lang['2-Factor Authentication'],
                    html: r.lang['Enter this code to proceed']+' <b>'+s.factorAuth[r.ke][r.uid].key+'</b>. '+r.lang.FactorAuthText1,
                }, (error, info) => {
                    if (error) {
                        s.systemLog(r.lang.MailError,error)
                        return
                    }
                })
            }
        }
        const onFilterEventForEmail = function(x,d){
            // x = filter function
            // d = filter event object
            if(x === 'email'){
                if(d.videos && d.videos.length > 0){
                    d.mailOptions = {
                        from: config.mail.from, // sender address
                        to: checkEmail(d.mail),
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
                    sendMessage(d.mailOptions, (error, info) => {
                        if (error) {
                            s.tx({f:'error',ff:'filter_mail',ke:d.ke,error:error},'GRP_'+d.ke);
                            return ;
                        }
                        s.tx({f:'filter_mail',ke:d.ke,info:info},'GRP_'+d.ke);
                    })
                }
            }
        }
        const onEventTriggerBeforeFilterForEmail = function(d,filter){
            filter.mail = false
        }
        const onEventTriggerForEmail = async (d,filter) => {
            const monitorConfig = s.group[d.ke].rawMonitorConfigurations[d.id]
            if((filter.mail || monitorConfig.details.detector_mail === '1') && config.mail && !s.group[d.ke].activeMonitors[d.id].detector_mail){
                s.knexQuery({
                    action: "select",
                    columns: "mail",
                    table: "Users",
                    where: [
                        ['ke','=',d.ke],
                        ['details','NOT LIKE','%"sub"%'],
                    ]
                },async (err,r) => {
                    r = r[0];
                    var detector_mail_timeout
                    if(!monitorConfig.details.detector_mail_timeout||monitorConfig.details.detector_mail_timeout===''){
                        detector_mail_timeout = 1000 * 60 * 10;
                    }else{
                        detector_mail_timeout = parseFloat(monitorConfig.details.detector_mail_timeout) * 1000 * 60;
                    }
                    s.group[d.ke].activeMonitors[d.id].detector_mail = setTimeout(function(){
                        s.group[d.ke].activeMonitors[d.id].detector_mail = null
                    },detector_mail_timeout);
                    const sendMail = function(files){
                        const infoRows = []
                        Object.keys(d.details).forEach(function(key){
                            var value = d.details[key]
                            var text = value
                            if(value instanceof Object){
                                text = JSON.stringify(value,null,3)
                            }
                            infoRows.push(template.createRow({
                                title: key,
                                text: text
                            }))
                        })
                        sendMessage({
                            from: config.mail.from,
                            to: checkEmail(r.mail),
                            subject: lang.Event+' - '+d.screenshotName,
                            html: template.createFramework({
                                title: lang.EventText1 + ' ' + d.currentTimestamp,
                                subtitle: 'Shinobi Event',
                                body: infoRows.join(''),
                            }),
                            attachments: files || []
                        }, (error, info) => {
                            if (error) {
                                s.systemLog(lang.MailError,error)
                                return false;
                            }
                        })
                    }
                    await getSnapshot(d,monitorConfig)
                    sendMail([
                        {
                            filename: d.screenshotName + '.jpg',
                            content: d.screenshotBuffer
                        }
                    ])
                    if(monitorConfig.details.detector_mail_send_video === '1'){
                        let videoPath = null
                        let videoName = null
                        const eventBasedRecording = await getEventBasedRecordingUponCompletion({
                            ke: d.ke,
                            mid: d.mid
                        })
                        if(eventBasedRecording.filePath){
                            videoPath = eventBasedRecording.filePath
                            videoName = eventBasedRecording.filename
                        }else{
                            const siftedVideoFileFromRam = await s.mergeDetectorBufferChunks(d)
                            videoPath = siftedVideoFileFromRam.filePath
                            videoName = siftedVideoFileFromRam.filename
                        }
                        if(videoPath){
                            fs.readFile(mergedFilepath,function(err,buffer){
                                if(buffer){
                                    sendMessage({
                                        from: config.mail.from,
                                        to: checkEmail(r.mail),
                                        subject: videoName,
                                        html: '',
                                        attachments: [
                                            {
                                                filename: videoName,
                                                content: buffer
                                            }
                                        ]
                                    }, (error, info) => {
                                        if (error) {
                                            s.systemLog(lang.MailError,error)
                                            return false;
                                        }
                                    })
                                }
                            })
                        }
                    }
                })
            }
        }
        const onMonitorUnexpectedExitForEmail = (monitorConfig) => {
            if(monitorConfig.details.notify_email === '1' && monitorConfig.details.notify_onUnexpectedExit === '1'){
                const ffmpegCommand = s.group[monitorConfig.ke].activeMonitors[monitorConfig.mid].ffmpeg
                const description = ffmpegCommand
                const subject = lang['Process Unexpected Exit'] + ' : ' + monitorConfig.name
                const currentTime = new Date()
                s.knexQuery({
                    action: "select",
                    columns: "mail",
                    table: "Users",
                    where: [
                        ['ke','=',monitorConfig.ke],
                        ['details','NOT LIKE','%"sub"%'],
                    ]
                },(err,r) => {
                    r = r[0]
                    sendMessage({
                        from: config.mail.from,
                        to: checkEmail(r.mail),
                        subject: subject,
                        html: template.createFramework({
                            title: subject,
                            subtitle: lang['Process Crashed for Monitor'],
                            body: description,
                            footerText: currentTime
                        }),
                        attachments: []
                    }, (error, info) => {
                        if (error) {
                            s.systemLog(lang.MailError,error)
                            return false;
                        }
                    })
                })
            }
        }
        s.onTwoFactorAuthCodeNotification(onTwoFactorAuthCodeNotificationForEmail)
        s.onEventTriggerBeforeFilter(onEventTriggerBeforeFilterForEmail)
        s.onEventTrigger(onEventTriggerForEmail)
        s.onFilterEvent(onFilterEventForEmail)
        s.onDetectorNoTriggerTimeout(onDetectorNoTriggerTimeoutForEmail)
        s.onMonitorUnexpectedExit(onMonitorUnexpectedExitForEmail)
        s.definitions['Account Settings'].blocks['2-Factor Authentication'].info.push(                   {
           "name": "detail=factor_mail",
           "field": `${lang.Email} (${lang['System Level']})`,
           "description": "Send 2-Factor Authentication codes to the email address of the account.",
           "default": "1",
           "example": "",
           "fieldType": "select",
           "possible": [
              {
                 "name": lang.No,
                 "value": "0"
              },
              {
                 "name": lang.Yes,
                 "value": "1"
              }
           ]
        });
        s.definitions["Event Filters"].blocks["Action for Selected"].info.push(                    {
          "name": "actions=mail",
          "field": `${lang['Email on Trigger']} (${lang['System Level']})`,
          "fieldType": "select",
          "form-group-class": "actions-row",
          "default": "",
          "example": "1",
          "possible": [
             {
                "name": lang['Original Choice'],
                "value": "",
                "selected": true
             },
             {
                "name": lang.Yes,
                "value": "1",
             }
          ]
        })
        s.definitions['Monitor Settings'].blocks['Notifications'].info[0].info.push(
            {
              "name": "detail=notify_email",
              "field": `${lang.Email} (${lang['System Level']})`,
              "default": "0",
              "fieldType": "select",
              "possible": [
                 {
                    "name": lang.No,
                    "value": "0"
                 },
                 {
                    "name": lang.Yes,
                    "value": "1"
                 }
              ]
           },
        )
        s.definitions['Monitor Settings'].blocks['Notifications'].info.push(
            {
                isFormGroupGroup: true,
                name: `${lang.Email} (${lang['System Level']})`,
                color: 'blue',
                'section-class': 'h_det_input h_det_1',
                info: [
                    {
                       "name": "detail=detector_mail",
                       "field": lang['Email on Trigger'],
                       "description": "Recieve an email of an image during a motion event to the master account for the camera group. You must setup SMTP details in conf.json.",
                       "default": "0",
                       "selector": "h_det_email",
                       "fieldType": "select",
                       "possible": [
                          {
                             "name": lang.No,
                             "value": "0"
                          },
                          {
                             "name": lang.Yes,
                             "value": "1"
                          }
                       ]
                    },
                    {
                       "name": "detail=detector_mail_timeout",
                       "field": lang['Allow Next Email'],
                       "description": "The amount of time until a trigger is allowed to send another email with motion details and another image.",
                       "default": "10",
                    },
                    {
                       "name": "detail=detector_notrigger_mail",
                       "field": lang['No Trigger'],
                       "description": "If motion has not been detected after the timeout period you will recieve an email.",
                       "default": "0",
                       "fieldType": "select",
                       "possible": [
                          {
                             "name": lang.No,
                             "value": "0"
                          },
                          {
                             "name": lang.Yes,
                             "value": "1"
                          }
                       ]
                    },
                ],
            }
        );
    }catch(err){
        console.log(err)
    }
}
