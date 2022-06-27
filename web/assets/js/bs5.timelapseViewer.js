$(document).ready(function(e){
    //Timelapse JPEG Window
    var timelapseWindow = $('#tab-timelapseViewer')
    var sideLinkListBox = $('#side-menu-link-timelapseViewer ul')
    var dateSelector = $('#timelapsejpeg_date')
    var fpsSelector = $('#timelapseJpegFps')
    var framesContainer = timelapseWindow.find('.frames')
    var frameStrip = timelapseWindow.find('.frameStrip')
    var frameIcons = timelapseWindow.find('.frameIcons')
    var fieldHolder = timelapseWindow.find('.fieldHolder')
    var frameStripPreview = timelapseWindow.find('.frameStripPreview')
    var frameStripContainer = timelapseWindow.find('.frameStripContainer')
    var playBackViewImage = timelapseWindow.find('.playBackView img')
    var liveStreamView = timelapseWindow.find('.liveStreamView')
    var monitorsList = timelapseWindow.find('.monitors_list')
    var downloadButton = timelapseWindow.find('.download_mp4')
    var apiBaseUrl = getApiPrefix()
    var downloadRecheckTimers = {}
    var currentPlaylist = {}
    var frameSelected = null
    var playIntervalTimer = null
    var fieldHolderCssHeightModifier = 0
    var canPlay = false;
    var downloaderIsChecking = false
    var allowKeepChecking = true
    var currentPlaylistArray = []

    var openTimelapseWindow = function(monitorId,startDate,endDate){
        drawTimelapseWindowElements(monitorId,startDate,endDate)
    }
    var getSelectedTime = function(asUtc){
        var dateRange = dateSelector.data('daterangepicker')
        var startDate = dateRange.startDate.clone()
        var endDate = dateRange.endDate.clone()
        if(asUtc){
            startDate = startDate.utc()
            endDate = endDate.utc()
        }
        startDate = startDate.format('YYYY-MM-DDTHH:mm:ss')
        endDate = endDate.format('YYYY-MM-DDTHH:mm:ss')
        return {
            startDate: startDate,
            endDate: endDate
        }
    }

    dateSelector.daterangepicker({
        startDate: moment().utc().subtract(2, 'days'),
        endDate: moment().utc(),
        timePicker: true,
        locale: {
            format: 'YYYY/MM/DD hh:mm:ss A'
        }
    }, function(start, end, label) {
        drawTimelapseWindowElements()
    })
    monitorsList.change(function(){
        drawTimelapseWindowElements()
        getLiveStream()
    })
    var getLiveStream = function(){
        var selectedMonitor = monitorsList.val()
        liveStreamView.html(`<iframe src="${apiBaseUrl + '/embed/' + $user.ke + '/' + selectedMonitor + '/jquery|fullscreen'}"></iframe>`)
        liveStreamView.find('iframe').width(playBackViewImage.width())

    }
    var drawTimelapseWindowElements = function(selectedMonitor,startDate,endDate){
        setDownloadButtonLabel(lang['Build Video'], 'database')
        var dateRange = getSelectedTime(false)
        if(!startDate)startDate = dateRange.startDate
        if(!endDate)endDate = dateRange.endDate
        if(!selectedMonitor)selectedMonitor = monitorsList.val()
        var queryString = [
            'start=' + startDate,
            'end=' + endDate,
            'noLimit=1'
        ]
        var frameIconsHtml = ''
        var apiURL = apiBaseUrl + '/timelapse/' + $user.ke + '/' + selectedMonitor
        $.getJSON(apiURL + '?' + queryString.join('&'),function(data){
            if(data && data[0]){
                var firstFilename = data[0].filename
                frameSelected = firstFilename
                currentPlaylist = {}
                currentPlaylistArray = []
                $.each(data.reverse(),function(n,fileInfo){
                    fileInfo.href = apiURL + '/' + fileInfo.filename.split('T')[0] + '/' + fileInfo.filename
                    fileInfo.number = n
                    frameIconsHtml += '<div class="col-md-4 frame-container"><div class="frame" data-filename="' + fileInfo.filename + '" frame-container-unloaded="' + fileInfo.href + '"><div class="button-strip"><button type="button" class="btn btn-sm btn-danger delete"><i class="fa fa-trash-o"></i></button></div><div class="shade">' + moment(fileInfo.time).format('YYYY-MM-DD HH:mm:ss') + '</div></div></div>'
                    currentPlaylist[fileInfo.filename] = fileInfo
                })
                currentPlaylistArray = data
                frameIcons.html(frameIconsHtml)
                frameIcons.find(`.frame:first`).click()
                // getLiveStream()
                resetFilmStripPositions()
                loadVisibleTimelapseFrames()
            }else{
                frameIconsHtml = lang['No Data']
                frameIcons.html(frameIconsHtml)
            }
        })
    }
    var resetFilmStripPositions = function(){
        var numberOfFrames = Object.keys(currentPlaylist).length
        var fieldHolderHeight = fieldHolder.height() + fieldHolderCssHeightModifier
        frameIcons.css({height:"calc(100% - 15px - " + fieldHolderHeight + "px)"})
    }
    var setPlayBackFrame = function(href,callback){
        playBackViewImage
        .off('load').on('load',function(){
            playBackViewImage.off('error')
            if(callback)callback()
        })
        .off('error').on('error',function(){
            if(callback)callback()
        })
        playBackViewImage[0].src = href
    }
    var startPlayLoop = function(){
        var selectedFrame = currentPlaylist[frameSelected]
        var selectedFrameNumber = currentPlaylist[frameSelected].number
        setPlayBackFrame(selectedFrame.href,function(){
            frameIcons.find(`.frame.selected`).removeClass('selected')
            frameIcons.find(`.frame[data-filename="${selectedFrame.filename}"]`).addClass('selected')
            clearTimeout(playIntervalTimer)
            playIntervalTimer = setTimeout(function(){
                if(!canPlay)return
                ++selectedFrameNumber
                var newSelectedFrame = currentPlaylistArray[selectedFrameNumber]
                if(!newSelectedFrame)return
                frameSelected = newSelectedFrame.filename
                startPlayLoop()
            },1000/parseInt(fpsSelector.val(),10))
        })
    }
    var playTimelapse = function(){
        var playPauseText = timelapseWindow.find('.playPauseText')
        canPlay = true
        playPauseText.text(lang.Pause)
        startPlayLoop()
    }
    var destroyTimelapse = function(){
        playBackViewImage.off('load')
        frameSelected = null
        pauseTimelapse()
        frameIcons.empty()
        setPlayBackFrame(null)
        allowKeepChecking = false
    }
    var pauseTimelapse = function(){
        var playPauseText = timelapseWindow.find('.playPauseText')
        canPlay = false
        playPauseText.text(lang.Play)
        clearTimeout(playIntervalTimer)
        playIntervalTimer = null
    }
    var togglePlayPause = function(){
        if(canPlay){
            pauseTimelapse()
        }else{
            playTimelapse()
        }
    }
    var iconHtml = function(iconClasses,withSpace){
        if(withSpace === undefined)withSpace = true
        return `<i class="fa fa-${iconClasses}"></i>` + (withSpace ? ' ' : '')
    }
    var setDownloadButtonLabel = function(text,icon){
        downloadButton.html(icon ? iconHtml(icon) + text : text)
    }
    timelapseWindow.on('click','.frame',function(){
        pauseTimelapse()
        var selectedFrame = $(this).attr('data-filename')
        if(selectedFrame === frameSelected){
            return togglePlayPause()
        }
        frameSelected = selectedFrame
        frameIcons.find(`.frame.selected`).removeClass('selected')
        frameIcons.find(`.frame[data-filename="${selectedFrame}"]`).addClass('selected')
        var href = currentPlaylist[selectedFrame].href
        setPlayBackFrame(href)
    })
    timelapseWindow.on('click','.playPause',function(){
        togglePlayPause()
    })
    timelapseWindow.on('click','.frame .delete',function(e){
        e.stopPropagation()
        var el = $(this).parents('.frame')
        var filename = el.attr('data-filename')
        var frame = currentPlaylist[filename]
        $.confirm.create({
            title: lang['Delete Timelapse Frame'],
            body: lang.DeleteThisMsg + `<br><br><img style="max-width:100%" src="${frame.href}">`,
            clickOptions: {
                class: 'btn-danger',
                title: lang.Delete,
            },
            clickCallback: function(){
                $.getJSON(frame.href + '/delete',function(response){
                    if(response.ok){
                        el.parent().remove()
                    }
                })
            }
        })
    })
    timelapseWindow.on('click','.download_mp4',function(){
        var fps = fpsSelector.val()
        var dateRange = getSelectedTime(false)
        var startDate = dateRange.startDate
        var endDate = dateRange.endDate
        var selectedMonitor = monitorsList.val()
        var parsedFrames = JSON.stringify(currentPlaylistArray.map(function(frame){
            return {
                mid: frame.mid,
                ke: frame.ke,
                filename: frame.filename,
            }
        }));
        $.post(apiBaseUrl + '/timelapseBuildVideo/' + $user.ke + '/' + selectedMonitor,{
            fps: fps,
            frames: parsedFrames,
        },function(response){
            setDownloadButtonLabel(response.msg, '')
            new PNotify({
                title: lang['Timelapse Frames Video'],
                text: response.msg,
                type: response.fileExists ? 'success' : 'info'
            })
            if(response.fileExists)downloadTimelapseVideo(response);
        })
    })
    function isElementVisible (el) {
      const holder = frameIcons[0]
      const { top, bottom, height } = el.getBoundingClientRect()
      const holderRect = holder.getBoundingClientRect()

      return top <= holderRect.top
        ? holderRect.top - top <= height
        : bottom - holderRect.bottom <= height
    }
    function loadVisibleTimelapseFrames(){
        frameIcons.find('[frame-container-unloaded]').each(function(n,v){
            if(isElementVisible(v)){
                var el = $(v)
                var imgSrc = el.attr('frame-container-unloaded')
                el.removeAttr('frame-container-unloaded').attr('style',`background-image:url(${imgSrc})`)
            }
        })
    }
    function buildFileBinUrl(data){
        return apiBaseUrl + '/fileBin/' + data.ke + '/' + data.mid + '/' + data.name
    }
    function downloadTimelapseVideo(data){
        var downloadUrl = buildFileBinUrl(data)
        var a = document.createElement('a')
        a.href = downloadUrl
        a.download = data.name
        a.click()
    }
    function onTimelapseVideoBuildComplete(data){
        var saveBuiltVideo = dashboardOptions().switches.timelapseSaveBuiltVideo
        if(saveBuiltVideo === 1){
            new PNotify({
                title: lang['Timelapse Video Build Complete'],
                text: lang.yourFileDownloadedShortly,
                type: 'success',
            })
        }else{
            new PNotify({
                title: lang['File Download Ready'],
                text: `<a class="btn btn-sm btn-success" href="${buildFileBinUrl(data)}">${lang.Download}</a>`,
                type: 'success',
                sticky: true,
            })
        }
    }
    function drawTimelapseVideoProgressBar(data){
        var html = `<li data-mid="${data.mid}" data-ke="${data.mid}" data-name="${data.name}">
            <div class="text-white cursor-pointer d-flex flex-row" style="align-items: center;justify-content: center;">
                <span class="dot shadow mr-2 dot-green"></span>
                <div>
                    ${lang.Building}...
                </div>
                <div class="flex-grow-1 px-2 pt-1">
                    <div class="progress" style="height:18px">
                        <div class="progress-bar progress-bar-warning" role="progressbar" style="width: ${data.percent}%;">${data.percent}%</div>
                    </div>
                </div>
                <div style="display:none;" class="download-button">
                    <a class="badge badge-sm badge-success" download href="${buildFileBinUrl(data)}"><i class="fa fa-download"></i></a>
                </div>
            </div>
        </li>`
        sideLinkListBox.append(html)
    }
    onWebSocketEvent(function(data){
        switch(data.f){
            case'fileBin_item_added':
                var saveBuiltVideo = dashboardOptions().switches.timelapseSaveBuiltVideo
                if(data.timelapseVideo && saveBuiltVideo === 1){
                    downloadTimelapseVideo(data)
                    var progressItem = sideLinkListBox.find(`[data-mid="${data.mid}"][data-ke="${data.mid}"][data-name="${data.name}"]`)
                    progressItem.find('.download-button').show()
                }
            break;
            case'timelapse_build_percent':
                var progressItem = sideLinkListBox.find(`[data-mid="${data.mid}"][data-ke="${data.mid}"][data-name="${data.name}"]`)
                if(data.percent === '100.0'){
                    onTimelapseVideoBuildComplete(data)
                }
                if(progressItem.length === 0){
                    drawTimelapseVideoProgressBar(data)
                }else{
                    progressItem = sideLinkListBox.find(`[data-mid="${data.mid}"][data-ke="${data.mid}"][data-name="${data.name}"]`)
                    progressItem.find('.progress-bar').css('width',`${data.percent}%`).text(`${data.percent}%`)
                    progressItem.find('.percent').text(data.percent)
                }
                console.log(data)
            break;
        }
    })
    frameIcons.on('scroll',loadVisibleTimelapseFrames)
    $('body').on('click','.open-timelapse-viewer',function(){
        var el = $(this).parents('[data-mid]')
        var monitorId = el.attr('data-mid')
        openTab(`timelapseViewer`,{},null)
        monitorsList.val(monitorId).change()
    })
    setDownloadButtonLabel(lang['Build Video'], 'database')
    addOnTabOpen('timelapseViewer', function () {
        if(!monitorsList.val()){
            drawMonitorListToSelector(monitorsList)
            drawTimelapseWindowElements()
        }
    })
    addOnTabReopen('timelapseViewer', function () {
        var theSelected = `${monitorsList.val()}`
        drawMonitorListToSelector(monitorsList)
        monitorsList.val(theSelected)
        resetFilmStripPositions()
    })
    addOnTabAway('timelapseViewer',function(){
        pauseTimelapse()
    })
})
