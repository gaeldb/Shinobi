const fs = require('fs')
const exec = require('child_process').exec
const spawn = require('child_process').spawn
const isWindows = (process.platform === 'win32' || process.platform === 'win64')
process.send = process.send || function () {};

var jsonData = JSON.parse(fs.readFileSync(process.argv[3],'utf8'))
const config = jsonData.globalInfo.config
const ffmpegAbsolutePath = process.argv[2].trim()
const ffmpegCommandString = jsonData.cmd
const rawMonitorConfig = jsonData.rawMonitorConfig
const stdioPipes = jsonData.pipes || []
var newPipes = []
var stdioWriters = [];

const { fetchTimeout } = require('../basic/utils.js')(process.cwd(),config)
const dataPort = require('./libs/dataPortConnection.js')(jsonData,
// onConnected
() => {
    dataPort.send(jsonData.dataPortToken)
},
// onError
(err) => {
    writeToStderr([
        'dataPort:Connection:Error',
        err
    ])
},
// onClose
(e) => {
    writeToStderr([
        'dataPort:Connection:Closed',
        e
    ])
})

var writeToStderr = function(argsAsArray){
  try{
    process.stderr.write(Buffer.from(`${JSON.stringify(argsAsArray)}`, 'utf8' ))
    // dataPort.send({
    //     f: 'debugLog',
    //     data: argsAsArray,
    // })
      // stdioWriters[2].write(Buffer.from(`${new Error('writeToStderr').stack}`, 'utf8' ))
  }catch(err){
  }
  // fs.appendFileSync('/home/ubuntu/cdn-site/tools/compilers/diycam/Shinobi/test.log',text + '\n','utf8')
}
process.logData = writeToStderr
if(!process.argv[2] || !process.argv[3]){
    return writeToStderr('Missing FFMPEG Command String or no command operator')
}
const buildMonitorUrl = function(e,noPath){
    var authd = ''
    var url
    if(e.details.muser&&e.details.muser!==''&&e.host.indexOf('@')===-1) {
        e.username = e.details.muser
        e.password = e.details.mpass
        authd = e.details.muser+':'+e.details.mpass+'@'
    }
    if(e.port==80&&e.details.port_force!=='1'){e.porty=''}else{e.porty=':'+e.port}
    url = e.protocol+'://'+authd+e.host+e.porty
    if(noPath !== true)url += e.path
    return url
}

// [CTRL] + [C] = exit
process.on('uncaughtException', function (err) {
    writeToStderr('Uncaught Exception occured!');
    writeToStderr(err.stack);
});
const exitAction = function(){
    try{
        if(isWindows){
            spawn("taskkill", ["/pid", cameraProcess.pid, '/f', '/t'])
        }else{
            process.kill(-cameraProcess.pid)
        }
    }catch(err){

    }
}
process.on('SIGTERM', exitAction);
process.on('SIGINT', exitAction);
process.on('exit', exitAction);

for(var i=0; i < stdioPipes; i++){
    switch(i){
      case 0:
        newPipes[i] = 'pipe'
      break;
      case 1:
        newPipes[i] = 1
      break;
      case 2:
        newPipes[i] = 2
      break;
      case 3:
        stdioWriters[i] = fs.createWriteStream(null, {fd: i, end:false});
        if(rawMonitorConfig.details.detector === '1' && rawMonitorConfig.details.detector_pam === '1'){
          newPipes[i] = 'pipe'
        }else{
          newPipes[i] = stdioWriters[i]
        }
      break;
      case 5:
        stdioWriters[i] = fs.createWriteStream(null, {fd: i, end:false});
        newPipes[i] = 'pipe'
      break;
      default:
        stdioWriters[i] = fs.createWriteStream(null, {fd: i, end:false});
        newPipes[i] = stdioWriters[i]
      break;
    }
}
stdioWriters.forEach((writer)=>{
  writer.on('error', (err) => {
      writeToStderr(err.stack);
  });
})
var cameraProcess = spawn(ffmpegAbsolutePath,ffmpegCommandString,{detached: true,stdio:newPipes})
cameraProcess.on('close',()=>{
  writeToStderr('Process Closed')
  stdioWriters.forEach((writer)=>{
    writer.end()
  })
  process.exit();
})
cameraProcess.stdio[5].on('data',(data)=>{
    stdioWriters[5].write(data)
})
writeToStderr('Thread Opening')



if(rawMonitorConfig.details.detector === '1' && rawMonitorConfig.details.detector_pam === '1'){
  try{
    const attachPamDetector = require(config.monitorDetectorDaemonPath ? config.monitorDetectorDaemonPath : __dirname + '/detector.js')(jsonData,(detectorObject) => {
        dataPort.send(JSON.stringify(detectorObject))
    },dataPort)
    attachPamDetector(cameraProcess)
  }catch(err){
    writeToStderr(err.stack)
  }
}

if(rawMonitorConfig.type === 'jpeg'){
    writeToStderr('JPEG Input Type Detected')
    var recordingSnapper
    var errorTimeout
    var errorCount = 0
    var capture_fps = parseInt(rawMonitorConfig.details.sfps) || 1
    if(isNaN(capture_fps)){
        writeToStderr(`${lang['Error While Decoding']}, ${lang['Field Missing Value']} : ${lang['Monitor Capture Rate']}`)
        return;
    }
    writeToStderr(`Running at ${capture_fps} FPS`)
    try{
        cameraProcess.stdio[0].on('error',function(err){
            if(err && rawMonitorConfig.details.loglevel !== 'quiet'){
                // s.userLog(e,{type:'STDIN ERROR',msg:err});
            }
        })
    }catch(err){
        writeToStderr(err.stack)
    }
    setTimeout(() => {
        if(!cameraProcess.stdin)return writeToStderr('No Camera Process Found for Snapper');
        const captureOne = function(f){
            fetchTimeout(buildMonitorUrl(rawMonitorConfig),15000,{
                method: 'GET',
            })
            .then(response => response.arrayBuffer())
            .then(function(content){
                cameraProcess.stdin.write(new Uint8Array(content))
                recordingSnapper = setTimeout(function(){
                    captureOne()
                },1000 / capture_fps)
                if(!errorTimeout){
                    clearTimeout(errorTimeout)
                    errorTimeout = setTimeout(function(){
                        errorCount = 0;
                        delete(errorTimeout)
                    },3000)
                }
            }).catch(function(err){
                ++errorCount
                clearTimeout(errorTimeout)
                errorTimeout = null
                writeToStderr(err.stack)
                if(rawMonitorConfig.details.loglevel !== 'quiet'){
                    // s.userLog(e,{
                    //     type: lang['JPEG Error'],
                    //     msg: {
                    //         msg: lang.JPEGErrorText,
                    //         info: err
                    //     }
                    // });
                    switch(err.code){
                        case'ESOCKETTIMEDOUT':
                        case'ETIMEDOUT':
                            // ++s.group[e.ke].activeMonitors[e.id].errorSocketTimeoutCount
                            // if(
                            //     rawMonitorConfig.details.fatal_max !== 0 &&
                            //     s.group[e.ke].activeMonitors[e.id].errorSocketTimeoutCount > rawMonitorConfig.details.fatal_max
                            // ){
                            //     // s.userLog(e,{type:lang['Fatal Maximum Reached'],msg:{code:'ESOCKETTIMEDOUT',msg:lang.FatalMaximumReachedText}});
                            //     // s.camera('stop',e)
                            // }else{
                            //     // s.userLog(e,{type:lang['Restarting Process'],msg:{code:'ESOCKETTIMEDOUT',msg:lang.FatalMaximumReachedText}});
                            //     // s.camera('restart',e)
                            // }
                            // return;
                        break;
                    }
                }
                // if(rawMonitorConfig.details.fatal_max !== 0 && errorCount > rawMonitorConfig.details.fatal_max){
                //     clearTimeout(recordingSnapper)
                //     process.exit()
                // }
            })
        }
        captureOne()
    },5000)
}

if(
    rawMonitorConfig.type === 'dashcam' ||
    rawMonitorConfig.type === 'socket'
){
    process.stdin.on('data',(data) => {
        //confirmed receiving data this way.
        cameraProcess.stdin.write(data)
    })
}
