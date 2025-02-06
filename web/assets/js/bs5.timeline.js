$(document).ready(function(){
    var theWindow = $('#tab-timeline')
    var timeStripVideoCanvas = $('#timeline-video-canvas');
    var timeStripEl = $('#timeline-bottom-strip');
    var timeStripControls = $('#timeline-controls');
    var timeStripInfo = $('#timeline-info');
    var timeStripPreBuffers = $('#timeline-pre-buffers');
    var timeStripObjectSearchInput = $('#timeline-video-object-search');
    var dateSelector = $('#timeline-date-selector');
    var sideMenuList = $(`#side-menu-link-timeline ul`)
    var monitorList = $(`#timeline-monitor-list`)
    var videoTypeSelector = $(`#timeline-video-type`)
    var playToggles = timeStripControls.find('[timeline-action="playpause"]')
    var speedButtons = timeStripControls.find('[timeline-action="speed"]')
    var gridSizeButtons = timeStripControls.find('[timeline-action="gridSize"]')
    var autoGridSizerButtons = timeStripControls.find('[timeline-action="autoGridSizer"]')
    var playUntilVideoEndButtons = timeStripControls.find('[timeline-action="playUntilVideoEnd"]')
    var currentTimeLabel = timeStripInfo.find('.current-time')
    var timelineActionButtons = timeStripControls.find('[timeline-action]')
    var timelineSpeed = 1;
    var timelineGridSizing = `md-6`;
    var timeStripVis = null;
    var timeStripVisTick = null;
    var timeStripVisItems = null;
    var timeStripCurrentStart = null;
    var timeStripCurrentEnd = null;
    var timeStripVisTickMovementInterval = null;
    var timeStripVisTickMovementIntervalSecond = null;
    var timeStripHollowClickQueue = {}
    var timeStripTickPosition = new Date()
    var timeStripPreBuffersEls = {}
    var timeStripItemColors = {}
    var timeStripAutoGridSizer = false
    var timeStripListOfQueries = []
    var timeStripSelectedMonitors = dashboardOptions().timeStripSelectedMonitors || []
    var timeStripAutoScrollTimeout = null;
    var timeStripAutoScrollPositionStart = null;
    var timeStripAutoScrollPositionEnd = null;
    var timeStripAutoScrollAmount = null;
    var timeStripItemIncrement = 0;
    var loadedVideosOnTimeStrip = []
    var loadedMonitorsOnCanvas = []
    var loadedVideosOnCanvas = {}
    var loadedVideoElsOnCanvas = {}
    var loadedVideoElsOnCanvasNextVideoTimeout = {}
    var loadedVideoEndingTimeouts = {}
    var playUntilVideoEnd = false
    var dontShowDetectionOnTimeline = true
    var isPlaying = false
    var earliestStart = null
    var latestEnd = null
    var timeChanging = false
    var dateRangeChanging = false
    var lastDateChecked = new Date(0)
    var monitorSelectionElements = []
    var sideMenuListMissing = sideMenuList.length === 0;
    var selectingMonitorList = (sideMenuListMissing ? monitorList : sideMenuList);
    function setLoadingMask(turnOn){
        if(turnOn){
            if(theWindow.find('.loading-mask').length === 0){
                var html = `<div class="loading-mask"><i class="fa fa-spinner fa-pulse fa-5x"></i></div>`
                theWindow.prepend(html)
            }
        }else{
            theWindow.find('.loading-mask').remove()
        }

    }
    function addVideoBeforeAndAfter(videos) {
        videos.sort((a, b) => {
            if (a.mid === b.mid) {
                return new Date(a.time) - new Date(b.time);
            }
            return a.mid.localeCompare(b.mid);
        });
        for (let i = 0; i < videos.length; i++) {
            if (i > 0 && videos[i].mid === videos[i - 1].mid) {
                videos[i].videoBefore = videos[i - 1];
            } else {
                videos[i].videoBefore = null;
            }
            if (i < videos.length - 1 && videos[i].mid === videos[i + 1].mid) {
                videos[i].videoAfter = videos[i + 1];
            } else {
                videos[i].videoAfter = null;
            }
        }
        return videos;
    }
    function findGapsInSearchRanges(timeRanges, range) {
        timeRanges.sort((a, b) => a[0] - b[0]);
        let gaps = [];
        let currentEnd = new Date(range[0]);
        for (let i = 0; i < timeRanges.length; i++) {
            let [start, end] = timeRanges[i];
            if (start > currentEnd) {
                gaps.push([currentEnd, start]);
            }
            if (end > currentEnd) {
                currentEnd = end;
            }
        }
        if (currentEnd < range[1]) {
            gaps.push([currentEnd, range[1]]);
        }
        return gaps;
    }
    async function getVideosInGaps(gaps,monitorIds){
        var searchQuery = timeStripObjectSearchInput.val()
        var videoType = videoTypeSelector.val()
        var wantArchivedVideo = videoType === 'archive'
        var wantCloudVideo = videoType === 'cloud' && !wantArchivedVideo
        var andOnly = searchQuery.startsWith('and:')
        var videos = []
        var eventLimit = Object.values(loadedMonitors).length * 300
        searchQuery = andOnly ? searchQuery.replace('and:','') : searchQuery;
        async function loopOnGaps(monitorId){
            for (let i = 0; i < gaps.length; i++) {
                var range = gaps[i]
                var videosFound = (await getVideos({
                    monitorId,
                    startDate: range[0],
                    endDate: range[1],
                    eventLimit,
                    searchQuery,
                    andOnly: andOnly ? '1' : '0',
                    archived: wantArchivedVideo,
                    customVideoSet: wantCloudVideo ? 'cloudVideos' : null,
                },null,dontShowDetectionOnTimeline)).videos;
                videos.push(...videosFound);
                executeExtender('timelineGetVideosByMonitor', [monitorId, videosFound])
            }
        }
        if(monitorIds && monitorIds.length > 0){
            for (let ii = 0; ii < monitorIds.length; ii++) {
                var monitorId = monitorIds[ii]
                await loopOnGaps(monitorId)
            }
        }else{
            await loopOnGaps('')
        }
        return videos;
    }
    async function getVideosByTimeStripRange(addOrOverWrite){
        var currentVideosLength = parseInt(loadedVideosOnTimeStrip.length)
        var stripDate = getTimestripDate()
        var startDate = stripDate.start
        var endDate = stripDate.end
        var dateNow = new Date()
        var isOverCacheTime = dateNow.getTime() - lastDateChecked.getTime() >= 20 * 60 * 1000;
        if(isOverCacheTime){
            timeStripListOfQueries = []
            loadedVideosOnTimeStrip = []
        }
        if(timeStripSelectedMonitors.length > 0){
            var gaps = findGapsInSearchRanges(timeStripListOfQueries, [startDate,endDate])
            if(gaps.length > 0){
                setLoadingMask(true)
                timeStripListOfQueries.push(...gaps)
                var videos = await getVideosInGaps(gaps,timeStripSelectedMonitors)
                executeExtender('timelineGetVideos', [videos])
                videos = addVideoBeforeAndAfter(videos)
                loadedVideosOnTimeStrip.push(...videos)
                if(currentVideosLength !== loadedVideosOnTimeStrip.length)addTimelineItems(loadedVideosOnTimeStrip);
                setLoadingMask(false)
            }
            lastDateChecked = new Date();
        }
        lastDateChecked = new Date();
        return loadedVideosOnTimeStrip
    }
    function selectVideosForCanvas(time, videos){
        var selectedVideosByMonitorId = {}
        $.each(loadedMonitors,function(n,monitor){
            selectedVideosByMonitorId[monitor.mid] = null
        })
        var filteredVideos = videos.filter(video => {
          var startTime = new Date(video.time);
          var endTime = new Date(video.end);
          return time >= startTime && time <= endTime;
        });
        $.each(filteredVideos,function(n,video){
            selectedVideosByMonitorId[video.mid] = video;
        })
        return selectedVideosByMonitorId;
    }
    function drawVideosToCanvas(selectedVideosByMonitorId){
        var html = ''
        var preBufferHtml = ''
        $.each(loadedMonitors,function(monitorId,monitor){
            var itemColor = timeStripItemColors[monitorId];
            html += `<div class="timeline-video open-video col-${timelineGridSizing} p-0 m-0 no-video" data-mid="${monitorId}" data-ke="${monitor.ke}" style="background-color:${itemColor}">
                <div class="film"></div>
                <div class="event-objects"></div>
            </div>`
            preBufferHtml += `<div class="timeline-video-buffer" data-mid="${monitorId}" data-ke="${monitor.ke}"></div>`
        })
        timeStripVideoCanvas.html(html)
        timeStripPreBuffers.html(preBufferHtml)
        $.each(selectedVideosByMonitorId,function(monitorId,video){
            if(!video)return;
            setVideoInCanvas(video)
        })
    }
    function destroyTimeline(){
        try{
            timeStripVis.destroy()
        }catch(err){
            // console.log(err)
        }
    }
    function formatVideosForTimeline(videos){
        var formattedVideos = [];
        (videos || []).forEach((video) => {
            var blockColor = timeStripItemColors[video.mid];
            ++timeStripItemIncrement;
            formattedVideos.push({
                id: timeStripItemIncrement,
                content: ``,
                style: `background-color: ${blockColor};border-color: ${blockColor}`,
                start: video.time,
                end: video.end,
                group: 1
            })
            video.events.forEach((theEvent) => {
                ++timeStripItemIncrement;
                formattedVideos.push({
                    id: timeStripItemIncrement,
                    content: ``,
                    style: `background-color: yellow;border-color: yellow`,
                    start: theEvent.time,
                    group: 1
                })
            })
        });
        return formattedVideos
    }
    function createTimelineItems(){
        var items = new vis.DataSet([]);
        var groups = new vis.DataSet([
          {id: 1, content: ''}
        ]);
        timeStripVisItems = items
        return {
            items,
            groups,
        }
    }
    function resetTimelineItems(videos){
        var newVideos = formatVideosForTimeline(videos)
        timeStripVisItems.clear();
        timeStripVisItems.add(newVideos);
    }
    function addTimelineItems(videos){
        var newVideos = formatVideosForTimeline(videos)
        timeStripVisItems.add(newVideos);
    }
    async function resetTimeline(clickTime){
        await getAndDrawVideosToTimeline(clickTime,true)
        if(timeStripSelectedMonitors.length > 0){
            setTickDate(clickTime)
            setTimeLabel(clickTime)
            setTimeOfCanvasVideos(clickTime)
            setHollowClickQueue()
        }else{
            setViewForNoMonitorsSelected()
        }
        setSideMenuMonitorVisualSelection()
    }
    function timeStripActionWithPausePlay(restartPlaySpeed){
        return new Promise((resolve,reject) => {
            var currentlyPlaying = !!isPlaying;
            timeStripPlay(true)
            resolve(timeChanging)
            if(currentlyPlaying){
                setTimeout(() => {
                    timeStripPlay()
                },restartPlaySpeed || 500)
            }
        })
    }
    function createTimeline(){
        timeStripItemIncrement = 0;
        var timeChangingTimeout = null
        var dateNow = new Date()
        var hour = 1000 * 60 * 60
        var startTimeForLoad = new Date(dateNow.getTime() - (hour * 24 + hour))
        destroyTimeline()
        var {
            items,
            groups,
        } = createTimelineItems()
        // make chart
        timeStripVis = new vis.Timeline(timeStripEl[0], items, groups, {
            showCurrentTime: false,
            stack: false,
            start: timeStripCurrentStart || startTimeForLoad,
            end: timeStripCurrentEnd || dateNow,
        });
        // make tick
        timeStripVisTick = timeStripVis.addCustomTime(dateNow, `${lang.Time}`);
        timeStripVis.on('click', async function(properties) {
            var clickTime = properties.time;
            timeStripActionWithPausePlay().then((timeChanging) => {
                if(!timeChanging){
                    resetTimeline(clickTime)
                    executeExtender('timelineTimeChange', [clickTime, loadedMonitorsOnCanvas])
                }
            })
        });
        timeStripVis.on('rangechange', function(properties){
            timeChanging = true
        })
        timeStripVis.on('rangechanged', function(properties){
            clearTimeout(timeChangingTimeout)
            timeStripCurrentStart = properties.start;
            timeStripCurrentEnd = properties.end;
            timeStripAutoScrollPositionStart = getTimeBetween(timeStripCurrentStart,timeStripCurrentEnd,10);
            timeStripAutoScrollPositionEnd = getTimeBetween(timeStripCurrentStart,timeStripCurrentEnd,90);
            timeStripAutoScrollAmount = getTimelineScrollAmount(timeStripCurrentStart,timeStripCurrentEnd);
            if(dateRangeChanging)return;
            timeChangingTimeout = setTimeout(function(){
                var clickTime = properties.time;
                resetDateRangePicker()
                setTimeout(() => {
                    timeChanging = false
                    getAndDrawVideosToTimeline(clickTime)
                    executeExtender('timelineRangeChanged', [properties.start, properties.end, getTimestripDate(), loadedMonitorsOnCanvas])
                },500)
            },300)
        })
        setTimeout(function(){
            timeStripEl.find('.vis-timeline').resize()
        },2000)
    }
    function getTimelineScrollAmount(start,end){
        var startTime = start.getTime()
        var endTime = end.getTime()
        var difference = (endTime - startTime) / 1000;
        var minute = 60
        var hour = 60 * 60
        var day = 60 * 60 * 24
        // returns hours
        if(difference <= 60){
            return 0.1
        }else if(difference > minute && difference <= hour){
            return 0.1
        }else if(difference > hour && difference < day){
            return 0.3
        }else if(difference >= day){
            return 0.9
        }
    }
    function scrollTimeline(addHours){
        if(timeStripAutoScrollTimeout)return;
        timeStripAutoScrollTimeout = setTimeout(() => {
            delete(timeStripAutoScrollTimeout)
            timeStripAutoScrollTimeout = null
        },2000)
        var stripTime = getTimestripDate()
        var timeToAdd = addHours * 1000 * 60 * 60
        var start = new Date(stripTime.start.getTime() + timeToAdd)
        var end = new Date(stripTime.end.getTime() + timeToAdd)
        setTimestripDate(start,end)
    }
    function scrollTimelineToTime(tickTime) {
        var stripTime = getTimestripDate();
        var halfRange = (stripTime.end.getTime() - stripTime.start.getTime()) / 2;
        var start = new Date(tickTime.getTime() - halfRange);
        var end = new Date(tickTime.getTime() + halfRange);
        setTimestripDate(start, end);
    }
    function setTickDate(newDate){
        if(isPlaying){
            if(newDate >= timeStripAutoScrollPositionEnd){
                scrollTimeline(timeStripAutoScrollAmount)
            }else if(newDate >= new Date()){
                timeStripPlay(true)
            }
        }
        timeStripTickPosition = new Date(newDate)
        return timeStripVis.setCustomTime(newDate, timeStripVisTick);
    }
    function setTimeLabel(newDate){
        return currentTimeLabel.text(`${timeAgo(newDate)}, ${getDayOfWeek(newDate)}, ${formattedTime(newDate)}`)
    }
    function getTickDate() {
        return timeStripTickPosition;
    }
    function getTimestripDate() {
        var visibleWindow = timeStripVis.getWindow();
        var start = visibleWindow.start;
        var end = visibleWindow.end;
        return {
            start,
            end
        };
    }
    function setTimestripDate(newStart, newEnd) {
        return timeStripVis.setWindow(newStart, newEnd);
    }
    function selectAndDrawVideosToCanvas(theTime,redrawVideos){
        var selectedVideosForTime = selectVideosForCanvas(theTime,loadedVideosOnTimeStrip)
        loadedVideosOnCanvas = selectedVideosForTime;
        loadedMonitorsOnCanvas = Object.keys(loadedVideosOnCanvas)
        if(redrawVideos){
            drawVideosToCanvas(selectedVideosForTime)
        }
    }
    async function getAndDrawVideosToTimeline(theTime,redrawVideos){
        await getVideosByTimeStripRange()
        selectAndDrawVideosToCanvas(theTime,redrawVideos)
    }
    function getVideoContainerInCanvas(video){
        return timeStripVideoCanvas.find(`[data-mid="${video.mid}"][data-ke="${video.ke}"]`)
    }
    function getVideoFilmInCanvas(video){
        return getVideoContainerInCanvas(video).find('.film')
    }
    function getVideoElInCanvas(video){
        return getVideoContainerInCanvas(video).find('video')[0]
    }
    function getObjectContainerInCanvas(video){
        return getVideoContainerInCanvas(video).find('.event-objects')
    }
    function getVideoContainerPreBufferEl(video){
        return timeStripPreBuffers.find(`[data-mid="${video.mid}"][data-ke="${video.ke}"]`)
    }
    function getWaitTimeUntilNextVideo(endTimeOfFirstVideo,startTimeOfNextVideo){
        return (new Date(startTimeOfNextVideo).getTime() - new Date(endTimeOfFirstVideo).getTime()) / timelineSpeed
    }
    function jumpNextVideoIfEmptyCanvas(){
        if(isPlaying && hasNoCanvasVideos()){
            jumpToNextVideo()
        }
    }
    function setActiveMonitorIds(monitorId, toggle){
        if(toggle){
            if(loadedMonitorsOnCanvas.indexOf(monitorId) === -1)loadedMonitorsOnCanvas.push(monitorId)
        }else{
            const monitorIndex = loadedMonitorsOnCanvas.indexOf(monitorId);
            if(monitorIndex > -1)loadedMonitorsOnCanvas.splice(monitorIndex, 1)
        }
    }
    function clearVideoInCanvas(oldVideo){
        var monitorId = oldVideo.mid
        setActiveMonitorIds(monitorId, false)
        loadedVideosOnCanvas[monitorId] = null
        loadedVideoElsOnCanvas[monitorId] = null
        clearTimeout(loadedVideoEndingTimeouts[monitorId])
        var container = getVideoContainerInCanvas(oldVideo).addClass('no-video').find('.film')
        var videoEl = container.find('video')
        videoEl.attr('src','')
        try{
            videoEl[0].pause()
        }catch(err){
            console.log(err)
        }
        container.empty()
        timeStripAutoGridResize()
        if(playUntilVideoEnd){
            timeStripPlay(true)
        }else{
            jumpNextVideoIfEmptyCanvas()
        }
    }
    function setVideoInCanvas(newVideo){
        var monitorId = newVideo.mid
        var container = getVideoContainerInCanvas(newVideo)
        .removeClass('no-video').find('.film').html(`<video muted src="${newVideo.href}"></video>`)
        var vidEl = getVideoElInCanvas(newVideo)
        var objectContainer = getObjectContainerInCanvas(newVideo)
        vidEl.playbackRate = timelineSpeed
        if(isPlaying)playVideo(vidEl)
        loadedVideoElsOnCanvas[monitorId] = {
            vidEl,
            container,
            objectContainer,
        }
        setActiveMonitorIds(monitorId, true)
        loadedVideosOnCanvas[monitorId] = newVideo
        timeStripPreBuffersEls[monitorId] = getVideoContainerPreBufferEl(newVideo)
        queueNextVideo(newVideo)
        timeStripAutoGridResize()
    }
    function setTimeOfCanvasVideos(newTime){
        $.each(loadedVideosOnCanvas,function(n,video){
            if(!video)return;
            var monitorId = video.mid
            var timeAfterStart = (newTime - new Date(video.time)) / 1000;
            var videoEl = loadedVideoElsOnCanvas[monitorId].vidEl
            videoEl.currentTime = timeAfterStart
            // playVideo(videoEl)
            // pauseVideo(videoEl)
        })
    }
    function hasNoCanvasVideos(){
        return getLoadedVideosOnCanvas().length === 0;
    }
    function prepareEventsList(events){
        var newEvents = {}
        events.forEach((item) => {
            newEvents[new Date(item.time)] = item
        })
        return newEvents
    }
    function respaceObjectContainer(parentConatiner,objectContainer,videoWidth,videoHeight){
        var parentWidth = parentConatiner.width()
        var spaceWidth = (parentWidth - videoWidth) / 2
        objectContainer.width(videoWidth).css('left',`${spaceWidth}px`)
    }
    function queueNextVideo(video){
        if(!video)return;
        var monitorId = video.mid
        var onCanvas = loadedVideoElsOnCanvas[monitorId]
        var videoEl = onCanvas.vidEl
        var videoAfter = video.videoAfter
        var endingTimeout = null;
        var alreadyDone = false;
        var videoStartTime = (new Date(video.time).getTime() / 1000)
        var container = onCanvas.container
        var objectContainer = onCanvas.objectContainer
        var videoHeight = 0
        var videoWidth = 0
        var videoEvents = prepareEventsList(video.events)
        function currentVideoIsOver(){
            if(alreadyDone)return;
            alreadyDone = true;
            clearVideoInCanvas(video)
            if(videoAfter){
                var waitTimeTimeTillNext = getWaitTimeUntilNextVideo(video.end,videoAfter.time)
                // console.log('End of Video',video)
                // console.log('Video After',videoAfter)
                // console.log('Starting in ',waitTimeTimeTillNext / 1000, 'seconds')
                loadedVideoElsOnCanvasNextVideoTimeout[monitorId] = setTimeout(() => {
                    setVideoInCanvas(videoAfter)
                },waitTimeTimeTillNext)
            // }else{
                // console.log('End of Timeline for Monitor',loadedMonitors[monitorId].name)
            }
        }
        function drawMatricesOnVideoTimeUpdate(){
            var eventTime = new Date((videoStartTime + videoEl.currentTime) * 1000)
            var theEvent = videoEvents[eventTime]
            if(theEvent){
                drawMatrices(theEvent,{
                    theContainer: objectContainer,
                    height: videoHeight,
                    width: videoWidth,
                })
            }else{
                objectContainer.find('.stream-detected-object').remove()
            }
        }
        videoEl.onerror = function(err){
            err.preventDefault()
            console.error(`video error`)
            console.error(err)
        }
        videoEl.ontimeupdate = function(){
            if(videoEl.currentTime >= videoEl.duration){
                clearTimeout(loadedVideoEndingTimeouts[monitorId])
                currentVideoIsOver()
            }else if(isPlaying){
                var theTime = getTickDate()
                var waitTimeTimeTillNext = getWaitTimeUntilNextVideo(theTime,video.end)
                clearTimeout(loadedVideoEndingTimeouts[monitorId])
                loadedVideoEndingTimeouts[monitorId] = setTimeout(() => {
                    currentVideoIsOver()
                },waitTimeTimeTillNext)
            }
            drawMatricesOnVideoTimeUpdate()
        }
        videoEl.oncanplay = function() {
            var dims = getDisplayDimensions(videoEl);
            videoWidth = dims.videoWidth
            videoHeight = dims.videoHeight
            respaceObjectContainer(container,objectContainer,videoWidth,videoHeight)
        }
        // pre-buffer it
        timeStripPreBuffersEls[monitorId].html(videoAfter ? `<video preload="auto" muted src="${videoAfter.href}"></video>` : '')
    }
    function findVideoAfterTime(time, monitorId) {
        let inputTime = new Date(time);
        let matchingVideos = loadedVideosOnTimeStrip.filter(video => {
            let videoTime = new Date(video.time);
            return video.mid === monitorId && videoTime > inputTime;
        });
        matchingVideos.sort((a, b) => new Date(a.time) - new Date(b.time));
        return matchingVideos.length > 0 ? matchingVideos[0] : null;
    }
    function setHollowClickQueue(){
        $.each(loadedVideosOnCanvas,function(monitorId,video){
            if(!video){
                // console.log(`Add Hollow Action`, loadedMonitors[monitorId].name)
                var tickTime = getTickDate()
                var foundVideo = findVideoAfterTime(tickTime,monitorId)
                clearTimeout(loadedVideoElsOnCanvasNextVideoTimeout[monitorId])
                if(foundVideo){
                    var waitTimeTimeTillNext = getWaitTimeUntilNextVideo(tickTime,foundVideo.time)
                    // console.log('Found Video',foundVideo)
                    // console.log('Video Starts in ',waitTimeTimeTillNext / 1000, 'seconds after Play')
                    timeStripHollowClickQueue[monitorId] = () => {
                        // console.log('Hollow Start Point for',loadedMonitors[monitorId].name)
                        loadedVideoElsOnCanvasNextVideoTimeout[monitorId] = setTimeout(() => {
                            // console.log('Hollow Replace')
                            setVideoInCanvas(foundVideo)
                        },waitTimeTimeTillNext)
                    }
                }else{
                    // console.log('End of Timeline for Monitor',loadedMonitors[monitorId].name)
                    timeStripHollowClickQueue[monitorId] = () => {}
                }
            }else{
                timeStripHollowClickQueue[monitorId] = () => {}
            }
        })
    }
    function runHollowClickQueues(){
        $.each(timeStripHollowClickQueue,function(monitorId,theAction){
            theAction()
        })
    }
    function getAllActiveVideosInSlots(){
        return timeStripVideoCanvas.find('video')
    }
    function getActiveMonitorsInSlots(){
        return loadedMonitorsOnCanvas
    }
    function playVideo(videoEl){
        try{
            videoEl.playbackRate = timelineSpeed
            videoEl.play()
        }catch(err){
            console.log(err)
        }
    }
    function pauseVideo(videoEl){
        try{
            videoEl.pause()
        }catch(err){
            console.log(err)
        }
    }
    function playAllVideos(){
        getAllActiveVideosInSlots().each(function(n,video){
            playVideo(video)
        })
    }
    function pauseAllVideos(){
        getAllActiveVideosInSlots().each(function(n,video){
            pauseVideo(video)
        })
    }
    function setPlayToggleUI(icon){
        playToggles.html(`<i class="fa fa-${icon}"></i>`)
    }
    function timeStripPlay(forcePause){
        if(!forcePause && !isPlaying){
            isPlaying = true
            var currentDate = getTickDate().getTime();
            var msSpeed = 50
            var addition = 0
            var newTime
            runHollowClickQueues()
            playAllVideos()
            timeStripVisTickMovementInterval = setInterval(function() {
                addition += (msSpeed * timelineSpeed);
                newTime = new Date(currentDate + addition)
                setTickDate(newTime);
                executeExtender('timelineTimeChange', [newTime, loadedMonitorsOnCanvas])
                // setTimeOfCanvasVideos(newTime)
            }, msSpeed)
            timeStripVisTickMovementIntervalSecond = setInterval(function() {
                setTimeLabel(newTime);
            }, 1000)
            setPlayToggleUI(`pause-circle-o`)
            jumpNextVideoIfEmptyCanvas()
        }else{
            isPlaying = false
            pauseAllVideos()
            clearInterval(timeStripVisTickMovementInterval)
            clearInterval(timeStripVisTickMovementIntervalSecond)
            $.each(loadedVideoElsOnCanvasNextVideoTimeout,function(n,timeout){
                clearTimeout(timeout)
            })
            $.each(loadedVideoEndingTimeouts,function(n,timeout){
                clearTimeout(timeout)
            })
            setPlayToggleUI(`play-circle-o`)
        }
    }
    // function downloadPlayingVideo(video){
    //     if(video.currentSrc){
    //         var filename = getFilenameFromUrl(video.currentSrc)
    //         downloadFile(video.currentSrc,filename)
    //     }
    // }
    function getLoadedVideosOnCanvas(){
        return Object.values(loadedVideosOnCanvas).filter(item => !!item)
    }
    function downloadAllPlayingVideos(){
        zipVideosAndDownloadWithConfirm(getLoadedVideosOnCanvas())
    }
    async function jumpTimeline(amountInMs,direction){
        timeStripPlay(true)
        var tickTime = getTickDate().getTime()
        var newTime = 0;
        if(direction === 'right'){
            newTime = tickTime + amountInMs
        }else{
            newTime = tickTime - amountInMs
        }
        newTime = new Date(newTime)
        await resetTimeline(newTime)
        checkScroll(tickTime)
    }
    function checkScroll(tickTime,scrollToTick){
        if(tickTime <= timeStripAutoScrollPositionStart){
            if(scrollToTick){
                scrollTimelineToTime(tickTime)
            }else{
                scrollTimeline(-timeStripAutoScrollAmount)
            }
        }else if(tickTime >= timeStripAutoScrollPositionEnd){
            if(scrollToTick){
                scrollTimelineToTime(tickTime)
            }else{
                scrollTimeline(timeStripAutoScrollAmount)
            }
        }
    }
    function adjustTimelineSpeed(newSpeed){
        var currentlyPlaying = !!isPlaying;
        if(currentlyPlaying)timeStripPlay(true);
        timelineSpeed = newSpeed + 0
        setHollowClickQueue()
        if(currentlyPlaying)timeStripPlay();
    }
    function adjustTimelineGridSize(newCol){
        timelineGridSizing = `${newCol}`
        var containerEls = timeStripVideoCanvas.find('.timeline-video')
        containerEls.removeClass (function (index, className) {
            return (className.match (/(^|\s)col-\S+/g) || []).join(' ');
        }).addClass(`col-${newCol}`)
        gridSizeButtons.removeClass('btn-success')
        timeStripControls.find(`[timeline-action="gridSize"][size="${newCol}"]`).addClass('btn-success')
    }
    async function refreshTimeline(){
        var currentlyPlaying = !!isPlaying;
        timeStripPlay(true)
        timeStripListOfQueries = []
        loadedVideosOnTimeStrip = []
        createTimeline()
        await resetTimeline(getTickDate())
        if(currentlyPlaying)timeStripPlay();
    }
    function timeStripAutoGridSizerToggle(){
        if(timeStripAutoGridSizer){
            timeStripAutoGridSizer = false
            autoGridSizerButtons.removeClass('btn-success')
            dashboardOptions('timeStripAutoGridSizer','2')
        }else{
            timeStripAutoGridSizer = true
            autoGridSizerButtons.addClass('btn-success')
            timeStripAutoGridResize()
            dashboardOptions('timeStripAutoGridSizer','1')
        }
    }
    function timeStripPlayUntilVideoEndToggle(){
        if(playUntilVideoEnd){
            playUntilVideoEnd = false
            playUntilVideoEndButtons.removeClass('btn-success')
            dashboardOptions('timeStripPlayUntilVideoEnd','2')
        }else{
            playUntilVideoEnd = true
            playUntilVideoEndButtons.addClass('btn-success')
            dashboardOptions('timeStripPlayUntilVideoEnd','1')
        }
    }
    function timeStripDontShowDetectionToggle(){
        var theButtons = timeStripControls.find('[timeline-action="dontShowDetection"]')
        if(dontShowDetectionOnTimeline){
            dontShowDetectionOnTimeline = false
            theButtons.removeClass('btn-warning')
            dashboardOptions('dontShowDetectionOnTimeline','2')
        }else{
            dontShowDetectionOnTimeline = true
            theButtons.addClass('btn-warning')
            dashboardOptions('dontShowDetectionOnTimeline','1')
        }
        refreshTimeline()
    }
    function timeStripAutoGridResize(){
        if(!timeStripAutoGridSizer)return;
        var numberOfBlocks = timeStripVideoCanvas.find('.timeline-video:visible').length
        if(numberOfBlocks <= 1){
            adjustTimelineGridSize(`md-12`)
        }else if(numberOfBlocks >= 2 && numberOfBlocks < 5){
            adjustTimelineGridSize(`md-6`)
        }else if(numberOfBlocks >= 5){
            adjustTimelineGridSize(`md-4`)
        }
    }
    function resetDateRangePicker(){
        var stripDate = getTimestripDate()
        var startDate = stripDate.start
        var endDate = stripDate.end
        var picker = dateSelector.data('daterangepicker')
        picker.setStartDate(startDate);
        picker.setEndDate(endDate);
    }
    function drawFoundCamerasSubMenu(){
        var tags = getListOfTagsFromMonitors()
        var monitorsOrdered = Object.values(loadedMonitors).sort((a, b) => a.name.localeCompare(b.name));
        var allFound = [
            {
                attributes: `timeline-menu-action="selectMonitorGroup" tag=""`,
                class: `cursor-pointer`,
                color: 'forestgreen',
                label: lang['All Monitors'],
            }
        ]
        $.each(tags,function(tag,monitors){
            allFound.push({
                attributes: `timeline-menu-action="selectMonitorGroup" tag="${tag}"`,
                class: `cursor-pointer`,
                color: 'blue',
                label: tag,
            })
        })
        if(allFound.length === 1){
            allFound.push({
                attributes: ``,
                class: ``,
                color: ' d-none',
                label: `<small class="mt-1">${lang.addTagText}</small>`,
            })
        }else if(allFound.length !== 0){
            allFound.push({
                divider: true
            })
        }
        $.each(monitorsOrdered,function(monitorKey,monitor){
            var monitorId = monitor.mid
            var label = monitor.name
            allFound.push({
                attributes: `timeline-menu-action="selectMonitor" data-mid="${monitorId}"`,
                class: `cursor-pointer timeline-selectMonitor`,
                color: 'grey',
                label,
            })
        })
        var html = buildSubMenuItems(allFound)
        if(!sideMenuListMissing)sideMenuList.html(html)
        monitorList.html(html)
        monitorSelectionElements = selectingMonitorList.find('.timeline-selectMonitor')
    }
    async function setSideMenuMonitorVisualSelection(){
        var getForAllMonitors = timeStripSelectedMonitors.length === 0;
        monitorSelectionElements.find('.dot').removeClass('dot-green')
        if(!getForAllMonitors){
            timeStripSelectedMonitors.forEach((monitorId) => {
                selectingMonitorList.find(`[data-mid="${monitorId}"] .dot`).addClass('dot-green')
            })
        }
    }
    function setColorReferences(){
        $.each(loadedMonitors,function(monitorId,monitor){
            var itemColor = stringToColor(monitorId)
            timeStripItemColors[monitorId] = itemColor
        })
    }
    function findEndingLatestInCanvas(){
        var foundVideo = {time: 0};
        $.each(loadedVideosOnCanvas,function(monitorId,video){
            if(!video)return;
            var videoTime = new Date(video.time).getTime()
            if(new Date(foundVideo.time).getTime() < videoTime){
                foundVideo = video;
            }
        })
        if(!foundVideo.mid)return null;
        return foundVideo
    }
    function findCurrentVideoIndex(video){
        var currentVideoIndex = loadedVideosOnTimeStrip.findIndex((item) => {
            return video.mid === item.mid && video.time == item.time
        });
        return currentVideoIndex
    }
    function findNextVideo(){
        var tickTime = getTickDate()
        let closestObject = [...loadedVideosOnTimeStrip]
          .sort((a, b) => new Date(a.time) - new Date(b.time))
          .find(obj => new Date(obj.time) > tickTime);
        return closestObject;
    }
    function findPreviousVideo(){
        var tickTime = getTickDate()
        let closestObject = [...loadedVideosOnTimeStrip]
         .sort((a, b) => new Date(b.time) - new Date(a.time))
         .find(obj => new Date(obj.time) < tickTime);
        return closestObject;
    }
    async function jumpToVideo(video){
        var clickTime = new Date(video.time)
        timeStripActionWithPausePlay().then(async (timeChanging) => {
            if(!timeChanging){
                await resetTimeline(clickTime)
                checkScroll(clickTime, true)
            }
        })
    }
    async function jumpToNextVideo(){
        var video = findNextVideo()
        if(!video)timeStripPlay(true);
        await jumpToVideo(video)
    }
    async function jumpToPreviousVideo(){
        var video = findPreviousVideo()
        if(!video)return console.log('No More!')
        await jumpToVideo(video)
    }
    function onSelectedMonitorChange(){
        dashboardOptions('timeStripSelectedMonitors', timeStripSelectedMonitors)
    }
    function setViewForNoMonitorsSelected(){
        destroyTimeline();
        timeStripVideoCanvas.html(`<h3 class="my-3 text-center text-white vertical-center flex-column"><i class="fa fa-hand-pointer-o fa-3x m-3"></i><div>${lang['No Monitors Selected']}</div></h3>`)
    }
    function isAllMonitorsSelected(percent = 100){
        var divisor = percent / 100;
        var allMonitorIds = Object.values(loadedMonitors).map(item => item.mid);
        return timeStripSelectedMonitors.length >= (allMonitorIds.length * divisor);
    }
    function deselectAllMonitors(){
        timeStripSelectedMonitors = [];
        onSelectedMonitorChange()
        refreshTimeline()
    }
    window.resetTimelineWithMonitors = function(monitorIds, start = new Date(), end = new Date(), tickTime){
        setTimeout(() => {
            timeStripSelectedMonitors = monitorIds || [];
            onSelectedMonitorChange()
            setLoadingMask(true)
            dateRangeChanging = true
            setTimestripDate(start, end)
            setTimeout(() => {
                dateRangeChanging = false
                refreshTimeline()
                var newTickPosition = tickTime || getTimeBetween(start,end,50);
                setTickDate(newTickPosition)
            },2000)
        },1000)
        openTab('timeline')
    }
    function refreshTimelineOnAgree(){
        var askToLoad = isAllMonitorsSelected(50)
        if(!window.skipTimelineAgree && askToLoad){
            $.confirm.create({
                title: lang.tooManyMonitorsSelected,
                body: lang.performanceMayBeAffected,
                clickOptions: {
                    title: lang.getVideos,
                    class: 'btn-success'
                },
                clickCallback: function(){
                    refreshTimeline()
                },
                onCancel: function(){
                    deselectAllMonitors()
                }
            })
        }else{
            refreshTimeline()
        }
        window.skipTimelineAgree = false;
    }
    function monitorSelectorController(){
        var el = $(this)
        var type = el.attr('timeline-menu-action')
        switch(type){
            case'selectMonitor':
                var monitorId = el.attr('data-mid')
                var alreadySelected = timeStripSelectedMonitors.indexOf(monitorId) > -1;
                if(alreadySelected){
                    timeStripSelectedMonitors = timeStripSelectedMonitors.filter(fillId => monitorId !== fillId)
                }else{
                    timeStripSelectedMonitors.push(monitorId)
                }
                onSelectedMonitorChange()
                refreshTimeline()
            break;
            case'selectMonitorGroup':
                var tag = el.attr('tag')
                if(!tag){
                    timeStripSelectedMonitors = Object.values(loadedMonitors).map(item => item.mid)
                    refreshTimelineOnAgree()
                }else{
                    var tags = getListOfTagsFromMonitors()
                    var monitorIds = tags[tag]
                    timeStripSelectedMonitors = [...monitorIds];
                    onSelectedMonitorChange()
                    refreshTimeline()
                }
            break;
        }
    }
    monitorList.on('click','[timeline-menu-action]', monitorSelectorController)
    sideMenuList.on('click','[timeline-menu-action]', monitorSelectorController)
    timelineActionButtons.click(function(){
        var el = $(this)
        var type = el.attr('timeline-action')
        switch(type){
            case'playpause':
                timeStripPlay()
            break;
            case'downloadAll':
                if(featureIsActivated(true)){
                    downloadAllPlayingVideos()
                }
            break;
            case'jumpLeft':
                jumpTimeline(5000,'left')
            break;
            case'jumpRight':
                jumpTimeline(5000,'right')
            break;
            case'jumpNext':
                jumpToNextVideo()
            break;
            case'jumpPrev':
                jumpToPreviousVideo()
            break;
            case'speed':
                var speed = parseInt(el.attr('speed'))
                if(featureIsActivated(true)){
                    adjustTimelineSpeed(speed)
                    speedButtons.removeClass('btn-success')
                    el.addClass('btn-success')
                }
            break;
            case'gridSize':
                var size = el.attr('size')
                adjustTimelineGridSize(size)
            break;
            case'refresh':
                refreshTimeline()
            break;
            case'autoGridSizer':
                timeStripAutoGridSizerToggle()
            break;
            case'playUntilVideoEnd':
                timeStripPlayUntilVideoEndToggle()
            break;
            case'dontShowDetection':
                timeStripDontShowDetectionToggle()
            break;
        }
    })
    timeStripObjectSearchInput.change(function(){
        refreshTimeline()
    })
    videoTypeSelector.change(function(){
        refreshTimeline()
    })
    timeStripVideoCanvas.on('dblclick','.timeline-video',function(){
        var monitorId = $(this).attr('data-mid')
        var video = loadedVideosOnCanvas[monitorId];
        createVideoPlayerTab(video)
        setVideoStatus(video)
    })
    addOnTabOpen('timeline', async function () {
        setColorReferences()
        drawFoundCamerasSubMenu()
        refreshTimelineOnAgree()
    })
    addOnTabReopen('timeline', function () {
        drawFoundCamerasSubMenu()
    })
    addOnTabAway('timeline', function () {
        timeStripPlay(true)
    })
    loadDateRangePicker(dateSelector,{
        timePicker: true,
        timePicker24Hour: true,
        timePickerSeconds: true,
        timePickerIncrement: 30,
        autoApply: true,
        buttonClasses: 'hidden',
        drops: 'up',
        maxDate: new Date(),
        onChange: function(start, end, label) {
            if(!timeChanging){
                setLoadingMask(true)
                dateRangeChanging = true
                setTimestripDate(start, end)
                var newTickPosition = getTimeBetween(start,end,50);
                setTickDate(newTickPosition)
                setTimeout(() => {
                    dateRangeChanging = false
                    refreshTimeline()
                },2000)
            }
        }
    })
    var currentOptions = dashboardOptions()
    if(isChromiumBased){
        [ 7, 10 ].forEach((speed) => {
            timeStripControls.find(`[timeline-action="speed"][speed="${speed}"]`).remove()
        });
    }
    if(!currentOptions.timeStripAutoGridSizer || currentOptions.timeStripAutoGridSizer === '1'){
        timeStripAutoGridSizerToggle()
    }
    if(currentOptions.timeStripPlayUntilVideoEnd === '1'){
        timeStripPlayUntilVideoEndToggle()
    }
    if(currentOptions.dontShowDetectionOnTimeline === '1'){
        timeStripDontShowDetectionToggle()
    }
    addExtender('timelineTimeChange')
    addExtender('timelineRangeChanged')
    addExtender('timelineGetVideos')
    addExtender('timelineGetVideosByMonitor')
})
