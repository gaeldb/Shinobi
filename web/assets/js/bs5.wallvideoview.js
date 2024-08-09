function createVideoPlayerTab(video){
    // not real one, dummy for wallvideoview.
    var videoEndpoint = getApiPrefix(`videos`) + '/' + video.mid + '/' + video.filename
    $.confirm.create({
        title: lang["Download"],
        body: `<div class="text-center mb-2"><h6 class="mb-0">${loadedMonitors[video.mid].name}</h6><small>${video.time}</small></div><video style="border-radius:10px;max-width:100%;" autoplay controls playsinline src="${videoEndpoint}"></video>`,
        clickOptions: {
            title: '<i class="fa fa-download"></i> ' + lang.Download,
            class: 'btn-success btn-sm'
        },
        clickCallback: function(){
            downloadFile(videoEndpoint, video.filename)
        }
    });
}
$(document).ready(function(){
    loadMonitorsIntoMemory(function(data){
        openTab('timeline')
        onDashboardReadyExecute()
    })
})
