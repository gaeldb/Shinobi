const fetch  = require('node-fetch');
const { AbortController } = require('node-abort-controller')
module.exports = (s,config,lang) => {
    const fetchTimeout = (url, ms, { signal, ...options } = {}) => {
        const controller = new AbortController();
        const promise = fetch(url, { signal: controller.signal, ...options });
        if (signal) signal.addEventListener("abort", () => controller.abort());
        const timeout = setTimeout(() => controller.abort(), ms);
        return promise.finally(() => clearTimeout(timeout));
    }
    function canAddMoreMonitors() {
        const cameraCountChecks = [
            { kind: 'ec2', maxCameras: 2, condition: config.isEC2 },
            { kind: 'highCoreCount', maxCameras: 50, condition: config.isHighCoreCount },
            { kind: 'default', maxCameras: 15, condition: true },
        ];
        if (!config.userHasSubscribed) {
            const monitorCountOnSystem = getTotalMonitorCount();
            for (const check of cameraCountChecks) {
                if (check.condition && monitorCountOnSystem >= check.maxCameras) {
                    return false;
                }
            }
        }
        return true;
    }
    function getTotalMonitorCount() {
        let monitorCount = 0;
        try{
            for (const groupKey in s.group) {
                const monitorIds = Object.keys(s.group[groupKey].rawMonitorConfigurations);
                monitorCount += monitorIds.length;
            }
        }catch(err){
            s.debugLog(err)
        }
        return monitorCount;
    }
    function sanitizeMonitorConfig(monitorConfig){
        const sanitized = {}
        const errors = {}
        const availableKeys = [
            {name: 'ke', type: 'string'},
            {name: 'mid', type: 'string'},
            {name: 'name', type: 'string'},
            {name: 'details', type: 'longtext'},
            {name: 'type', type: 'string', defaultTo: 'h264'},
            {name: 'ext', type: 'string', defaultTo: 'mp4'},
            {name: 'protocol', type: 'string', defaultTo: 'rtsp'},
            {name: 'host', type: 'string', missingHalt: true },
            {name: 'path', type: 'string', missingHalt: true },
            {name: 'port', type: 'integer', defaultTo: 554},
            {name: 'fps', type: 'integer', defaultTo: null},
            {name: 'mode', type: 'string', defaultTo: 'stop'},
            {name: 'width', type: 'integer', defaultTo: 640},
            {name: 'height', type: 'integer', defaultTo: 480},
        ];
        for(item of availableKeys){
            const column = item.name;
            const type = item.type;
            const monitorValue = monitorConfig[column]
            let newValue = monitorValue;
            switch(type){
                case'string':
                case'longtext':
                    if(monitorValue instanceof String){

                    }else{
                        newValue = `${monitorValue}`;
                        errors[column] = `corrected ${type} type : ${typeof monitorValue}`;
                    }
                break;
                case'integer':
                    if(!isNaN(monitorValue)){

                    }else{
                        newValue = parseInt(monitorValue);
                        errors[column] = `corrected ${type} type : ${typeof monitorValue}`;
                    }
                break;
            }
            sanitized[column] = newValue;
        }
        return {
            sanitized,
            errors
        }
    }
    function isGroupBelowMaxMonitorCount(groupKey){
        const theGroup = s.group[groupKey];
        try{
            const initData = theGroup.init;
            const maxCamerasAllowed = parseInt(initData.max_camera) || false;
            return (!maxCamerasAllowed || Object.keys(theGroup.activeMonitors).length <= parseInt(maxCamerasAllowed))
        }catch(err){
            return true
        }
    }
    return {
        fetchTimeout,
        canAddMoreMonitors,
        getTotalMonitorCount,
        sanitizeMonitorConfig,
        isGroupBelowMaxMonitorCount,
    }
}
