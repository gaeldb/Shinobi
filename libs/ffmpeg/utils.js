const fs = require('fs');
const exec = require('child_process').exec;
const execSync = require('child_process').execSync;
const spawn = require('child_process').spawn;
const treekill = require('tree-kill');
module.exports = (s,config,lang) => {
    const {
        mergeDeep,
        validateIntValue,
    } = require('../common.js')
    const getPossibleWarnings = require('./possibleWarnings.js')
    const activeProbes = {}
    const runFFprobe = (url,auth,callback,forceOverlap,customInput) => {
        var endData = {ok: false, result: {}}
        if(!url){
            endData.error = 'Missing URL'
            if(callback)callback(endData)
            return {
                result: {
                    format: {
                        duration: 1
                    }
                }
            }
        }
        if(!forceOverlap && activeProbes[auth]){
            endData.error = 'Account is already probing'
            if(callback)callback(endData)
            return {
                result: {
                    format: {
                        duration: 1
                    }
                }
            }
        }
        return new Promise((resolve) => {
            activeProbes[auth] = 1
            var stderr = ''
            var stdout = ''
            const probeCommand = splitForFFMPEG(`${customInput ? customInput + ' ' : ''}-analyzeduration 10000 -probesize 10000 -v quiet -print_format json -show_format -show_streams -i "${url}"`)
            var processTimeout = null
            var ffprobeLocation = config.ffmpegDir.split('/')
            ffprobeLocation[ffprobeLocation.length - 1] = 'ffprobe'
            ffprobeLocation = ffprobeLocation.join('/')
            const probeProcess = spawn(ffprobeLocation, probeCommand)
            const finishReponse = () => {
                delete(activeProbes[auth])
                if(!stdout){
                    endData.error = stderr
                }else{
                    endData.ok = true
                    endData.result = s.parseJSON(stdout)
                }
                endData.probe = probeCommand
                if(callback)callback(endData)
                resolve(endData)
            }
            probeProcess.stderr.on('data',function(data){
                stderr += data.toString()
            })
            probeProcess.stdout.on('data',function(data){
                stdout += data.toString()
            })
            probeProcess.on('exit',function(){
                clearTimeout(processTimeout)
                finishReponse()
            })
            processTimeout = setTimeout(() => {
                treekill(probeProcess.pid)
            },10000)
        })
    }
    const probeMonitor = (monitor,timeoutAmount,forceOverlap) => {
        return new Promise((resolve,reject) => {
            const inputTypeIsH264 = monitor.type === 'h264'
            const protocolIsRtsp = monitor.protocol === 'rtsp'
            const rtspTransportIsManual = monitor.details.rtsp_transport && monitor.details.rtsp_transport !== 'no'
            const url = s.buildMonitorUrl(monitor);
            runFFprobe(url,`${monitor.ke}${monitor.mid}`,(response) => {
                setTimeout(() => {
                    resolve(response)
                },timeoutAmount || 1000)
            },forceOverlap,
            inputTypeIsH264 && protocolIsRtsp && rtspTransportIsManual ? `-rtsp_transport ${monitor.details.rtsp_transport}` : null)
        })
    }
    const getStreamInfoFromProbe = (probeResult) => {
        const streamIndex = {
            video: [],
            audio: [],
            all: []
        }
        const streams = probeResult.streams || []
        streams.forEach((stream) => {
            try{
                const codecType = stream.codec_type || 'video'
                if(!streamIndex[codecType])streamIndex[codecType] = []
                const simpleInfo = {
                    fps: eval(stream.r_frame_rate) || '',
                    width: stream.coded_width,
                    height: stream.coded_height,
                    streamType: stream.codec_type,
                    codec: (stream.codec_name || '').toLowerCase(),
                }
                streamIndex.all.push(simpleInfo)
                streamIndex[codecType].push(simpleInfo)
            }catch(err){
                s.debugLog(err)
            }
        })
        if(streamIndex.video.length === 0){
            streamIndex.video.push({
                streamType: 'video',
                codec: 'unknown',
            })
        }
        return streamIndex
    }
    const createWarningsForConfiguration = (monitor,probeResult) => {
        const warnings = []
        const possibleWarnings = getPossibleWarnings(monitor,probeResult,config,lang)
        possibleWarnings.forEach((warning) => {
            if(warning.isTrue)warnings.push(warning)
        })
        return warnings
    }
    const buildMonitorConfigPartialFromWarnings = (warnings) => {
        var configPartial = {}
        warnings.forEach((warning) => {
            if(warning.automaticChange)configPartial = mergeDeep(configPartial,warning.automaticChange)
        })
        return configPartial
    }
    const repairConfiguration = (monitor,probeResult) => {
        const warnings = createWarningsForConfiguration(monitor,probeResult)
        const configPartial = buildMonitorConfigPartialFromWarnings(warnings)
        return mergeDeep(monitor,configPartial)
    }
    const applyPartialToConfiguration = (activeMonitor,configPartial) => {
        Object.keys(configPartial).forEach((key) => {
            if(key !== 'details'){
                activeMonitor[key] = configPartial[key]
            }else{
                const details = s.parseJSON(configPartial.details)
                Object.keys(details).forEach((key) => {
                    try{
                        activeMonitor.details[key] = details[key]
                    }catch(err){
                        console.log(err)
                    }
                })
            }
        })
    }
    const validateDimensions = (oldWidth,oldHeight) => {
        const width = validateIntValue(oldWidth)
        const height = validateIntValue(oldHeight)
        return {
            videoWidth: width,
            videoHeight: height,
        }
    }
    const sanitizedFfmpegCommand = (e,ffmpegCommandString) => {
        var sanitizedCmd = `${ffmpegCommandString}`
        if(e.details.muser && e.details.mpass){
            sanitizedCmd = ffmpegCommandString
                .replace(`//${e.details.muser}:${e.details.mpass}@`,'//')
                .replace(`=${e.details.muser}`,'=USERNAME')
                .replace(`=${e.details.mpass}`,'=PASSWORD')
        }else if(e.details.muser){
            sanitizedCmd = ffmpegCommandString.replace(`//${e.details.muser}:@`,'//').replace(`=${e.details.muser}`,'=USERNAME')
        }
        return sanitizedCmd
    }
    const createPipeArray = function(e, amountToAdd){
        const stdioPipes = [];
        var times = amountToAdd ? amountToAdd + config.pipeAddition : config.pipeAddition;
        if(e.details && e.details.stream_channels){
            times += e.details.stream_channels.length
        }
        for(var i=0; i < times; i++){
            stdioPipes.push('pipe')
        }
        return stdioPipes
    }
    const splitForFFMPEG = function(ffmpegCommandAsString) {
        return ffmpegCommandAsString.replace(/\s+/g,' ').trim().match(/\\?.|^$/g).reduce((p, c) => {
            if(c === '"'){
                p.quote ^= 1;
            }else if(!p.quote && c === ' '){
                p.a.push('');
            }else{
                p.a[p.a.length-1] += c.replace(/\\(.)/,"$1");
            }
            return  p;
        }, {a: ['']}).a
    }
    //check local ffmpeg
    const checkForWindows = function(){
        s.debugLog('ffmpeg.js : checkForWindows')
        const ffmpegPath = s.mainDirectory + '/ffmpeg/ffmpeg.exe'
        const hasFfmpeg = s.isWin && fs.existsSync(ffmpegPath)
        const response = {
            ok: hasFfmpeg
        }
        if (hasFfmpeg) {
            config.ffmpegDir = ffmpegPath
        }
        return response
    }
    //check local ffmpeg
    const checkForUnix = function(){
        s.debugLog('ffmpeg.js : checkForUnix')
        const response = {
            ok: false
        }
        if(s.isWin === false){
            if (fs.existsSync('/usr/bin/ffmpeg')) {
                response.ok = true
                config.ffmpegDir = '/usr/bin/ffmpeg'
            }else{
                if (fs.existsSync('/usr/local/bin/ffmpeg')) {
                    response.ok = true
                    config.ffmpegDir = '/usr/local/bin/ffmpeg'
                }
            }
        }
        return response
    }
    //check node module : ffmpeg-static
    const checkForNpmStatic = function(){
        s.debugLog('ffmpeg.js : checkForNpmStatic')
        const response = {
            ok: false
        }
        try{
            var staticFFmpeg = require('ffmpeg-static');
            staticFFmpeg = staticFFmpeg.path ? staticFFmpeg.path : staticFFmpeg
            if (fs.statSync(staticFFmpeg)) {
                response.ok = true
                config.ffmpegDir = staticFFmpeg
            }else{
                response.msg = `"ffmpeg-static" from NPM has failed to provide a compatible library or has been corrupted.
Run "npm uninstall ffmpeg-static" to remove it.
Run "npm install ffbinaries" to get a different static FFmpeg downloader.`
            }
        }catch(err){
            response.error = err
            response.msg = 'No "ffmpeg-static".'
        }
        return response
    }
    //check node module : ffbinaries
    const checkForFfbinary = function(){
        s.debugLog('ffmpeg.js : checkForFfbinary')
        const response = {
            ok: false
        }
        return new Promise((resolve,reject) => {
            try{
                ffbinaries = require('ffbinaries')
                var ffbinaryDir = s.mainDirectory + '/ffmpeg/'
                if (!fs.existsSync(ffbinaryDir + 'ffmpeg')) {
                    console.log('ffbinaries : Downloading FFmpeg. Please Wait...');
                    ffbinaries.downloadBinaries(['ffmpeg', 'ffprobe'], {
                        destination: ffbinaryDir,
                        version : config.ffbinariesVersion || '4.2'
                    },function () {
                        config.ffmpegDir = ffbinaryDir + 'ffmpeg'
                        response.msg = 'ffbinaries : FFmpeg Downloaded.'
                        response.ok = true
                        resolve(response)
                    })
                }else{
                    response.msg = 'ffbinaries : Found.'
                    response.ok = true
                    config.ffmpegDir = ffbinaryDir + 'ffmpeg'
                    resolve(response)
                }
            }catch(err){
                response.msg = `No "ffbinaries". Continuing.
Run "npm install ffbinaries" to get this static FFmpeg downloader.`
                resolve(response)
            }
        })
    }
    const checkStaticBuilds = async () => {
        s.debugLog('ffmpeg.js : checkStaticBuilds')
        const response = {
            ok: false,
            msg: []
        }
        const ffbinaryCheck = await checkForFfbinary()
        if(!ffbinaryCheck.ok){
            // needs ffprobe solution
            // const npmStaticCheck = checkForNpmStatic()
            // if(npmStaticCheck.ok){
            //     response.ok = true
            // }
            // if(npmStaticCheck.msg)response.msg.push(npmStaticCheck.msg)
        }else{
            response.ok = true
        }
        if(ffbinaryCheck.msg)response.msg.push(ffbinaryCheck.msg)
        return response
    }
    //ffmpeg version
    const checkVersion = function(callback){
        s.debugLog('ffmpeg.js : checkVersion')
        const response = {
            ok: false
        }
        try{
            s.ffmpegVersion = execSync(config.ffmpegDir+" -version").toString().split('Copyright')[0].replace('ffmpeg version','').trim()
            if(s.ffmpegVersion.indexOf(': 2.')>-1){
                s.systemLog('FFMPEG is too old : '+s.ffmpegVersion+', Needed : 3.2+',err)
                throw (new Error())
            }else{
                response.ok = true
            }
        }catch(err){
            console.log('No FFmpeg found.')
            // process.exit()
        }
        return response
    }
    //check available hardware acceleration methods
    const checkHwAccelMethods = function(){
        s.debugLog('ffmpeg.js : checkHwAccelMethods')
        const response = {
            ok: true
        }
        if(config.availableHWAccels === undefined){
            const hwAccels = execSync(config.ffmpegDir+" -loglevel quiet -hwaccels").toString().split('\n')
            hwAccels.shift()
            availableHWAccels = []
            hwAccels.forEach(function(method){
                if(method && method !== '')availableHWAccels.push(method.trim())
            })
            config.availableHWAccels = availableHWAccels
            config.availableHWAccels = ['auto'].concat(config.availableHWAccels)
            console.log('Available Hardware Acceleration Methods : ',availableHWAccels.join(', '))
            var methods = {
                auto: {label:lang['Auto'],value:'auto'},
                drm: {label:lang['drm'],value:'drm'},
                cuvid: {label:lang['cuvid'],value:'cuvid'},
                cuda: {label:lang['cuda'],value:'cuda'},
                opencl: {label:lang['opencl'],value:'opencl'},
                vaapi: {label:lang['vaapi'],value:'vaapi'},
                qsv: {label:lang['qsv'],value:'qsv'},
                vdpau: {label:lang['vdpau'],value:'vdpau'},
                dxva2: {label:lang['dxva2'],value:'dxva2'},
                vdpau: {label:lang['vdpau'],value:'vdpau'},
                videotoolbox: {label:lang['videotoolbox'],value:'videotoolbox'}
            }
            s.listOfHwAccels = []
            config.availableHWAccels.forEach(function(availibleMethod){
                if(methods[availibleMethod]){
                    var method = methods[availibleMethod]
                    s.listOfHwAccels.push({
                        name: method.label,
                        value: method.value,
                    })
                 }
            })
        }
        return response
    }
    async function getWarningChangesForMonitor(monitorConfig){
        const probeResponse = await probeMonitor(monitorConfig,2000,true)
        const probeStreams = getStreamInfoFromProbe(probeResponse.result)
        const warnings = createWarningsForConfiguration(monitorConfig,probeStreams)
        const configPartial = warnings.length > 0 ? buildMonitorConfigPartialFromWarnings(warnings) : {}
        return {
            configPartial,
            warnings,
            probeResponse,
            probeStreams,
        }
    }
    return {
        ffprobe: runFFprobe,
        probeMonitor: probeMonitor,
        getStreamInfoFromProbe: getStreamInfoFromProbe,
        createWarningsForConfiguration: createWarningsForConfiguration,
        buildMonitorConfigPartialFromWarnings: buildMonitorConfigPartialFromWarnings,
        applyPartialToConfiguration: applyPartialToConfiguration,
        repairConfiguration: repairConfiguration,
        validateDimensions: validateDimensions,
        sanitizedFfmpegCommand: sanitizedFfmpegCommand,
        createPipeArray: createPipeArray,
        splitForFFMPEG: splitForFFMPEG,
        checkForWindows: checkForWindows,
        checkForUnix: checkForUnix,
        checkForNpmStatic: checkForNpmStatic,
        checkForFfbinary: checkForFfbinary,
        checkStaticBuilds: checkStaticBuilds,
        checkVersion: checkVersion,
        checkHwAccelMethods: checkHwAccelMethods,
        getWarningChangesForMonitor,
    }
}
