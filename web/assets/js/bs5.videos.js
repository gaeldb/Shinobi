var loadedVideosInMemory = {}
var loadedEventsInMemory = {}
var loadedFramesMemory = {}
var loadedFramesMemoryTimeout = {}
var loadedFramesLock = {}
function getLocalTimelapseImageLink(imageUrl){
    if(loadedFramesLock[imageUrl]){
        return null;
    }else if(loadedFramesMemory[imageUrl]){
        return loadedFramesMemory[imageUrl]
    }else{
        loadedFramesLock[imageUrl] = true
        return new Promise((resolve,reject) => {
            fetch(imageUrl)
              .then(res => res.blob()) // Gets the response and returns it as a blob
              .then(blob => {
                var objectURL = URL.createObjectURL(blob);
                loadedFramesMemory[imageUrl] = objectURL
                clearTimeout(loadedFramesMemoryTimeout[imageUrl])
                loadedFramesMemoryTimeout[imageUrl] = setTimeout(function(){
                    URL.revokeObjectURL(objectURL)
                    delete(loadedFramesMemory[imageUrl])
                    delete(loadedFramesMemoryTimeout[imageUrl])
                },1000 * 60 * 10);
                loadedFramesLock[imageUrl] = false;
                resolve(objectURL);
            }).catch((err) => {
                resolve()
            });
        })
    }
}
async function preloadAllTimelapseFramesToMemoryFromVideoList(framesSortedByDays){
    async function syncWait(waitTime){
        return new Promise((resolve,reject) => {
            setTimeout(function(){
                resolve()
            },waitTime)
        })
    }
    for (let ii = 0; ii < framesSortedByDays.length; ii++) {
        var frame = framesSortedByDays[ii]
        console.log ('Loading... ',frame.href)
        await syncWait(50)
        await getLocalTimelapseImageLink(frame.href)
        console.log ('Loaded! ',frame.href)
    }
}
function createVideoLinks(video,options){
    var details = safeJsonParse(video.details)
    var queryString = []
    // if(details.isUTC === true){
    //     queryString.push('isUTC=true')
    // }else{
    //     video.time = s.utcToLocal(video.time)
    //     video.end = s.utcToLocal(video.end)
    // }
    if(queryString.length > 0){
        queryString = '?' + queryString.join('&')
    }else{
        queryString = ''
    }
    video.ext = video.ext ? video.ext : 'mp4'
    if(details.type === 'googd'){
        video.href = undefined
    }else if(!video.ext && video.href){
        video.ext = video.href.split('.')
        video.ext = video.ext[video.ext.length - 1]
    }
    video.filename = formattedTimeForFilename(convertTZ(video.time, serverTimezone),null,`YYYY-MM-DDTHH-mm-ss`) + '.' + video.ext;
    var href = getApiPrefix('videos') + '/'+video.mid+'/'+video.filename;
    video.actionUrl = href
    video.links = {
        deleteVideo : href+'/delete' + queryString,
        changeToUnread : href+'/status/1' + queryString,
        changeToRead : href+'/status/2' + queryString
    }
    if(!video.href || options.hideRemote === true)video.href = href + queryString
    video.details = details
    return video
}
function applyDataListToVideos(videos, events, keyName, reverseList) {
    const eventMap = new Map();

    // Build a map of events by monitor ID
    events.forEach(event => {
        if (!eventMap.has(event.mid)) {
            eventMap.set(event.mid, []);
        }
        eventMap.get(event.mid).push(event);
    });

    // Attach events to videos
    videos.forEach(video => {
        const videoEvents = eventMap.get(video.mid) || [];
        const matchedEvents = videoEvents.filter(event => {
            const startTime = new Date(video.time);
            const endTime = new Date(video.end);
            const eventTime = new Date(event.time);
            return eventTime >= startTime && eventTime <= endTime;
        });

        if (reverseList) matchedEvents.reverse();

        video[keyName || 'events'] = matchedEvents;
    });

    return videos;
}
function applyTimelapseFramesListToVideos(videos, events, keyName, reverseList) {
    const thisApiPrefix = `${getApiPrefix()}/timelapse/${$user.ke}/`;
    const eventMap = new Map();

    // Build a map of events by monitor ID
    events.forEach(event => {
        if (!eventMap.has(event.mid)) {
            eventMap.set(event.mid, []);
        }
        eventMap.get(event.mid).push(event);
    });

    // Attach timelapse frames to videos
    videos.forEach(video => {
        const videoEvents = eventMap.get(video.mid) || [];
        const matchedEvents = videoEvents.filter(event => {
            const startTime = new Date(video.time);
            const endTime = new Date(video.end);
            const eventTime = new Date(event.time);
            return eventTime >= startTime && eventTime <= endTime;
        });

        if (reverseList) matchedEvents.reverse();

        // Assigning matched events to video
        video[keyName || 'timelapseFrames'] = matchedEvents.map(row => {
            const apiURL = `${thisApiPrefix}${row.mid}`;
            return {
                ...row,
                href: `${libURL}${apiURL}/${row.filename.split('T')[0]}/${row.filename}`
            };
        });
    });

    return videos;
}
function getFrameOnVideoRow(percentageInward, video) {
    var startTime = video.time;
    var endTime = video.end;
    var timeDifference = endTime - startTime;
    var timeInward = timeDifference / (100 / percentageInward);
    var timeAdded = new Date(startTime.getTime() + timeInward); // ms
    var frames = video.timelapseFrames || [];

    if (frames.length === 1) {
        return {
            timeInward: timeInward,
            foundFrame: frames[0],
            timeAdded: timeAdded,
        };
    }

    var closestFrame = frames.length > 0 ? frames.reduce(function(prev, curr) {
        var prevDiff = Math.abs(timeAdded - new Date(prev.time));
        var currDiff = Math.abs(timeAdded - new Date(curr.time));
        return (prevDiff < currDiff) ? prev : curr;
    }) : null;

    return {
        timeInward: timeInward,
        foundFrame: closestFrame,
        timeAdded: timeAdded,
    };
}
function getVideoFromDay(percentageInward, reversedVideos, startTime, endTime) {
    var timeDifference = endTime - startTime;
    var timeInward = timeDifference / (100 / percentageInward);
    var timeAdded = new Date(startTime.getTime() + timeInward); // ms
    var closestVideo = reversedVideos.reduce(function (prev, curr) {
        var prevDiff = Math.abs(timeAdded - new Date(prev.time));
        var currDiff = Math.abs(timeAdded - new Date(curr.time));
        return (prevDiff < currDiff) ? prev : curr;
    });
    return closestVideo;
}
function bindFrameFindingByMouseMoveForDay(createdCardCarrier,dayKey,videos,allFrames){
    var stripTimes = getStripStartAndEnd(videos,allFrames)
    var dayStart = stripTimes.start
    var dayEnd = stripTimes.end
    var createdCardElement = createdCardCarrier.find('.video-time-card')
    var timeImg = createdCardElement.find('.video-time-img')
    var rowHeader = createdCardElement.find('.video-time-header')
    var timeStrip = createdCardElement.find('.video-time-strip')
    var timeNeedleSeeker = createdCardElement.find('.video-time-needle-seeker')
    var firstFrameOfDay = allFrames[0] || null
    $.each(videos,function(day,video){
        $.each(video.timelapseFrames,function(day,frame){
            if(!firstFrameOfDay)firstFrameOfDay = frame;
        })
    })
    if(!firstFrameOfDay){
        timeImg.remove()
        rowHeader.css('position','initial')
    }else{
        timeImg.attr('src',firstFrameOfDay.href)
    }
    var videoSlices = createdCardElement.find('.video-day-slice')
    var videoTimeLabel = createdCardElement.find('.video-time-label')
    var currentlySelected = videos[0]
    var currentlySelectedFrame = null
    var reversedVideos = ([]).concat(videos).reverse();
    function onSeek(evt, isTouch){
        var offest = createdCardElement.offset()
        var elementWidth = createdCardElement.width() + 2
        var amountMoved = (isTouch ? evt.originalEvent.touches[0] : evt).pageX - offest.left
        var percentMoved = amountMoved / elementWidth * 100
        percentMoved = percentMoved > 100 ? 100 : percentMoved < 0 ? 0 : percentMoved
        var videoFound = videos[0] ? getVideoFromDay(percentMoved,reversedVideos,dayStart,dayEnd) : null
        createdCardElement.find(`[data-time]`).css('background-color','')
        if(videoFound){
            if(currentlySelected && currentlySelected.time !== videoFound.time){
                timeNeedleSeeker.attr('video-time-seeked-video-position',videoFound.time)
            }
            currentlySelected = Object.assign({},videoFound)
        }
        // draw frame
        var result = getFrameOnVideoRow(percentMoved,{
            time: dayStart,
            end: dayEnd,
            timelapseFrames: allFrames,
        })
        var frameFound = result.foundFrame
        videoTimeLabel.text(formattedTime(result.timeAdded,'hh:mm:ss AA, DD-MM-YYYY'))
        if(frameFound){
            currentlySelectedFrame = Object.assign({},frameFound)
            setTimeout(async function(){
                var frameUrl = await getLocalTimelapseImageLink(frameFound.href)
                if(frameUrl && currentlySelectedFrame.time === frameFound.time)timeImg.attr('src',frameUrl);
            },1)
        }
        timeNeedleSeeker.attr('video-slice-seeked',result.timeInward).css('left',`${percentMoved}%`)
    }
    createdCardElement.on('mousemove',function(evt){
        onSeek(evt, false)
    })
    createdCardElement.on('touchmove',function(evt){
        onSeek(evt, true)
    })
}
function getPercentOfTimePositionFromVideo(video,theEvent){
    var startTime = new Date(video.time)
    var endTime = new Date(video.end)
    var eventTime = new Date(theEvent.time)
    var rangeMax = endTime - startTime
    var eventMs = eventTime - startTime
    var percentChanged = eventMs / rangeMax * 100
    return percentChanged
}
function createVideoRow(row,classOverride){
    var objectTagsHtml = ``
    var eventMatrixHtml = ``
    if(row.objects && row.objects.length > 0){
        $.each(row.objects.split(','),function(n,objectTag){
            eventMatrixHtml += `<span class="badge badge-primary badge-sm">${objectTag}</span>`
        })
    }
    if(row.events && row.events.length > 0){
        $.each(row.events,function(n,theEvent){
            var leftPercent = getPercentOfTimePositionFromVideo(row,theEvent)
            eventMatrixHtml += `<div title="Event at ${theEvent.time}" class="video-time-needle video-time-needle-event" style="left:${leftPercent}%"></div>`
        })
    }
    var videoEndpoint = getApiPrefix(`videos`) + '/' + row.mid + '/' + row.filename
    return `
    <div class="video-row ${classOverride ? classOverride : `col-md-12 col-lg-6 mb-3`} search-row" data-mid="${row.mid}" data-time="${row.time}" data-type="${row.type}" data-time-formed="${new Date(row.time)}">
        <div class="video-time-card shadow-lg px-0 btn-default">
            <div class="card-header">
                <div class="${definitions.Theme.isDark ? 'text-white' : ''}">
                    ${moment(row.time).fromNow()}
                </div>
                <small class="text-muted">~${durationBetweenTimes(row.time,row.end)} ${lang.Minutes}</small>
            </div>
            <div class="card-body">
                <div class="mb-2">
                    <a class="badge btn btn-primary open-video" title="${lang['Watch']}"><i class="fa fa-play-circle"></i></a>
                    <a class="badge btn btn-success" download href="${videoEndpoint}" title="${lang['Download']}"><i class="fa fa-download"></i></a>
                    <a class="badge btn btn-danger delete-video" title="${lang['Delete']}"><i class="fa fa-trash-o"></i></a>
                </div>
                <div title="${row.time}" class="border-bottom-dotted border-bottom-dark mb-2">
                    <div>
                        <div title="${row.time}"><small class="text-muted">${lang.Started} : ${formattedTime(row.time,true)}</small></div>
                        <div title="${row.end}"><small class="text-muted">${lang.Ended} : ${formattedTime(row.end,true)}</small></div>
                    </div>
                    <small>
                        ${loadedMonitors[row.mid] ? loadedMonitors[row.mid].name : row.mid}
                    </small>
                </div>
                <div class="mb-2">
                    ${objectTagsHtml}
                </div>
            </div>
            <div class="video-time-strip card-footer p-0">
                ${eventMatrixHtml}
            </div>
        </div>
    </div>`
}
function sortVideosByDays(videos){
    var days = {}
    videos.forEach(function(video){
        var videoTime = new Date(video.time)
        var theDayKey = `${videoTime.getDate()}-${videoTime.getMonth()}-${videoTime.getFullYear()}`
        if(!days[video.mid])days[video.mid] = {};
        if(!days[video.mid][theDayKey])days[video.mid][theDayKey] = [];
        days[video.mid][theDayKey].push(video)
    })
    return days
}
function sortFramesByDays(frames){
    var days = {}
    var thisApiPrefix = getApiPrefix() + '/timelapse/' + $user.ke + '/'
    frames.forEach(function(frame){
        var frameTime = new Date(frame.time)
        var theDayKey = `${frameTime.getDate()}-${frameTime.getMonth()}-${frameTime.getFullYear()}`
        if(!days[frame.mid])days[frame.mid] = {};
        if(!days[frame.mid][theDayKey])days[frame.mid][theDayKey] = [];
        var apiURL = thisApiPrefix + frame.mid
        frame.href = libURL + apiURL + '/' + frame.filename.split('T')[0] + '/' + frame.filename
        days[frame.mid][theDayKey].push(frame)
    })
    return days
}
function getAllDays(videos,frames){
    var listOfDays = {}
    $.each(loadedMonitors,function(monitorId){
        if(!listOfDays[monitorId])listOfDays[monitorId] = {}
    })
    videos.forEach(function(video){
        var videoTime = new Date(video.time)
        var monitorId = video.mid
        var theDayKey = `${videoTime.getDate()}-${videoTime.getMonth()}-${videoTime.getFullYear()}`
        if(!listOfDays[monitorId])listOfDays[monitorId] = {};
        listOfDays[monitorId][theDayKey] = []
    })
    frames.forEach(function(frame){
        var frameTime = new Date(frame.time)
        var monitorId = frame.mid
        var theDayKey = `${frameTime.getDate()}-${frameTime.getMonth()}-${frameTime.getFullYear()}`
        if(!listOfDays[monitorId])listOfDays[monitorId] = {};
        listOfDays[monitorId][theDayKey] = []
    })
    return listOfDays
}
function getStripStartAndEnd(videos,frames){
    var stripStartTimeByVideos = videos[0] ? new Date(videos[0].time) : null
    var stripEndTimeByVideos = videos[0] ? new Date(videos[videos.length - 1].end) : null
    var stripStartTimeByFrames = frames[0] ? new Date(frames[0].time) : stripStartTimeByVideos
    var stripEndTimeByFrames = frames[0] ? new Date(frames[frames.length - 1].time) : stripEndTimeByVideos
    var stripStartTime = stripStartTimeByVideos && stripStartTimeByVideos < stripStartTimeByFrames ? stripStartTimeByVideos : stripStartTimeByFrames
    var stripEndTime = stripEndTimeByVideos && stripEndTimeByVideos > stripEndTimeByFrames ? stripEndTimeByVideos : stripEndTimeByFrames
    return {
        start: new Date(stripStartTime),
        end: new Date(stripEndTime),
    }
}
function getVideoPercentWidthForDay(row,videos,frames){
    var startTime = new Date(row.time)
    var endTime = new Date(row.end)
    var timeDifference = endTime - startTime
    var stripTimes = getStripStartAndEnd(videos,frames)
    var stripTimeDifference = stripTimes.end - stripTimes.start
    var percent = (timeDifference / stripTimeDifference) * 100
    return percent
}
function createDayCard(videos,frames,dayKey,monitorId,classOverride){
    var html = ''
    var eventMatrixHtml = ``
    var stripTimes = getStripStartAndEnd(videos,frames)
    var startTime = stripTimes.start
    var endTime = stripTimes.end
    var firstVideoTime = videos[0] ? videos[0].time : null
    var dayParts = formattedTime(startTime).split(' ')[1].split('-')
    var day = dayParts[2]
    var month = dayParts[1]
    var year = dayParts[0]
    $.each(videos,function(n,row){
        var nextRow = videos[n + 1]
        var marginRight = !!nextRow ? getVideoPercentWidthForDay({time: row.end, end: nextRow.time},videos,frames) : 0;
        eventMatrixHtml += `<div class="video-day-slice" data-mid="${row.mid}" data-time="${row.time}" style="width:${getVideoPercentWidthForDay(row,videos,frames)}%;position:relative">`
        if(row.events && row.events.length > 0){
            $.each(row.events,function(n,theEvent){
                var leftPercent = getPercentOfTimePositionFromVideo(row,theEvent)
                eventMatrixHtml += `<div class="video-time-needle video-time-needle-event" style="margin-left:${leftPercent}%"></div>`
            })
        }
        eventMatrixHtml += `</div>`
        eventMatrixHtml += `<div class="video-day-slice-spacer" style="width: ${marginRight}%"></div>`
    })
    html += `
    <div class="video-row ${classOverride ? classOverride : `col-md-12 col-lg-6 mb-3`} search-row">
        <div class="video-time-card shadow-sm px-0 ${definitions.Theme.isDark ? 'bg-dark' : 'bg-light'}">
            <div class="video-time-header">
                <div class="d-flex flex-row vertical-center ${definitions.Theme.isDark ? 'text-white' : ''}">
                    <div class="flex-grow-1 p-3">
                        <b>${loadedMonitors[monitorId] ? loadedMonitors[monitorId].name : monitorId}</b>
                        <div class="${definitions.Theme.isDark ? 'text-white' : ''}">
                            <span class="video-time-label">${formattedTime(startTime)} to ${formattedTime(endTime)}</span>
                        </div>
                    </div>
                    <div class="text-right p-3" style="background:rgba(0,0,0,0.5)">
                        <div class="text-center" style="font-size:20pt;font-weight:bold">${day}</div>
                        <div>${month}, ${year}</div>
                    </div>
                </div>
            </div>
            <div class="text-center">
                <img class="video-time-img">
            </div>
            <div class="video-time-strip card-footer p-0">
                <div class="flex-row d-flex" style="height:30px">${eventMatrixHtml}</div>
                <div class="video-time-needle video-time-needle-seeker" ${firstVideoTime ? `video-time-seeked-video-position="${firstVideoTime}"` : ''} data-mid="${monitorId}"></div>
            </div>
        </div>
    </div>`
    return html
}
function drawVideoRowsToList(targetElement,rows){
    var theVideoList = $(targetElement)
    theVideoList.empty()
    $.each(rows,function(n,row){
        theVideoList.append(createVideoRow(row))
    })
    liveStamp()
}
function loadVideosData(newVideos){
    $.each(newVideos,function(n,video){
        delete(video.f)
        loadedVideosInMemory[`${video.mid}${video.time}${video.type}`] = video
    })
}
function loadEventsData(videoEvents){
    videoEvents.forEach((anEvent) => {
        loadedEventsInMemory[`${anEvent.mid}${anEvent.time}`] = anEvent
    })
}
function getVideoSearchRequestQueries(options){
    var searchQuery = options.searchQuery
    var requestQueries = []
    var andOnly = options.andOnly === '1'
    var monitorId = options.monitorId
    var archived = options.archived
    var customVideoSet = options.customVideoSet
    var limit = options.limit
    var eventLimit = options.eventLimit || 300
    var doLimitOnFames = options.doLimitOnFames || false
    var eventStartTime
    var eventEndTime
    if(options.startDate){
        eventStartTime = formattedTimeForFilename(options.startDate,false)
        requestQueries.push(`start=${eventStartTime}`)
    }
    if(options.endDate){
        eventEndTime = formattedTimeForFilename(options.endDate,false)
        requestQueries.push(`end=${eventEndTime}`)
    }
    if(searchQuery){
        requestQueries.push(`search=${searchQuery}`)
    }
    if(archived){
        requestQueries.push(`archived=1`)
    }
    if(andOnly){
        requestQueries.push(`andOnly=1`)
    }
    return {
        searchQuery,
        andOnly,
        monitorId,
        archived,
        customVideoSet,
        limit,
        eventLimit,
        doLimitOnFames,
        eventStartTime,
        eventEndTime,
        requestQueries,
    }
}
function mergeVideosAndBin(options,callback){
    const {
        searchQuery,
        andOnly,
        monitorId,
        archived,
        customVideoSet,
        limit,
        eventLimit,
        doLimitOnFames,
        eventStartTime,
        eventEndTime,
        requestQueries,
    } = getVideoSearchRequestQueries(options);
    const videos = options.videos.map(video => {
        const newVideo = {
            ke: video.ke,
            mid: video.mid,
            time: video.time,
            end: video.end,
            ext: video.ext,
            saveDir: video.saveDir,
            details: video.details,
        };
        delete(newVideo.timelapseFrames)
        return newVideo
    });
    console.log(videos)
    return new Promise((resolve) => {
        $.post(`${getApiPrefix(`mergeVideos`)}${monitorId ? `/${monitorId}` : ''}?${requestQueries.concat([limit ? `limit=${limit}` : `noLimit=1`]).join('&')}`, {
            videos,
        },function(data){
            resolve(data)
        })
    })
}
function getVideos(options,callback,noEvents){
    return new Promise((resolve,reject) => {
        options = options ? options : {}
        const {
            searchQuery,
            andOnly,
            monitorId,
            archived,
            customVideoSet,
            limit,
            eventLimit,
            doLimitOnFames,
            eventStartTime,
            eventEndTime,
            requestQueries,
        } = getVideoSearchRequestQueries(options);
        $.getJSON(`${getApiPrefix(customVideoSet ? customVideoSet : searchQuery ? `videosByEventTag` : `videos`)}${monitorId ? `/${monitorId}` : ''}?${requestQueries.concat([limit ? `limit=${limit}` : `noLimit=1`]).join('&')}`,function(data){
            var videos = data.videos.map((video) => {
                return Object.assign({},video,{
                    href: `${getFullOrigin(true) + video.href}${customVideoSet === 'cloudVideos' ? `?type=${video.type}` : ''}`
                })
            })
            $.getJSON(`${getApiPrefix(`timelapse`)}${monitorId ? `/${monitorId}` : ''}?${requestQueries.concat([`noLimit=1`]).join('&')}`,function(timelapseFrames){
                function completeRequest(eventData){
                    var theEvents = eventData.events || eventData;
                    var newVideos = applyDataListToVideos(videos,theEvents)
                    newVideos = applyTimelapseFramesListToVideos(newVideos,timelapseFrames.frames || timelapseFrames,'timelapseFrames',true).map((video) => {
                        video.videoSet = customVideoSet
                        return video
                    })
                    loadEventsData(theEvents)
                    loadVideosData(newVideos)
                    if(callback)callback({videos: newVideos, frames: timelapseFrames});
                    resolve({videos: newVideos, frames: timelapseFrames})
                }
                if(noEvents){
                    completeRequest([])
                }else{
                    $.getJSON(`${getApiPrefix(`events`)}${monitorId ? `/${monitorId}` : ''}?${requestQueries.concat([`limit=${eventLimit}`]).join('&')}`,function(eventData){
                        completeRequest(eventData)
                    })
                }
            })
        })
    })
}
function getEvents(options,callback){
    return new Promise((resolve,reject) => {
        options = options ? options : {}
        var requestQueries = []
        var monitorId = options.monitorId
        var limit = options.limit || 5000
        var eventStartTime
        var eventEndTime
        // var startDate = options.startDate
        // var endDate = options.endDate
        if(options.startDate){
            eventStartTime = formattedTimeForFilename(options.startDate,false)
            requestQueries.push(`start=${eventStartTime}`)
        }
        if(options.endDate){
            eventEndTime = formattedTimeForFilename(options.endDate,false)
            requestQueries.push(`end=${eventEndTime}`)
        }
        if(options.onlyCount){
            requestQueries.push(`onlyCount=1`)
        }
        $.getJSON(`${getApiPrefix(`events`)}${monitorId ? `/${monitorId}` : ''}?${requestQueries.join('&')}`,function(eventData){
            var theEvents = eventData.events || eventData
            if(callback)callback(theEvents)
            resolve(theEvents)
        })
    })
}
function deleteVideo(video,callback){
    return new Promise((resolve,reject) => {
        var videoEndpoint = getApiPrefix(`videos`) + '/' + video.mid + '/' + video.filename
        $.getJSON(videoEndpoint + '/delete',function(data){
            notifyIfActionFailed(data)
            if(callback)callback(data)
            resolve(data)
        })
    })
}
async function deleteVideos(videos){
    for (let i = 0; i < videos.length; i++) {
        var video = videos[i];
        await deleteVideo(video)
    }
}
function downloadVideo(video){
    var videoEndpoint = getApiPrefix(`videos`) + '/' + video.mid + '/' + video.filename
    downloadFile(videoEndpoint,video.filename)
}
async function downloadVideos(videos){
    for (let i = 0; i < videos.length; i++) {
        var video = videos[i];
        await downloadVideo(video)
    }
}
function compressVideo(video,callback){
    if(video.filename.includes('.webm')){
        console.log('Already Compressed')
        if(callback)callback('Already Compressed')
        return
    }
    return new Promise((resolve) => {
        var videoEndpoint = getApiPrefix(`videos`) + '/' + video.mid + '/' + video.filename
        $.getJSON(videoEndpoint + '/compress',function(data){
            if(data.ok){
                console.log('Video Compressing')
            }else{
                console.log('Video Not Compressing',data,videoEndpoint)
            }
            if(callback)callback()
            resolve()
        })
    })
}
async function compressVideos(videos){
    for (let i = 0; i < videos.length; i++) {
        var video = videos[i];
        await compressVideo(video)
    }
}
function getArchiveButtons(video,isFileBin){
    return $(`[data-mid="${video.mid}"][data-ke="${video.ke}"][data-time="${video.time}"] .archive-${isFileBin ? `file` : 'video'}`)
}
var currentlyArchiving = {}
function archiveVideo(video,unarchive,isFileBin){
    return new Promise((resolve) => {
        var videoEndpoint = getApiPrefix(isFileBin ? `fileBin` : `videos`) + '/' + video.mid + '/' + (isFileBin ? video.name : video.filename)
        // var currentlyArchived = video.archive === 1
        if(currentlyArchiving[videoEndpoint]){
            resolve({ok: false})
            return;
        }
        currentlyArchiving[videoEndpoint] = true
        $.getJSON(videoEndpoint + '/archive' + `${unarchive ? `?unarchive=1` : ''}`,function(data){
            if(data.ok){
                var archiveButtons = getArchiveButtons(video,isFileBin)
                var classToRemove = 'btn-default'
                var classToAdd = 'btn-success status-archived'
                var iconToRemove = 'fa-unlock-alt'
                var iconToAdd = 'fa-lock'
                var elTitle = `${lang.Unarchive}`
                if(!data.archived){
                    console.log('Video Unarchived',unarchive)
                    classToRemove = 'btn-success status-archived'
                    classToAdd = 'btn-default'
                    iconToRemove = 'fa-lock'
                    iconToAdd = 'fa-unlock-alt'
                    elTitle = `${lang.Archive}`
                }else{
                    console.log('Video Archived',unarchive)
                }
                archiveButtons.removeClass(classToRemove).addClass(classToAdd).attr('title',elTitle)
                archiveButtons.find('i').removeClass(iconToRemove).addClass(iconToAdd)
                archiveButtons.find('span').text(elTitle)
                video.archive = data.archived ? 1 : 0
            }else{
                console.log('Video Archive status unchanged',data,videoEndpoint)
            }
            delete(currentlyArchiving[videoEndpoint])
            resolve(data)
        })
    })
}
async function archiveVideos(videos){
    for (let i = 0; i < videos.length; i++) {
        var video = videos[i];
        await archiveVideo(video)
    }
}
function unarchiveVideo(video){
    return archiveVideo(video,true)
}
async function unarchiveVideos(videos){
    for (let i = 0; i < videos.length; i++) {
        var video = videos[i];
        await unarchiveVideo(video)
    }
}
function buildDefaultVideoMenuItems(file,options){
    var isLocalVideo = !file.videoSet || file.videoSet === 'videos'
    var href = getApiHost() + file.href + `${!isLocalVideo ? `?type=${file.type}` : ''}`
    options = options ? options : {play: true}
    return `
    <li><a class="dropdown-item" href="${href}" download>${lang.Download}</a></li>
    ${options.play ? `<li><a class="dropdown-item open-video" href="${href}">${lang.Play}</a></li>` : ``}
    <li><hr class="dropdown-divider"></li>
    ${isLocalVideo && permissionCheck('video_delete',file.mid) ? `<li><a class="dropdown-item open-video-studio" href="${href}">${lang.Slice}</a></li>` : ``}
    ${permissionCheck('video_delete',file.mid) ? `<li><a class="dropdown-item delete-video" href="${href}">${lang.Delete}</a></li>` : ``}
    ${isLocalVideo && permissionCheck('video_delete',file.mid) ? `<li><a class="dropdown-item compress-video" href="${href}">${lang.Compress}</a></li>` : ``}
`
}
function setVideoStatus(video,toStatus){
    return new Promise((resolve,reject) => {
        toStatus = toStatus || 2
        if(video.status != toStatus){
            $.get(`${video.actionUrl}/status/${toStatus}`,function(data){
                resolve(data)
            })
        }
    })
}
function getVideoInfoFromEl(_this){
    var el = $(_this).parents('[data-mid]')
    var monitorId = el.attr('data-mid')
    var videoTime = el.attr('data-time')
    var video = loadedVideosInMemory[`${monitorId}${videoTime}${undefined}`]
    return {
        monitorId,
        videoTime,
        video,
    }
}
function getDisplayDimensions(videoElement) {
  var actualVideoWidth = videoElement.videoWidth;
  var actualVideoHeight = videoElement.videoHeight;
  var elementWidth = videoElement.offsetWidth;
  var elementHeight = videoElement.offsetHeight;
  var actualVideoAspect = actualVideoWidth / actualVideoHeight;
  var elementAspect = elementWidth / elementHeight;
  var displayWidth, displayHeight;
  if (actualVideoAspect > elementAspect) {
    displayWidth = elementWidth;
    displayHeight = elementWidth / actualVideoAspect;
  } else {
    displayHeight = elementHeight;
    displayWidth = elementHeight * actualVideoAspect;
  }
  return {
    videoWidth: displayWidth,
    videoHeight: displayHeight,
  };
}
