$(document).ready(function(e){
    //api window
    var foundMonitors = {}
    var theWindow = $('#tab-rally')
    var theWindowForm = $('#rallyForm')
    var tableEl = $('#rallyCameras')
    function getMonitors(connectionInfo, asis){
        return new Promise((resolve) => {
            $.post(`${getApiPrefix('rally')}/getMonitors`,{
                connectionInfo,
            },function(data){
                resolve(data)
            })
        })
    }
    function saveMonitor(monitor){
        return new Promise((resolve) => {
            $.post(`${getApiPrefix('configureMonitor')}/${monitor.mid}`,{
                data: JSON.stringify(monitor)
            },function(data){
                resolve(data)
            })
        })
    }
    async function saveMonitors(monitors){
        for(monitor of monitors){
            await saveMonitor(monitor)
        }
    }
    function channelsAvailable(monitor){
        const streams = monitor.streams;
        return Object.keys(streams).join(', ')
    }
    function findRallyTypeFromStreamPath(streamPath) {
        let chosenType = null;
        if(streamPath.endsWith('m3u8')){
            chosenType = 'hls'
        }else if(streamPath.endsWith('mp4')){
            chosenType = 'mp4'
        }
        return chosenType;
    }
    function drawTable(monitors){
        var html = ''
        foundMonitors = {}
        for(monitor of monitors){
            var monitorKey = `${monitor.ke}${monitor.mid}`
            foundMonitors[monitorKey] = monitor;
            html += `
            <tr monitor="${monitorKey}">
                <td title="${lang['Monitor Name']}">${monitor.name}</td>
                <td title="${lang['Monitor ID']}">${monitor.mid}</td>
                <td title="${lang.Host}">${monitor.host}</td>
                <td title="${lang.Status}">${monitorStatusCodes[monitor.code]}</td>
                <td title="${lang['Channels Available']}">${channelsAvailable(monitor)}</td>
                <td><a class="add-monitor btn btn-sm btn-success" href="#">${lang.Add}</a></td>
            </tr>`
        }
        tableEl.html(html);
    }
    function convertToRalliedMonitor(monitor, connectionInfo){
        const { host, groupKey, apiKey, channel } = connectionInfo;
        let [ hostname, port ] = host.split('://')[1].split(':');
        const protocol = host.startsWith('https') ? 'https' : 'http';
        hostname = hostname.endsWith('/') ? hostname.substring(0, str.length - 1) : hostname;
        const streamPath = monitor.streams[parseInt(channel) || 0];
        const rallyType = findRallyTypeFromStreamPath(streamPath);
        if(hostname && rallyType){
            const autoHostUrl = `${protocol}://${hostname}:${port}${streamPath}`;
            monitor.protocol = protocol;
            monitor.host = hostname;
            monitor.port = port;
            monitor.path = streamPath;
            monitor.type = rallyType;
            monitor.details.auto_host = autoHostUrl;
            return monitor
        }
        return null;
    }
    function convertToRalliedMonitors(monitors, connectionInfo){
        const ralliedMonitors = []
        monitors.forEach(monitor => {
            var converted = convertToRalliedMonitor(monitor, connectionInfo)
            if(converted)ralliedMonitors.push(converted)
        });
        return ralliedMonitors;
    }
    function getConnectionInfo(){
        const connectionInfo = theWindowForm.serializeObject();
        return connectionInfo
    }
    theWindowForm.submit(async function(e){
        e.preventDefault();
        const connectionInfo = getConnectionInfo()
        const monitors = await getMonitors(connectionInfo)
        drawTable(monitors)
        return false;
    })
    theWindow.on('click','.add-monitor',function(e){
        e.preventDefault();
        const connectionInfo = getConnectionInfo()
        const el = $(this).parents('[monitor]')
        const monitorKey = el.attr('monitor')
        const monitor = foundMonitors[monitorKey]
        const convertedMonitor = convertToRalliedMonitor(monitor, connectionInfo)
        saveMonitor(convertedMonitor)
    })
    theWindow.on('click','.add-all',function(e){
        const connectionInfo = getConnectionInfo()
        const monitors = convertToRalliedMonitors(foundMonitors, connectionInfo)
        $.confirm.create({
            title: lang['Add All (Rallied)'],
            body: lang.AddAllRalliedText,
            clickOptions: {
                class: 'btn-success',
                title: `<i class="fa fa-check"></i> ${lang.Save}`,
            },
            clickCallback: function(){
                saveMonitors(monitors)
            }
        })
    })
    // addOnTabOpen('rally', function () {
    // })
    // addOnTabReopen('rally', function () {
    // })
})
