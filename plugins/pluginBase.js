//
// Shinobi - Plugin Base
// Copyright (C) 2016-2025 Moe Alam, moeiscool
//
// # Donate
//
// If you like what I am doing here and want me to continue please consider donating :)
// PayPal : paypal@m03.ca
//
var fs = require('fs');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var moment = require('moment');
var express = require('express');
var http = require('http'),
    app = express();
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

    try{
        if(!config.skipMainConfigCheck){
            mainConfig = require('../conf.json')
            plugLog('Main Shinobi Config Found... Checking for Plugin Key...')
            var foundKeyAdded = false
            if(mainConfig.pluginKeys && mainConfig.pluginKeys[config.plug]){
                foundKeyAdded = true
            }
            if(mainConfig.plugins){
                mainConfig.plugins.forEach((plug) => {
                    if(plug.id === config.plug){
                        foundKeyAdded = true
                    }
                })
            }
            plugLog('Plugin Key matches Main Configuration : ' + foundKeyAdded)
            if(foundKeyAdded === false){
                console.error(new Date(),'Plugin Cannot Be Initiated, Check Plugin Key in Main Configuration!')
            }
        }
    }catch(err){

    }

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
        const theSocket = s.getWebsocket()
        ++overAllProcessingCount
        theSocket.emit('processCount',overAllProcessingCount)
        s.detectObject(buffer,d,tx,frameLocation,() => {
            --overAllProcessingCount
            theSocket.emit('processCount',overAllProcessingCount)
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
    server = http.createServer(app).on('error', (err) => {
        if(err.code === 'EADDRINUSE'){
            //try next port
            if(webServerTryCount === 5){
                return plugLog('Failed to Start Web Server. No Longer Trying.')
            }
            ++webServerTryCount
            var port = parseInt(config.hostPort)
            config.hostPort = parseInt(config.hostPort) + 1
            plugLog(`Failed to Start Web Server on ${port}. Trying next Port ${config.hostPort}`)
            startWebServer()
        }else{
            console.log(err)
        }
    })
    var webServerTryCount = 0
    var startWebServer = () => {
        var port = parseInt(config.hostPort)
        server.listen(config.hostPort, (err) => {
            if(port === config.hostPort){
                plugLog('Plugin started on Port ' + port)
            }
        })
    }
    startWebServer()
    //web pages and plugin api
    var webPageMssage = '<b>'+config.plug+'</b> for Shinobi is running'
    app.get('/', (req, res) => {
      res.end()
    });
    //Conector to Shinobi
    if(config.mode === 'host'){
        plugLog('Plugin started as Host')
        //start plugin as host
        const io = new (require('socket.io').Server)(server,{
            transports: ['websocket']
        })
        io.engine.ws = new (require('cws').Server)({
            noServer: true,
            perMessageDeflate: false
        })
        io.attach(server);
        s.connectedClients = {};
        io.on('connection', (cn) => {
            plugLog('Plugin Connected to a Shinobi..')
            s.connectedClients[cn.id] = {
                id: cn.id
            }
            s.connectedClients[cn.id].tx = (data) => {
                data.pluginKey = config.key
                data.plug = config.plug
                return io.to(cn.id).emit('ocv',data)
            }
            cn.on('f',(d) => {
                s.MainEventController(d,cn,s.connectedClients[cn.id].tx)
            })
            cn.on('disconnect',(d) => {
                plugLog('Plugin Disconnected.',cn.id)
                delete(s.connectedClients[cn.id])
            })
        });
        s.disconnectWebSocket = () => {

        }
    }else{
        //start plugin as client
        var retryConnection = 0
        var clearRetryConnectionTimeout
        maxRetryConnection = parseInt(config.maxRetryConnection) || 5
        plugLog('Plugin starting as Client, Host Address : '+'ws://'+config.host+':'+config.port)
        if(!config.host){config.host='localhost'}
        const createConnection = () => {
          var allowDisconnect = false;
          var io = require('socket.io-client')('ws://'+config.host+':'+config.port,{
              transports: ['websocket']
          });
          s.disconnectWebSocket = () => {
              allowDisconnect = true
              io.disconnect()
              console.log('Disconnected Websocket')
          }
          const onDisconnect = (err) => {
              clearTimeout(clearRetryConnectionTimeout)
              if(io.connected){
                  io.disconnect()
                  return
              }
              if(err && err.type){
                  plugLog('Plugin Error. Attempting Reconnect..')
                  plugLog(err.type)
              }
              if(retryConnection > maxRetryConnection && maxRetryConnection !== 0){
                  webPageMssage = 'Max Failed Retries Reached'
                  return plugLog('Max Failed Retries Reached!',maxRetryConnection)
              }
              ++retryConnection
              plugLog('Plugin Disconnected..')
              if(!allowDisconnect){
                  setTimeout(() => {
                      if(!io.connected){
                          plugLog('Attempting Reconnect..')
                          io.connect()
                      }
                  },3000)
              };
          }
          //connect to master
          s.cx = (x) => {
              var sendData = Object.assign(x,{
                  pluginKey : config.key,
                  plug : config.plug
              })
              return io.emit('ocv',sendData)
          }
          io.on('connect_error', onDisconnect)
          io.on('connect', (d) => {
              plugLog('Plugin Connected to Shinobi..')
              s.cx({f:'init',plug:config.plug,notice:config.notice,type:config.type,connectionType:config.connectionType});
              clearRetryConnectionTimeout = setTimeout(() => {
                  retryConnection = 0
              },10000)
          })
          io.on('disconnect',onDisconnect)
          io.on('error',onDisconnect)
          io.on('f', (d) => {
              s.MainEventController(d,null,s.cx)
          })
          return io
        }
        var io = createConnection()
    }
    s.getWebsocket = () => {
        return io
    }
    if(config.clusterMode){
        plugLog('Plugin enabling Cluster Mode...')
        if(config.clusterBasedOnGpu){
            setTimeout(() => {
                parseNvidiaSmi((gpus)=>{
                    io.emit('gpuUsage',gpus)
                })
            },1000 * 10)
        }else{
            setTimeout(() => {
                getCpuUsage((percent) => {
                    io.emit('cpuUsage',percent)
                })
            },1000 * 10)
        }
    }
    s.createPythonScriptDaemon = () => {
        if(!config.pythonScript){config.pythonScript = config.dirname + '/pumpkin.py'}
        if(!config.pythonPort){config.pythonPort = 7990}
        //Start Python Controller
        s.callbacks = {}
        s.createCameraBridgeToPython = (uniqueId) => {
            var pythonIo = require('socket.io-client')('ws://localhost:' + config.pythonPort,{
                transports: ['websocket']
            })
            var sendToPython = (data,callback) => {
                s.callbacks[data.id] = callback
                pythonIo.emit('f',data)
            }
            var refreshTracker = (data) => {
                pythonIo.emit('refreshTracker',{trackerId : data})
            }
            pythonIo.on('connect', (d) => {
                s.debugLog(uniqueId+' is Connected from Python')
            })
            pythonIo.on('disconnect', (d) => {
                s.debugLog(uniqueId+' is Disconnected from Python')
                setTimeout(() => {
                    pythonIo.connect();
                    s.debugLog(uniqueId+' is Attempting to Reconect to Python')
                },3000)
            })
            pythonIo.on('f', (d) => {
                if(s.callbacks[d.id]){
                    s.callbacks[d.id](d.data)
                    delete(s.callbacks[d.id])
                }
            })
            return {
                refreshTracker: refreshTracker,
                sendToPython: sendToPython
            }
        }


        //Start Python Daemon
        process.env.PYTHONUNBUFFERED = 1;
        var createPythonProcess = () => {
            s.isPythonRunning = false
            s.pythonScript = spawn('sh',[config.dirname + '/bootPy.sh',config.pythonScript,config.dirname]);
            var onStdErr = (data) => {
                s.debugLog(data.toString())
            }
            var onStdOut = (data) => {
                s.debugLog(data.toString())
            }
            setTimeout(() => {
              s.isPythonRunning = true
            },5000)
            s.pythonScript.stderr.on('data',onStdErr);

            s.pythonScript.stdout.on('data',onStdOut);

            s.pythonScript.on('close', () => {
                s.debugLog('Python CLOSED')
            });
        }
        createPythonProcess()
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
