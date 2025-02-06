function setGamepadMonitorSelection(monitorId) => {
    dashboardOptions('gamepadMonitorSelection', monitorId);
    selectedMonitor = `${monitorId}`;
}

function canGame() {
   return "getGamepads" in navigator;
}

function convertStickAxisTo2048(value){
   var newVal = parseInt((stickMax - stickBase) * value + stickBase)
   return newVal
}

function getAnalogStickValues(gp, i, callback){
    var label = i === 0 ? 'left' : 'right'
    var horizontal = gp.axes[i] * outerDeadZone
    var vertical = gp.axes[i + 1] * outerDeadZone
    var newH = convertStickAxisTo2048(horizontal > deadZoneThreshold || horizontal < -deadZoneThreshold ? horizontal : 0)
    var newV = convertStickAxisTo2048((vertical > deadZoneThreshold || vertical < -deadZoneThreshold ? vertical : 0) * -1)
    if(
        newH !== lastState.sticks[label].h ||
        newV !== lastState.sticks[label].v
    ){
        callback(label, newH, newV)
    }
    lastState.sticks[label].h = newH
    lastState.sticks[label].v = newV
}

function getStickValue(gp, i, callback){
    var label = `axis${axis}`;
    var axis = gp.axes[i] * outerDeadZone
    var newH = convertStickAxisTo2048(axis > deadZoneThreshold || axis < -deadZoneThreshold ? axis : 0)
    if(newH !== lastState[label]){
        callback(newH)
    }
    lastState[label] = newH
}

function getButtonsPressed(gp, callback, offCallback = () => {}){
    $.each(keyLegend,function(code,key){
        if(gp.buttons[code] && gp.buttons[code].pressed){
            if(!lastState[key]){
                buttonsPressed[code] = true;
                callback(code)
            }
            lastState[key] = true
        }else{
            if(lastState[key]){
                buttonsPressed[code] = false;
                offCallback(code)
            }
            lastState[key] = false
        }
    })
}

function sendPtzCommand(direction, doMove){
    runPtzMove(selectedMonitor, direction, doMove)
}

function sentPtzToHome(){
    runPtzCommand(selectedMonitor, 'center')
}
