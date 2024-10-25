var os = require('os');
const onvif = require("shinobi-onvif");
const {
    addCredentialsToUrl,
    stringContains,
    getBuffer,
} = require('../common.js')
module.exports = (s,config,lang) => {
    const ipRange = (start_ip, end_ip) => {
      var startLong = toLong(start_ip);
      var endLong = toLong(end_ip);
      if (startLong > endLong) {
        var tmp = startLong;
        startLong = endLong
        endLong = tmp;
      }
      var rangeArray = [];
      var i;
      for (i = startLong; i <= endLong; i++) {
        rangeArray.push(fromLong(i));
      }
      return rangeArray;
    }
    const portRange = (lowEnd,highEnd) => {
        var list = [];
        for (var i = lowEnd; i <= highEnd; i++) {
            list.push(i);
        }
        return list;
    }
    //toLong taken from NPM package 'ip'
    const toLong = (ip) => {
      var ipl = 0;
      ip.split('.').forEach(function(octet) {
        ipl <<= 8;
        ipl += parseInt(octet);
      });
      return(ipl >>> 0);
    }
    //fromLong taken from NPM package 'ip'
    const fromLong = (ipl) => {
      return ((ipl >>> 24) + '.' +
          (ipl >> 16 & 255) + '.' +
          (ipl >> 8 & 255) + '.' +
          (ipl & 255) );
    }
    const runOnvifScanner = (options,foundCameraCallback) => {
        var ip = options.ip.replace(/ /g,'')
        var ports = options.port.replace(/ /g,'')
        if(options.ip === ''){
            var interfaces = os.networkInterfaces()
            var addresses = []
            for (var k in interfaces) {
                for (var k2 in interfaces[k]) {
                    var address = interfaces[k][k2]
                    if (address.family === 'IPv4' && !address.internal) {
                        addresses.push(address.address)
                    }
                }
            }
            const addressRange = []
            addresses.forEach(function(address){
                if(address.indexOf('0.0.0')>-1){return false}
                var addressPrefix = address.split('.')
                delete(addressPrefix[3]);
                addressPrefix = addressPrefix.join('.')
                addressRange.push(`${addressPrefix}1-${addressPrefix}254`)
            })
            ip = addressRange.join(',')
        }
        if(ports === ''){
            ports = '80,8080,8000,7575,8081,9080,8090,8999,8899'
        }
        if(ports.indexOf('-') > -1){
            ports = ports.split('-')
            var portRangeStart = ports[0]
            var portRangeEnd = ports[1]
            ports = portRange(portRangeStart,portRangeEnd);
        }else{
            ports = ports.split(',')
        }
        var ipList = options.ipList
        var onvifUsername = options.user || ''
        var onvifPassword = options.pass || ''
        ip.split(',').forEach(function(addressRange){
            var ipRangeStart = addressRange[0]
            var ipRangeEnd = addressRange[1]
            if(addressRange.indexOf('-')>-1){
                addressRange = addressRange.split('-');
                ipRangeStart = addressRange[0]
                ipRangeEnd = addressRange[1]
            }else{
                ipRangeStart = addressRange
                ipRangeEnd = addressRange
            }
            if(!ipList){
                ipList = ipRange(ipRangeStart,ipRangeEnd);
            }else{
                ipList = ipList.concat(ipRange(ipRangeStart,ipRangeEnd))
            }
        })
        var hitList = []
        ipList.forEach((ipEntry,n) => {
            ports.forEach((portEntry,nn) => {
                hitList.push({
                    xaddr : 'http://' + ipEntry + ':' + portEntry + '/onvif/device_service',
                    user : onvifUsername,
                    pass : onvifPassword,
                    ip: ipEntry,
                    port: portEntry,
                })
            })
        })
        var responseList = []
        hitList.forEach(async (camera) => {
            try{
                var device = new onvif.OnvifDevice(camera)
                var info = await device.init()
                var date = await device.services.device.getSystemDateAndTime()
                var stream = await device.services.media.getStreamUri({
                    ProfileToken : device.current_profile.token,
                    Protocol : 'RTSP'
                })

                var cameraResponse = {
                    ip: camera.ip,
                    port: camera.port,
                    info: info,
                    date: date,
                    uri: stream.data.GetStreamUriResponse.MediaUri.Uri
                }
                try{
                    const camPtzConfigs = (await device.services.ptz.getConfigurations()).data.GetConfigurationsResponse
                    if(
                        camPtzConfigs.PTZConfiguration &&
                        (
                            camPtzConfigs.PTZConfiguration.PanTiltLimits ||
                            camPtzConfigs.PTZConfiguration.ZoomLimits
                        )
                    ){
                        cameraResponse.isPTZ = true
                    }
                }catch(err){
                    s.debugLog(err)
                }
                responseList.push(cameraResponse)
                var imageSnap
                try{
                    const snapUri = addCredentialsToUrl({
                        username: onvifUsername,
                        password: onvifPassword,
                        url: (await device.services.media.getSnapshotUri({
                            ProfileToken : device.current_profile.token,
                        })).data.GetSnapshotUriResponse.MediaUri.Uri,
                    });
                    imageSnap = (await getBuffer(snapUri)).toString('base64');
                }catch(err){
                    s.debugLog(err)
                }
                if(foundCameraCallback)foundCameraCallback(Object.assign(cameraResponse,{f: 'onvif', snapShot: imageSnap}))
            }catch(err){
                const searchError = (find) => {
                    return stringContains(find,err.message,true)
                }
                var foundDevice = false
                var errorMessage = ''
                switch(true){
                    //ONVIF camera found but denied access
                    case searchError('400'): //Bad Request - Sender not Authorized
                        foundDevice = true
                        errorMessage = lang.ONVIFErr400
                    break;
                    case searchError('405'): //Method Not Allowed
                        foundDevice = true
                        errorMessage = lang.ONVIFErr405
                    break;
                    //Webserver exists but undetermined if IP Camera
                    case searchError('404'): //Not Found
                        foundDevice = true
                        errorMessage = lang.ONVIFErr404
                    break;
                }
                if(foundDevice && foundCameraCallback){
                    foundCameraCallback({
                        f: 'onvif',
                        ff: 'failed_capture',
                        ip: camera.ip,
                        port: camera.port,
                        error: errorMessage
                    })
                }
                if(config.debugLogVerbose)s.debugLog(err);
            }
        })
        return responseList
    }
    return {
        ipRange: ipRange,
        portRange: portRange,
        runOnvifScanner: runOnvifScanner,
    }
}
