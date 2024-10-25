var cpuIndicator = $('#indicator-cpu')
var cpuIndicatorBar = cpuIndicator.find('.progress-bar')
var cpuIndicatorPercentText = cpuIndicator.find('.indicator-percent')
var ramIndicator = $('#indicator-ram')
var ramIndicatorBar = ramIndicator.find('.progress-bar')
var ramIndicatorUsed = ramIndicator.find('.used')
var ramIndicatorPercentText = ramIndicator.find('.indicator-percent')
var diskIndicator = $('#indicator-disk')
var diskIndicatorBar = diskIndicator.find('.progress-bar')
var diskIndicatorBarUsed = diskIndicator.find('.value')
var diskIndicatorPercentText = diskIndicator.find('.indicator-percent')
var loadedIndicators = {}
function loadHiddenSectionsInForms(){
    window.boxWrappersHidden = dashboardOptions().boxWrappersHidden || {}
    $.each(boxWrappersHidden,function(boxId,hide){
        if(hide){
            $(`#${boxId}`).addClass('hide-box-wrapper')
        }
    })
}
function loadSwitchStates(){
    var theSwitches = dashboardOptions().switches;
    if(!theSwitches){
        theSwitches = {
            notifyHide: 0,
            monitorMuteAudio: 1,
        }
        dashboardOptions('switches',theSwitches)
    }
    $.each(theSwitches,function(systemSwitch,toggleState){
        setSwitchUIState(systemSwitch,toggleState)
        runDashboardSwitchCallback(systemSwitch)
    })
}
function loadClassToggleStates(){
    var theClassToggles = dashboardOptions().class_toggle;
    if(theClassToggles){
        $.each(theClassToggles,function(n,v){
            var classToToggle = v[0]
            var togglePosition = v[1]
            if(togglePosition === 1){
                $(n).addClass(v[0])
            }else{
                $(n).removeClass(v[0])
            }
            if(v[2] && v[3]){
                var iconTarget = v[3]
                var iconClassesToToggle = v[2]
                var iconElement = $(`[class_toggle="${classToToggle}"] ${iconTarget}`)
                iconElement
                    .addClass(iconClassesToToggle[togglePosition])
                    .removeClass(iconClassesToToggle[togglePosition === 1 ? 0 : 1])
            }
        })
    }
}
function loadDropdownToggleStates(){
    var theDropdownToggles = dashboardOptions().dropdown_toggle
    if(theDropdownToggles){
        $.each(theDropdownToggles,function(n,v){
            $('[dropdown_toggle="'+n+'"]').val(v).change()
        })
    }
}
function loadLocalStorageInputValues(){
    var theLocalStorageBasedInputs = dashboardOptions()
    if(theLocalStorageBasedInputs){
        $.each(theLocalStorageBasedInputs,function(n,v){
            if(typeof v==='string'){
                var el = $('[localStorage="'+n+'"]')
                if(el.is(':checkbox') === false){
                    el.val(v)
                }
            }
        })
    }
}
function onFullScreenChange() {
    var fullscreenElement = document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement;
    if(!fullscreenElement){
        $('.videoPlayer-detection-info').removeClass('hide')
        $('.fullscreen').removeClass('fullscreen')
        setTimeout(function(){
            $('canvas.stream-element').resize();
        },2000)
    }
}
function loadBoxWrappers() {
    window.boxWrappersHidden = dashboardOptions().boxWrappersHidden
}
function drawAddStorageIndicators(){
    $.each(addStorage,function(n,storage){
        drawIndicatorBar({
            multiple: true,
            icon: 'hdd-o',
            name: storage.name,
            label: `<span style="text-transform:capitalize">${storage.name}</span> : <span class="value"></span>`,
        })
        var el = $(`#indicator-${storage.name}`)
        loadedIndicators[storage.name] = {
            value: el.find('.value'),
            percent: el.find('.indicator-percent'),
            progressBar: el.find('.progress-bar'),
        }
    })
}
function showLoginNotices(){
    $.each([
        !$user.details.sub ? {
            isValid: !$user.details.size || parseInt($user.details.size) < 20000,
            PNotify: {
                type:'warning',
                title: lang['Max Storage Amount'],
                text: lang.setMaxStorageAmountText,
            }
        } : {}
    ],function(n,notice){
        if(notice.isValid){
            new PNotify(notice.PNotify)
        }
    })
}
$('body')
.one('click',function(){
    window.hadFocus = true
})
.on('change','[localStorage]',function(){
    var el = $(this)
    var keyName = el.attr('localStorage')
    var value = el.val()
    dashboardOptions(keyName,value)
})
.on('change','[dropdown_toggle]',function(){
    var el = $(this);
    var keyName = el.attr('dropdown_toggle');
    var value = el.val();
    var dropdownToggles = dashboardOptions().dropdown_toggle || {};
    dropdownToggles[keyName] = value
    dashboardOptions('dropdown_toggle',dropdownToggles)
})
.on('dblclick','[type="password"],.password_field',function(){
    var _this = $(this)
    var type = 'password'
    _this.addClass('password_field')
    if(_this.attr('type') === 'password'){
        type = 'text'
    }
    _this.attr('type',type)
})
function parseDiskUsePercent(diskUsed,diskLimit){
    return parseFloat((diskUsed/diskLimit)*100).toFixed(1)+'%'
}
onWebSocketEvent(function (d){
    switch(d.f){
        case'init_success':
            var coreCount = d.os.cpuCount
            var operatingSystem = d.os.platform
            var totalRAM = d.os.totalmem
            cpuIndicator.find('.os_cpuCount').text(coreCount)
            cpuIndicator.find('.os_platform').text(operatingSystem)
            ramIndicatorUsed.attr('title',`Total : ${(totalRAM/1048576).toFixed(2)}`)
            if(d.os.cpuCount > 1){
                cpuIndicator.find('.os_cpuCount_trailer').html('s')
            }
        break;
        case'log':
            logWriterDraw(d.mid, d)
        break;
        case'os'://indicator
            //cpu
            var cpuPercent = parseFloat(d.cpu).toFixed(1) + '%'
            cpuIndicatorBar.css('width',cpuPercent)
            cpuIndicatorPercentText.html(cpuPercent)
            //ram
            var ramPercent = parseFloat(d.ram.percent).toFixed(1) + '%'
            ramIndicatorBar.css('width',ramPercent)
            ramIndicatorPercentText.html(ramPercent)
            ramIndicatorUsed.html(d.ram.used.toFixed(2))
        break;
        case'diskUsed':
            var diskLimit = d.limit || 10000
            var diskUsed = d.size
            var percent = parseDiskUsePercent(diskUsed,diskLimit);
            var videosPercent = parseDiskUsePercent(d.usedSpaceVideos,diskLimit);
            var timelapsePercent = parseDiskUsePercent(d.usedSpaceTimelapseFrames,diskLimit);
            var fileBinPercent = parseDiskUsePercent(d.usedSpaceFilebin,diskLimit);
            var humanText = parseFloat(diskUsed)
            if(humanText > 1000){
                humanText = (humanText / 1000).toFixed(2) + ' GB'
            }else{
                humanText = humanText.toFixed(2) + ' MB'
            }
            diskIndicatorBarUsed.html(humanText)
            diskIndicatorPercentText.html(percent)
            diskIndicatorBar[0].style.width = videosPercent
            diskIndicatorBar[0].title = `${lang['Video Share']} : ${videosPercent}`
            diskIndicatorBar[1].style.width = timelapsePercent
            diskIndicatorBar[1].title = `${lang['Timelapse Frames Share']} : ${timelapsePercent}`
            diskIndicatorBar[2].style.width = fileBinPercent
            diskIndicatorBar[2].title = `${lang['FileBin Share']} : ${fileBinPercent}`
            if(d.addStorage){
                $.each(d.addStorage,function(n,storage){
                    var diskIndicator = loadedIndicators[storage.name]
                    var diskIndicatorBars = diskIndicator.progressBar
                    var diskLimit = storage.sizeLimit
                    var percent = parseDiskUsePercent(storage.usedSpace,diskLimit);
                    var videosPercent = parseDiskUsePercent(storage.usedSpaceVideos,diskLimit);
                    var timelapsePercent = parseDiskUsePercent(storage.usedSpaceTimelapseFrames,diskLimit);
                    //
                    var humanValue = parseFloat(storage.usedSpace)
                    if(humanValue > 1000){
                        humanValue = (humanValue/1000).toFixed(2)+' GB'
                    }else{
                        humanValue = humanValue.toFixed(2)+' MB'
                    }
                    diskIndicator.value.html(humanValue)
                    diskIndicator.percent.html(percent)
                    diskIndicatorBars[0].style.width = videosPercent
                    diskIndicatorBars[0].title = `${lang['Video Share']} : ${videosPercent}`
                    diskIndicatorBars[1].style.width = timelapsePercent
                    diskIndicatorBars[1].title = `${lang['Timelapse Frames Share']} : ${timelapsePercent}`
                })
            }
        break;
        case'monitor_status':
            updateInterfaceStatus(d);
        break;
    }
})
$(document).ready(function(){
    loadHiddenSectionsInForms()
    loadClassToggleStates()
    loadDropdownToggleStates()
    loadLocalStorageInputValues()
    loadBoxWrappers()
    drawAddStorageIndicators()
    showLoginNotices()
    // set onFullScreenChange
    document.addEventListener("fullscreenchange", onFullScreenChange, false);
    document.addEventListener("webkitfullscreenchange", onFullScreenChange, false);
    document.addEventListener("mozfullscreenchange", onFullScreenChange, false);
});
var soundAlarmInterval
var windowFocus = true
$(window).focus(function() {
    windowFocus = true
    clearInterval(soundAlarmInterval)
}).blur(function() {
    windowFocus = false
})
onDashboardReady(function(){
    loadSwitchStates()
})
