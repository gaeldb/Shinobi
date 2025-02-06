function hasOnvifEventsEnabled(monitorConfig) {
    return monitorConfig.details.is_onvif === '1' && monitorConfig.details.onvif_events === '1';
}

module.exports = function (s, config, lang) {
    const {Cam} = require("onvif");
    const {
        triggerEvent,
    } = require('./utils.js')(s, config, lang)

    function handleEvent(event, monitorConfig, onvifEventLog) {
        const eventValue = event.message?.message?.data?.simpleItem?.$?.Value;
        if (eventValue === false) {
            onvifEventLog(`ONVIF Event Stopped`, `topic ${event.topic?._}`)
            return
        }
        onvifEventLog(`ONVIF Event Detected!`, `topic ${event.topic?._}`)
        triggerEvent({
            f: 'trigger',
            id: monitorConfig.mid,
            ke: monitorConfig.ke,
            details: {
                plug: 'onvifEvent',
                name: 'onvifEvent',
                reason: event.topic?._,
                confidence: 100,
                [event.message?.message?.data?.simpleItem?.$?.Name]: eventValue
            }
        })
    }

    function configureOnvif(monitorConfig, onvifEventLog) {
        const controlBaseUrl = monitorConfig.details.control_base_url || s.buildMonitorUrl(monitorConfig, true)
        const controlURLOptions = s.cameraControlOptionsFromUrl(controlBaseUrl, monitorConfig)
        const onvifPort = parseInt(monitorConfig.details.onvif_port) || 8000

        const options = {
            hostname: controlURLOptions.host,
            username: controlURLOptions.username,
            password: controlURLOptions.password,
            port: onvifPort,
        };

        return new Cam(options, function (error) {
            if (error) {
                onvifEventLog(`ONVIF Event Error`,error)
                return
            }
            this.on('event', function (event) {
                handleEvent(event, monitorConfig, onvifEventLog);
            })
            this.on('eventsError', function (e) {
                onvifEventLog(`ONVIF Event Error`,e)
            })

        })
    }

    const cams = {};

    function initializeOnvifEvents(monitorConfig) {
        monitorConfig.key = `${monitorConfig.mid}${monitorConfig.ke}`

        const onvifEventLog = function onvifEventLog(type, data) {
            s.userLog({
                ke: monitorConfig.key,
                mid: monitorConfig.mid
            }, {
                type: type,
                msg: data
            })
        }

        if (!hasOnvifEventsEnabled(monitorConfig)) {
            cams[monitorConfig.key]?.removeAllListeners('event')
            return
        }
        if (cams[monitorConfig.key]) {
            onvifEventLog("ONVIF already listening to events")
            return;
        }

        cams[monitorConfig.key] = configureOnvif(monitorConfig,onvifEventLog);
    }

    s.onMonitorStart((monitorConfig) => {
        initializeOnvifEvents(monitorConfig)
    })

    const connectionInfoArray = s.definitions["Monitor Settings"].blocks["Detector"].info
    connectionInfoArray.splice(2, 0, {
        "name": "detail=onvif_events",
        "field": lang['ONVIF Events'],
        "default": "0",
        "form-group-class": "h_onvif_input h_onvif_1",
        "form-group-class-pre-layer": "h_det_input h_det_1",
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
}
