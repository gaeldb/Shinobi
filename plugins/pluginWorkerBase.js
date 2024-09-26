//
// Shinobi - Plugin Base
// Copyright (C) 2016-2025 Moe Alam, moeiscool
//
// # Donate
//
// If you like what I am doing here and want me to continue please consider donating :)
// PayPal : paypal@m03.ca
//
const {
    parentPort
} = require('worker_threads');
var fs = require('fs');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var moment = require('moment');
var overAllProcessingCount = 0
module.exports = function(__dirname, config){
    if(!config){
        return console.log(`Configuration file is missing.`)
    }
    var plugLog = (d1) => {
        console.log(new Date(), config.plug, d1)
    }

    process.on('uncaughtException', (err) => {
        console.error('uncaughtException', err)
    })

    if(!config.dirname){config.dirname = '.'}
    if(!config.port){config.port = 8080}
    if(!config.hostPort){config.hostPort = 8082}
    if(config.systemLog === undefined){config.systemLog = true}
    if(config.connectionType === undefined)config.connectionType = 'websocket'
    const imageBuffers = {}
    s = {
        group: {},
        monitors: {},
        monitorInfo: {},
        dir: {},
        isWin: (process.platform === 'win32'),
        s: (json) => {
            return JSON.stringify(json,null,3)
        }
    }
    //default stream folder check
    if(!config.streamDir){
        if(s.isWin === false){
            config.streamDir = '/dev/shm'
        }else{
            config.streamDir = config.windowsTempDir
        }
        if(!fs.existsSync(config.streamDir)){
            config.streamDir = config.dirname+'/streams/'
        }else{
            config.streamDir += '/streams/'
        }
    }
    s.dir.streams = config.streamDir
    //streams dir
    if(!fs.existsSync(s.dir.streams)){
        fs.mkdirSync(s.dir.streams)
    }
    s.checkCorrectPathEnding = (x) => {
        var length = x.length
        if(x.charAt(length-1) !== '/'){
            x = x+'/'
        }
        return x.replace('__DIR__',config.dirname)
    }
    s.gid = (x) => {
        if(!x){x = 10};
        var t = "";
        var p = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for( var i = 0; i < x; i++ )
            t += p.charAt(Math.floor(Math.random() * p.length));
        return t;
    };
    s.systemLog = (q,w,e) => {
        if(!w){w=''}
        if(!e){e=''}
        if(config.systemLog===true){
           return console.log(moment().format(),q,w,e)
        }
    }
    s.debugLog = () => {
        if(config.debugLog === true){
            console.log(new Date(),arguments)
            if(config.debugLogVerbose === true){
                console.log(new Error())
            }
        }
    }
    s.detectObject = (buffer,d,tx,frameLocation) => {
        console.log('detectObject handler not set')
    }
    const processImage = async (buffer,d,tx,frameLocation) => {
        ++overAllProcessingCount
        sendToParentPort('processCount',overAllProcessingCount)
        s.detectObject(buffer,d,tx,frameLocation,() => {
            --overAllProcessingCount
            sendToParentPort('processCount',overAllProcessingCount)
        })
    }
    const getCpuUsage = (callback) => {
        var k = {}
        switch(s.platform){
            case'win32':
                k.cmd = "@for /f \"skip=1\" %p in ('wmic cpu get loadpercentage') do @echo %p%"
            break;
            case'darwin':
                k.cmd = "ps -A -o %cpu | awk '{s+=$1} END {print s}'";
            break;
            case'linux':
                k.cmd = 'top -b -n 2 | awk \'toupper($0) ~ /^.?CPU/ {gsub("id,","100",$8); gsub("%","",$8); print 100-$8}\' | tail -n 1';
            break;
            case'freebsd':
                k.cmd = 'vmstat 1 2 | awk \'END{print 100-$19}\''
            break;
	        case'openbsd':
                k.cmd = 'vmstat 1 2 | awk \'END{print 100-$18}\''
            break;
        }
        if(config.customCpuCommand){
          exec(config.customCpuCommand,{encoding:'utf8',detached: true},function(err,d){
              if(s.isWin===true) {
                  d = d.replace(/(\r\n|\n|\r)/gm, "").replace(/%/g, "")
              }
              callback(d)
              s.onGetCpuUsageExtensions.forEach(function(extender){
                  extender(d)
              })
          })
        } else if(k.cmd){
             exec(k.cmd,{encoding:'utf8',detached: true},function(err,d){
                 if(s.isWin===true){
                     d=d.replace(/(\r\n|\n|\r)/gm,"").replace(/%/g,"")
                 }
                 callback(d)
                 s.onGetCpuUsageExtensions.forEach(function(extender){
                     extender(d)
                 })
             })
        } else {
            callback(0)
        }
    }
    const parseNvidiaSmi = function(callback){
        var response = {
            ok: true,
        }
        exec('nvidia-smi -x -q',function(err,data){
            var response = xmlParser.toJson(data)
            var newArray = []
            try{
                JSON.parse(response).nvidia_smi_log.gpu.forEach((gpu)=>{
                    newArray.push({
                        id: gpu.minor_number,
                        name: gpu.product_name,
                        brand: gpu.product_brand,
                        fan_speed: gpu.fan_speed,
                        temperature: gpu.temperature,
                        power: gpu.power_readings,
                        utilization: gpu.utilization,
                        maxClocks: gpu.max_clocks,
                    })
                })
            }catch(err){

            }
            if(callback)callback(newArray)
        })
    }
    s.onCameraInitExtensions = []
    s.onCameraInit = (extender) => {
        s.onCameraInitExtensions.push(extender)
    }
    s.onPluginEvent = []
    s.onPluginEventExtender = (extender) => {
        s.onPluginEvent.push(extender)
    }
    s.MainEventController = async (d,cn,tx) => {
        switch(d.f){
            case'init_plugin_as_host':
                if(!cn){
                    console.log('No CN',d)
                    return
                }
                if(d.key!==config.key){
                    console.log(new Date(),'Plugin Key Mismatch',cn.request.connection.remoteAddress,d)
                    cn.emit('init',{ok:false})
                    cn.disconnect()
                }else{
                    console.log(new Date(),'Plugin Connected to Client',cn.request.connection.remoteAddress)
                    cn.emit('init',{ok:true,plug:config.plug,notice:config.notice,type:config.type})
                }
            break;
            case'monitorUpdate':
                var monitorConfig = d.monitorConfig;
                var groupKey = monitorConfig.ke;
                var monitorId = monitorConfig.mid;
                var monitorDetails = monitorConfig.details;
                var monitorKey = `${groupKey}${monitorId}`
                if(!s.monitors[monitorKey])s.monitors[monitorKey] = Object.assign({}, monitorConfig);
                var isObjectDetectionSeparate = monitorDetails.detector_use_detect_object === '1'
                var width = parseFloat(isObjectDetectionSeparate  && monitorDetails.detector_scale_x_object ? monitorDetails.detector_scale_x_object : monitorDetails.detector_scale_x)
                var height = parseFloat(isObjectDetectionSeparate  && monitorDetails.detector_scale_y_object ? monitorDetails.detector_scale_y_object : monitorDetails.detector_scale_y)
                s.monitorInfo[monitorKey] = {
                    isObjectDetectionSeparate,
                    width,
                    height,
                }
                delete(imageBuffers[monitorKey])
                for(extender of s.onCameraInitExtensions){
                    extender(monitorConfig, cn, tx)
                }
                // console.log(monitorId, 'registered', s.monitorInfo[monitorKey])
            break;
            case'frameFromRam':
                if(!s.group[d.ke]){
                    s.group[d.ke] = {}
                }
                if(!s.group[d.ke][d.id]){
                    s.group[d.ke][d.id] = {}
                }
                processImage(buffer,d,tx,d.frameLocation)
            break;
            case'frame':
                try{
                    const monitorKey = `${d.id}${d.ke}`;
                    imageBuffers[monitorKey]
                    if(!imageBuffers[monitorKey]){
                      imageBuffers[monitorKey] = [d.frame];
                    }else{
                      imageBuffers[monitorKey].push(d.frame)
                    }
                    if(d.frame[d.frame.length-2] === 0xFF && d.frame[d.frame.length-1] === 0xD9){
                        var buffer = Buffer.concat(imageBuffers[monitorKey]);
                        processImage(buffer,d,tx)
                        imageBuffers[monitorKey] = null
                    }
                }catch(err){
                    if(err){
                        s.systemLog(err)
                        delete(imageBuffers[monitorKey])
                    }
                }
            break;
        }
        s.onPluginEvent.forEach((extender) => {
            extender(d,cn,tx)
        })
    }
    plugLog('Plugin started as Worker')
    const sendToParentPort = (type,data) => {
        parentPort.postMessage([type,data])
    }

    //start plugin as client

    parentPort.on('message',(data) => {
        s.MainEventController(data,null,s.cx)
    })


    s.cx = (x) => {
        var sendData = Object.assign(x,{
            pluginKey : config.key,
            plug : config.plug
        })
        return sendToParentPort('ocv',sendData)
    }

    if(config.clusterMode){
        plugLog('Plugin enabling Cluster Mode...')
        if(config.clusterBasedOnGpu){
            setTimeout(() => {
                parseNvidiaSmi((gpus)=>{
                    sendToParentPort('gpuUsage',gpus)
                })
            },1000 * 10)
        }else{
            setTimeout(() => {
                getCpuUsage((percent) => {
                    sendToParentPort('cpuUsage',percent)
                })
            },1000 * 10)
        }
    }

    s.getImageDimensions = (d) => {
        var height
        var width
        if(
            d.mon.detector_scale_y_object &&
            d.mon.detector_scale_y_object !== '' &&
            d.mon.detector_scale_x_object &&
            d.mon.detector_scale_x_object !== ''
        ){
            height = d.mon.detector_scale_y_object
            width = d.mon.detector_scale_x_object
        }else{
            height = d.mon.detector_scale_y
            width = d.mon.detector_scale_x
        }
        return {
            height : parseFloat(height),
            width : parseFloat(width)
        }
    }
    return s
}
