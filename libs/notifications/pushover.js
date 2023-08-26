var fs = require('fs');
module.exports = function (s, config, lang, getSnapshot) {
    const {
        getObjectTagNotifyText,
        getEventBasedRecordingUponCompletion,
    } = require('../events/utils.js')(s,config,lang)

    if (config.pushover === true) {
        const Pushover = require('pushover-notifications');
        try {
            const sendMessage = async function (sendBody, files, groupKey) {
                var pushover = s.group[groupKey].pushover;
                if (!pushover) {
                    s.userLog(
                        { ke: groupKey, mid: '$USER' },
                        {
                            type: lang.PushoverNotifyErrorText,
                            msg: lang.PushoverNotEnabledText,
                        }
                    );
                    return;
                }
                if (pushover && pushover.send) {
                    try {
                        var msg = {
                            // These values correspond to the parameters detailed on https://pushover.net/api
                            // 'message' is required. All other values are optional.
                            message: sendBody.description, // required
                            title: 'Shinobi: ' + sendBody.title,
                            sound: 'siren',
                            //  we do not support devices here. use group identifiers instead.
                            //	device: 'devicename',
                            priority: 1,
                        };
                        if (files.length > 0) {
                            // sadly pushover allows only ONE single attachment
                            msg.file = {
                                name: files[0].name,
                                data: files[0].attachment,
                            };
                        }
                        pushover.send(msg, function (err, result) {
                            if (err) {
                                throw err;
                            }
                            console.log(result);
                        });
                    } catch (err) {
                        s.userLog(
                            { ke: groupKey, mid: '$USER' },
                            { type: lang.NotifyErrorText, msg: err }
                        );
                    }
                } else {
                    s.userLog(
                        {
                            ke: groupKey,
                            mid: '$USER',
                        },
                        {
                            type: lang.NotifyErrorText,
                            msg: lang['Check the Recipient ID'],
                        }
                    );
                }
            };

            const loadPushoverForUser = function (user) {
                const userDetails = s.parseJSON(user.details);
                if (
                    !s.group[user.ke].pushover &&
                    config.pushover === true &&
                    userDetails.pushover === '1' &&
                    userDetails.pushover_token !== '' &&
                    userDetails.pushover_recipient_identifier !== ''
                ) {
                    s.group[user.ke].pushover = new Pushover({
                        user: userDetails.pushover_recipient_identifier,
                        token: userDetails.pushover_token,
                    });
                }
            };

            const unloadPushoverForUser = function (user) {
                if (
                    s.group[user.ke].pushover &&
                    s.group[user.ke].pushover.destroy
                ) {
                    s.group[user.ke].pushover.destroy();
                }
                delete s.group[user.ke].pushover;
            };

            const onTwoFactorAuthCodeNotificationForPushover = function (r) {
                // r = user
                if (r.details.factor_pushover === '1') {
                    sendMessage(
                        {
                            title: r.lang['Enter this code to proceed'],
                            description:
                                '**' +
                                s.factorAuth[r.ke][r.uid].key +
                                '** ' +
                                r.lang.FactorAuthText1,
                        },
                        [],
                        r.ke
                    );
                }
            };

            const onEventTriggerForPushover = async (d, filter) => {
                const monitorConfig =
                    s.group[d.ke].rawMonitorConfigurations[d.id];
                // d = event object
                if (
                    s.group[d.ke].pushover &&
                    (filter.pushover || monitorConfig.details.notify_pushover === '1') &&
                    !s.group[d.ke].activeMonitors[d.id].detector_pushover
                ) {
                    const notifyText = getObjectTagNotifyText(d)
                    var detector_pushover_timeout;
                    if (
                        !monitorConfig.details.detector_pushover_timeout ||
                        monitorConfig.details.detector_pushover_timeout === ''
                    ) {
                        detector_pushover_timeout = 1000 * 60 * 10;
                    } else {
                        detector_pushover_timeout =
                            parseFloat(
                                monitorConfig.details.detector_pushover_timeout
                            ) *
                            1000 *
                            60;
                    }
                    s.group[d.ke].activeMonitors[d.id].detector_pushover =
                        setTimeout(function () {
                            clearTimeout(
                                s.group[d.ke].activeMonitors[d.id]
                                    .detector_pushover
                            );
                            s.group[d.ke].activeMonitors[
                                d.id
                            ].detector_pushover = null;
                        }, detector_pushover_timeout);
                    await getSnapshot(d, monitorConfig);
                    if (d.screenshotBuffer) {
                        sendMessage(
                            {
                                title: notifyText,
                                description: lang.EventText1 + ' ' + d.currentTimestamp,
                            },
                            [
                                {
                                    type: 'photo',
                                    attachment: d.screenshotBuffer,
                                    name: d.screenshotName + '.jpg',
                                },
                            ],
                            d.ke
                        );
                    }
                }
            };

            const onEventTriggerBeforeFilterForPushover = function (d, filter) {
                filter.pushover = false;
            };

            const onDetectorNoTriggerTimeoutForPushover = function (e) {
                //e = monitor object
                var currentTime = new Date();
                if (e.details.detector_notrigger_pushover === '1') {
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
                    sendMessage(
                        {
                            title: lang['"No Motion" Detector'],
                            description: html,
                        },
                        [],
                        e.ke
                    );
                }
            };

            const onMonitorUnexpectedExitForPushover = (monitorConfig) => {
                if (
                    monitorConfig.details.notify_pushover === '1' &&
                    monitorConfig.details.notify_onUnexpectedExit === '1'
                ) {
                    const ffmpegCommand =
                        s.group[monitorConfig.ke].activeMonitors[
                            monitorConfig.mid
                        ].ffmpeg;
                    const description =
                        lang['Process Crashed for Monitor'] +
                        '\n' +
                        ffmpegCommand;
                    const currentTime = new Date();
                    sendMessage(
                        {
                            title:
                                lang['Process Unexpected Exit'] +
                                ' : ' +
                                monitorConfig.name,
                            description: description,
                        },
                        [],
                        monitorConfig.ke
                    );
                }
            };

            s.loadGroupAppExtender(loadPushoverForUser);
            s.unloadGroupAppExtender(unloadPushoverForUser);
            s.onTwoFactorAuthCodeNotification(
                onTwoFactorAuthCodeNotificationForPushover
            );
            s.onEventTrigger(onEventTriggerForPushover);
            s.onEventTriggerBeforeFilter(onEventTriggerBeforeFilterForPushover);
            s.onDetectorNoTriggerTimeout(onDetectorNoTriggerTimeoutForPushover);
            s.onMonitorUnexpectedExit(onMonitorUnexpectedExitForPushover);
            s.definitions['Monitor Settings'].blocks[
                'Notifications'
            ].info[0].info.push({
                name: 'detail=notify_pushover',
                field: 'Pushover',
                description: '',
                default: '0',
                example: '',
                selector: 'h_det_pushover',
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
                    evaluation: "$user.details.use_pushover !== '0'",
                    isFormGroupGroup: true,
                    name: 'Pushover',
                    color: 'blue',
                    'section-class': 'h_det_pushover_input h_det_pushover_1',
                    info: [
                        {
                            name: 'detail=detector_pushover_timeout',
                            field:
                                lang['Allow Next Alert'] +
                                ` (${lang['on Event']})`,
                            description: '',
                            default: '10',
                            example: '',
                            possible: '',
                        },
                    ],
                }
            );
            s.definitions['Account Settings'].blocks[
                '2-Factor Authentication'
            ].info.push({
                name: 'detail=factor_pushover',
                field: 'Pushover',
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
            s.definitions['Account Settings'].blocks['Pushover'] = {
                evaluation: "$user.details.use_pushover !== '0'",
                name: 'Pushover',
                color: 'blue',
                info: [
                    {
                        name: 'detail=pushover',
                        selector: 'u_pushover',
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
                        name: 'detail=pushover_token',
                        fieldType: 'password',
                        placeholder: 'azGDORePK8gMaC0QOYAMyEEuzJnyUi',
                        field: lang.Token,
                        'form-group-class': 'u_pushover_input u_pushover_1',
                        description: '',
                        default: '',
                        example: '',
                        possible: '',
                    },
                    {
                        hidden: true,
                        name: 'detail=pushover_recipient_identifier',
                        placeholder: 'uQiRzpo4DXghDmr9QzzfQu27cmVRsG',
                        field: lang['Recipient ID'],
                        'form-group-class': 'u_pushover_input u_pushover_1',
                        description: '',
                        default: '',
                        example: '',
                        possible: '',
                    },
                ],
            };
            s.definitions["Event Filters"].blocks["Action for Selected"].info.push({
                 "name": "actions=pushover",
                 "field": lang['Pushover'],
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
            console.log(
                'Could not start pushover notifications, please run "npm install pushover-notifications" inside the Shinobi folder.'
            );
        }
    }
};
