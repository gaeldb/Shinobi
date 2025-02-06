var loadedMonitors = {}
var selectedMonitors = {}
PNotify.prototype.options.styling = "fontawesome";
var wallViewMonitorList = $('#wallview-monitorList')
var wallViewMonitorListContainer = $('#wallview-monitorList-container')
var wallViewControls = $('#wallview-controls')
var wallViewCanvas = $('#wallview-canvas')
var wallViewInfoScreen = $('#wallview-info-screen')
var theWindow = $(window);
var lastWindowWidth = theWindow.width()
var lastWindowHeight = theWindow.height()
var websocketPath = checkCorrectPathEnding(urlPrefix.replace(location.origin, '')) + 'socket.io'
function checkCorrectPathEnding(x){
    var length=x.length
    if(x.charAt(length-1)!=='/'){
        x=x+'/'
    }
    return x
}
function dashboardOptions(r,rr,rrr){
    if(!rrr){rrr={};};if(typeof rrr === 'string'){rrr={n:rrr}};if(!rrr.n){rrr.n='ShinobiOptions_'+location.host+'_'+$user.ke+$user.uid}
    ii={o:localStorage.getItem(rrr.n)};try{ii.o=JSON.parse(ii.o)}catch(e){ii.o={}}
    if(!ii.o){ii.o={}}
    if(r&&rr&&!rrr.x){
        ii.o[r]=rr;
    }
    switch(rrr.x){
        case 0:
            delete(ii.o[r])
        break;
        case 1:
            delete(ii.o[r][rr])
        break;
    }
    localStorage.setItem(rrr.n,JSON.stringify(ii.o))
    return ii.o
}
function getQueryString(){
    var theObject = {}
    location.search.substring(1).split('&').forEach(function(string){
        var parts = string.split('=')
        theObject[parts[0]] = parts[1]
    })
    return theObject
}
function featureIsActivated(showNotice){
    if(userHasSubscribed){
        return true
    }else{
        if(showNotice){
            new PNotify({
                title: lang.activationRequired,
                text: lang.featureRequiresActivationText,
                type: 'warning'
            })
        }
        return false
    }
}
function createWallViewWindow(windowName){
    var el = $(document)
    var width = el.width()
    var height = el.height()
    window.open(getApiPrefix() + '/wallview/' + groupKey + (windowName ? '?window=' + windowName : ''), 'wallview_'+windowName, 'height='+height+',width='+width)
}
function getApiPrefix(innerPart){
    return `${urlPrefix}${authKey}${innerPart ? `/${innerPart}/${groupKey}` : ''}`
}
function getWindowName(){
    const urlParams = new URLSearchParams(window.location.search);
    const theWindowChoice = urlParams.get('window');
    return theWindowChoice || '1'
}
function drawMonitorList(){
    return new Promise((resolve) => {
        $.get(getApiPrefix('monitor'),function(monitors){
            $.each(monitors, function(n,monitor){
                if(monitor.mode !== 'stop' && monitor.mode !== 'idle'){
                    loadedMonitors[monitor.mid] = monitor;
                }
            })
            var tags = getListOfTagsFromMonitors()
            var monitorsOrdered = Object.values(loadedMonitors).sort((a, b) => a.name.localeCompare(b.name));
            var allFound = [
                {
                    attributes: `tag=""`,
                    class: `cursor-pointer wallview-open-monitor-group`,
                    color: 'forestgreen',
                    label: lang['All Monitors'],
                }
            ]
            $.each(tags,function(tag,monitors){
                allFound.push({
                    attributes: `tag="${tag}"`,
                    class: `cursor-pointer wallview-open-monitor-group`,
                    color: 'blue',
                    label: tag,
                })
            })
            $.each(monitorsOrdered,function(monitorKey,monitor){
                var monitorId = monitor.mid
                var label = monitor.name
                allFound.push({
                    attributes: `select-monitor="${monitorId}"`,
                    class: `cursor-pointer`,
                    color: 'grey',
                    label,
                })
            })
            var html = allFound.map(item => `<div class="mb-1 search-row"><a class="btn d-block btn-primary btn-sm ${item.class}" ${item.attributes} href="#">${item.label}</a></div>`).join('')
            wallViewMonitorList.html(html)
            resolve(monitors)
        })
    })
}

function getMonitorListItem(monitorId){
    return wallViewMonitorList.find(`[select-monitor="${monitorId}"]`)
}

function selectMonitor(monitorId, css){
    css = css || {};
    var embedHost = getQueryString().host || `/`;
    var isSelected = selectedMonitors[monitorId]
    if(isSelected)return;
    var numberOfSelected = Object.keys(selectedMonitors)
    if(numberOfSelected > 3 && !featureIsActivated(true)){
        return
    }
    selectedMonitors[monitorId] = Object.assign({}, loadedMonitors[monitorId]);
    wallViewCanvas.append(`<div class="wallview-video p-0 m-0" live-stream="${monitorId}" style="left:${css.left || 0}px;top:${css.top || 0}px;width:${css.width ? css.width + 'px' : '50vw'};height:${css.height ? css.height + 'px' : '50vh'};"><div class="overlay"><div class="wallview-item-controls text-end"><a class="btn btn-sm btn-outline-danger wallview-item-close"><i class="fa fa-times"></i></a></div></div><iframe src="${getApiPrefix('embed')}/${monitorId}/fullscreen%7Cjquery%7Crelative?host=${embedHost}"></iframe></div>`)
    wallViewCanvas.find(`[live-stream="${monitorId}"]`)
    .draggable({
        grid: [40, 40],
        snap: '#wallview-canvas',
        containment: "window",
        stop: function(){
            saveLayout()
        }
    })
    .resizable({
        grid: [40, 40],
        snap: '#wallview-container',
        stop: function(){
            saveLayout()
        }
    });
    getMonitorListItem(monitorId).removeClass('btn-primary').addClass('btn-warning')
}
function deselectMonitor(monitorId){
    delete(selectedMonitors[monitorId])
    var monitorItem = wallViewCanvas.find(`[live-stream="${monitorId}"]`);
    monitorItem.find('iframe').attr('src','about:blank')
    monitorItem.remove()
    getMonitorListItem(monitorId).removeClass('btn-warning').addClass('btn-primary')
}

function getCurrentLayout(){
    var layout = []
    wallViewCanvas.find('.wallview-video').each(function(n,v){
        var el = $(v)
        var monitorId = el.attr('live-stream')
        var position = el.position()
        layout.push({
            monitorId,
            css: {
                left: position.left,
                top: position.top,
                width: el.width(),
                height: el.height(),
            }
        })
    })
    return layout
}

function saveLayout(){
    var windowName = getWindowName();
    var layouts = getAllLayouts();
    var layout = getCurrentLayout();
    var saveContainer = {
        layout,
        windowInnerWidth: window.innerWidth,
        windowInnerHeight: window.innerHeight,
    }
    layouts[windowName] = saveContainer;
    localStorage.setItem('windowLayouts', JSON.stringify(layouts));
}

function getAllLayouts(){
    return JSON.parse(localStorage.getItem(`windowLayouts`) || '{}');
}

function getLayout(full){
    var windowName = getWindowName();
    var saveContainer = getAllLayouts()[windowName]
    if(full)return saveContainer || { layout: [] };
    var layout = saveContainer.layout || []
    return layout;
}

function resetWindowDimensions(){
    var saveContainer = getLayout(true);
    if(saveContainer.windowInnerWidth && saveContainer.windowInnerHeight){
        var widthDiff = window.outerWidth - window.innerWidth;
        var heightDiff = window.outerHeight - window.innerHeight;
        lastWindowWidth = saveContainer.windowInnerWidth
        lastWindowHeight = saveContainer.windowInnerHeight
        window.resizeTo(saveContainer.windowInnerWidth + widthDiff, saveContainer.windowInnerHeight + heightDiff);
    }
}

function loadSavedLayout(){
    var saveContainer = getLayout(true);
    resetWindowDimensions()
    saveContainer.layout.forEach(function({ monitorId, css }, n){
        selectMonitor(monitorId, css);
    });
    displayInfoScreen();
}

function displayInfoScreen(){
    if(getCurrentLayout().length === 0){
        wallViewInfoScreen.css('display','flex')
    }else{
        wallViewInfoScreen.hide()
    }
}
function resizeMonitorItem({ monitorId, css }, oldWidth, oldHeight, newWidth, newHeight){
    var monitorItem = wallViewCanvas.find(`[live-stream="${monitorId}"]`);
    var newCss = rescaleMatrix(css, oldWidth, oldHeight, newWidth, newHeight)
    monitorItem.css(newCss)
}
function rescaleMatrix(matrix, oldWidth, oldHeight, newWidth, newHeight) {
    const scaleX = newWidth / oldWidth;
    const scaleY = newHeight / oldHeight;

    return {
        left: matrix.left * scaleX,
        top: matrix.top * scaleY,
        width: matrix.width * scaleX,
        height: matrix.height * scaleY
    };
}

function onWindowResize(){
    var currentWindowWidth = theWindow.width()
    var currentWindowHeight = theWindow.height()
    var layout = getCurrentLayout();
    for(item of layout){
        resizeMonitorItem(item,lastWindowWidth,lastWindowHeight,currentWindowWidth,currentWindowHeight)
    }
    lastWindowWidth = currentWindowWidth
    lastWindowHeight = currentWindowHeight
}

function autoPlaceCurrentMonitorItems() {
    const wallviewVideos = wallViewCanvas.find('.wallview-video');
    const totalItems = wallviewVideos.length;

    let numRows, numCols;

    if (totalItems === 6 || totalItems === 5) {
        numCols = 3;
        numRows = 2;
    } else {
        numRows = Math.ceil(Math.sqrt(totalItems));
        numCols = Math.ceil(totalItems / numRows);
    }

    const containerWidth = wallViewCanvas.width();
    const containerHeight = wallViewCanvas.height();
    const itemWidth = containerWidth / numCols;
    const itemHeight = containerHeight / numRows;

    wallviewVideos.each(function(index, element) {
        const row = Math.floor(index / numCols);
        const col = index % numCols;

        $(element).css({
            left: col * itemWidth,
            top: row * itemHeight,
            width: itemWidth,
            height: itemHeight
        });
    });
}

function openAllMonitors(){
    $.each(loadedMonitors,function(monitorId, monitor){
        var modeAccepted = monitor.mode !== 'stop' && monitor.mode !== 'idle'
        if(modeAccepted)selectMonitor(monitorId)
    })
    autoPlaceCurrentMonitorItems()
    displayInfoScreen()
    saveLayout()
}

function openMonitors(monitorIds, savePlaces){
    $.each(monitorIds,function(n, monitorId){
        selectMonitor(monitorId)
    })
    autoPlaceCurrentMonitorItems()
    displayInfoScreen()
    if(savePlaces)saveLayout()
}

function openNextMonitors(numberOf){
    var allLayouts = getAllLayouts()
    var ignoreMonitors = []
    var availableMonitors = []
    var numberToOpen = parseInt(numberOf) || 4;
    $.each(allLayouts,function(windowName, { layout }){
        $.each(layout,function(n, { monitorId }){
            ignoreMonitors.push(monitorId)
        })
    });
    $.each(loadedMonitors,function(monitorId, monitor){
        if(ignoreMonitors.indexOf(monitor.mid) === -1){
            var modeAccepted = monitor.mode !== 'stop' && monitor.mode !== 'idle'
            if(modeAccepted)availableMonitors.push(monitorId)
        }
    });
    for (let i = 0; i < numberToOpen; i++) {
        selectMonitor(availableMonitors[i])
    }
    autoPlaceCurrentMonitorItems()
    displayInfoScreen()
    saveLayout()
}

function closeAllMonitors(){
    $.each(loadedMonitors,function(monitorId, monitor){
        deselectMonitor(monitorId)
    })
    displayInfoScreen()
    saveLayout()
}

addExtender('onDashboardReady')

$(document).ready(function(){
    drawMonitorList().then(() => {
        loadSavedLayout()
        setTimeout(() => {
            theWindow.resize(() => {
                onWindowResize()
                saveLayout()
            })
            executeExtender('onDashboardReady')
        },500)
    })
    $('body')
    .on('click', '[select-monitor]', function(e){
        e.preventDefault()
        var el = $(this);
        var monitorId = el.attr('select-monitor')
        var isSelected = selectedMonitors[monitorId]
        if(isSelected){
            deselectMonitor(monitorId)
        }else{
            selectMonitor(monitorId)
        }
        displayInfoScreen()
        saveLayout()
    })
    .on('click', '.open-wallview', function(e){
        e.preventDefault()
        var windowName = getWindowName();
        if(isNaN(windowName)){
            windowName = windowName + '2'
        }else{
            windowName = `${parseInt(windowName) + 1}`
        }
        createWallViewWindow(windowName)
    })
    .on('click', '.wallview-autoplace', function(e){
        e.preventDefault()
        autoPlaceCurrentMonitorItems()
        saveLayout()
    })
    .on('click', '.wallview-item-close', function(e){
        e.preventDefault()
        var monitorId = $(this).parents('[live-stream]').attr('live-stream')
        deselectMonitor(monitorId)
    })
    .on('click', '.wallview-open-all', function(e){
        e.preventDefault()
        openAllMonitors()
    })
    .on('click', '.wallview-open-next', function(e){
        e.preventDefault()
        var numberOf = $(this).attr('number-of')
        openNextMonitors(numberOf)
    })
    .on('click', '.wallview-close-all', function(e){
        e.preventDefault()
        closeAllMonitors()
    })
    .on('click', '.wallview-toggle-monitor-list', function(e){
        e.preventDefault();
        wallViewMonitorListContainer.toggleClass('d-none')
        return false;
    })
    .on('click', '.wallview-open-monitor-group', function(e){
        e.preventDefault();
        var el = $(this)
        var tag = el.attr('tag')
        if(!tag){
            for(monitorId of Object.keys(loadedMonitors)){
                selectMonitor(monitorId)
            }
        }else{
            var tags = getListOfTagsFromMonitors()
            var monitorIds = tags[tag]
            for(monitorId of monitorIds){
                selectMonitor(monitorId)
            }
        }
        autoPlaceCurrentMonitorItems()
        displayInfoScreen()
        saveLayout()
        return false;
    })
    .on('keyup','.search-parent .search-controller',function(){
        var _this = this;
        var parent = $(this).parents('.search-parent')
        $.each(parent.find(".search-body .search-row"), function() {
            if($(this).text().toLowerCase().indexOf($(_this).val().toLowerCase()) === -1)
               $(this).hide();
            else
               $(this).show();
        });
    });
    createWebsocket(location.origin,{
        path: websocketPath
    });
});
