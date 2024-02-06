var fs = require("fs")
var Discord = require("discord.js")
module.exports = function(s,config,lang,getSnapshot){
    const {
        getObjectTagNotifyText,
        getEventBasedRecordingUponCompletion,
    } = require('../events/utils.js')(s,config,lang)
    //discord bot
    if(config.discordBot === true){
        try{
            const messageFooter = {
                icon_url: config.iconURL,
                text: config.notifyFooterText || "Shinobi Systems"
            };
            const sendMessage = function(data,files,groupKey){
                if(!data)data = {};
                var bot = s.group[groupKey].discordBot
                if(!bot){
                    s.userLog({ke:groupKey,mid:'$USER'},{type:lang.DiscordFailedText,msg:lang.DiscordNotEnabledText})
                    return
                }
                const sendBody = Object.assign({
                    color: 3447003,
                    title: 'Alert from Shinobi',
                    description: "",
                    fields: [],
                    timestamp: new Date(),
                    footer: messageFooter
                },data)
                const discordChannel = bot.channels.cache.get(s.group[groupKey].init.discordbot_channel)
                if(discordChannel && discordChannel.send){
                    discordChannel.send({
                        embed: sendBody,
                        files: files
                    }).catch(err => {
                        if(err){
                            s.userLog({ke:groupKey,mid:'$USER'},{type:lang.DiscordErrorText,msg:err})
                            restartDiscordBot(groupKey, 1)
                        }
                    })
                }else{
                    s.userLog({
                        ke: groupKey,
                        mid: '$USER'
                    },{
                        type: lang.DiscordErrorText,
                        msg: 'Check the Channel ID'
                    });
                }
            }
            const onEventTriggerBeforeFilterForDiscord = function(d,filter){
                filter.discord = false
            }
            const onEventTriggerForDiscord = async (d,filter) => {
                const monitorConfig = s.group[d.ke].rawMonitorConfigurations[d.id]
                // d = event object
                //discord bot
                const isEnabled = filter.discord || monitorConfig.details.detector_discordbot === '1' || monitorConfig.details.notify_discord === '1'
                if(s.group[d.ke].discordBot && isEnabled && !s.group[d.ke].activeMonitors[d.id].detector_discordbot){
                    const monitorName = s.group[d.ke].rawMonitorConfigurations[d.id].name
                    const notifyText = getObjectTagNotifyText(d)
                    var detector_discordbot_timeout
                    if(!monitorConfig.details.detector_discordbot_timeout||monitorConfig.details.detector_discordbot_timeout===''){
                        detector_discordbot_timeout = 1000 * 60 * 10;
                    }else{
                        detector_discordbot_timeout = parseFloat(monitorConfig.details.detector_discordbot_timeout) * 1000 * 60;
                    }
                    s.group[d.ke].activeMonitors[d.id].detector_discordbot = setTimeout(function(){
                        clearTimeout(s.group[d.ke].activeMonitors[d.id].detector_discordbot);
                        s.group[d.ke].activeMonitors[d.id].detector_discordbot = null
                    },detector_discordbot_timeout)
                    await getSnapshot(d,monitorConfig)
                    if(d.screenshotBuffer){
                        sendMessage({
                            author: {
                              name: monitorName,
                              icon_url: config.iconURL
                            },
                            title: notifyText,
                            description: notifyText+' '+d.currentTimestamp,
                            fields: [],
                            timestamp: d.currentTime,
                            footer: messageFooter
                        },[
                            {
                                attachment: d.screenshotBuffer,
                                name: notifyText + '.jpg'
                            }
                        ],d.ke)
                    }
                    if(monitorConfig.details.detector_discordbot_send_video === '1'){
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
                                author: {
                                  name: monitorName,
                                  icon_url: config.iconURL
                                },
                                title: `${notifyText}`,
                                description: notifyText,
                                fields: [],
                                timestamp: d.currentTime,
                                footer: messageFooter
                            },[
                                {
                                    attachment: videoPath,
                                    name: notifyText + '.mp4'
                                }
                            ],d.ke)
                        }
                    }
                }
            }
            const onTwoFactorAuthCodeNotificationForDiscord = function(r){
                // r = user
                if(r.details.factor_discord === '1'){
                    sendMessage({
                        author: {
                          name: r.lang['2-Factor Authentication'],
                          icon_url: config.iconURL
                        },
                        title: r.lang['Enter this code to proceed'],
                        description: '**'+s.factorAuth[r.ke][r.uid].key+'** '+r.lang.FactorAuthText1,
                        fields: [],
                        timestamp: new Date(),
                        footer: messageFooter
                    },[],r.ke)
                }
            }
            let restartAttemptLockTimer = null
            const restartDiscordBot = function(groupKey, timer = 60000 * 5){
                s.debugLog(`Discord Bot Restarting : ${groupKey}`)
                s.group[groupKey].discordBot = null;
                clearTimeout(restartAttemptLockTimer);
                restartAttemptLockTimer = setTimeout(function(){
                    s.loadGroupApps({ke: groupKey});
                }, timer);
            }
            const loadDiscordBotForUser = function(user){
                const userDetails = s.parseJSON(user.details);
                //discordbot
                if(!s.group[user.ke].discordBot &&
                   config.discordBot === true &&
                   userDetails.discordbot === '1' &&
                   userDetails.discordbot_token !== ''
                  ){
                    const groupKey = user.ke;
                    const theGroup = s.group[groupKey];
                    s.debugLog(`!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`)
                    s.debugLog(`Discord Connecting ${userDetails.discordbot_token}`)
                    const discordBot = new Discord.Client();
                    discordBot.on('ready', () => {
                        const botTag = discordBot.user.tag;
                        s.debugLog(`Discord Bot Ready : ${groupKey} : ${botTag}`)
                        s.userLog({
                            ke: groupKey,
                            mid: '$USER'
                        },{
                            type: lang.DiscordLoggedIn,
                            msg: botTag
                        })
                    });
                    discordBot.on('error', (error) => {
                        s.debugLog(`Discord Error : ${groupKey} : ${error}`)
                        s.userLog({
                            ke: groupKey,
                            mid: '$USER'
                        },{
                            type: lang.DiscordErrorText,
                            msg: error
                        });
                        restartDiscordBot(groupKey)
                    });
                    discordBot.login(userDetails.discordbot_token);
                    theGroup.discordBot = discordBot;
                }
            }
            const unloadDiscordBotForUser = function(user){
                if(s.group[user.ke].discordBot && s.group[user.ke].discordBot.destroy){
                    s.group[user.ke].discordBot.destroy()
                    delete(s.group[user.ke].discordBot)
                }
            }
            const onDetectorNoTriggerTimeoutForDiscord = function(e){
                //e = monitor object
                var currentTime = new Date()
                if(e.details.detector_notrigger_discord === '1'){
                    var html = '*'+lang.NoMotionEmailText2+' ' + (e.details.detector_notrigger_timeout || 10) + ' '+lang.minutes+'.*\n'
                    html += '**' + lang['Monitor Name'] + '** : '+e.name + '\n'
                    html += '**' + lang['Monitor ID'] + '** : '+e.id + '\n'
                    html += currentTime
                    sendMessage({
                        author: {
                          name: s.group[e.ke].rawMonitorConfigurations[e.id].name,
                          icon_url: config.iconURL
                        },
                        title: lang['\"No Motion"\ Detector'],
                        description: html,
                        fields: [],
                        timestamp: currentTime,
                        footer: messageFooter
                    },[],e.ke)
                }
            }
            const onMonitorUnexpectedExitForDiscord = (monitorConfig) => {
                const isEnabled = monitorConfig.details.detector_discordbot === '1' || monitorConfig.details.notify_discord === '1'
                if(isEnabled && monitorConfig.details.notify_onUnexpectedExit === '1'){
                    const ffmpegCommand = s.group[monitorConfig.ke].activeMonitors[monitorConfig.mid].ffmpeg
                    const description = lang['Process Crashed for Monitor'] + '\n' + ffmpegCommand
                    const currentTime = new Date()
                    sendMessage({
                        author: {
                          name: monitorConfig.name + ' : ' + monitorConfig.mid,
                          icon_url: config.iconURL
                        },
                        title: lang['Process Unexpected Exit'] + ' : ' + monitorConfig.name,
                        description: description,
                        fields: [],
                        timestamp: currentTime,
                        footer: messageFooter
                    },[],monitorConfig.ke)
                }
            }
            s.loadGroupAppExtender(loadDiscordBotForUser)
            s.unloadGroupAppExtender(unloadDiscordBotForUser)
            s.onTwoFactorAuthCodeNotification(onTwoFactorAuthCodeNotificationForDiscord)
            s.onEventTrigger(onEventTriggerForDiscord)
            s.onEventTriggerBeforeFilter(onEventTriggerBeforeFilterForDiscord)
            s.onDetectorNoTriggerTimeout(onDetectorNoTriggerTimeoutForDiscord)
            s.onMonitorUnexpectedExit(onMonitorUnexpectedExitForDiscord)
            s.definitions["Monitor Settings"].blocks["Notifications"].info[0].info.push(
                {
                   "name": "detail=notify_discord",
                   "field": "Discord",
                   "description": "",
                   "default": "0",
                   "example": "",
                   "selector": "h_det_discord",
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
               "evaluation": "$user.details.use_discordbot !== '0'",
               isFormGroupGroup: true,
               "name": "Discord",
               "color": "purple",
               "section-class": "h_det_discord_input h_det_discord_1",
               "info": [
                   {
                      "name": "detail=detector_discordbot_send_video",
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
                      "name": "detail=detector_discordbot_timeout",
                      "field": lang['Allow Next Alert'] + ` (${lang['on Event']})`,
                      "description": "",
                      "default": "10",
                      "example": "",
                      "possible": ""
                   },
                   {
                      "name": "detail=detector_notrigger_discord",
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
                "name": "detail=factor_discord",
                "field": 'Discord',
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
            s.definitions["Account Settings"].blocks["Discord"] = {
               "evaluation": "$user.details.use_discordbot !== '0'",
               "name": "Discord",
               "color": "purple",
               "info": [
                   {
                      "name": "detail=discordbot",
                      "selector":"u_discord_bot",
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
                      "name": "detail=discordbot_token",
                      "fieldType": "password",
                      "placeholder": "XXXXXXXXXXXXXXXXXXXXXXXX.XXXXXXXXXXXXXXX_XXXXXXXXXXXXXXXXXX",
                      "field": lang.Token,
                      "form-group-class":"u_discord_bot_input u_discord_bot_1",
                      "description": "",
                      "default": "",
                      "example": "",
                      "possible": ""
                  },
                   {
                       hidden: true,
                      "name": "detail=discordbot_channel",
                      "placeholder": "xxxxxxxxxxxxxxxxxx",
                      "field": lang["Recipient ID"],
                      "form-group-class":"u_discord_bot_input u_discord_bot_1",
                      "description": "",
                      "default": "",
                      "example": "",
                      "possible": ""
                   }
               ]
            }
            s.definitions["Event Filters"].blocks["Action for Selected"].info.push({
                 "name": "actions=discord",
                 "field": lang['Discord'],
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
            console.log('Could not start Discord bot, please run "npm install discord.js" inside the Shinobi folder.')
        }
    }
}
