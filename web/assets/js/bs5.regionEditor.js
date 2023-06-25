$(document).ready(function(e){
    var regionEditorWindow = $('#tab-regionEditor')
    var regionEditorForm = regionEditorWindow.find('form')
    var regionEditorRegionsList = $('#regions_list')
    var regionEditorRegionsPoints = $('#regions_points')
    var regionEditorRegionsCanvas = $('#regions_canvas')
    var regionStillImage = regionEditorWindow.find('.toggle-region-still-image');
    var regionEditorCanvasHolder = regionEditorWindow.find('.canvas_holder')
    var regionEditorMonitorsList = $('#region_editor_monitors')
    var regionEditorLiveView = $('#region_editor_live')
    var regionEditorGridOverlay = regionEditorWindow.find('.grid')
    var accuracyModeToggle = regionEditorWindow.find('[detail="detector_motion_tile_mode"]')
    var tileSizeField = regionEditorWindow.find('[detail="detector_tile_size"]')
    var getRegionEditorCanvas = function(){
        return regionEditorWindow.find('canvas')
    }
    var getRegionEditorNameField = function(){
        return regionEditorWindow.find('[name="name"]')
    }
    var getCurrentlySelectedMonitorId = function(){
        return regionEditorMonitorsList.val()
    }
    var getCurrentlySelectedRegionId = function(){
        return regionEditorRegionsList.val()
    }
    var regionViewerDetails = {}
    function createBlankCoorindateObject(name){
        var streamElement = regionEditorLiveView.find('iframe,img')
        var width = streamElement.width() || 200
        var height = streamElement.height() || 200
        return {
            name: name,
            sensitivity: 10,
            max_sensitivity: '',
            threshold: 1,
            color_threshold: 9,
            points: [
                [0, 0],
                [0, height * 0.6],
                [width * 0.6, height * 0.6],
                [width * 0.6, 0]
            ]
        }
    }
    var loadRegionEditor = function(monitor){
        regionEditorForm.find('input').prop('disabled',false)
        var theCanvas = getRegionEditorCanvas()
        var monitorDetails = Object.assign({},monitor.details)
        var imageWidth = !isNaN(monitorDetails.detector_scale_x) ? parseInt(monitorDetails.detector_scale_x) : 640
        var imageHeight = !isNaN(monitorDetails.detector_scale_y) ? parseInt(monitorDetails.detector_scale_y) : 480
        monitorDetails.cords = monitorDetails.cords ? safeJsonParse(monitorDetails.cords) || {} : {}
        getRegionEditorCanvas()
            .attr('width',imageWidth)
            .attr('height',imageHeight);
        regionEditorCanvasHolder.css({
            width: imageWidth,
            height: imageHeight
        });
        if(Object.keys(monitorDetails.cords).length === 0){
            const regionName = lang['Region Name']
            monitorDetails.cords = {}
            monitorDetails.cords[regionName] = createBlankCoorindateObject(regionName)
        }
        regionViewerDetails = monitorDetails;
        initiateRegionList()
        loadPrimaryFields(monitor)
    }
    function loadPrimaryFields(monitor){
        var monitorDetails = Object.assign({},monitor.details)
        $.each(monitorDetails,function(n,v){
            regionEditorForm.find(`[detail="${n}"]`).val(v)
        })
    }
    var drawPointsTable = function(){
        var currentRegionId = getCurrentlySelectedRegionId()
        var value = regionEditorRegionsCanvas.val().replace(/(,[^,]*),/g, '$1;').split(';');
        var newArray = [];
        $.each(value,function(n,v){
            v = v.split(',')
            if(v[1]){
                newArray.push([v[0],v[1]])
            }
        })
        regionViewerDetails.cords[currentRegionId].points = newArray
        regionEditorRegionsPoints.empty()
        $.each(regionViewerDetails.cords[currentRegionId].points,function(n,v){
            if(isNaN(v[0])){v[0] = 20}
            if(isNaN(v[1])){v[1] = 20}
            regionEditorRegionsPoints.append(`<tr points="${n}">
    <td>
        <input class="form-control" placeholder="X" point="x" value="${v[0]}">
    </td>
    <td>
        <input class="form-control" placeholder="Y" point="y" value="${v[1]}">
    </td>
    <td class="text-right"><a class="badge delete btn btn-sm btn-danger text-white"><i class="fa fa-trash-o"></i></a></td>
</tr>`)
        })
    }
    function saveCoords(coorindates){
        var monitorId = getCurrentlySelectedMonitorId()
        var monitorConfig = Object.assign({},loadedMonitors[monitorId])
        var regionCoordinates = {};
        var randomCoordinates = Object.assign({},coorindates || regionViewerDetails.cords instanceof Object ? regionViewerDetails.cords : safeJsonParse(regionViewerDetails.cords) || {});
        $.each(randomCoordinates,function(randomId,region){
            regionCoordinates[region.name] = region
        })
        regionEditorForm.find('[detail]').each(function(n,v){
            var el = $(this);
            var key = el.attr('detail')
            var value = el.val()
            monitorConfig.details[key] = value;
        });
        monitorConfig.details.cords = JSON.stringify(regionCoordinates)
        monitorConfig.details = JSON.stringify(monitorConfig.details)
        setSubmitButton(regionEditorForm, lang[`Please Wait...`], `spinner fa-pulse`, true)
        $.post(getApiPrefix(`configureMonitor`)+ '/' + monitorId,{
            data: JSON.stringify(monitorConfig)
        },function(d){
            if(d.ok === false){
                new PNotify({
                    title: lang['Action Failed'],
                    text: d.msg,
                    type: 'danger'
                })
            }
            debugLog(d)
            setSubmitButton(regionEditorForm, lang.Save, `check`, false)
        })
    }
    var initiateRegionList = function(presetVal){
        regionEditorRegionsList.empty()
        regionEditorRegionsPoints.empty()
        $.each(regionViewerDetails.cords,function(regionId,region){
            if(region && region.name){
                regionEditorRegionsList.append('<option value="' + regionId + '">' + region.name + '</option>')
            }
        });
        if(presetVal)regionEditorRegionsList.val(presetVal);
        regionEditorRegionsList.change();
    }
    function displayGridOverCanvas(isOn,tileSize){
        if(isOn){
            regionEditorGridOverlay.css('background-size',`${tileSize}px ${tileSize}px`).show()
        }else{
            regionEditorGridOverlay.hide()
        }
    }
    function setGridDisplayBasedOnFields(){
        var isOn = accuracyModeToggle.val() === '1'
        var tileSize = tileSizeField.val() || 20
        displayGridOverCanvas(isOn,tileSize)
    }
    function initLiveStream(monitorId){
        var monitorId = monitorId || getCurrentlySelectedMonitorId()
        var liveElement = regionEditorLiveView.find('iframe,img')
        var loadedMonitor = loadedMonitors[monitorId]
        var monitorDetails = loadedMonitor.details
        if(loadedMonitor.mode === 'stop'){
            var apiUrl = placeholder.getData(placeholder.plcimg({
                bgcolor: '#000',
                text: lang[`Cannot watch a monitor that isn't running.`],
                size: regionViewerDetails.detector_scale_x+'x'+regionViewerDetails.detector_scale_y
            }))
            liveElement.attr('src',apiUrl).show()
        }else{
            var apiPoint = 'embed'
            regionEditorLiveView.find('iframe,img').attr('src','').hide()
            regionEditorGridOverlay.css('background-size',`71px 71px`).show()
            var tileSize = monitorDetails.detector_tile_size || 20
            displayGridOverCanvas(monitorDetails.detector_motion_tile_mode === '1',tileSize)
            if(getRegionStillImageSwitch()){
                apiPoint = 'jpeg'
            }else{
                apiPoint = 'embed'
            }
            var apiUrl = `${getApiPrefix(apiPoint)}/${monitorId}`
            if(apiPoint === 'embed'){
                apiUrl += `/fullscreen|jquery|gui|relative?host=${location.pathname}`
            }else{
                apiUrl += '/s.jpg'
            }
            if(liveElement.attr('src') !== apiUrl){
                liveElement.attr('src',apiUrl).show()
            }
            liveElement.attr('width',regionViewerDetails.detector_scale_x)
            liveElement.attr('height',regionViewerDetails.detector_scale_y)
        }

    }
    var initCanvas = function(dontReloadStream){
        var newArray = [];
        var regionEditorRegionsListValue = regionEditorRegionsList.val();
        if(!regionEditorRegionsListValue){
            regionEditorForm.find('[name="name"]').val('')
            regionEditorForm.find('[name="sensitivity"]').val('')
            regionEditorForm.find('[name="max_sensitivity"]').val('')
            regionEditorForm.find('[name="threshold"]').val('')
            regionEditorForm.find('[name="color_threshold"]').val('')
            regionEditorRegionsPoints.empty()
        }else{
            var cord = regionViewerDetails.cords[regionEditorRegionsListValue];
            if(!cord.points){
                cord.points = [
                    [0,0],
                    [0,100],
                    [100,0]
                ]
            }
            $.each(cord.points,function(n,v){
                newArray = newArray.concat(...v)
            })
            if(isNaN(cord.sensitivity)){
                cord.sensitivity = regionViewerDetails.detector_sensitivity
            }
            regionEditorForm.find('[name="name"]').val(cord.name || regionEditorRegionsListValue)
            regionEditorWindow.find('.cord_name').text(cord.name || regionEditorRegionsListValue)
            regionEditorForm.find('[name="sensitivity"]').val(cord.sensitivity)
            regionEditorForm.find('[name="max_sensitivity"]').val(cord.max_sensitivity)
            regionEditorForm.find('[name="threshold"]').val(cord.threshold)
            regionEditorForm.find('[name="color_threshold"]').val(cord.color_threshold)
            regionEditorWindow.find('.canvas_holder canvas').remove()
            if(!dontReloadStream)initLiveStream();
            regionEditorRegionsCanvas.val(newArray.join(','))
            regionEditorRegionsCanvas.canvasAreaDraw({
                imageUrl: placeholder.getData(placeholder.plcimg({
                    bgcolor: 'transparent',
                    text: ' ',
                    size: regionViewerDetails.detector_scale_x+'x'+regionViewerDetails.detector_scale_y
                }))
            })
            drawPointsTable()
        }
    }
    function getRegionStillImageSwitch(){
        var dashboardSwitches = dashboardOptions().switches || {}
        return dashboardSwitches.regionStillImage == 1;
    }
    function toggleRegionStillImage(){
        var dashboardSwitches = dashboardOptions().switches || {}
        if(dashboardSwitches.regionStillImage !== 1){
            dashboardSwitches.regionStillImage = 1
        }else{
            dashboardSwitches.regionStillImage = "0"
        }
        dashboardOptions('switches',dashboardSwitches)
    }
    regionEditorRegionsList.change(function(e){
        initCanvas(true);
    })
    accuracyModeToggle.change(setGridDisplayBasedOnFields)
    tileSizeField.change(setGridDisplayBasedOnFields)
    regionEditorWindow.find('[name]').change(function(){
        var currentRegionId = getCurrentlySelectedRegionId()
        var el = $(this)
        var val = el.val()
        var key = el.attr('name')
        switch(key){
            case'name':
                var newRegion = Object.assign({},regionViewerDetails.cords[currentRegionId])
                newRegion.name = val
                regionViewerDetails.cords[val] = newRegion
                delete(regionViewerDetails.cords[currentRegionId])
                initiateRegionList(val)
            break;
            default:
                regionViewerDetails.cords[currentRegionId][key] = val
            break;
        }
    })
    regionEditorWindow.on('change','[point]',function(e){
        var currentRegionId = getCurrentlySelectedRegionId()
        var points = [];
        $('[points]').each(function(n,v){
            var el = $(this)
            var pointValueX = el.find('[point="x"]').val()
            if(pointValueX){
                points.push([
                    pointValueX,
                    el.find('[point="y"]').val()
                ])
            }
        })
        regionViewerDetails.cords[currentRegionId].points = points;
        initCanvas()
    })
    regionEditorWindow.find('.erase').click(function(e){
        var currentRegionId = getCurrentlySelectedRegionId()
        var newCoordinates = []
        $.each(regionViewerDetails.cords,function(n,points){
            if(points && points !== regionViewerDetails.cords[currentRegionId]){
                newCoordinates.push(points)
            }
        })
        regionViewerDetails.cords = newCoordinates.concat([])
        if(Object.keys(regionViewerDetails.cords).length > 0){
            initiateRegionList();
        }else{
            regionEditorForm.find('input').prop('disabled',true)
            regionEditorRegionsPoints.empty()
            regionEditorRegionsList.find('[value="'+currentRegionId+'"]').remove()
            // saveCoords([])
        }
    })
    regionEditorWindow.on('changed','#regions_canvas',function(e){
        drawPointsTable()
        // saveCoords()
    })
    regionEditorForm.submit(function(e){
        e.preventDefault()
        saveCoords()
        return false;
    })
    regionEditorRegionsPoints
    .on('click','.delete',function(e){
        e.stopPropagation()
        var elParent = $(this).parents('tr')
        var points = elParent.attr('points')
        delete(regionViewerDetails.cords[regionEditorRegionsList.val()].points[points])
        // saveCoords()
        elParent.remove()
        regionEditorRegionsList.change()
        return false;
    })
    regionEditorWindow.on('click','.add',function(e){
        e.stopPropagation()
        regionEditorForm.find('input').prop('disabled',false)
        var regionName = lang['Region Name'];
        var newCoordinates = {}
        $.each(regionViewerDetails.cords,function(n,v){
            if(v && v !== null && v !== 'null'){
                newCoordinates[n] = v;
            }
        })
        regionViewerDetails.cords = newCoordinates
        regionViewerDetails.cords[regionName] = createBlankCoorindateObject(regionName)
        regionEditorRegionsList.append(`<option value="${regionName}">${lang['Region Name']}</option>`)
        regionEditorRegionsList.val(regionName)
        regionEditorRegionsList.change()
        return false;
    })
    regionStillImage.click(function(e){
        toggleRegionStillImage()
        initLiveStream()
    })
    $('body')
    .on('click','.open-region-editor',function(e){
        var monitorId = getMonitorIdFromElement(this)
        var monitor = loadedMonitors[monitorId]
        openTab(`regionEditor`,{},null)
        loadRegionEditor(monitor)
        initLiveStream()
    });
    regionEditorMonitorsList.change(function(){
        var monitorId = $(this).val()
        var monitor = loadedMonitors[monitorId]
        if(monitor){
            loadRegionEditor(monitor)
            initLiveStream()
        }
    })
    addOnTabOpen('regionEditor', function () {
        drawMonitorListToSelector(regionEditorMonitorsList,true)
        initLiveStream()
    })
    addOnTabReopen('regionEditor', function () {
        initLiveStream()
        var theSelected = `${regionEditorMonitorsList.val()}`
        drawMonitorListToSelector(regionEditorMonitorsList)
        regionEditorMonitorsList.val(theSelected)
    })
    addOnTabAway('regionEditor', function () {
        regionEditorLiveView.find('iframe,img').attr('src','about:blank')
    })
    drawSubMenuItems('regionEditor',definitions['Region Editor'])
})
