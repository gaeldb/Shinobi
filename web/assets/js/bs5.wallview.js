var loadedMonitors = {}
var selectedMonitors = {}
var selectedMonitorsCount = 0
$(document).ready(function(){
    PNotify.prototype.options.styling = "fontawesome";
    var wallViewMonitorList = $('#wallview-monitorList')
    var wallViewControls = $('#wallview-controls')
    var wallViewCanvas = $('#wallview-canvas')
    var wallViewInfoScreen = $('#wallview-info-screen')
    var lastWindowWidth = $(window).width()
    var lastWindowHeight = $(window).height()
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
        const theWindow = urlParams.get('window');
        return theWindow || '1'
    }
    function drawMonitorListItem(monitor){
        wallViewMonitorList.append(`<li><a class="dropdown-item" select-monitor="${monitor.mid}" href="#"><i class="fa fa-check"></i> ${monitor.name}</a></li>`)
    }
    function drawMonitorList(){
        return new Promise((resolve) => {
            $.get(getApiPrefix('monitor'),function(monitors){
                $.each(monitors, function(n,monitor){
                    if(monitor.mode !== 'stop' && monitor.mode !== 'idle'){
                        loadedMonitors[monitor.mid] = monitor;
                        drawMonitorListItem(monitor)
                    }
                })
                resolve(monitors)
            })
        })
    }

    function getMonitorListItem(monitorId){
        return wallViewMonitorList.find(`[select-monitor="${monitorId}"]`)
    }

    function selectMonitor(monitorId, css){
        css = css || {};
        var numberOfSelected = Object.keys(selectedMonitors)
        if(numberOfSelected > 3 && !featureIsActivated(true)){
            return
        }
        ++selectedMonitorsCount
        selectedMonitors[monitorId] = Object.assign({}, loadedMonitors[monitorId]);
        wallViewCanvas.append(`<div class="wallview-video p-0 m-0" live-stream="${monitorId}" style="left:${css.left || 0}px;top:${css.top || 0}px;width:${css.width ? css.width + 'px' : '50vw'};height:${css.height ? css.height + 'px' : '50vh'};"><div class="overlay"></div><iframe src="${getApiPrefix('embed')}/${monitorId}/fullscreen%7Cjquery%7Crelative?host=/"></iframe></div>`)
        wallViewCanvas.find(`[live-stream="${monitorId}"]`)
        .draggable({
            grid: [10, 10],
            snap: '#wallview-canvas',
            containment: "window",
            stop: function(){
                saveLayout()
            }
        })
        .resizable({
            grid: [10, 10],
            snap: '#wallview-container',
            stop: function(){
                saveLayout()
            }
        });
        getMonitorListItem(monitorId).addClass('active')
    }
    function deselectMonitor(monitorId){
        --selectedMonitorsCount
        delete(selectedMonitors[monitorId])
        var monitorItem = wallViewCanvas.find(`[live-stream="${monitorId}"]`);
        monitorItem.find('iframe').attr('src','about:blank')
        monitorItem.remove()
        getMonitorListItem(monitorId).removeClass('active')
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
        var layout = getCurrentLayout();
        localStorage.setItem(`windowLayout_${windowName}`, JSON.stringify(layout))
    }

    function getLayout(){
        var windowName = getWindowName();
        var layout = JSON.parse(localStorage.getItem(`windowLayout_${windowName}`) || '[]')
        return layout;
    }

    function loadSavedLayout(){
        var layout = getLayout()
        layout.forEach(function({ monitorId, css }, n){
            selectMonitor(monitorId, css)
        })
        displayInfoScreen()
    }

    function displayInfoScreen(){
        if(selectedMonitorsCount === 0){
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
        var theWindow = $(window);
        var currentWindowWidth = theWindow.width()
        var currentWindowHeight = theWindow.height()
        var layout = getCurrentLayout();
        for(item of layout){
            resizeMonitorItem(item,lastWindowWidth,lastWindowHeight,currentWindowWidth,currentWindowHeight)
        }
        lastWindowWidth = currentWindowWidth
        lastWindowHeight = currentWindowHeight
    }

    drawMonitorList().then(loadSavedLayout)
    $(window).resize(onWindowResize)
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
})
