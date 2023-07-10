function calculateFOV(camera, direction, fieldOfView, range) {
    var startAngle = (direction - fieldOfView / 2) * Math.PI / 180;
    var endAngle = (direction + fieldOfView / 2) * Math.PI / 180;
    var sectorPoints = [camera];
    for (var angle = startAngle; angle <= endAngle; angle += Math.PI / 180) {
        var dx = range * Math.cos(angle);
        var dy = range * Math.sin(angle);
        var lat = camera[0] + dy / 111.325;  // Rough conversion from kilometers to degrees
        var lng = camera[1] + dx / (111.325 * Math.cos(camera[0] * Math.PI / 180));  // Rough conversion from kilometers to degrees
        sectorPoints.push([lat, lng]);
    }
    sectorPoints.push(camera);
    return sectorPoints;
}
function drawMapMarkerFov(map, {
    lat,
    lng,
    direction,
    fov,
    range
}){
    var fovEl = L.polygon(calculateFOV([lat, lng], direction, fov, range), {color: 'red'}).addTo(map);
    return fovEl
}
function setMapMarkerFov(fovEl,{
    lat,
    lng,
    direction,
    fov,
    range,
}){
    fovEl.setLatLngs(calculateFOV([lat, lng], direction, fov, range));
}

function getGeolocationParts(geolocation){
    var defaultLat = 49.2578298
    var defaultLng = -123.2634732
    var defaultZoom = 13
    var defaultDirection = 90
    var defaultFov = 60
    var defaultRange = 1
    try{
        var parts = geolocation.split(',')
        var lat = !parts[0] ? defaultLat : parseFloat(parts[0].trim().replace('@','')) || defaultLat
        var lng = !parts[1] ? defaultLng : parseFloat(parts[1].trim()) || defaultLng
        var zoom = !parts[2] ? defaultZoom : parseFloat(parts[2].trim().replace('v','')) || defaultZoom
        var direction = !parts[3] ? defaultDirection : parseFloat(parts[3].trim()) || defaultDirection
        var fov = !parts[4] ? defaultFov : parseFloat(parts[4].trim()) || defaultFov
        var range = !parts[5] ? defaultRange : parseFloat(parts[5].trim()) || defaultRange
    }catch(err){
        console.error(err)
        var lat = defaultLat
        var lng = defaultLng
        var zoom = defaultZoom
        var direction = defaultDirection
        var fov = defaultFov
        var range = defaultRange
    }
    return {
        lat,
        lng,
        zoom,
        direction,
        fov,
        range,
    }
}

function getCardinalDirection(degree) {
    if (degree >= 337.5 || degree < 22.5) {
        return 'N';
    } else if (degree >= 22.5 && degree < 67.5) {
        return 'NE';
    } else if (degree >= 67.5 && degree < 112.5) {
        return 'E';
    } else if (degree >= 112.5 && degree < 157.5) {
        return 'SE';
    } else if (degree >= 157.5 && degree < 202.5) {
        return 'S';
    } else if (degree >= 202.5 && degree < 247.5) {
        return 'SW';
    } else if (degree >= 247.5 && degree < 292.5) {
        return 'W';
    } else if (degree >= 292.5 && degree < 337.5) {
        return 'NW';
    } else {
        return 'Invalid degree';
    }
}
