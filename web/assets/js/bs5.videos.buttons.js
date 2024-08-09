onWebSocketEvent(function(d){
    switch(d.f){
        case'video_edit':case'video_archive':
            var video = loadedVideosInMemory[`${d.mid}${d.time}${d.type}`]
            if(video){
                let filename = `${formattedTimeForFilename(convertTZ(d.time),false,`YYYY-MM-DDTHH-mm-ss`)}.${video.ext || 'mp4'}`
                loadedVideosInMemory[`${d.mid}${d.time}${d.type}`].status = d.status
                $(`[data-mid="${d.mid}"][data-filename="${filename}"]`).attr('data-status',d.status);
            }
        break;
        case'video_delete':
            $('[file="'+d.filename+'"][mid="'+d.mid+'"]:not(.modal)').remove();
            $('[data-file="'+d.filename+'"][data-mid="'+d.mid+'"]:not(.modal)').remove();
            $('[data-time-formed="'+(new Date(d.time))+'"][data-mid="'+d.mid+'"]:not(.modal)').remove();
            var videoPlayerId = getVideoPlayerTabId(d)
            if(tabTree.name === videoPlayerId){
                goBackOneTab()
            }
            deleteTab(videoPlayerId)
        break;
    }
})
$(document).ready(function(){
    $('body')
    .on('click','.open-video',function(e){
        e.preventDefault()
        var _this = this;
        var {
            monitorId,
            videoTime,
            video,
        } = getVideoInfoFromEl(_this)
        createVideoPlayerTab(video)
        setVideoStatus(video)
        return false;
    })
    .on('click','[video-time-seeked-video-position]',function(){
        var el = $(this)
        var monitorId = el.attr('data-mid')
        var videoTime = el.attr('video-time-seeked-video-position')
        var timeInward = (parseInt(el.attr('video-slice-seeked')) / 1000) - 2
        var video = loadedVideosInMemory[`${monitorId}${videoTime}${undefined}`]
        timeInward = timeInward < 0 ? 0 : timeInward
        createVideoPlayerTab(video,timeInward)
    })
    .on('click','.delete-video',function(e){
        e.preventDefault()
        var el = $(this).parents('[data-mid]')
        var monitorId = el.attr('data-mid')
        var videoTime = el.attr('data-time')
        var type = el.attr('data-type')
        var video = loadedVideosInMemory[`${monitorId}${videoTime}${type}`]
        var videoSet = video.videoSet
        var ext = video.filename.split('.')
        ext = ext[ext.length - 1]
        var isCloudVideo = videoSet === 'cloudVideos'
        var videoEndpoint = getApiPrefix(videoSet || 'videos') + '/' + video.mid + '/' + video.filename
        var endpointType = isCloudVideo ? `?type=${video.type}` : ''
        $.confirm.create({
            title: lang["Delete Video"] + ' : ' + video.filename,
            body: `${lang.DeleteVideoMsg}<br><br><div class="row"><video class="video_video" autoplay loop controls><source src="${videoEndpoint}${endpointType}" type="video/${ext}"></video></div>`,
            clickOptions: {
                title: '<i class="fa fa-trash-o"></i> ' + lang.Delete,
                class: 'btn-danger btn-sm'
            },
            clickCallback: function(){
                $.getJSON(videoEndpoint + '/delete' + endpointType,function(data){
                    if(data.ok){
                        console.log('Video Deleted')
                    }else{
                        console.log('Video Not Deleted',data,videoEndpoint + endpointType)
                    }
                })
            }
        });
        return false;
    })
    .on('click','.compress-video',function(e){
        e.preventDefault()
        var el = $(this).parents('[data-mid]')
        var monitorId = el.attr('data-mid')
        var videoTime = el.attr('data-time')
        var video = loadedVideosInMemory[`${monitorId}${videoTime}${undefined}`]
        var ext = video.filename.split('.')
        ext = ext[ext.length - 1]
        var videoEndpoint = getApiPrefix(`videos`) + '/' + video.mid + '/' + video.filename
        $.confirm.create({
            title: lang["Compress"] + ' : ' + video.filename,
            body: `${lang.CompressVideoMsg}<br><br><div class="row"><video class="video_video" autoplay loop controls><source src="${videoEndpoint}" type="video/${ext}"></video></div>`,
            clickOptions: {
                title: '<i class="fa fa-compress"></i> ' + lang.Compress,
                class: 'btn-primary btn-sm'
            },
            clickCallback: function(){
                compressVideo(video)
            }
        });
        return false;
    })
    .on('click','.archive-video',function(e){
        e.preventDefault()
        var el = $(this).parents('[data-mid]')
        var monitorId = el.attr('data-mid')
        var videoTime = el.attr('data-time')
        var unarchive = $(this).hasClass('status-archived')
        var video = loadedVideosInMemory[`${monitorId}${videoTime}${undefined}`]
        var ext = video.filename.split('.')
        ext = ext[ext.length - 1]
        var videoEndpoint = getApiPrefix(`videos`) + '/' + video.mid + '/' + video.filename
        if(unarchive){
            unarchiveVideo(video)
        }else{
            // $.confirm.create({
            //     title: lang["Archive"] + ' : ' + video.filename,
            //     body: `${lang.ArchiveVideoMsg}<br><br><div class="row"><video class="video_video" autoplay loop controls><source src="${videoEndpoint}" type="video/${ext}"></video></div>`,
            //     clickOptions: {
            //         title: '<i class="fa fa-lock"></i> ' + lang.Archive,
            //         class: 'btn-primary btn-sm'
            //     },
            //     clickCallback: function(){
                    archiveVideo(video)
            //     }
            // });
        }
        return false;
    })
    .on('click','.fix-video',function(e){
        e.preventDefault()
        var el = $(this).parents('[data-mid]')
        var monitorId = el.attr('data-mid')
        var videoTime = el.attr('data-time')
        var video = loadedVideosInMemory[`${monitorId}${videoTime}${undefined}`]
        var ext = video.filename.split('.')
        ext = ext[ext.length - 1]
        var videoEndpoint = getApiPrefix(`videos`) + '/' + video.mid + '/' + video.filename
        $.confirm.create({
            title: lang["Fix Video"] + ' : ' + video.filename,
            body: `${lang.FixVideoMsg}<br><br><div class="row"><video class="video_video" autoplay loop controls><source src="${videoEndpoint}" type="video/${ext}"></video></div>`,
            clickOptions: {
                title: '<i class="fa fa-wrench"></i> ' + lang.Fix,
                class: 'btn-danger btn-sm'
            },
            clickCallback: function(){
                $.getJSON(videoEndpoint + '/fix',function(data){
                    if(data.ok){
                        console.log('Video Fixed')
                    }else{
                        console.log('Video Not Fixed',data,videoEndpoint)
                    }
                })
            }
        });
        return false;
    })
})
