const fetch = require('node-fetch');
const FormData = require('form-data');
module.exports = function(s,config,lang,getSnapshot){
    function replaceQueryStringValues(webhookEndpoint,data){
        let newString = webhookEndpoint
            .replace(/{{INNER_EVENT_TITLE}}/g,data.title)
            .replace(/{{INNER_EVENT_INFO}}/g,s.stringJSON(data.info));
        return newString;
    }
    const sendMessage = function(sendBody,files,groupKey){
        let webhookEndpoint = s.group[groupKey].init.global_webhook_url;
        if(!webhookEndpoint){
            s.userLog({
                ke: groupKey,
                mid: '$USER'
            },{
                type: lang.NotifyErrorText,
                infoType: 'global_webhook',
                msg: lang['Invalid Settings']
            })
            return new Promise((resolve,reject) => {
                resolve({
                    error: lang['Invalid Settings'],
                    ok: false,
                })
            })
        }
        const doPostMethod = s.group[groupKey].init.global_webhook_method === 'POST';
        // const includeSnapshot = s.group[groupKey].init.global_webhook_include_image === '1';
        const webhookInfoData = {
            info: sendBody,
            files: [],
        }
        const formData = new FormData();
        if(files && doPostMethod){
            files.forEach(async (file,n) => {
                const fileName = file.name
                switch(file.type){
                    case'video':
                        // video cannot be sent this way unless POST
                        formData.append(`file${n + 1}`, file.attachment, {
                          contentType: 'video/mp4',
                          name: fileName,
                          filename: fileName,
                        });
                        webhookInfoData.files.push(fileName)
                    break;
                    case'photo':
                        formData.append(`file${n + 1}`, file.attachment, {
                          contentType: 'image/jpeg',
                          name: fileName,
                          filename: fileName,
                        });
                        webhookInfoData.files.push(fileName)
                    break;
                }
            })
        }else{
            delete(webhookInfoData.files)
        }
        webhookEndpoint = replaceQueryStringValues(webhookEndpoint,{
            title: sendBody.title,
            info: webhookInfoData,
        });
        return new Promise((resolve,reject) => {
            const response = {
                ok: true,
            }
            fetch(webhookEndpoint,doPostMethod ? {
                method: 'POST',
                body: formData
            } : undefined)
                .then(res => res.text())
                .then((text) => {
                    console.error(`Webhook Response`,text)
                    response.response = text;
                    resolve(response)
                })
                .catch((err) => {
                    console.error(`Webhook Fail`)
                    response.ok = false;
                    response.error = err;
                    s.userLog({
                        ke: groupKey,
                        mid: '$USER'
                    },{
                        type: lang.NotifyErrorText,
                        infoType: 'global_webhook',
                        msg: err
                    })
                    resolve(response)
                })
        })
    }
    const onEventTriggerBeforeFilterForGlobalWebhook = function(d,filter){
        filter.global_webhook = false
    }
    const onEventTriggerForGlobalWebhook = async (d,filter) => {
        let filesSent = 0;
        const monitorConfig = s.group[d.ke].rawMonitorConfigurations[d.id]
        if((filter.global_webhook || monitorConfig.details.notify_global_webhook === '1')){
            await getSnapshot(d,monitorConfig)
            if(d.screenshotBuffer){
                sendMessage({
                    title: lang.Event+' - '+d.screenshotName,
                    description: lang.EventText1+' '+d.currentTimestamp,
                    ke: d.ke,
                    mid: d.id,
                    eventDetails: d.details
                },[
                    {
                        type: 'photo',
                        attachment: d.screenshotBuffer,
                        name: d.screenshotName+'.jpg'
                    }
                ],d.ke)
                ++filesSent;
            }
            if(filesSent === 0){
                sendMessage({
                    title: lang.Event,
                    description: lang.EventText1+' '+d.currentTimestamp,
                    ke: d.ke,
                    mid: d.id,
                    eventDetails: d.details
                },[],d.ke)
            }
        }
    }
    const onTwoFactorAuthCodeNotificationForGlobalWebhook = function(r){
        // r = user
        if(r.details.factor_global_webhook === '1'){
            sendMessage({
                title: r.lang['Enter this code to proceed'],
                description: '**'+s.factorAuth[r.ke][r.uid].key+'** '+r.lang.FactorAuthText1,
            },[],r.ke)
        }
    }
    // const onDetectorNoTriggerTimeoutForGlobalWebhook = function(e){
    //     //e = monitor object
    //     var currentTime = new Date()
    //     if(e.details.detector_notrigger_global_webhook === '1'){
    //         var html = '*'+lang.NoMotionEmailText2+' ' + (e.details.detector_notrigger_timeout || 10) + ' '+lang.minutes+'.*\n'
    //         html += '**' + lang['Monitor Name'] + '** : '+e.name + '\n'
    //         html += '**' + lang['Monitor ID'] + '** : '+e.id + '\n'
    //         html += currentTime
    //         sendMessage({
    //             title: lang['\"No Motion"\ Detector'],
    //             description: html,
    //         },[],e.ke)
    //     }
    // }
    const onMonitorUnexpectedExitForGlobalWebhook = (monitorConfig) => {
        if(monitorConfig.details.notify_global_webhook === '1' && monitorConfig.details.notify_onUnexpectedExit === '1'){
            const ffmpegCommand = s.group[monitorConfig.ke].activeMonitors[monitorConfig.mid].ffmpeg
            const description = lang['Process Crashed for Monitor'] + '\n' + ffmpegCommand
            const currentTime = new Date()
            sendMessage({
                title: lang['Process Unexpected Exit'] + ' : ' + monitorConfig.name,
                description: description,
            },[],monitorConfig.ke)
        }
    }
    s.onTwoFactorAuthCodeNotification(onTwoFactorAuthCodeNotificationForGlobalWebhook)
    s.onEventTrigger(onEventTriggerForGlobalWebhook)
    s.onEventTriggerBeforeFilter(onEventTriggerBeforeFilterForGlobalWebhook)
    // s.onDetectorNoTriggerTimeout(onDetectorNoTriggerTimeoutForGlobalWebhook)
    s.onMonitorUnexpectedExit(onMonitorUnexpectedExitForGlobalWebhook)
    s.definitions["Monitor Settings"].blocks["Notifications"].info[0].info.push(
        {
           "name": "detail=notify_global_webhook",
           "field": lang.Webhook,
           "description": "",
           "default": "0",
           "example": "",
           "selector": "h_det_global_webhook",
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
    );
    s.definitions["Account Settings"].blocks["2-Factor Authentication"].info.push({
        "name": "detail=factor_global_webhook",
        "field": lang.Webhook,
        "default": "1",
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
    s.definitions["Account Settings"].blocks["Webhook"] = {
        "evaluation": "$user.details.use_global_webhook !== '0'",
        "name": lang.Webhook,
        "color": "blue",
        info: [
            {
               "name": "detail=global_webhook",
               "selector":"u_global_webhook",
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
               "name": "detail=global_webhook_url",
               "placeholder": "http://your-webhook-point/onEvent/{{INNER_EVENT_TITLE}}?info={{INNER_EVENT_INFO}}",
               "field": lang["Webhook URL"],
               "form-group-class":"u_global_webhook_input u_global_webhook_1",
           },
           {
                hidden: true,
                "name": "detail=global_webhook_method",
               "field": lang['Call Method'],
               "default": "GET",
               "form-group-class":"u_global_webhook_input u_global_webhook_1",
               "fieldType": "select",
               "possible": [
                   {
                      "name": `GET (${lang.Default})`,
                      "value": "GET"
                   },
                   {
                      "name": "PUT",
                      "value": "PUT"
                   },
                   {
                      "name": "POST",
                      "value": "POST"
                   }
                ]
            },
        ]
    }
    s.definitions["Event Filters"].blocks["Action for Selected"].info.push({
             "name": "actions=global_webhook",
             "field": lang['Webhook'],
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
        },
    )
}
