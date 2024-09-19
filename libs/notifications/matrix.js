const fs = require("fs")
const fetch = require("node-fetch")
module.exports = async function(s,config,lang,getSnapshot){
    const {
        getObjectTagNotifyText,
        getEventBasedRecordingUponCompletion,
    } = require('../events/utils.js')(s,config,lang)
    //matrix bot
    if(config.matrixBot === true){
        const sdk = await import("matrix-js-sdk")
        try{
            function sendFile(file,groupKey){
                const client = s.group[groupKey].matrixBot
                const roomId = s.group[groupKey].matrixBotRoom
                const {
                    buffer,
                    name,
                    type,
                    info,
                    opttype,
                } = file;
                client.uploadContent(buffer, {
                        name: name,
                        type: opttype,
                }).then(function(url) {
                    const content = {
                        msgtype: type || "m.file",
                        body: name,
                        info: info,
                        url: url.content_uri
                    };
                    client.sendMessage(roomId, content);
                }).catch(err => {
                    console.error(err)
                    s.userLog({
                        ke: groupKey,
                        mid: '$USER'
                    },{
                        type: 'matrix.org Error',
                        msg: err.toString()
                    });
                })
            }
            const sendMessage = function(data,files,groupKey){
                if(!data)data = {};
                const client = s.group[groupKey].matrixBot
                const roomId = s.group[groupKey].matrixBotRoom
                if(!client){
                    s.userLog({ke:groupKey,mid:'$USER'},{type:'matrix.org Error'})
                    return
                }
                if(client.sendMessage){
                    if(data.text){
                        const sendBody = {
                           "body": data.text,
                           "msgtype": "m.text"
                        }
                        client.sendMessage(roomId, sendBody);
                    }
                    files.forEach((file) => {
                        sendFile(file,groupKey)
                    });
                }else{
                    s.userLog({
                        ke: groupKey,
                        mid: '$USER'
                    },{
                        type: 'matrix.org Error',
                        msg: '!sendMessage'
                    });
                }
            }
            const onEventTriggerBeforeFilterForMatrixBot = function(d,filter){
                filter.matrixBot = false
            }
            const onEventTriggerForMatrixBot = async (d,filter) => {
                const monitorConfig = s.group[d.ke].rawMonitorConfigurations[d.id]
                // d = event object
                const isEnabled = filter.matrixBot || monitorConfig.details.detector_matrixbot === '1' || monitorConfig.details.notify_matrix === '1'
                if(s.group[d.ke].matrixBot && isEnabled && !s.group[d.ke].activeMonitors[d.id].detector_matrixbot){
                    const notifyText = getObjectTagNotifyText(d)
                    var detector_matrixbot_timeout
                    if(!monitorConfig.details.detector_matrixbot_timeout||monitorConfig.details.detector_matrixbot_timeout===''){
                        detector_matrixbot_timeout = 1000 * 60 * 10;
                    }else{
                        detector_matrixbot_timeout = parseFloat(monitorConfig.details.detector_matrixbot_timeout) * 1000 * 60;
                    }
                    s.group[d.ke].activeMonitors[d.id].detector_matrixbot = setTimeout(function(){
                        clearTimeout(s.group[d.ke].activeMonitors[d.id].detector_matrixbot);
                        s.group[d.ke].activeMonitors[d.id].detector_matrixbot = null
                    },detector_matrixbot_timeout)
                    await getSnapshot(d,monitorConfig)
                    if(d.screenshotBuffer){
                        sendMessage({
                            text: notifyText,
                        },[
                            {
                                buffer: d.screenshotBuffer,
                                name: d.screenshotName+'.jpg',
                                type: 'm.image',
                                opttype: 'image/jpeg',
                                                info: {
                                                    mimetype: 'image/jpeg',
                                                },
                            }
                        ],d.ke)
                    }
                    if(monitorConfig.details.detector_matrixbot_send_video === '1'){
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
                            sendMessage({
                                text: notifyText,
                            },[
                                {
                                    buffer: await fs.promises.readFile(videoPath),
                                    name: videoName,
                                    type: 'm.video',
                                    opttype: 'video/mp4',
                                    info: {
                                    mimetype: 'video/mp4',
                                    },
                                }
                            ],d.ke)
                        }
                    }
                }
            }
            const onTwoFactorAuthCodeNotificationForMatrixBot = function(user){
                // r = user
                if(r.details.factor_matrixbot === '1'){
                    const eventText = `${user.lang['2-Factor Authentication']} : ${user.lang['Enter this code to proceed']} **${factorAuthKey}** ${user.lang.FactorAuthText1}`
                    sendMessage({
                        text: eventText,
                    },[],d.ke)
                }
            }
            const loadMatrixBotForUser = function(user){
                const userDetails = s.parseJSON(user.details);
                //matrixbot
                if(!s.group[user.ke].matrixBot &&
                   config.matrixBot === true &&
                   userDetails.matrixbot === '1' &&
                   userDetails.matrixbot_baseUrl &&
                   userDetails.matrixbot_accessToken &&
                   userDetails.matrixbot_userId &&
                   userDetails.matrixbot_roomId
                  ){
                    s.debugLog(`!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`)
                    s.debugLog(`Matrix Connecting... ${userDetails.matrixbot_baseUrl}`)
                    const client = sdk.createClient({
                        baseUrl: userDetails.matrixbot_baseUrl,
                        accessToken: userDetails.matrixbot_accessToken,
                        userId: userDetails.matrixbot_userId
                    });
                    s.group[user.ke].matrixBot = client
                    s.group[user.ke].matrixBotRoom = userDetails.matrixbot_roomId
                    client.startClient();
                    client.once('sync', function(state, prevState, res) {
                        s.userLog({
                            ke: user.ke,
                            mid: '$USER'
                        },{
                            type: 'matrix.org',
                            msg: lang.Ready
                        })
                    });
                }
            }
            const unloadMatrixBotForUser = function(user){
                if(s.group[user.ke].matrixBot && s.group[user.ke].matrixBot.stopClient){
                    s.group[user.ke].matrixBot.stopClient()
                    delete(s.group[user.ke].matrixBot)
                }
            }
            const onDetectorNoTriggerTimeoutForMatrixBot = function(e){
                //e = monitor object
                var currentTime = new Date()
                if(e.details.detector_notrigger_matrixbot === '1'){
                    var html = '*'+lang.NoMotionEmailText2+' ' + (e.details.detector_notrigger_timeout || 10) + ' '+lang.minutes+'.*\n'
                    html += '**' + lang['Monitor Name'] + '** : '+e.name + '\n'
                    html += '**' + lang['Monitor ID'] + '** : '+e.id + '\n'
                    html += currentTime
                    const eventText = `${lang['"No Motion" Detector']} : ${html}`
                    sendMessage({
                        text: eventText,
                    },[],e.ke)
                }
            }
            const onMonitorUnexpectedExitForMatrixBot = (monitorConfig) => {
                const isEnabled = monitorConfig.details.detector_matrixbot === '1' || monitorConfig.details.notify_matrix === '1'
                if(isEnabled && monitorConfig.details.notify_onUnexpectedExit === '1'){
                    const ffmpegCommand = s.group[monitorConfig.ke].activeMonitors[monitorConfig.mid].ffmpeg
                    const description = lang['Process Crashed for Monitor'] + '\n' + ffmpegCommand
                    const currentTime = new Date()
                    const eventText = `${lang['Process Unexpected Exit']} : ${monitorConfig.name} : ${description}`
                    sendMessage({
                        text: eventText,
                    },[],monitorConfig.ke)
                }
            }
            s.loadGroupAppExtender(loadMatrixBotForUser)
            s.unloadGroupAppExtender(unloadMatrixBotForUser)
            s.onTwoFactorAuthCodeNotification(onTwoFactorAuthCodeNotificationForMatrixBot)
            s.onEventTrigger(onEventTriggerForMatrixBot)
            s.onEventTriggerBeforeFilter(onEventTriggerBeforeFilterForMatrixBot)
            s.onDetectorNoTriggerTimeout(onDetectorNoTriggerTimeoutForMatrixBot)
            s.onMonitorUnexpectedExit(onMonitorUnexpectedExitForMatrixBot)
            s.definitions["Monitor Settings"].blocks["Notifications"].info[0].info.push(
                {
                   "name": "detail=notify_matrix",
                   "field": "Matrix.org",
                   "description": "",
                   "default": "0",
                   "example": "",
                   "selector": "h_det_matrixbot",
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
                }
            )
            s.definitions["Monitor Settings"].blocks["Notifications"].info.push({
               "evaluation": "$user.details.use_matrixbot !== '0'",
               isFormGroupGroup: true,
               "name": "Matrix.org",
               "color": "purple",
               "section-class": "h_det_matrixbot_input h_det_matrixbot_1",
               "info": [
                   {
                      "name": "detail=detector_matrixbot_send_video",
                      "field": lang["Attach Video Clip"] + ` (${lang['on Event']})`,
                      "description": "",
                      "default": "0",
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
                   },
                   {
                      "name": "detail=detector_matrixbot_timeout",
                      "field": lang['Allow Next Alert'] + ` (${lang['on Event']})`,
                      "description": "",
                      "default": "10",
                      "example": "",
                      "possible": ""
                   },
                   {
                      "name": "detail=detector_notrigger_matrixbot",
                      "field": lang['No Trigger'],
                      "description": lang.noTriggerText,
                      "default": "0",
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
                   },
               ]
            })
            s.definitions["Account Settings"].blocks["2-Factor Authentication"].info.push({
                "name": "detail=factor_matrixbot",
                "field": 'Matrix.org',
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
            })
            s.definitions["Account Settings"].blocks["Matrix.org"] = {
               "evaluation": "$user.details.use_matrixbot !== '0'",
               "name": "Matrix.org",
               "color": "purple",
               "info": [
                   {
                      "name": "detail=matrixbot",
                      "selector":"u_matrixbot_bot",
                      "field": lang.Enabled,
                      "default": "0",
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
                   },
                   {
                       hidden: true,
                      "name": "detail=matrixbot_baseUrl",
                      "placeholder": "",
                      "field": lang["Host"],
                      "form-group-class":"u_matrixbot_bot_input u_matrixbot_bot_1",
                   },
                   {
                       hidden: true,
                      "name": "detail=matrixbot_userId",
                      "placeholder": "xxxxxxxxxxxxxxxxxx",
                      "field": lang["User ID"],
                      "form-group-class":"u_matrixbot_bot_input u_matrixbot_bot_1",
                   },
                   {
                       hidden: true,
                      "name": "detail=matrixbot_roomId",
                      "placeholder": "xxxxxxxxxxxxxxxxxx",
                      "field": lang["Room ID"],
                      "form-group-class":"u_matrixbot_bot_input u_matrixbot_bot_1",
                   },
                   {
                       hidden: true,
                      "name": "detail=matrixbot_accessToken",
                      "fieldType": "password",
                      "placeholder": "XXXXXXXXXXXXXXXXXXXXXXXX",
                      "field": lang.Token,
                      "form-group-class":"u_matrixbot_bot_input u_matrixbot_bot_1",
                  },
               ]
            }
            s.definitions["Event Filters"].blocks["Action for Selected"].info.push({
                 "name": "actions=matrixBot",
                 "field": 'Matrix.org',
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
        }catch(err){
            console.log(err)
            console.log('Could not start Matrix bot, please run "npm install matrix-js-sdk" inside the Shinobi folder.')
        }
    }
}
