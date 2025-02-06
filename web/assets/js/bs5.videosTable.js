$(document).ready(function(e){
    var theEnclosure = $('#tab-videosTableView')
    var monitorsList = theEnclosure.find('.monitors_list')
    var dateSelector = theEnclosure.find('.date_selector')
    var videosTableDrawArea = $('#videosTable_draw_area')
    var videosTablePreviewArea = $('#videosTable_preview_area')
    var objectTagSearchField = $('#videosTable_tag_search')
    var objectTagSearchFieldAndOnly = $('#videosTable_tag_search_andonly')
    var cloudVideoCheckSwitch = $('#videosTable_cloudVideos')
    var sideLinkListBox = $('#side-menu-link-videosTableView ul')
    var loadedVideosTable = [];
    var redrawTimeout;
    var frameUrlCache = {}
    var frameUrlCacheTimeouts = {}
    async function getSnapshotFromVideoTimeFrame(monitorId,startDate,endDate){
        const frameUrlCacheId = `${monitorId}${startDate}${endDate}`
        if(typeof frameUrlCache[frameUrlCacheId] === 'string'){
            return frameUrlCache[frameUrlCacheId]
        }else{
            const frame = (await getTimelapseFrames(monitorId,startDate,endDate,1))[0]
            const href = frame && frame.href ? frame.href : ''
            frameUrlCache[frameUrlCacheId] = `${href}`
            frameUrlCacheTimeouts[frameUrlCacheId] = setTimeout(() => {
                delete(frameUrlCache[frameUrlCacheId])
                delete(frameUrlCacheTimeouts[frameUrlCacheId])
            },1000 * 60 * 15)
            return href
        }
    }
    //Lazy Load Thumbnails
    function loadFramesForVideosInView() {
        videosTableDrawArea.find('.video-thumbnail').each(async (n, imgEl) => {
            const el = $(imgEl);
            const monitorId = el.attr('data-mid');
            const startDate = el.attr('data-time');
            const endDate = el.attr('data-end');
            const imgBlock = el.find('.video-thumbnail-img-block');

            if (el.is(':visible')) {  // Only load if visible
                const href = await getSnapshotFromVideoTimeFrame(monitorId, startDate, endDate);
                imgBlock.find('img').attr('src', href);
            }
        });
    }
    window.openVideosTableView = function(monitorId){
        drawMonitorListToSelector(monitorsList,null,null,true)
        monitorsList.val(monitorId)
        drawVideosTableViewElements()
        openTab(`videosTableView`,{})
    }
    loadDateRangePicker(dateSelector,{
        onChange: function(start, end, label) {
	    videosTableDrawArea.bootstrapTable('destroy');
            drawVideosTableViewElements()
        }
    })
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    };

    [
        monitorsList,
        objectTagSearchField,
        objectTagSearchFieldAndOnly,
        cloudVideoCheckSwitch,
    ].forEach(function(theElement){
        theElement.change(debounce(function(){
            videosTableDrawArea.bootstrapTable('destroy');
            drawVideosTableViewElements();
        }, 300));
    });

    // Event listener for the Refresh link styled as a button
    $('.refresh-data').click(function(e) {
        e.preventDefault();
        videosTableDrawArea.bootstrapTable('destroy');
        drawVideosTableViewElements();
    });

    async function drawVideosTableViewElements(pageNumber, pageSize, usePreloadedData) {
    // Set default values if pageNumber and pageSize are not provided
    pageNumber = pageNumber || 1;
    pageSize = pageSize || 10;

    var dateRange = getSelectedTime(dateSelector);
    var searchQuery = objectTagSearchField.val() || null;
    var andOnly = objectTagSearchFieldAndOnly.val() || '0';
    var startDate = dateRange.startDate;
    var endDate = dateRange.endDate;
    var monitorId = monitorsList.val();
    var wantsArchivedVideo = getVideoSetSelected() === 'archive';
    var wantCloudVideo = wantCloudVideos();
    if (!usePreloadedData) {
        var result = await getVideos({
            monitorId,
            startDate,
            endDate,
            searchQuery,
            andOnly,
            archived: wantsArchivedVideo,
            customVideoSet: wantCloudVideo ? 'cloudVideos' : null,
            pageSize: pageSize, // Pass pageSize to server
            currentPage: pageNumber // Pass currentPage to server
        });
        loadedVideosTable = result.videos;
    }

    //videosTableDrawArea.bootstrapTable('destroy');
    videosTableDrawArea.bootstrapTable({
        pagination: true,
        search: true,
        pageList: [10, 25, 50, 100, 1000, 2000],
        pageSize: pageSize, // Ensure the current page size is maintained
        pageNumber: pageNumber, // Ensure the current page number is maintained
        totalRows: result.total, // Reflect total number of videos
        onPostBody: loadFramesForVideosInView,
        onPageChange: (newPageNumber, newPageSize) => {
            drawVideosTableViewElements(newPageNumber, newPageSize);
            setTimeout(() => {
                loadFramesForVideosInView();
            }, 500);
        },
        columns: [
            {
                field: 'mid',
                title: '',
                checkbox: true,
                formatter: () => {
                    return {
                        checked: false
                    };
                },
            },
            {
                field: 'image',
                title: '',
            },
            {
                field: 'Monitor',
                title: '',
            },
            {
                field: 'time',
                title: lang['Time'],
            },
            {
                field: 'objects',
                title: lang['Objects Found']
            },
            {
                field: 'tags',
                title: ''
            },
            {
                field: 'size',
                title: ''
            },
            {
                field: 'buttons',
                title: ''
            }
        ],
        data: loadedVideosTable.map((file) => {
            var isLocalVideo = !wantCloudVideo;
            var href = file.href + `${!isLocalVideo ? `?type=${file.type}` : ''}`;
            var loadedMonitor = loadedMonitors[file.mid];
            return {
                image: `<div class="video-thumbnail" data-mid="${file.mid}" data-ke="${file.ke}" data-time="${file.time}" data-end="${file.end}" data-filename="${file.filename}">
                            <div class="video-thumbnail-img-block">
                                <img class="pop-image cursor-pointer" style="min-width: 100px;min-height: 75px;">
                            </div>
                            <div class="video-thumbnail-buttons d-flex">
                                <a class="video-thumbnail-button-cell open-snapshot p-3">
                                    <i class="fa fa-camera"></i>
                                </a>
                                <a class="video-thumbnail-button-cell preview-video p-3" href="${href}" title="${lang.Play}">
                                    <i class="fa fa-play"></i>
                                </a>
                            </div>
                        </div>`,
                Monitor: loadedMonitor && loadedMonitor.name ? loadedMonitor.name : file.mid,
                mid: file.mid,
                time: `
                       <div>${timeAgo(file.time)}</div>
                       <div><small><b>${lang.Start} :</b> ${formattedTime(file.time, 'DD-MM-YYYY hh:mm:ss AA')}</small></div>
                       <div><small><b>${lang.End} :</b> ${formattedTime(file.end, 'DD-MM-YYYY hh:mm:ss AA')}</small></div>`,
                objects: `<div style="word-break: break-word;max-width:125px;">${file.objects}</div>`,
                tags: `
                    ${file.ext ? `<span class="badge badge-${file.ext ==='webm' ? `primary` : 'danger'}">${file.ext}</span>` : ''}
                    ${!isLocalVideo ? `<span class="badge badge-success">${file.type}</span>` : ''}
                `,
                size: convertKbToHumanSize(file.size),
                buttons: `
                <div class="row-info btn-group" data-mid="${file.mid}" data-ke="${file.ke}" data-time="${file.time}" data-filename="${file.filename}" data-status="${file.status}" data-type="${file.type}">
                    <a class="btn btn-sm btn-default btn-monitor-status-color open-video" href="${href}" title="${lang.Play}"><i class="fa fa-play"></i></a>
                    ${isLocalVideo && permissionCheck('video_delete',file.mid) ? `<a class="btn btn-sm btn-${file.archive === 1 ? `success status-archived` : `default`} archive-video" title="${lang.Archive}"><i class="fa fa-${file.archive === 1 ? `lock` : `unlock-alt`}"></i></a>` : ''}
                    <div class="dropdown d-inline-block">
                        <a class="btn btn-sm btn-primary dropdown-toggle dropdown-toggle-split" data-bs-toggle="dropdown" aria-expanded="false" data-bs-reference="parent">
                          <i class="fa fa-ellipsis-v" aria-hidden="true"></i>
                        </a>
                        <ul class="dropdown-menu ${definitions.Theme.isDark ? 'dropdown-menu-dark bg-dark' : ''} shadow-lg">
                            ${buildDefaultVideoMenuItems(file)}
                        </ul>
                    </div>
                </div>
                `,
            }
        })
    })
    }
    function drawPreviewVideo(href){
        videosTablePreviewArea.html(`<video class="video_video" style="width:100%" autoplay controls preload loop src="${href}"></video>`)
    }
    function getSelectedRows(getLoadedRows){
        var rowsSelected = []
        videosTableDrawArea.find('[name="btSelectItem"]:checked').each(function(n,checkbox){
            var rowInfo = $(checkbox).parents('tr').find('.row-info')
            var monitorId = rowInfo.attr('data-mid')
            var groupKey = rowInfo.attr('data-ke')
            var time = rowInfo.attr('data-time')
            var filename = rowInfo.attr('data-filename')
            var type = rowInfo.attr('data-type')
            rowsSelected.push(getLoadedRows ? loadedVideosInMemory[`${monitorId}${time}${type}`] : {
                mid: monitorId,
                ke: groupKey,
                time: time,
                filename: filename,
            })
        })
        return rowsSelected
    }
    function getVideoSetSelected(){
        return cloudVideoCheckSwitch.val()
    }
    function wantCloudVideos(){
        const isChecked = getVideoSetSelected() === 'cloud'
        return isChecked
    }
    function drawCompressedVideoProgressBar(data){
        var videoUrl = buildNewFileLink(data)
        var html = `<li data-mid="${data.mid}" data-ke="${data.mid}" data-name="${data.name}" title="${data.name}">
            <div class="text-white cursor-pointer d-flex flex-row" style="align-items: center;justify-content: center;">
                <span class="dot shadow mr-2 dot-orange"></span>
                <div class="row-status">
                    ${lang.Compressing}...
                </div>
                <div class="flex-grow-1 px-2 pt-1">
                    <div class="progress" style="height:18px">
                        <div class="progress-bar progress-bar-warning" role="progressbar" style="width: ${data.percent}%;">${data.percent}%</div>
                    </div>
                </div>
                <div style="display:none;" class="download-button pr-2">
                    <a class="badge badge-sm badge-default open-video" href="${videoUrl}"><i class="fa fa-play"></i></a>
                </div>
                <div style="display:none;" class="download-button pr-2">
                    <a class="badge badge-sm badge-success" download href="${videoUrl}"><i class="fa fa-download"></i></a>
                </div>
                <div style="display:none;" class="download-button">
                    <a class="badge badge-sm badge-dark remove-row"><i class="fa fa-times"></i></a>
                </div>
            </div>
        </li>`
        sideLinkListBox.append(html)
    }
    function buildNewFileLink(data){
        return apiBaseUrl + '/videos/' + data.ke + '/' + data.mid + '/' + data.name
    }
    function downloadCompressedVideo(data){
        var downloadUrl = buildNewFileLink(data)
        downloadFile(downloadUrl,data.name)
    }
    function mergeSelectedVideos(){
        var videos = getSelectedRows(true)
        var dateRange = getSelectedTime(dateSelector);
        var searchQuery = objectTagSearchField.val() || null;
        var startDate = dateRange.startDate;
        var endDate = dateRange.endDate;
        var monitorId = monitorsList.val();
        var wantsArchivedVideo = getVideoSetSelected() === 'archive';
        if(!monitorId){
            new PNotify({
                title: lang['No Monitor Selected'],
                text: lang['No Monitor Found, Ignoring Request'],
                type: 'danger',
            })
            return
        }
        $.confirm.create({
            title: lang["Merge Videos"],
            body: `${videos.length > 0 ? lang.MergeAllSelected : lang.MergeAllInRange}`,
            clickOptions: {
                title: '<i class="fa fa-check"></i> ' + lang.Save,
                class: 'btn-success btn-sm'
            },
            clickCallback: async function(){
                console.log('Merging Video...')
                var result = await mergeVideosAndBin({
                    monitorId,
                    startDate,
                    endDate,
                    videos,
                    searchQuery,
                    archived: wantsArchivedVideo,
                });
                console.log('Merged Video! Check Filebin.')
            }
        });
    }
    $('body')
    .on('click','.open-videosTable',function(e){
        e.preventDefault()
        var monitorId = getRowsMonitorId(this)
        openVideosTableView(monitorId)
        return false;
    });
    sideLinkListBox
    .on('click','.remove-row',function(){
        var el = $(this).parents('[data-mid]')
        el.remove()
    });
    theEnclosure
    .on('click','.preview-video',function(e){
        e.preventDefault()
        var el = $(this)
        var rowEl = $(this).parents('[data-mid]')
        var monitorId = rowEl.attr('data-mid')
        var videoTime = rowEl.attr('data-time')
        var type = rowEl.attr('data-type')
        var video = loadedVideosInMemory[`${monitorId}${videoTime}${type}`]
        var href = el.attr('href')
        setPreviewedVideoHighlight(el,videosTableDrawArea)
        drawPreviewVideo(href)
        setVideoStatus(video)
        return false;
    })
    .on('click','.zip-selected-videos',function(e){
        e.preventDefault()
        var videos = getSelectedRows(true)
        zipVideosAndDownloadWithConfirm(videos)
        return false;
    })
    .on('click','.merge-selected-videos',function(e){
        e.preventDefault()
        mergeSelectedVideos();
        return false;
    })
    .on('click','.refresh-data',function(e){
        e.preventDefault()
        drawVideosTableViewElements()
        return false;
    })
    .on('click','.open-snapshot',function(e){
        e.preventDefault()
        var href = $(this).parents('.video-thumbnail').find('img').click()
        return false;
    })
    .on('click','.delete-selected-videos',function(e){
        e.preventDefault()
        var videos = getSelectedRows()
        if(videos.length === 0)return;
        $.confirm.create({
            title: lang["Delete Videos"],
            body: `${lang.DeleteTheseMsg}`,
            clickOptions: {
                title: '<i class="fa fa-trash-o"></i> ' + lang.Delete,
                class: 'btn-danger btn-sm'
            },
            clickCallback: function(){
                deleteVideos(videos).then(() => {
                    console.log(`Done Deleting Rows!`)
                })
            }
        });
        return false;
    })
    .on('click','.compress-selected-videos',function(e){
        e.preventDefault()
        var videos = getSelectedRows()
        if(videos.length === 0)return;
        $.confirm.create({
            title: lang["Compress Videos"],
            body: `${lang.CompressTheseMsg}`,
            clickOptions: {
                title: '<i class="fa fa-compress"></i> ' + lang.Compress,
                class: 'btn-primary btn-sm'
            },
            clickCallback: function(){
                compressVideos(videos).then(() => {
                    console.log(`Done Sending Compression Request!`)
                })
            }
        });
        return false;
    })
    .on('click','.archive-selected-videos',function(e){
        e.preventDefault()
        var videos = getSelectedRows()
        if(videos.length === 0)return;
        $.confirm.create({
            title: lang["Archive Videos"],
            body: `${lang.ArchiveTheseMsg}`,
            clickOptions: {
                title: '<i class="fa fa-lock"></i> ' + lang.Archive,
                class: 'btn-primary btn-sm'
            },
            clickCallback: function(){
                archiveVideos(videos).then(() => {
                    console.log(`Done Archiving Rows!`)
                })
            }
        });
        return false;
    })
    .on('click','.download-selected-videos',function(e){
        e.preventDefault()
        var videos = getSelectedRows()
        if(videos.length === 0)return;
        $.confirm.create({
            title: lang["Batch Download"],
            body: `${lang.batchDownloadText}`,
            clickOptions: {
                title: '<i class="fa fa-check"></i> ' + lang.Yes,
                class: 'btn-success btn-sm'
            },
            clickCallback: function(){
                downloadVideos(videos)
            }
        });
        return false;
    })
    .on('click','.pop-img',function(e){
        e.preventDefault()
        var videos = getSelectedRows()
        if(videos.length === 0)return;
        $.confirm.create({
            title: lang["Batch Download"],
            body: `${lang.batchDownloadText}`,
            clickOptions: {
                title: '<i class="fa fa-check"></i> ' + lang.Yes,
                class: 'btn-success btn-sm'
            },
            clickCallback: function(){
                downloadVideos(videos)
            }
        });
        return false;
    })
    onWebSocketEvent((data) => {
        switch(data.f){
            case'fileBin_item_added':
                new PNotify({
                    title: lang['File Saved'],
                    text: `${lang.checkFileBinForNewFile}<br><br><a class="btn btn-sm btn-success" href="${buildFileBinUrl(data)}" download>${lang.Download}</a>`,
                    type: 'success',
                    sticky: true,
                })
            break;
            case'video_delete':
            case'video_delete_cloud':
                if(tabTree.name === 'videosTableView'){
                    var videoIndexToRemove = loadedVideosTable.findIndex(row => (!data.type || data.type === row.type) && data.mid === row.mid && new Date(row.time).getTime() === new Date(data.time).getTime())
                    if(videoIndexToRemove !== -1){
                        loadedVideosTable.splice(videoIndexToRemove, 1);
                        delete(loadedVideosInMemory[`${data.mid}${data.time}${data.type}`])
                        clearTimeout(redrawTimeout)
                        redrawTimeout = setTimeout(function(){
			    videosTableDrawArea.bootstrapTable('destroy');
                            drawVideosTableViewElements(true)
                        },2000)
                    }
                }
            break;
            case'video_compress_started':
                console.log(`Compressing Video...`,data)
            break;
            case'video_compress_completed':
                if(data.success){
                    var progressItem = sideLinkListBox.find(`[data-mid="${data.mid}"][data-ke="${data.mid}"][data-name="${data.name}"]`)
                    var saveBuiltVideo = dashboardOptions().switches.saveCompressedVideo
                    if(saveBuiltVideo === 1){
                        downloadCompressedVideo(data)
                        progressItem.remove()
                        console.log(`Downloaded!`,data)
                    }else if(!data.automated){
                        progressItem.find('.row-status').text(`${lang.Done}!`)
                        progressItem.find('.dot').removeClass('dot-orange').addClass('dot-green')
                        progressItem.find('.download-button').show()
                        progressItem.find('.progress-bar').css('width',`100%`).text(`100%`)
                    }else if(data.automated){
                        progressItem.remove()
                    }
                }
            break;
            case'video_compress_percent':
                var progressItem = sideLinkListBox.find(`[data-mid="${data.mid}"][data-ke="${data.mid}"][data-name="${data.name}"]`)
                data.percent = data.percent > 100 ? 100 : data.percent
                if(progressItem.length === 0){
                    drawCompressedVideoProgressBar(data)
                }else{
                    progressItem = sideLinkListBox.find(`[data-mid="${data.mid}"][data-ke="${data.mid}"][data-name="${data.name}"]`)
                    progressItem.find('.progress-bar').css('width',`${data.percent}%`).text(`${data.percent}%`)
                }
                console.log(data)
            break;
        }
    })
    addOnTabOpen('videosTableView', function () {
        drawMonitorListToSelector(monitorsList,null,null,true)
        drawVideosTableViewElements()
    })
    addOnTabReopen('videosTableView', function () {
        var theSelected = `${monitorsList.val()}`
        drawMonitorListToSelector(monitorsList,null,null,true)
        monitorsList.val(theSelected)
    })
    addOnTabAway('videosTableView', function () {
        videosTablePreviewArea.find('video')[0].pause()
    })
})
