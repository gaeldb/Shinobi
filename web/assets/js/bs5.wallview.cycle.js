var wallViewCycleTimer = null;
var cycleLiveOptionsBefore = null;
var cycleLiveOptions = null;
var cycleLiveMoveNext = function(){}
var cycleLiveMovePrev = function(){}
var cycleLiveFullList = null
var cycleLiveCurrentPart = null
function getRunningMonitors(asArray){
    const foundMonitors = {}
    $.each(loadedMonitors,function(monitorId,monitor){
        if(
            monitor.mode === 'start' ||
            monitor.mode === 'record'
        ){
            foundMonitors[monitorId] = monitor
        }
    })
    return asArray ? Object.values(foundMonitors) : foundMonitors
}
function getListOfMonitorsToCycleLive(chosenTags,useMonitorIds){
    var monitors = []
    if(useMonitorIds){
        monitors = getMonitorsFromIds(chosenTags)
    }else if(chosenTags){
        var tags = sanitizeTagList(chosenTags)
        monitors = getMonitorsFromTags(tags)
    }else{
        monitors = getRunningMonitors(true)
    }
    return monitors;
}
function getPartForCycleLive(fullList, afterMonitorId, numberOfMonitors) {
    const startIndex = afterMonitorId ? fullList.findIndex(monitor => monitor.mid === afterMonitorId) : -1;
    const result = [];
    for (let i = 1; i <= numberOfMonitors; i++) {
        const index = (startIndex + i) % fullList.length;
        result.push(fullList[index]);
    }
    return result;
}
function displayCycleSetOnLiveGrid(monitorsList){
    cycleLiveCurrentPart = [].concat(monitorsList)
    closeAllMonitors()
    openMonitors(monitorsList.map(monitor => monitor.mid))
}
// rotator
function stopCycleLive(){
    clearTimeout(wallViewCycleTimer)
    wallViewCycleTimer = null
}
function resumeCycleLive(fullList,partForCycle,numberOfMonitors){
    const theLocalStorage = dashboardOptions()
    const cycleLiveTimerAmount = parseInt(theLocalStorage.cycleLiveTimerAmount) || 30000
    function next(){
        var afterMonitorId = partForCycle.slice(-1)[0].mid;
        partForCycle = getPartForCycleLive(fullList,afterMonitorId,numberOfMonitors)
        displayCycleSetOnLiveGrid(partForCycle)
        reset()
    }
    function prev(){
        var firstInPart = partForCycle[0].mid;
        var firstPartIndex = fullList.findIndex(monitor => monitor.mid === firstInPart)
        var backedToIndex = (firstPartIndex - (numberOfMonitors + 1) + fullList.length) % fullList.length;
        var beforeMonitorId = fullList[backedToIndex].mid
        partForCycle = getPartForCycleLive(fullList,beforeMonitorId,numberOfMonitors, true)
        displayCycleSetOnLiveGrid(partForCycle)
        reset()
    }
    function reset(){
        clearTimeout(wallViewCycleTimer)
        wallViewCycleTimer = setTimeout(function(){
            next()
        },cycleLiveTimerAmount)
    }
    reset()
    cycleLiveMoveNext = next
    cycleLiveMovePrev = prev
}
function beginCycleLive({
    chosenTags,
    useMonitorIds,
    numberOfMonitors,
    monitorHeight,
}){
    var fullList = getListOfMonitorsToCycleLive(chosenTags,useMonitorIds)
    var partForCycle = getPartForCycleLive(fullList,null,numberOfMonitors)
    cycleLiveFullList = [].concat(fullList)
    displayCycleSetOnLiveGrid(partForCycle)
    stopCycleLive()
    resumeCycleLive(fullList,partForCycle,numberOfMonitors)
}
function toggleCycleLiveState(toggleState){
    console.log('Toggle Cycle', toggleState)
    const cycleControls = $('.wallview-cycle-control')
    if(toggleState){
        cycleControls.hide()
        cycleLiveOptions = null
        cycleLiveOptionsBefore = null
        stopCycleLive()
    }else{
        cycleControls.show()
        cycleLiveOptionsBefore = cycleLiveOptions ? Object.assign({},cycleLiveOptions) : null
        const theLocalStorage = dashboardOptions()
        const cycleLivePerRow = parseInt(theLocalStorage.cycleLivePerRow) || 2
        const cycleLiveNumberOfMonitors = parseInt(theLocalStorage.cycleLiveNumberOfMonitors) || 4
        const cycleLiveMonitorHeight = parseInt(theLocalStorage.cycleLiveMonitorHeight) || 4
        cycleLiveOptions = {
            chosenTags: null,
            useMonitorIds: null,
            monitorsPerRow: cycleLivePerRow,
            numberOfMonitors: cycleLiveNumberOfMonitors,
            monitorHeight: cycleLiveMonitorHeight,
        }
        beginCycleLive(cycleLiveOptions)
    }
}
function keyShortcutsForCycleLive(enable) {
    function cleanup(){
        document.removeEventListener('keydown', keyShortcuts['cycleLive'].keydown);
        document.removeEventListener('keyup', keyShortcuts['cycleLive'].keyup);
        delete(keyShortcuts['cycleLive'])
    }
    if(enable){
        let isKeyPressed = false;
        function handleKeyboard(event){
            if (isKeyPressed) {
                return;
            }
            event.preventDefault();
            switch(event.code){
                case 'Space':
                    isKeyPressed = true;
                    if(wallViewCycleTimer){
                        stopCycleLive()
                    }else{
                        resumeCycleLive(
                            cycleLiveFullList,
                            cycleLiveCurrentPart,
                            cycleLiveOptions.numberOfMonitors
                        )
                    }
                break;
                case 'ArrowLeft':
                    isKeyPressed = true;
                    cycleLiveMovePrev();
                break;
                case 'ArrowRight':
                    isKeyPressed = true;
                    cycleLiveMoveNext();
                break;
            }
        }
        function handleKeyup(event) {
            isKeyPressed = false;
        }
        keyShortcuts['cycleLive'] = {
            keydown: handleKeyboard,
            keyup: handleKeyup,
        }
        document.addEventListener('keydown', keyShortcuts['cycleLive'].keydown);
        document.addEventListener('keyup', keyShortcuts['cycleLive'].keyup);
    }else{
        cleanup()
    }
}

$(document).ready(function(){
    $('body')
    .on('click', '.wallview-cycle', function(e){
        toggleCycleLiveState(!!wallViewCycleTimer)
    })
    .on('click', '.wallview-cycle-back', function(e){
        cycleLiveMovePrev();
    })
    .on('click', '.wallview-cycle-front', function(e){
        cycleLiveMoveNext();
    })
})
