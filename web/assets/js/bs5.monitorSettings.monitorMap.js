$(document).ready(function(e){
    var monitorEditorWindow = $('#tab-monitorSettings')
    var monitorSettingsMonitorMap = $('#monitor-settings-monitor-map')
    var monitorSettingsMonitorMapContainer = $('#monitor-settings-monitor-map-container')
    var monitorSettingsMapOptionsEl = $('#monitor-settings-geolocation-options')
    var monitorSettingsMapOptionsElOptions = monitorSettingsMapOptionsEl.find('[map-option]')
    var editorForm = monitorEditorWindow.find('form')
    var mapInWindow;
    var monitorMapMarker;
    var monitorMapMarkerFov;
    function setAdditionalControls(options){
        options = options || {}
        monitorSettingsMapOptionsElOptions.each(function(n,v){
            var el = $(v)
            var key = el.attr('map-option')
            if(options[key])el.val(options[key]);
        })
    }
    function setGeolocationFieldValue(markerDetails) {
        editorForm.find(`[detail="geolocation"]`).val(getMapMarkerPosition(markerDetails))
    }
    function loadMap(monitor, geoString){
        try{
            unloadMap()
        }catch(err){

        }
        console.log('MAP LOAD!!!',monitor)
        var {
            lat,
            lng,
            zoom,
            direction,
            fov,
            range,
        } = getGeolocationParts(geoString || monitor.details.geolocation);
        mapInWindow = L.map('monitor-settings-monitor-map').setView([lat, lng], zoom);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
        }).addTo(mapInWindow);
        monitorMapMarker = L.marker([lat, lng], {
            title: monitor ? `${monitor.name} (${monitor.host})` : null,
            draggable: true,
        }).addTo(mapInWindow);
        monitorMapMarker.on('dragend', function(){
            setGeolocationFieldValue()
        });
        monitorMapMarker.on('drag', function(){
            var markerDetails = getMapMarkerDetails();
            setMapMarkerFov(monitorMapMarkerFov,markerDetails)
        });
        mapInWindow.on('zoomend', function(){
            setGeolocationFieldValue()
        });
        setAdditionalControls({
            direction,
            fov,
            range,
        })
        monitorMapMarkerFov = drawMapMarkerFov(mapInWindow,{
            lat,
            lng,
            direction,
            fov,
            range,
        })
        setAdditionalControlsUI({
            direction,
            fov,
            range,
        })
    }
    function unloadMap(){
        mapInWindow.remove();
        mapInWindow = null;
    }
    function getMapOptions(){
        var options = {}
        monitorSettingsMapOptionsElOptions.each(function(n,v){
            var el = $(v)
            var key = el.attr('map-option')
            var value = el.val()
            options[key] = parseFloat(value) || value
        })
        return options
    }
    function getMapMarkerDetails(){
        var pos = monitorMapMarker.getLatLng()
        var zoom = mapInWindow.getZoom();
        var {
            direction,
            fov,
            range,
        } = getMapOptions();
        return {
            lat: pos.lat,
            lng: pos.lng,
            zoom,
            direction,
            fov,
            range,
        }
    }
    function getMapMarkerPosition(markerDetails){
        var {
            lat,
            lng,
            zoom,
            direction,
            fov,
            range,
        } = (markerDetails || getMapMarkerDetails());
        return `${lat},${lng},${zoom},${direction},${fov},${range}`
    }
    function setAdditionalControlsUI(markerDetails){
        $.each(markerDetails,function(key,value){
            var setValue = `${value}`
            if(key === 'direction'){
                setValue = `${value} (${getCardinalDirection(value)})`
            }
            monitorSettingsMapOptionsEl.find(`[map-option-value="${key}"]`).text(setValue)
        })
    }
    editorForm.find(`[detail="geolocation"]`).change(function(){
        var geoString = $(this).val();
        var currentGeoString = monitorEditorSelectedMonitor.details.geolocation
        if(!geoString && currentGeoString){
            editorForm.find(`[detail="geolocation"]`).val(currentGeoString)
        }
        loadMap(monitorEditorSelectedMonitor, geoString)
    })
    addOnTabOpen('monitorSettings', function () {
        loadMap(monitorEditorSelectedMonitor)
    })
    addOnTabReopen('monitorSettings', function () {
        loadMap(monitorEditorSelectedMonitor)
    })
    addOnTabAway('monitorSettings', function () {
        unloadMap()
    })
    onMonitorSettingsLoaded(function(monitorConfig){
        loadMap(monitorConfig)
    })
    monitorSettingsMapOptionsElOptions.on('input',function(){
        var markerDetails = getMapMarkerDetails();
        setGeolocationFieldValue(markerDetails)
        setMapMarkerFov(monitorMapMarkerFov,markerDetails)
        setAdditionalControlsUI(markerDetails)
    })
})
