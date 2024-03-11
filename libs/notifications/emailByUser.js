var fs = require('fs');
const {
    template,
    checkEmail,
} = require("./emailUtils.js")
module.exports = function (s, config, lang, getSnapshot) {
    const { getEventBasedRecordingUponCompletion } = require('../events/utils.js')(s, config, lang);
    const nodeMailer = require('nodemailer');
    try {
        const sendMessage = async function (sendBody, files, groupKey) {
            const transporter = s.group[groupKey].emailClient;
            if (!transporter) {
                s.userLog(
                    { ke: groupKey, mid: '$USER' },
                    {
                        type: lang.NotifyErrorText,
                        msg: {
                            msg: lang.AppNotEnabledText,
                            app: lang.Email
                        },
                    }
                );
                return;
            }
            try {
                const emailClientOptions = s.group[groupKey].emailClientOptions;
                const appOptions = emailClientOptions.transport;
                const sendTo = emailClientOptions.sendTo;
                sendTo.forEach((reciepientAddress) => {
                    const sendData = {
                        from: `"${config.mailFromName || 'shinobi.video'}" <${appOptions.auth.user}>`,
                        to: reciepientAddress,
                        subject: sendBody.subject,
                        html: sendBody.html,
                        attachments: files || []
                    };
                    transporter.sendMail(sendData, function (err, result) {
                        if (err) {
                            throw err;
                        }
                        s.userLog(result);
                        s.debugLog(result);
                    });
                })
            } catch (err) {
                s.debugLog(err)
                s.userLog(
                    { ke: groupKey, mid: '$USER' },
                    { type: lang.NotifyErrorText, msg: err }
                );
            }
        };

        const loadAppForUser = function (user) {
            const userDetails = s.parseJSON(user.details);
            const optionsHost = userDetails.emailClient_host
            const optionsUser = userDetails.emailClient_user
            const optionsSendTo = userDetails.emailClient_sendTo || ''
            if (
                !s.group[user.ke].emailClient &&
                userDetails.emailClient === '1' &&
                optionsHost &&
                optionsUser &&
                optionsSendTo
            ){
                const optionsPass = userDetails.emailClient_pass || ''
                const optionsSecure = userDetails.emailClient_secure === '1' ? true : false
                const optionsUnauth = userDetails.emailClient_unauth === '1' ? false : true
                const optionsPort = isNaN(userDetails.emailClient_port) ? (optionsSecure ? 465 : 587) : parseInt(userDetails.emailClient_port)
                const clientOptions = {
                    host: optionsHost,
                    port: optionsPort,
                    secure: optionsSecure,
                    tls: {
                        rejectUnauthorized: optionsUnauth,
                    },
                    auth: {
                        user: optionsUser,
                        pass: optionsPass
                    }
                }
                s.group[user.ke].emailClientOptions = {
                    transport: clientOptions,
                    sendTo: optionsSendTo.split(',').map((text) => {return text.trim()}),
                }
                s.group[user.ke].emailClient = nodeMailer.createTransport(clientOptions)
            }
        };

        const unloadAppForUser = function (user) {
            if (
                s.group[user.ke].emailClient &&
                s.group[user.ke].emailClient.close
            ) {
                s.group[user.ke].emailClient.close();
            }
            delete s.group[user.ke].emailClient;
            delete s.group[user.ke].emailClientOptions;
        };

        const onTwoFactorAuthCodeNotificationForApp = function (r) {
            // r = user
            if (r.details.factor_emailClient === '1') {
                sendMessage({
                    subject: r.lang['2-Factor Authentication'],
                    html: template.createFramework({
                        title: r.lang['2-Factor Authentication'],
                        subtitle: r.lang['Enter this code to proceed'],
                        body: '<b style="font-size: 20pt;">'+s.factorAuth[r.ke][r.uid].key+'</b><br><br>'+r.lang.FactorAuthText1,
                    }),
                },[],r.ke);
            }
        };

        const onEventTriggerForApp = async (d, filter) => {
            const monitorConfig = s.group[d.ke].rawMonitorConfigurations[d.id];
            // d = event object
            if (
                s.group[d.ke].emailClient &&
                (filter.emailClient || monitorConfig.details.notify_emailClient === '1') &&
                !s.group[d.ke].activeMonitors[d.id].detector_emailClient
            ) {
                var detector_emailClient_timeout;
                if (!monitorConfig.details.detector_emailClient_timeout){
                    detector_emailClient_timeout = 1000 * 60 * 10
                }else{
                    detector_emailClient_timeout = parseFloat(monitorConfig.details.detector_emailClient_timeout) * 1000 * 60
                }
                s.group[d.ke].activeMonitors[d.id].detector_emailClient = setTimeout(function () {
                    s.group[d.ke].activeMonitors[d.id].detector_emailClient = null;
                }, detector_emailClient_timeout);

                // lock passed
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
                        subject: lang.Event+' - '+d.screenshotName,
                        html: template.createFramework({
                            title: lang.EventText1 + ' ' + d.currentTimestamp,
                            subtitle: lang.Event,
                            body: infoRows.join(''),
                        }),
                    },files || [],d.ke)
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
                                sendMail([
                                    {
                                        filename: videoName,
                                        content: buffer
                                    }
                                ])
                            }
                        })
                    }
                }
            }
        };

        const onEventTriggerBeforeFilterForApp = function (d, filter) {
            filter.emailClient = false;
        };

        const onDetectorNoTriggerTimeoutForApp = function (e) {
            //e = monitor object
            var currentTime = new Date();
            if (e.details.detector_notrigger_emailClient === '1') {
                var html =
                    '*' +
                    lang.NoMotionEmailText2 +
                    ' ' +
                    (e.details.detector_notrigger_timeout || 10) +
                    ' ' +
                    lang.minutes +
                    '.*\n';
                html +=
                    '**' + lang['Monitor Name'] + '** : ' + e.name + '\n';
                html += '**' + lang['Monitor ID'] + '** : ' + e.id + '\n';
                html += currentTime;
                sendMessage({
                    subject: lang['"No Motion" Detector'],
                    html: template.createFramework({
                        title: lang['"No Motion" Detector'],
                        subtitle: 'Shinobi Event',
                        body: html,
                    }),
                },[],e.ke);
            }
        };

        const onMonitorUnexpectedExitForApp = (monitorConfig) => {
            if (
                monitorConfig.details.notify_emailClient === '1' &&
                monitorConfig.details.notify_onUnexpectedExit === '1'
            ){
                const ffmpegCommand = s.group[monitorConfig.ke].activeMonitors[monitorConfig.mid].ffmpeg
                const subject = lang['Process Unexpected Exit'] + ' : ' + monitorConfig.name
                const currentTime = new Date();
                sendMessage({
                    subject: subject,
                    html: template.createFramework({
                        title: subject,
                        subtitle: lang['Process Crashed for Monitor'],
                        body: ffmpegCommand,
                        footerText: currentTime
                    }),
                },[],monitorConfig.ke);
            }
        };

        s.loadGroupAppExtender(loadAppForUser);
        s.unloadGroupAppExtender(unloadAppForUser);
        s.onTwoFactorAuthCodeNotification(onTwoFactorAuthCodeNotificationForApp);
        s.onEventTrigger(onEventTriggerForApp);
        s.onEventTriggerBeforeFilter(onEventTriggerBeforeFilterForApp);
        s.onDetectorNoTriggerTimeout(onDetectorNoTriggerTimeoutForApp);
        s.onMonitorUnexpectedExit(onMonitorUnexpectedExitForApp);
        s.definitions['Monitor Settings'].blocks['Notifications'].info[0].info.push({
            name: 'detail=notify_emailClient',
            field: lang.Email,
            description: '',
            default: '0',
            example: '',
            selector: 'h_det_emailClient',
            fieldType: 'select',
            possible: [
                {
                    name: lang.No,
                    value: '0',
                },
                {
                    name: lang.Yes,
                    value: '1',
                },
            ],
        });
        s.definitions['Monitor Settings'].blocks['Notifications'].info.push(
            {
                evaluation: "$user.details.use_emailClient !== '0'",
                isFormGroupGroup: true,
                name: lang.Email,
                color: 'blue',
                'section-class': 'h_det_emailClient_input h_det_emailClient_1',
                info: [
                    {
                        name: 'detail=detector_emailClient_timeout',
                        field: `${lang['Allow Next Alert']} (${lang['on Event']})`,
                        default: '10',
                    },
                ],
            }
        );
        s.definitions['Account Settings'].blocks['2-Factor Authentication'].info.push({
            name: 'detail=factor_emailClient',
            field: lang.Email,
            default: '1',
            example: '',
            fieldType: 'select',
            possible: [
                {
                    name: lang.No,
                    value: '0',
                },
                {
                    name: lang.Yes,
                    value: '1',
                },
            ],
        });
        s.definitions['Account Settings'].blocks['Email'] = {
            evaluation: "$user.details.use_emailClient !== '0'",
            name: lang.Email,
            id: lang.Email,
            color: 'blue',
            info: [
                {
                    name: 'detail=emailClient',
                    selector: 'u_emailClient',
                    field: lang.Enabled,
                    default: '0',
                    example: '',
                    fieldType: 'select',
                    possible: [
                        {
                            name: lang.No,
                            value: '0',
                        },
                        {
                            name: lang.Yes,
                            value: '1',
                        },
                    ],
                },
                {
                    hidden: true,
                    field: lang.Host,
                    name: 'detail=emailClient_host',
                    example: 'smtp.gmail.com',
                    'form-group-class': 'u_emailClient_input u_emailClient_1',
                },
                {
                    hidden: true,
                    field: lang.Port,
                    name: 'detail=emailClient_port',
                    example: '587',
                    'form-group-class': 'u_emailClient_input u_emailClient_1',
                },
                {
                    hidden: true,
                    name: 'detail=emailClient_secure',
                    'form-group-class': 'u_emailClient_input u_emailClient_1',
                    field: lang.Secure,
                    default: '0',
                    example: '',
                    fieldType: 'select',
                    possible: [
                        {
                            name: lang.No,
                            value: '0',
                        },
                        {
                            name: lang.Yes,
                            value: '1',
                        },
                    ],
                },
                {
                    hidden: true,
                    name: 'detail=emailClient_unauth',
                    'form-group-class': 'u_emailClient_input u_emailClient_1',
                    field: lang.rejectUnauth,
                    default: '0',
                    example: '',
                    fieldType: 'select',
                    possible: [
                        {
                            name: lang.No,
                            value: '0',
                        },
                        {
                            name: lang.Yes,
                            value: '1',
                        },
                    ],
                },
                {
                    hidden: true,
                    field: lang.Email,
                    name: 'detail=emailClient_user',
                    example: 'test@gmail.com',
                    'form-group-class': 'u_emailClient_input u_emailClient_1',
                },
                {
                    hidden: true,
                    field: lang.Password,
                    fieldType: 'password',
                    name: 'detail=emailClient_pass',
                    'form-group-class': 'u_emailClient_input u_emailClient_1',
                },
                {
                    hidden: true,
                    field: lang['Send to'],
                    name: 'detail=emailClient_sendTo',
                    example: 'testrecipient@gmail.com',
                    'form-group-class': 'u_emailClient_input u_emailClient_1',
                },
            ],
        };
        s.definitions["Event Filters"].blocks["Action for Selected"].info.push({
             "name": "actions=emailClient",
             "field": lang['Email'],
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
    } catch (err) {
        console.log(err);
        console.log('Could not engage Email notifications.');
    }
};
