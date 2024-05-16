var os = require('os');
var exec = require('child_process').exec;
module.exports = function(s,config,lang){
    const { fetchWithAuthentication, asyncSetTimeout } = require('../basic/utils.js')(process.cwd(),config)
    const moveLock = {}
    const ptzTimeoutsUntilResetToHome = {}
    const sliceUrlAuth = (url) => {
        return /^(.+?\/\/)(?:.+?:.+?@)?(.+)$/.exec(url).slice(1).join('')
    }
    function getGenericControlParameters(options,doStart){
        const monitorConfig = s.group[options.ke].rawMonitorConfigurations[options.id]
        const controlUrlMethod = monitorConfig.details.control_url_method || 'GET'
        const controlBaseUrl = monitorConfig.details.control_base_url || s.buildMonitorUrl(monitorConfig, true)
        let theURL;
        if(doStart){
            theURL = controlBaseUrl + monitorConfig.details[`control_url_${options.direction}`]
        }else{
            theURL = controlBaseUrl + monitorConfig.details[`control_url_${options.direction}_stop`]
        }
        let controlOptions = s.cameraControlOptionsFromUrl(theURL,monitorConfig);
        const hasDigestAuthEnabled = monitorConfig.details.control_digest_auth === '1'
        const requestUrl = controlBaseUrl + controlOptions.path
        return {
            monitorConfig,
            controlUrlMethod,
            controlBaseUrl,
            theURL,
            controlOptions,
            hasDigestAuthEnabled,
            requestUrl,
        }
    }
    function moveGeneric(options,doStart){
        if(!s.group[options.ke] || !s.group[options.ke].activeMonitors[options.id]){return}
        return new Promise((resolve,reject) => {
            if(doStart)moveLock[options.ke + options.id] = true;
            const {
                monitorConfig,
                controlUrlMethod,
                controlBaseUrl,
                theURL,
                controlOptions,
                hasDigestAuthEnabled,
                requestUrl,
            } = getGenericControlParameters(options,doStart)
            const response =  {
                ok: true,
                type: lang[doStart ? 'Control Triggered' : 'Control Trigger Ended']
            }
            var fetchWithAuthData;
            if (controlOptions.postData){
                fetchWithAuthData = {
                    method: controlUrlMethod || controlOptions.method,
                    digestAuth: hasDigestAuthEnabled,
                    postData: controlOptions.postData
                }
            }
            else{
                 fetchWithAuthData = {
                    method: controlUrlMethod || controlOptions.method,
                    digestAuth: hasDigestAuthEnabled
                }
            }
            const theRequest = fetchWithAuthentication(requestUrl,fetchWithAuthData);
            theRequest.then(res => res.text())
            .then((data) => {
                if(doStart){
                    const stopCommandEnabled = monitorConfig.details.control_stop === '1' || monitorConfig.details.control_stop === '2';
                    if(stopCommandEnabled && options.direction !== 'center'){
                        s.userLog(monitorConfig,{type: lang['Control Trigger Started']});
                    }else{
                        moveLock[options.ke + options.id] = false
                        s.userLog(monitorConfig,response);
                    }
                }else{
                    moveLock[options.ke + options.id] = false
                    s.userLog(monitorConfig,response);
                }
                resolve(response)
            });
            theRequest.catch((err) => {
                response.ok = false
                response.type = lang['Control Error']
                response.msg = err
                resolve(response)
            })
        })
    }
    function getOnvifControlOptions(options){
        const monitorConfig = s.group[options.ke].rawMonitorConfigurations[options.id]
        const invertedVerticalAxis = monitorConfig.details.control_invert_y === '1'
        const turnSpeed = parseFloat(monitorConfig.details.control_turn_speed) || 0.1
        const controlOptions = {
            Velocity : {}
        }
        if(options.axis){
            options.axis.forEach((axis) => {
                controlOptions.Velocity[axis.direction] = axis.amount < 0 ? -turnSpeed : axis.amount > 0 ? turnSpeed : 0
            })
        }else{
            const onvifDirections = {
                "left": [-turnSpeed,'x'],
                "right": [turnSpeed,'x'],
                "down": [invertedVerticalAxis ? turnSpeed : -turnSpeed,'y'],
                "up": [invertedVerticalAxis ? -turnSpeed : turnSpeed,'y'],
                "zoom_in": [turnSpeed,'z'],
                "zoom_out": [-turnSpeed,'z']
            }
            const direction = onvifDirections[options.direction]
            controlOptions.Velocity[direction[1]] = direction[0]
        }
        (['x','y','z']).forEach(function(axis){
            if(!controlOptions.Velocity[axis])
                controlOptions.Velocity[axis] = 0
        })
        return controlOptions
    }
    async function startMoveOnvif(options,callback){
        const controlOptions = getOnvifControlOptions(options);
        let activeMonitor = s.group[options.ke].activeMonitors[options.id]
        let device = activeMonitor.onvifConnection
        if(
            !device ||
            !device.current_profile ||
            !device.current_profile.token
        ){
            const response = await s.createOnvifDevice({
                ke: options.ke,
                id: options.id,
            })
            device = activeMonitor.onvifConnection
        }
        function returnResponse(){
            return new Promise((resolve,reject) => {
                if(
                    !device ||
                    !device.current_profile ||
                    !device.current_profile.token
                ){
                    resolve({ok: false, msg: lang.ONVIFEventsNotAvailableText1})
                    return
                }
                controlOptions.ProfileToken = device.current_profile.token
                s.runOnvifMethod({
                    auth: {
                        ke: options.ke,
                        id: options.id,
                        action: 'continuousMove',
                        service: 'ptz',
                    },
                    options: controlOptions,
                },resolve)
            })
        }
        return await returnResponse();
    }
    function stopMoveOnvif(options){
        return new Promise((resolve,reject) => {
            const device = s.group[options.ke].activeMonitors[options.id].onvifConnection
            try{
                s.runOnvifMethod({
                    auth: {
                        ke: options.ke,
                        id: options.id,
                        action: 'stop',
                        service: 'ptz',
                    },
                    options: {
                        'PanTilt': true,
                        'Zoom': true,
                        ProfileToken: device.current_profile.token
                    },
                },resolve)
            }catch(err){
                resolve({ok: false})
            }
        })
    }
    function relativeMoveOnvif(options){
        return new Promise((resolve,reject) => {
            const controlOptions = getOnvifControlOptions(options);
            controlOptions.Speed = {'x': 1, 'y': 1, 'z': 1}
            controlOptions.Translation = Object.assign(controlOptions.Velocity,{})
            delete(controlOptions.Velocity)
            moveLock[options.ke + options.id] = true
            s.runOnvifMethod({
                auth: {
                    ke: options.ke,
                    id: options.id,
                    action: 'relativeMove',
                    service: 'ptz',
                },
                options: controlOptions,
            },(response) => {
                if(response.ok){
                    resolve({type: 'Control Triggered'})
                }else{
                    resolve({type: 'Control Triggered', error: response.error})
                }
                moveLock[options.ke + options.id] = false
            })
        })
    }
    function moveOnvifCamera(options,doMove){
        return new Promise((resolve,reject) => {
            const monitorConfig = s.group[options.ke].rawMonitorConfigurations[options.id]
            const controlUrlStopTimeout = parseInt(monitorConfig.details.control_url_stop_timeout) || 1000
            options.direction = doMove ? options.direction : 'stopMove';
            switch(options.direction){
                case'center':
                    const onvifHomeControlMethod = monitorConfig.details.onvif_non_standard
                    const actionFunction = onvifHomeControlMethod === '2' ? moveToHomePosition : moveToPresetPosition
                    moveLock[options.ke + options.id] = true
                    actionFunction({
                        ke: options.ke,
                        id: options.id,
                    },(endData) => {
                        moveLock[options.ke + options.id] = false
                        resolve({ type: lang['Moving to Home Preset'], msg: endData })
                    })
                break;
                case'stopMove':
                    stopMoveOnvif({
                        ke: options.ke,
                        id: options.id,
                    }).then((response) => {
                        moveLock[options.ke + options.id] = false
                        resolve({ type: lang['Control Trigger Ended'], msg: response })
                    })
                break;
                default:
                    try{
                        moveLock[options.ke + options.id] = true
                        startMoveOnvif(options).then((moveResponse) => {
                            if(!moveResponse.ok){
                                s.debugLog('ONVIF Move Error',moveResponse)
                            }
                            resolve({ type: lang['Control Triggered'], msg: moveResponse })
                        })
                    }catch(err){
                        console.log(err)
                        console.log(new Error())
                    }
                break;
            }
        })
    }
    async function startMove(options){
        const monitorConfig = s.group[options.ke].rawMonitorConfigurations[options.id]
        const controlUrlMethod = monitorConfig.details.control_url_method || 'GET'
        if(controlUrlMethod === 'ONVIF'){
            return await moveOnvifCamera(options,true);
        }else{
            return await moveGeneric(options,true);
        }
    }
    async function stopMove(options){
        const monitorConfig = s.group[options.ke].rawMonitorConfigurations[options.id]
        const controlUrlMethod = monitorConfig.details.control_url_method || 'GET'
        if(controlUrlMethod === 'ONVIF'){
            return await moveOnvifCamera(options,false);
        }else{
            return await moveGeneric(options,false);
        }
    }
    async function ptzControl(options,callback){
        if(!s.group[options.ke] || !s.group[options.ke].activeMonitors[options.id]){return}
        const monitorConfig = s.group[options.ke].rawMonitorConfigurations[options.id]
        const controlUrlMethod = monitorConfig.details.control_url_method || 'GET'
        const controlUrlStopTimeout = options.moveTimeout || parseInt(monitorConfig.details.control_url_stop_timeout) || 1000
        const stopCommandEnabled = monitorConfig.details.control_stop === '1' || monitorConfig.details.control_stop === '2';
        const axisLock = monitorConfig.details.control_axis_lock
        const direction = options.direction
        if(monitorConfig.details.control !== "1"){
            s.userLog(monitorConfig,{
                type: lang['Control Error'],
                msg: lang.ControlErrorText1
            });
            return {
                ok: false,
                msg: lang.ControlErrorText1
            }
        }
        let response = {
            direction,
        }
        if(axisLock){
            const isHorizontalOnly = axisLock === '1'
            const isVerticalOnly = axisLock === '2'
            const moveIsHorizontal = direction === 'left' || direction === 'right'
            const moveIsVertical = direction === 'up' || direction === 'down'
            if(
                isHorizontalOnly && moveIsVertical ||
                isVerticalOnly && moveIsHorizontal
            ){
                response.ok = false
                response.msg = isHorizontalOnly ? lang['Pan Only'] : lang['Tilt Only']
                return response
            }
        }
        if(controlUrlMethod === 'ONVIF'){
            if(direction === 'center'){
                response.moveResponse = await moveOnvifCamera(options,true)
            }else if(stopCommandEnabled){
                response.moveResponse = await moveOnvifCamera(options,true)
                if(direction !== 'stopMove' && direction !== 'center'){
                    await asyncSetTimeout(controlUrlStopTimeout)
                    response.stopMoveResponse = await moveOnvifCamera(options,false)
                    response.ok = response.moveResponse.ok && response.stopMoveResponse.ok;
                }else{
                    response.ok = response.moveResponse.ok;
                }
            }else{
                response = await relativeMoveOnvif(options);
            }
        }else{
            if(direction === 'stopMove'){
                response = await moveGeneric(options,false)
            }else{
                // left, right, up, down, center
                response.moveResponse = await moveGeneric(options,true)
                if(stopCommandEnabled){
                    await asyncSetTimeout(controlUrlStopTimeout)
                    response.stopMoveResponse = await moveGeneric(options,false)
                    response.ok = response.moveResponse.ok && response.stopMoveResponse.ok;
                }else{
                    response.ok = response.moveResponse.ok;
                }
            }
        }
        if(callback)callback(response);
        return response;
    }
    const getPresetPositions = (options,callback) => {
        const profileToken = options.ProfileToken || "__CURRENT_TOKEN"
        return s.runOnvifMethod({
            auth: {
                ke: options.ke,
                id: options.id,
                service: 'ptz',
                action: 'getPresets',
            },
            options: {
                ProfileToken: profileToken
            },
        },callback)
    }
    const setPresetForCurrentPosition = (options,callback) => {
        return new Promise((resolve) => {
            const nonStandardOnvif = s.group[options.ke].rawMonitorConfigurations[options.id].details.onvif_non_standard === '1'
            const profileToken = options.ProfileToken || "__CURRENT_TOKEN"
            s.runOnvifMethod({
                auth: {
                    ke: options.ke,
                    id: options.id,
                    service: 'ptz',
                    action: 'setPreset',
                },
                options: {
                    ProfileToken: profileToken,
                    PresetToken: nonStandardOnvif ? '1' : options.PresetToken || profileToken,
                    PresetName: options.PresetName || nonStandardOnvif ? '1' : profileToken
                },
            },(response) => {
                if(callback)callback(response)
                resolve(response)
            })
        })
    }
    const moveToPresetPosition = (options,callback) => {
        const nonStandardOnvif = s.group[options.ke].rawMonitorConfigurations[options.id].details.onvif_non_standard === '1'
        const profileToken = options.ProfileToken || "__CURRENT_TOKEN"
        return s.runOnvifMethod({
            auth: {
                ke: options.ke,
                id: options.id,
                service: 'ptz',
                action: 'gotoPreset',
            },
            options: {
                ProfileToken: profileToken,
                PresetToken: options.PresetToken || nonStandardOnvif ? '1' : profileToken,
                Speed: {
                   "x": 1,
                   "y": 1,
                   "z": 1
                },
            },
        },callback)
    }
    const moveToHomePosition = (options,callback) => {
        const groupKey = options.ke
        const monitorId = options.mid || options.id
        const nonStandardOnvif = s.group[groupKey].rawMonitorConfigurations[monitorId].details.onvif_non_standard === '1'
        const profileToken = options.ProfileToken || "__CURRENT_TOKEN"
        return s.runOnvifMethod({
            auth: {
                ke: groupKey,
                id: monitorId,
                service: 'ptz',
                action: 'gotoHomePosition',
            },
            options: {
                ProfileToken: profileToken,
            },
        },callback)
    }
    const setHomePosition = (options,callback) => {
        return new Promise((resolve) => {
            const nonStandardOnvif = s.group[options.ke].rawMonitorConfigurations[options.id].details.onvif_non_standard === '1'
            const profileToken = options.ProfileToken || "__CURRENT_TOKEN"
            s.runOnvifMethod({
                auth: {
                    ke: options.ke,
                    id: options.id,
                    service: 'ptz',
                    action: 'setHomePosition',
                },
                options: {
                    ProfileToken: profileToken,
                },
            },(response) => {
                if(callback)callback(response)
                resolve(response)
            })
        })
    }
    const moveToHomePositionTimeout = (event) => {
        const groupKey = event.ke
        const monitorId = event.id
        const monitorConfig = s.group[groupKey].rawMonitorConfigurations[monitorId]
        const onvifHomeControlMethod = monitorConfig.details.onvif_non_standard
        const actionFunction = onvifHomeControlMethod === '2' ? moveToHomePosition : moveToPresetPosition
        clearTimeout(ptzTimeoutsUntilResetToHome[event.ke + event.id])
        ptzTimeoutsUntilResetToHome[event.ke + event.id] = setTimeout(() => {
            actionFunction({
                ke: event.ke,
                id: event.id,
            },(endData) => {
                s.debugLog(endData)
            })
        },7000)
    }
    const getLargestMatrix = (matrices,imgWidth,imgHeight) => {
        var largestMatrix = {width: 0, height: 0}
        const maxWidth = imgWidth * 0.95;
        const maxHeight = imgHeight * 0.95;
        matrices.forEach((matrix) => {
            const matrixWidth = matrix.width
            const matrixHeight = matrix.height
            if(
                matrixWidth > largestMatrix.width &&
                matrixHeight > largestMatrix.height &&
                matrixWidth <= maxWidth &&
                matrixHeight <= maxHeight
            )largestMatrix = matrix;
        })
        return largestMatrix.x ? largestMatrix : null
    }
    const moveCameraPtzToMatrix = function(event,trackingTarget){
        if(moveLock[event.ke + event.id])return;
        trackingTarget = trackingTarget || 'person'
        const imgHeight = event.details.imgHeight
        const imgWidth = event.details.imgWidth
        const thresholdX = imgWidth * 0.125
        const thresholdY = imgHeight * 0.125
        const imageCenterX = imgWidth / 2
        const imageCenterY = imgHeight / 2
        const matrices = event.details.matrices || []
        const largestMatrix = getLargestMatrix(matrices.filter(matrix => trackingTarget.indexOf(matrix.tag) > -1),imgWidth,imgHeight)
        if(!largestMatrix)return;
        const monitorConfig = s.group[event.ke].rawMonitorConfigurations[event.id]
        const invertedVerticalAxis = monitorConfig.details.control_invert_y === '1'
        const turnSpeed = parseFloat(monitorConfig.details.control_turn_speed) || 0.1
        const matrixCenterX = largestMatrix.x + (largestMatrix.width / 2)
        const matrixCenterY = largestMatrix.y + (largestMatrix.height / 2)
        const rawDistanceX = (matrixCenterX - imageCenterX)
        const rawDistanceY = (matrixCenterY - imageCenterY)
        const percentX = parseFloat((rawDistanceX / imgWidth).toFixed(2));
        const percentY = parseFloat((rawDistanceY / imgHeight).toFixed(2));
        const turnSpeedX = parseFloat(monitorConfig.details.control_turn_speed) || 0.1
        const turnSpeedY = parseFloat(monitorConfig.details.control_turn_speed) || 0.1
        const distanceX = imgWidth / rawDistanceX
        const distanceY = imgHeight / rawDistanceY
        const axisX = rawDistanceX > thresholdX || rawDistanceX < -thresholdX ? distanceX : 0
        const axisY = largestMatrix.y < 30 && largestMatrix.height > imgHeight * 0.8 ? 0.5 : rawDistanceY > thresholdY || rawDistanceY < -thresholdY ? -distanceY : 0
        if(axisX !== 0 || axisY !== 0){
            ptzControl({
                axis: [
                    {direction: 'x', amount: axisX === 0 ? 0 : axisX > 0 ? turnSpeedX : -turnSpeedX},
                    {direction: 'y', amount: axisY === 0 ? 0 : axisY > 0 ? invertedVerticalAxis ? -turnSpeedY : turnSpeedY : invertedVerticalAxis ? turnSpeedY : -turnSpeedY},
                    {direction: 'z', amount: 0},
                ],
                moveTimeout: 500,
                id: event.id,
                ke: event.ke
            },(msg) => {
                s.userLog(event,{
                    type: lang['Control'],
                    msg: msg
                });
                // console.log(msg)
                moveToHomePositionTimeout(event)
            })
        }else{
            moveToHomePositionTimeout(event)
        }
    }
    async function setHomePositionPreset(e){
        const groupKey = e.ke
        const monitorId = e.mid || e.id
        const controlOptions = {
            ke: groupKey,
            id: monitorId
        }
        const waitTime = 5000
        let response = {ok: false}
        const monitorConfig = s.group[groupKey].rawMonitorConfigurations[monitorId]
        const onvifHomeControlMethod = monitorConfig.details.onvif_non_standard
        const actionFunction = onvifHomeControlMethod === '2' ? setHomePosition : setPresetForCurrentPosition
        await asyncSetTimeout(waitTime)
        response = await actionFunction(controlOptions)
        if(response.ok === false){
            await asyncSetTimeout(waitTime)
            response = await actionFunction(controlOptions)
            if(response.ok === false){
                await asyncSetTimeout(waitTime)
                response = await actionFunction(controlOptions)
            }
        }
        return response
    }
    return {
        startMove,
        stopMove,
        ptzControl,
        getPresetPositions,
        setPresetForCurrentPosition,
        moveToPresetPosition,
        moveCameraPtzToMatrix,
        setHomePositionPreset,
        moveToHomePosition,
    }
}
