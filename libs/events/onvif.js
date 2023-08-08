module.exports = function(s,config,lang){
    const {
        triggerEvent,
    } = require('./utils.js')(s,config,lang)
    const onvifEvents = require("node-onvif-events");
    const onvifEventIds = []
    const onvifEventControllers = {}
    const startMotion = async (onvifId,monitorConfig) => {
        const groupKey = monitorConfig.ke
        const monitorId = monitorConfig.mid
        const onvifIdKey = `${monitorConfig.mid}${monitorConfig.ke}`
        const controlBaseUrl = monitorConfig.details.control_base_url || s.buildMonitorUrl(monitorConfig, true)
        const controlURLOptions = s.cameraControlOptionsFromUrl(controlBaseUrl,monitorConfig)
        const onvifPort = parseInt(monitorConfig.details.onvif_port) || 8000
        let options = {
          id: onvifId,
          hostname: controlURLOptions.host,
          username: controlURLOptions.username,
          password: controlURLOptions.password,
          port: onvifPort,
        };
      const detector = onvifEventControllers[onvifIdKey] || await onvifEvents.MotionDetector.create(options.id, options);
      function onvifEventLog(type,data){
          s.userLog({
              ke: groupKey,
              mid: monitorId
          },{
              type: type,
              msg: data
          })
      }
      onvifEventLog(`ONVIF Event Detection Listening!`)
      try {
        detector.listen((motion) => {
          if (motion) {
            onvifEventLog(`ONVIF Event Detected!`)
            triggerEvent({
                f: 'trigger',
                id: monitorId,
                ke: groupKey,
                details:{
                    plug: 'onvifEvent',
                    name: 'onvifEvent',
                    reason: 'motion',
                    confidence: 100,
                    // reason: 'object',
                    // matrices: [matrix],
                    // imgHeight: img.height,
                    // imgWidth: img.width,
                }
            })
          } else {
              onvifEventLog(`ONVIF Event Stopped`)
          }
        });
      } catch(e) {
          console.error(e)
          onvifEventLog(`ONVIF Event Error`,e)
      }
      return detector
    }
    async function initializeOnvifEvents(monitorConfig){
        const monitorMode = monitorConfig.mode
        const groupKey = monitorConfig.ke
        const monitorId = monitorConfig.mid
        const hasOnvifEventsEnabled = monitorConfig.details.is_onvif === '1' && monitorConfig.details.onvif_events === '1';
        if(hasOnvifEventsEnabled){
            const onvifIdKey = `${monitorConfig.mid}${monitorConfig.ke}`
            let onvifId = onvifEventIds.indexOf(onvifIdKey)
            if(onvifEventIds.indexOf(onvifIdKey) === -1){
                onvifId = onvifEventIds.length;
                onvifEventIds.push(onvifIdKey);
            }
            try{
                onvifEventControllers[onvifIdKey].close()
                s.debugLog('ONVIF Event Module Warning : This could cause a memory leak?')
            }catch(err){
                s.debugLog('ONVIF Event Module Error', err.stack);
            }
            try{
                delete(onvifEventControllers[onvifIdKey])
                s.debugLog('Can ',monitorConfig.name, 'read ONVIF Events?',monitorMode !== 'stop')
                if(monitorMode !== 'stop'){
                    s.debugLog('Starting ONVIF Event Reader on ',monitorConfig.name)
                    const detector = await startMotion(onvifId,monitorConfig)
                    onvifEventControllers[onvifIdKey] = detector;
                }
            }catch(err){
                console.error(err)
                s.debugLog('ONVIF Event Module Start Error', err.stack);
            }
        }
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
