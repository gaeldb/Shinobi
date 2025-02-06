$(document).ready(function() {
    var selectedController = 0;
    var keyLegend = {
        "0": "b",
        "1": "a",
        "2": "y",
        "3": "x",
        "4": "l",
        "5": "r",
        "6": "zl",
        "7": "zr",
        "8": "minus",
        "9": "plus",
        "10": "l_stick",
        "11": "r_stick",
        "12": "up",
        "13": "down",
        "14": "left",
        "15": "right",
    }
    var lastState = {
        sticks: {
            left: {},
            right: {},
        }
    }
    var lastPtzDirection = {}
    var buttonsPressed = {}
    var hasGP = false;
    var repGP;
    var reportInterval = 200
    var stickBase = 2048
    var stickMax = 4096
    var deadZoneThreshold = 0.35
    var outerDeadZone = 1.01
    var selectedMonitor = dashboardOptions().gamepadMonitorSelection;
    var monitorKeys = {};
    var onMonitorOpenForGamepad = () => {}
    var sequenceButtonPressList = []
    var sequenceButtonPressTimeout = null
    var buttonPressAction = null;
    window.setGamepadMonitorSelection = (monitorId) => {
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

    function setCameraFromButtonCode(buttonCode = 0, preAdded){
        const addedOneToButtonCode = preAdded ? buttonCode : parseInt(buttonCode) + 1
        try{
            const monitor = loadedMonitors[monitorKeys[addedOneToButtonCode]];
            const isFullscreened = !!document.fullscreenElement;
            if(isFullscreened) {
                document.exitFullscreen()
                closeAllLiveGridPlayers(true)
            }
            openMonitorInLiveGrid(monitor.mid, function(){
                if(isFullscreened) {
                    fullScreenLiveGridStreamById(monitor.mid)
                }
            })

        }catch(err){
            new PNotify({
                title: lang['Invalid Action'],
                text: `${lang.ptzControlIdNotFound}<br><br>${lang['Button Code']} : ${addedOneToButtonCode}`,
                type: 'warning'
            });
            console.log('No Monitor Associated :', buttonCode)
        }
    }

    // function setCameraFromButtonNumbers(){
    //     const buttons = Object.keys(buttonsPressed).filter(code => buttonsPressed[code]);
    //     console.log('pressed', buttons)
    //     if(buttons.length > 1){
    //
    //     }else if(buttons.length > 0){
    //         const monitor = loadedMonitors[monitorKeys[buttons[0]]];
    //         console.log(monitorKeys[buttons[0]])
    //         openMonitorInLiveGrid(monitor.mid)
    //     }
    // }

    function openMonitorInLiveGrid(monitorId, callback){
        lastPtzDirection = {};
        setGamepadMonitorSelection(monitorId)
        mainSocket.f({
            f: 'monitor',
            ff: 'watch_on',
            id: monitorId
        })
        onMonitorOpenForGamepad = (monitorId) => {
            setTimeout(() => {
                if(monitorId === selectedMonitor){
                    onMonitorOpenForGamepad = () => {}
                    if(callback)callback()
                }
            }, 200)
        }
    }

    function sendPtzCommand(direction, doMove){
        runPtzMove(selectedMonitor, direction, doMove)
    }

    function sentPtzToHome(){
        runPtzCommand(selectedMonitor, 'center')
    }

    function translatePointTiltStick(x, y){
        if(x > stickBase && !lastPtzDirection['right']){
            lastPtzDirection['right'] = true
            lastPtzDirection['left'] = false
            // sendPtzCommand('left', false)
            sendPtzCommand('right', true)
        }else if(x < stickBase && !lastPtzDirection['left']){
            lastPtzDirection['left'] = true
            lastPtzDirection['right'] = false
            // sendPtzCommand('right', false)
            sendPtzCommand('left', true)
        }else if(x === stickBase){
            if(lastPtzDirection['right'])sendPtzCommand('right', false)
            if(lastPtzDirection['left'])sendPtzCommand('left', false)
            lastPtzDirection['right'] = false
            lastPtzDirection['left'] = false
        }
        if(y > stickBase && !lastPtzDirection['up']){
            lastPtzDirection['up'] = true
            lastPtzDirection['down'] = false
            // sendPtzCommand('down', false)
            sendPtzCommand('up', true)
        }else if(y < stickBase && !lastPtzDirection['down']){
            lastPtzDirection['down'] = true
            lastPtzDirection['up'] = false
            // sendPtzCommand('up', false)
            sendPtzCommand('down', true)
        }else if(y === stickBase){
            if(lastPtzDirection['up'])sendPtzCommand('up', false)
            if(lastPtzDirection['down'])sendPtzCommand('down', false)
            lastPtzDirection['down'] = false
            lastPtzDirection['up'] = false
        }
        console.log(lastPtzDirection)
    }

    function translateZoomAxis(value){
        if(value > stickBase && !lastPtzDirection['zoom_in']){
            lastPtzDirection['zoom_in'] = true
            lastPtzDirection['zoom_out'] = false
            // sendPtzCommand('zoom_out', false)
            sendPtzCommand('zoom_in', true)
        }else if(value < stickBase && !lastPtzDirection['zoom_out']){
            lastPtzDirection['zoom_out'] = true
            lastPtzDirection['zoom_in'] = false
            // sendPtzCommand('zoom_in', false)
            sendPtzCommand('zoom_out', true)
        }else if(value === stickBase){
            if(lastPtzDirection['zoom_in'])sendPtzCommand('zoom_in', false)
            if(lastPtzDirection['zoom_out'])sendPtzCommand('zoom_out', false)
            lastPtzDirection['zoom_in'] = false
            lastPtzDirection['zoom_out'] = false
        }
    }

    function reportOnXboxGamepad() {
        try{
            var gp = navigator.getGamepads()[0];
            getButtonsPressed(gp, function(buttonCode){
                if(buttonCode == 6){
                    sendPtzCommand('zoom_out', true)
                }else if(buttonCode == 7){
                    sendPtzCommand('zoom_in', true)
                }else if(buttonCode == 8){
                    if($('.popped-image').length > 0){
                        closeSnapshot()
                    }else{
                        openSnapshot()
                    }
                }else if(buttonCode == 9){
                    sentPtzToHome()
                }else if(buttonCode == 11){
                    if (!document.fullscreenElement) {
                        fullScreenLiveGridStreamById(selectedMonitor)
                    }else{
                        document.exitFullscreen()
                    }
                }else{
                    buttonPressAction(buttonCode)
                }
            }, function(buttonCode){
                if(buttonCode == 6){
                    sendPtzCommand('zoom_out', false)
                }else if(buttonCode == 7){
                    sendPtzCommand('zoom_in', false)
                }
            })
            getAnalogStickValues(gp, 0, function(stick, x, y){
                translatePointTiltStick(x, y)
            })
            getAnalogStickValues(gp, 2, function(stick, x, y){
                translateZoomAxis(y)
            })
        }catch(err){
            console.log(err)
            // stopReporting()
        }
    }

    function reportOnGenericGamepad() {
        try{
            const gp = navigator.getGamepads()[0];
            getButtonsPressed(gp, function(buttonCode){
                if(buttonCode == 10){
                    closeSnapshot()
                    openSnapshot()
                }else if(buttonCode == 11){
                    closeSnapshot()
                }else{
                    buttonPressAction(buttonCode)
                }
            },function(buttonCode){

            })
            getAnalogStickValues(gp, 0, function(stick, x, y){
                translatePointTiltStick(x, y)
            })
            getStickValue(gp, 2,function(value){
                translateZoomAxis(value)
            })
        }catch(err){
            console.log(err)
            // stopReporting()
        }
    }

    function openSnapshot(){
        getSnapshot(loadedMonitors[selectedMonitor],function(url){
            popImage(url)
        })
    }
    function closeSnapshot(){
        popImageClose()
    }


    function startReporting(){
        if(hasGP){
            console.log('Reading Gamepad')
            repGP = window.setInterval(reportOnGamepad, reportInterval);
        }
    }

    function stopReporting(){
        console.log('Stopping Gamepad')
        window.clearInterval(repGP)
    }

    function generateMonitorKeysFromPtzIds(){
        monitorKeys = []
        Object.values(loadedMonitors)
            .filter(item => !!parseInt(item.details.ptz_id))
            .sort((a, b) => parseInt(b.details.ptz_id) - parseInt(a.details.ptz_id))
            .forEach((item) => {
                console.log(item.details.ptz_id)
                monitorKeys[item.details.ptz_id] = item.mid;
            });
            console.log(monitorKeys)
    }

    function setControllerType(gamepadId){
        switch(true){
            case gamepadId.includes('Xbox'):
                reportInterval = 200;
                reportOnGamepad = reportOnXboxGamepad
                buttonPressAction = setCameraFromButtonCode
                console.log('Xbox Controller found!')
            break;
            default:
                reportInterval = 50;
                reportOnGamepad = reportOnGenericGamepad
                buttonPressAction = sequenceButtonPress
            break;
        }
    }
    var reportOnGamepad = reportOnXboxGamepad;

    function sequenceButtonPress(buttonCode){
        sequenceButtonPressList.push(buttonCode)
        clearTimeout(sequenceButtonPressTimeout)
        sequenceButtonPressTimeout = setTimeout(() => {
            const newButtonCode = parseInt(sequenceButtonPressList.map(item => `${parseInt(item) + 1}`).join(''))
            setCameraFromButtonCode(newButtonCode, true)
            sequenceButtonPressList = []
        },300)
    }

    if(canGame()) {
        $(window).on("gamepadconnected", function(e) {
            hasGP = true;
            if(tabTree.name === 'liveGrid'){
                startReporting()
            }
            const gamepadName = e.originalEvent.gamepad.id;
            setControllerType(gamepadName)
            console.log('Gamepad Connected!', gamepadName)
        })
        .on("gamepaddisconnected", function() {
            if(!navigator.getGamepads()[0]){
                hasGP = false;
                console.log('Gamepad Disconnected!')
            }
        })
    }
    onDashboardReady(function(d){
        generateMonitorKeysFromPtzIds();
    })
    onWebSocketEvent(function(d){
        switch(d.f){
            case'monitor_edit':
                generateMonitorKeysFromPtzIds();
            break;
            case'monitor_watch_on':
                var monitorId = d.mid || d.id;
                onMonitorOpenForGamepad(monitorId)
            break;
        }
    })
    addOnTabOpen('liveGrid', function () {
        startReporting()
    })
    addOnTabReopen('liveGrid', function () {
        startReporting()
    })
    addOnTabAway('liveGrid', function () {
        stopReporting()
    })
});
