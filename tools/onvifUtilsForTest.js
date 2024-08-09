// relies on https://gitlab.com/Shinobi-Systems/shinobi-onvif
const onvif = require('shinobi-onvif');
const getFunctionParamNames = function(func) {
  var fnStr = func.toString().replace(/((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg, '');
  var result = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(/([^\s,]+)/g);
  if(result === null)
     result = [];
  return result;
}
const mergeDeep = function(...objects) {
  const isObject = obj => obj && typeof obj === 'object';

  return objects.reduce((prev, obj) => {
    Object.keys(obj).forEach(key => {
      const pVal = prev[key];
      const oVal = obj[key];

      if (Array.isArray(pVal) && Array.isArray(oVal)) {
        prev[key] = pVal.concat(...oVal);
      }
      else if (isObject(pVal) && isObject(oVal)) {
        prev[key] = mergeDeep(pVal, oVal);
      }
      else {
        prev[key] = oVal;
      }
    });

    return prev;
  }, {});
}
const replaceDynamicInOptions = (Camera,options) => {
    const newOptions = {}
    Object.keys(options).forEach((key) => {
        const value = options[key]
        if(typeof value === 'string'){
            newOptions[key] = value.replace(/__CURRENT_TOKEN/g,Camera.current_profile.token)
        }else if(value !== undefined && value !== null){
            newOptions[key] = value
        }
    })
    return newOptions
}
const runOnvifMethod = async (onvifOptions) => {
    return new Promise((resolve,reject) => {
        const onvifDevice = onvifOptions.device
        var response = {ok: false}
        var errorMessage = function(msg,error){
            response.ok = false
            response.msg = msg
            response.error = error
            resolve(response)
        }
        var actionCallback = function(onvifActionResponse){
            response.ok = true
            if(onvifActionResponse.data){
                response.responseFromDevice = onvifActionResponse.data
            }else{
                response.responseFromDevice = onvifActionResponse
            }
            if(onvifActionResponse.soap)response.soap = onvifActionResponse.soap
            resolve(response)
        }
        var isEmpty = function(obj) {
            for(var key in obj) {
                if(obj.hasOwnProperty(key))
                    return false;
            }
            return true;
        }
        var completeAction = function(command){
            if(command && command.then){
                command.then(actionCallback).catch(function(error){
                    errorMessage('Device Action responded with an error',error)
                })
            }else if(command){
                response.ok = true
                response.repsonseFromDevice = command
                resolve(response)
            }else{
                response.error = 'Big Errors, Please report it to Shinobi Development'
                resolve(response)
            }
        }
        var action
        if(onvifOptions.service){
            if(onvifDevice.services[onvifOptions.service] === undefined){
                return errorMessage('This is not an available service. Please use one of the following : '+Object.keys(onvifDevice.services).join(', '))
            }
            if(onvifDevice.services[onvifOptions.service] === null){
                return errorMessage('This service is not activated. Maybe you are not connected through ONVIF. You can test by attempting to use the "Control" feature with ONVIF in Shinobi.')
            }
            action = onvifDevice.services[onvifOptions.service][onvifOptions.action]
        }else{
            action = onvifDevice[onvifOptions.action]
        }
        if(!action || typeof action !== 'function'){
            errorMessage(onvifOptions.action+' is not an available ONVIF function. See https://github.com/futomi/node-onvif for functions.')
        }else{
            var argNames = getFunctionParamNames(action)
            var options
            var command
            if(argNames[0] === 'options' || argNames[0] === 'params'){
                options = replaceDynamicInOptions(onvifDevice,onvifOptions.options || {})
                response.options = options
            }
            if(onvifOptions.service){
                command = onvifDevice.services[onvifOptions.service][onvifOptions.action](options)
            }else{
                command = onvifDevice[onvifOptions.action](options)
            }
            completeAction(command)
        }
    })
}
const getDeviceInformation = async (onvifDevice,options) => {
    // const options = {
    //     protocols: true,
    //     networkInterface: true,
    //     gateway: true,
    //     dns: true,
    //     ntp: true,
    // }
    const response = {
        ok: true,
    }
    try{
        if(options.all || options.protocols){
            response.protocols = (await onvifDevice.services.device.getNetworkProtocols()).data.GetNetworkProtocolsResponse.NetworkProtocols
        }
        if(options.all || options.networkInterface){
            response.networkInterface = (await onvifDevice.services.device.getNetworkInterfaces()).data.GetNetworkInterfacesResponse.NetworkInterfaces
        }
        if(options.all || options.gatewayAddress){
            response.gateway = (await onvifDevice.services.device.getNetworkDefaultGateway()).data.GetNetworkDefaultGatewayResponse.NetworkGateway.IPv4Address
        }
        if(options.all || options.dns){
            response.dns = (await onvifDevice.services.device.getDNS()).data.GetDNSResponse.DNSInformation
        }
        if(options.all || options.ntp){
            response.ntp = (await onvifDevice.services.device.getNTP()).data.GetNTPResponse.NTPInformation
        }
        if(options.all || options.date){
            response.date = (await onvifDevice.services.device.getSystemDateAndTime()).data.GetSystemDateAndTimeResponse.SystemDateAndTime
        }
        if(options.all || options.users){
            response.users = (await onvifDevice.services.device.getUsers()).data.GetUsersResponse.User
        }
        if(options.all || options.hostname){
            response.hostname = (await onvifDevice.services.device.getHostname()).data.GetHostnameResponse.HostnameInformation.Name
        }
        if(options.all || options.discoveryMode){
            response.discoveryMode = (await onvifDevice.services.device.getDiscoveryMode()).data.GetDiscoveryModeResponse.DiscoveryMode
        }
        if(options.all || options.videoEncoders){
            response.videoEncoders = (await onvifDevice.services.media.getVideoEncoderConfigurations()).data.GetVideoEncoderConfigurationsResponse.Configurations
        }
        if(options.all || options.videoEncoderOptions){
            response.videoEncoderOptions = (await runOnvifMethod({
                device: onvifDevice,
                action: 'getVideoEncoderConfigurationOptions',
                service: 'media',
                options: {}
            })).responseFromDevice.GetVideoEncoderConfigurationOptionsResponse.Options
        }
        if(options.all || options.imagingSettings){
            const imagingSettings = (await runOnvifMethod({
                device: onvifDevice,
                action: 'getImagingSettings',
                service: 'imaging',
                options: {"ConfigurationToken":"__CURRENT_TOKEN"}
            }));
            response.imagingSettings = imagingSettings.responseFromDevice ? imagingSettings.responseFromDevice.GetImagingSettingsResponse.ImagingSettings : imagingSettings
        }
    }catch(err){
        response.ok = false
        response.error = err.stack.toString()
        console.log(err)
        console.log(onvifDevice)
    }
    return response
}
const setProtocols = async (onvifDevice,saveSet) => {
    // const saveSet = {
    //     "HTTP": "80",
    //     "RTSP": "554",
    // }
    const response = {
        ok: false
    }
    try{
        const saveKeys = Object.keys(saveSet)
        const protocols = (await getDeviceInformation(onvifDevice,{protocols: true})).protocols
        protocols.forEach((item) => {
            saveKeys.forEach((key) => {
                if(item.Name === key.toUpperCase()){
                    const port = saveSet[key] && !isNaN(saveSet[key]) ? parseInt(saveSet[key]) : item.Name === 'RTSP' ? 554 : 80
                    console.log('PORT',port)
                    item.Port = port
                    item.Enabled = true
                }
            })
        })
        console.log('protocols',protocols)

        const onvifResponse = await onvifDevice.services.device.setNetworkProtocols({
            NetworkProtocols: protocols
        })
        response.ok = true
        response.onvifResponse = onvifResponse
    }catch(err){
        response.error = err.stack.toString()
    }
    return response
}
const setNetworkInterface = async (onvifDevice,options) => {
    // const options = {
    //     interface: 'eth0',
    //     ipv4: '10.1.103.158',
    //     dhcp: false,
    // }
    const response = {
        ok: false
    }
    try{
        const { networkInterface } = await getDeviceInformation(onvifDevice,{networkInterface: true})
        const onvifParams = {
            SetNetworkInterfaces: {
                InterfaceToken: options.interface || networkInterface.$.token,
                NetworkInterface: {
                    Enabled: true,
                    IPv4: {
                        Enabled: true,
                        Manual: {
                            Address: options.ipv4 || networkInterface.IPv4.Config.Manual.Address,
                            PrefixLength: '24',
                        },
                        'DHCP': options.dhcp === undefined || options.dhcp === null ? networkInterface.IPv4.Config.DHCP === 'true' ? true : false : options.dhcp,
                    }
                }
            }
        }
        const onvifResponse = await onvifDevice.services.device.setNetworkInterfaces(onvifParams)
        response.ok = true
        response.onvifResponse = onvifResponse
    }catch(err){
        response.error = err.stack.toString()
    }
    return response
}
const setGateway = async (onvifDevice,options) => {
    // const options = {
    //     ipv4: '1.1.1.1,8.8.8.8',
    // }
    const response = {
        ok: false
    }
    try{
        const gatewayAddress = (await getDeviceInformation(onvifDevice,{gateway: true})).gateway
        const onvifResponse = await onvifDevice.services.device.setNetworkDefaultGateway({
            'NetworkGateway': [
              {'IPv4Address': options.ipv4 || gatewayAddress}
            ]
        })
        response.ok = true
        response.onvifResponse = onvifResponse
    }catch(err){
        response.error = err.stack.toString()
    }
    return response
}
const setDNS = async (onvifDevice,options) => {
    options = Object.assign({
        dns: '1.1.1.1,8.8.8.8',
        searchDomain: 'localhost',
        dhcp: false,
    },options)
    const response = {
        ok: false
    }
    try{
        const dnsArray = []
        const searchDomain = (options.searchDomain || '').split(',')
        const dnsList = (options.dns || '1.1.1.1').split(',')
        dnsList.forEach((item) => {
            dnsArray.push({
                Type: 'IPv4',
                IPv4Address: item,
            })
        })
        const dnsInfo = (await getDeviceInformation(onvifDevice,{dns: true})).dns
        const onvifResponse = await onvifDevice.services.device.setDNS({
          'FromDHCP'    : !options.dhcp ? false : true,
          'SearchDomain': searchDomain,
          'DNSManual'   : dnsArray
        })
        response.ok = true
        response.onvifResponse = onvifResponse
    }catch(err){
        response.error = err.stack.toString()
    }
    return response
}
const setNTP = async (onvifDevice,options) => {
    // const options = {
    //     ipv4: '1.1.1.1,8.8.8.8',
    //     dhcp: false,
    // }
    const response = {
        ok: false
    }
    try{
        const ntpInfo = (await getDeviceInformation(onvifDevice,{ntp: true})).ntp
        const ipv4 = options.ipv4 || ntpInfo.NTPManual.IPv4Address
        const onvifResponse = await onvifDevice.services.device.setNTP({
            FromDHCP: !options.dhcp ? false : true,
            NTPManual: {'Type': "IPv4", 'IPv4Address': ipv4}
        })
        response.ok = true
        response.onvifResponse = onvifResponse
    }catch(err){
        response.error = err.stack.toString()
    }
    return response
}
const setHostname = async (onvifDevice,options) => {
    // const options = {
    //     name: 'hostname',
    // }
    const response = {
        ok: false
    }
    try{
        const hostname = options.name || (await getDeviceInformation(onvifDevice,{hostname: true})).hostname
        const onvifResponse = await onvifDevice.services.device.setHostname({
            Name: hostname
        })
        response.ok = true
        response.onvifResponse = onvifResponse
    }catch(err){
        response.error = err.stack.toString()
    }
    return response
}
const rebootCamera = async (onvifDevice,options) => {
    const response = {
        ok: false
    }
    try{
        const onvifResponse = await onvifDevice.services.device.reboot()
        response.ok = true
        response.onvifResponse = onvifResponse
    }catch(err){
        response.error = err.stack.toString()
    }
    return response
}
const setDateAndTime = async (onvifDevice,options) => {
    // const options = {
    //     dateTimeType: 'ntp',
    //     daylightSavings: false,
    //     timezone: 'XXXX',
    //     utcDateTime: 'XXXX',
    // }
    const response = {
        ok: false
    }
    try{
        // const dateInfo = await onvifDevice.services.device.getSystemDateAndTime().GetSystemDateAndTimeResponse.SystemDateAndTime
        const onvifResponse = await onvifDevice.services.device.setSystemDateAndTime ({
            DateTimeType: options.dateTimeType,
            DaylightSavings: !options.daylightSavings ? false : true,
            // TimeZone: options.timezone,
            UTCDateTime: new Date(options.utcDateTime),
        })
        response.ok = true
        response.onvifResponse = onvifResponse
    }catch(err){
        response.error = err.stack.toString()
    }
    return response
}
const createUser = async (onvifDevice,options) => {
    // const options = {
    //     name: 'user1',
    //     password: '123',
    //     level: 'Administrator' || 'Operator' || 'User',
    // }
    const response = {
        ok: false
    }
    try{
        const onvifResponse = await onvifDevice.services.device.createUsers({
            'User' : [
                {'Username': options.name, 'Password' : options.password, 'UserLevel': options.level}
            ]
        })
        response.ok = true
        response.onvifResponse = onvifResponse
    }catch(err){
        response.error = err.stack.toString()
    }
    return response
}
const deleteUser = async (onvifDevice,options) => {
    // const options = {
    //     name: 'user1',
    // }
    const response = {
        ok: false
    }
    try{
        const onvifResponse = await onvifDevice.services.device.deleteUsers({
            'User' : [
                {'Username': options.name}
            ]
        })
        response.ok = true
        response.onvifResponse = onvifResponse
    }catch(err){
        response.error = err.stack.toString()
    }
    return response
}
const validateEncoderOptions = (chosenOptions, videoEncoderOptions) => {
    const resolutions = []
    const minQuality = parseInt(videoEncoderOptions.QualityRange.Min) || 1
    const maxQuality = parseInt(videoEncoderOptions.QualityRange.Max) || 6
    const quality = !isNaN(chosenOptions.Quality) ? parseInt(chosenOptions.Quality) : 1
    const minGovLength = parseInt(videoEncoderOptions.H264.GovLengthRange.Min) || 0
    const maxGovLength = parseInt(videoEncoderOptions.H264.GovLengthRange.Max) || 100
    const govLength = !isNaN(chosenOptions.H264.GovLength) ? parseInt(chosenOptions.H264.GovLength) : 10
    const minFrameRateLimit = parseInt(videoEncoderOptions.H264.FrameRateRange.Min) || 1
    const maxFrameRateLimit = parseInt(videoEncoderOptions.H264.FrameRateRange.Max) || 30
    const frameRateLimit = !isNaN(chosenOptions.RateControl.FrameRateLimit) ? parseInt(chosenOptions.RateControl.FrameRateLimit) : 15
    const minEncodingInterval = parseInt(videoEncoderOptions.H264.EncodingIntervalRange.Min) || 1
    const maxEncodingInterval = parseInt(videoEncoderOptions.H264.EncodingIntervalRange.Max) || 30
    const encodingInterval = !isNaN(chosenOptions.RateControl.EncodingInterval) ? parseInt(chosenOptions.RateControl.EncodingInterval) : 1
    videoEncoderOptions.H264.ResolutionsAvailable.forEach((resolution) => {
        resolutions.push(`${resolution.Width}x${resolution.Height}`)
    })
    if(resolutions.indexOf(`${chosenOptions.Resolution.Width}x${chosenOptions.Resolution.Height}`) === -1){
        chosenOptions.Resolution.Width = resolutions[0].Width
        chosenOptions.Resolution.Height = resolutions[0].Height
    }
    if(quality < minQuality || quality > maxQuality){
        chosenOptions.Quality = 1
    }
    if(govLength < minGovLength || govLength > maxGovLength){
        chosenOptions.H264.GovLength = 10
    }
    if(frameRateLimit < minFrameRateLimit || frameRateLimit > maxFrameRateLimit){
        chosenOptions.RateControl.FrameRateLimit = 15
    }
    if(encodingInterval < minEncodingInterval || encodingInterval > maxEncodingInterval){
        chosenOptions.RateControl.EncodingInterval = 1
    }
}
const setVideoConfiguration = async (onvifDevice,options) => {
    const response = {
        ok: false
    }
    try{
        const {
            videoEncoders,
            videoEncoderOptions
        } = await getDeviceInformation(onvifDevice,{
            videoEncoders: true,
            videoEncoderOptions: true
        })
        const videoEncoderIndex = {}
        videoEncoders.forEach((encoder) => {videoEncoderIndex[encoder.$.token] = encoder})
        const chosenToken = `${options.videoToken || videoEncoders[0].$.token}`
        const videoEncoder = videoEncoderIndex[chosenToken] || {}
        const onvifParams = mergeDeep(videoEncoder,options,{
            Multicast: {
                AutoStart: !options.Multicast || !options.Multicast.AutoStart ? 'false' : 'true'
            },
        })
        const validatedEncoderOptions = validateEncoderOptions(onvifParams, videoEncoderOptions)
        const onvifResponse = await onvifDevice.services.media.setVideoEncoderConfiguration({
            Configuration: onvifParams,
            ConfigurationToken: chosenToken
        })
        response.ok = true
        response.onvifResponse = onvifResponse
    }catch(err){
        response.error = err.stack.toString()
    }
    return response
}
const setImagingSettings = async (onvifDevice,options) => {
    const response = {
        ok: false
    }
    try{
        const { imagingSettings } = await getDeviceInformation(onvifDevice,{imagingSettings: true})
        const onvifParams = mergeDeep(imagingSettings,options)
        const onvifResponse = await onvifDevice.services.imaging.setImagingSettings({
            ConfigurationToken: options.videoToken || onvifDevice.current_profile.token,
            ImagingSettings: onvifParams
        })
        response.ok = true
        response.onvifResponse = onvifResponse
    }catch(err){
        response.error = err.stack.toString()
    }
    return response
}
const setDiscoveryMode = async (onvifDevice,options) => {
    const response = {
        ok: false
    }
    try{
        const onvifResponse = await onvifDevice.services.device.setDiscoveryMode(options.mode === 'Discoverable' || options.mode === 'NonDiscoverable' ? options.mode : 'Discoverable')
        response.ok = true
        response.onvifResponse = onvifResponse
    }catch(err){
        response.error = err.stack.toString()
    }
    return response
}
const getUIFieldValues = async (onvifDevice) => {
    return await getDeviceInformation(onvifDevice,{
        all: true,
    })
}
module.exports = {
    mergeDeep,
    getFunctionParamNames,
    getDeviceInformation: getDeviceInformation,
    setHostname: setHostname,
    setProtocols: setProtocols,
    setGateway: setGateway,
    setDNS: setDNS,
    setNTP: setNTP,
    rebootCamera: rebootCamera,
    setDateAndTime: setDateAndTime,
    createUser: createUser,
    deleteUser: deleteUser,
    setVideoConfiguration: setVideoConfiguration,
    setImagingSettings: setImagingSettings,
    setDiscoveryMode: setDiscoveryMode,
    setNetworkInterface: setNetworkInterface,
    getUIFieldValues: getUIFieldValues,
}
