var logStreams = {}
var logStreamWiggler = {}
var logStreamWiggling = {}
var logStreamLastTimeEl = {}
var monitorLogStreamElement = $(`#tab-monitorSettings .logs`);
$(document).ready(function(e){
    var theWindow = $('#tab-logViewer')
    var logTypeSelector = $('#log_monitors')
    var dateSelector = $('#logs_daterange')
    var savedLogRows = $('#saved-logs-rows')
    var globalLogStream = $('#global-log-stream')
    var theForm = theWindow.find('form')
    var logViewerDataInMemory = {}
    //log viewer
    function setLogStreamElements(monitorId){
        logStreams[monitorId] = $(`.logViewerStream[data-mid="${monitorId}"],.monitor_item[data-mid="${monitorId}"] .logs:visible`)
        logStreamWiggler[monitorId] = $(`#logViewerStreamContainer_${monitorId} .fa-exclamation-triangle`)
        logStreamLastTimeEl[monitorId] = $(`#logViewerStreamContainer_${monitorId} .lastlogtime`)
    }
    function drawMonitorContainer(monitor){
        var groupKey = monitor.ke
        var monitorId = monitor.mid
        var notExist = $(`#logViewerStreamContainer_${monitorId}`).length === 0;
        if(notExist){
            var dataTarget = `.logViewerStream[data-mid='${monitorId}']`
            var classToggle = (dashboardOptions().class_toggle || {})[dataTarget] || []
            var html = `<div id="logViewerStreamContainer_${monitorId}" class="card ${definitions.Theme.isDark ? 'btn-default' : ''} mb-3 search-row">
                <div id="logViewerStreamHeader_${monitorId}" class_toggle="d-none" data-target="${dataTarget}" class="card-header cursor-pointer d-flex">
                    <div class="col">
                        <i class="fa fa-exclamation-triangle"></i> &nbsp; ${monitor.name} <small>(${monitor.mid})</small>
                    </div>
                    <div class="lastlogtime col text-end"></div>
                </div>
                <div data-mid="${monitorId}" data-ke="${groupKey}" class="logViewerStream card-body ${classToggle[1] === 1 ? 'd-none' : ''}"></div>
            </div>`
            globalLogStream.append(html);
            setLogStreamElements(monitorId)
        }
    }
    function drawMonitorContainers(){
        globalLogStream.empty()
        drawMonitorContainer({ mid: '_USER', ke: $user.ke, name: lang['User Logs'] })
        $.each(loadedMonitors,function(n,monitor){
            drawMonitorContainer(monitor)
        })
    }
    function drawLogRows(){
        var html = ''
        var selectedLogType = logTypeSelector.val()
        selectedLogType = selectedLogType === 'all' ? '' : selectedLogType
        var dateRange = getSelectedTime(dateSelector)
        var apiEndpoint = getApiPrefix(`logs`) + '/' + selectedLogType + '?start=' + formattedTimeForFilename(dateRange.startDate) + '&end=' + formattedTimeForFilename(dateRange.endDate)
        $.getJSON(apiEndpoint,function(rows){
            logViewerDataInMemory = {
                startDate: dateRange.startDate,
                endDate: dateRange.endDate,
                url: apiEndpoint,
                query: selectedLogType,
                rows: rows,
            }
            if(rows.length === 0){
                html = '<tr class="text-center"><td>'+lang.NoLogsFoundForDateRange+'</td></tr>'
            }else{
                $.each(rows,function(n,v){
                    html += buildLogRow(v)
                })
            }
            savedLogRows.html(html)
        })
    }
    logTypeSelector.change(drawLogRows)
    theForm.submit(function(e){
        e.preventDefault()
        drawLogRows()
        return false
    })
    theWindow.find('[download]').click(function(e){
        e.preventDefault()
        if(!logViewerDataInMemory.rows){
            console.log('No Logs Found for Download')
            return
        }
        downloadJSON(logViewerDataInMemory,'Shinobi_Logs_'+(new Date())+'.json')
        return false;
    })
    loadDateRangePicker(dateSelector,{
        onChange: function(start, end, label) {
            drawLogRows()
        }
    })
    addOnTabOpen('logViewer',function(){
        logTypeSelector.find('optgroup option').remove()
        var html = ''
        $.each(loadedMonitors,function(n,v){
            html += createOptionHtml({
                value: v.mid,
                label: v.name,
            })
        })
        logTypeSelector.find('optgroup').html(html)
        drawLogRows()
    })
    drawMonitorContainers()
    onDashboardReady(function(){
        drawMonitorContainers()
    })
    onWebSocketEvent(function (d){
        switch(d.f){
            case'monitor_edit':
                drawMonitorContainer(d.mon)
            break;
            case'monitor_watch_on':
                setLogStreamElements(d.id || d.mid)
            break;
            case'monitor_watch_off':case'monitor_stopping':
                setLogStreamElements(d.id || d.mid)
            break;
        }
    })
})
