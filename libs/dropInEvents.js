var fs = require('fs')
var exec = require('child_process').exec
module.exports = function(s,config,lang,app,io){
    const base64Prefix = '=?UTF-8?B?';
    function isBase64String(theString){
        return theString.startsWith(base64Prefix)
    }
    function convertBase64ToTextString(theString){
        let data = theString.replace(base64Prefix,'');
        let buff = Buffer.from(data, 'base64');
        let text = buff.toString('ascii');
        return text
    }
    async function copyFileAsync(filePath, snapPath) {
        return new Promise((resolve, reject) => {
            const readStream = fs.createReadStream(filePath);
            const writeStream = fs.createWriteStream(snapPath);

            readStream.on('error', reject);
            writeStream.on('error', reject);
            writeStream.on('finish', resolve);

            readStream.pipe(writeStream);
        });
    }
    const {
        triggerEvent,
    } = require('./events/utils.js')(s,config,lang)
    const {
        deleteFilesInFolder,
    } = require('./basic/utils.js')(process.cwd(), config)
    if(config.dropInEventServer === true){
        if(config.dropInEventForceSaveEvent === undefined)config.dropInEventForceSaveEvent = true
        if(config.dropInEventDeleteFileAfterTrigger === undefined)config.dropInEventDeleteFileAfterTrigger = true
        var fileQueueForDeletion = {}
        var fileQueue = {}
        var search = function(searchIn,searchFor){
            return searchIn.indexOf(searchFor) > -1
        }
        var getFileNameFromPath = function(filePath){
            fileParts = filePath.split('/')
            return fileParts[fileParts.length - 1]
        }
        var clipPathEnding = function(filePath){
            var newPath = filePath + ''
            if (newPath.substring(newPath.length-1) == "/"){
                newPath = newPath.substring(0, newPath.length-1);
            }
            return newPath;
        }
        var processFile = function(filePath,monitorConfig){
            var ke = monitorConfig.ke
            var mid = monitorConfig.mid
            var filename = getFileNameFromPath(filePath)
            if(search(filename,'.jpg') || search(filename,'.jpeg')){
                var snapPath = s.dir.streams + ke + '/' + mid + '/s.jpg'
                fs.rm(snapPath,async function(err){
                    await copyFileAsync(filePath, snapPath)
                    triggerEvent({
                        id: mid,
                        ke: ke,
                        details: {
                            confidence: 100,
                            name: filename,
                            plug: "dropInEvent",
                            reason: "ftpServer"
                        },
                    },config.dropInEventForceSaveEvent)
                })
            }else{
                var reason = "ftpServer"
                if(search(filename,'.mp4')){
                    fs.stat(filePath,function(err,stats){
                        if(err)return;
                        var startTime = stats.ctime
                        var endTime = stats.mtime
                        var shinobiFilename = s.formattedTime(startTime) + '.mp4'
                        var recordingPath = s.getVideoDirectory(monitorConfig) + shinobiFilename
                        var writeStream = fs.createWriteStream(recordingPath)
                        fs.createReadStream(filePath).pipe(writeStream)
                        writeStream.on('finish', () => {
                            s.insertCompletedVideo(s.group[monitorConfig.ke].rawMonitorConfigurations[monitorConfig.mid],{
                                file: shinobiFilename,
                                events: [
                                    {
                                      id: mid,
                                      ke: ke,
                                      time: new Date(),
                                      details: {
                                          confidence: 100,
                                          name: filename,
                                          plug: "dropInEvent",
                                          reason: "ftpServer"
                                      }
                                    }
                                ],
                            },function(){
                            })
                        })
                    })
                }
                var completeAction = function(){
                    triggerEvent({
                        id: mid,
                        ke: ke,
                        details: {
                            confidence: 100,
                            name: filename,
                            plug: "dropInEvent",
                            reason: reason
                        },
                    },config.dropInEventForceSaveEvent)
                }
                if(search(filename,'.txt')){
                    fs.readFile(filePath,{encoding: 'utf-8'},function(err,data){
                        if(data){
                            reason = data.split('\n')[0] || filename
                        }else if(filename){
                            reason = filename
                        }
                        completeAction()
                    })
                }else{
                    completeAction()
                }

            }
        }
        var onFileOrFolderFound = function(filePath,deletionKey,monitorConfig){
          fs.stat(filePath,function(err,stats){
              if(!err){
                    if(stats.isDirectory()){
                        fs.readdir(filePath,function(err,files){
                            if(files){
                                files.forEach(function(filename){
                                    onFileOrFolderFound(clipPathEnding(filePath) + '/' + filename,deletionKey,monitorConfig)
                                })
                            }else if(err){
                                console.log(err)
                            }
                        })
                    }else{
                        if(!fileQueue[filePath]){
                            processFile(filePath,monitorConfig)
                            if(config.dropInEventDeleteFileAfterTrigger){
                                clearTimeout(fileQueue[filePath])
                                fileQueue[filePath] = setTimeout(function(){
                                    fs.rm(filePath, { recursive: true },(err) => {
                                        delete(fileQueue[filePath])
                                    })
                                },1000 * 60 * 5)
                            }
                        }
                    }
                    if(config.dropInEventDeleteFileAfterTrigger){
                        clearTimeout(fileQueueForDeletion[deletionKey])
                        fileQueueForDeletion[deletionKey] = setTimeout(function(){
                            fs.rm(filePath, { recursive: true },(err) => {
                                delete(fileQueueForDeletion[deletionKey])
                            })
                        },1000 * 60 * 5)
                    }
               }
           })
        }
        var createDropInEventsDirectory = function(){
            try{
                if(!config.dropInEventsDir){
                    config.dropInEventsDir = s.dir.streams + 'dropInEvents/'
                }
                s.dir.dropInEvents = s.checkCorrectPathEnding(config.dropInEventsDir)
                //dropInEvents dir
                if(!fs.existsSync(s.dir.dropInEvents)){
                    fs.mkdirSync(s.dir.dropInEvents)
                }
            }catch(err){
                console.error(err)
            }
        }
        var getDropInEventDir = function(monitorConfig){
            var ke = monitorConfig.ke
            var mid = monitorConfig.mid
            var groupEventDropDir = s.dir.dropInEvents + ke
            var monitorEventDropDir = groupEventDropDir + '/' + mid + '/'
            return monitorEventDropDir
        }
        var onMonitorStop = function(monitorConfig){
            var ke = monitorConfig.ke
            var mid = monitorConfig.mid
            if(s.group[monitorConfig.ke].activeMonitors[monitorConfig.mid].dropInEventWatcher){
                s.group[monitorConfig.ke].activeMonitors[monitorConfig.mid].dropInEventWatcher.close()
                delete(s.group[monitorConfig.ke].activeMonitors[monitorConfig.mid].dropInEventWatcher)
                var monitorEventDropDir = getDropInEventDir(monitorConfig)
                s.file('deleteFolder',monitorEventDropDir + '*')
            }
        }
        var createDropInEventDirectory = function(e,callback){
            var directory = s.dir.dropInEvents + e.ke + '/'
            fs.mkdir(directory,function(err){
                s.handleFolderError(err)
                directory = s.dir.dropInEvents + e.ke + '/' + (e.id || e.mid) + '/'
                fs.mkdir(directory,function(err){
                    s.handleFolderError(err)
                    deleteFilesInFolder(directory)
                    callback(err,directory)
                })
            })
        }
        var onMonitorInit = function(monitorConfig){
            var ke = monitorConfig.ke
            var mid = monitorConfig.mid
            var groupEventDropDir = s.dir.dropInEvents + ke
            createDropInEventDirectory(monitorConfig,function(err,monitorEventDropDir){})
        }
        // FTP Server
        createDropInEventsDirectory()
        if(config.ftpServer === true){
            try{
                const FtpSrv = require('ftp-srv')
                console.error('WARNING : FTP Server is enabled.')
                if(!config.ftpServerPort)config.ftpServerPort = 21
                if(!config.ftpServerUrl)config.ftpServerUrl = `ftp://0.0.0.0:${config.ftpServerPort}`
                if(!config.ftpServerPasvUrl)config.ftpServerPasvUrl = config.ftpServerUrl.replace(/.*:\/\//, '').replace(/:.*/, '');
                if(!config.ftpServerPasvMinPort)config.ftpServerPasvMinPort = 10050;
                if(!config.ftpServerPasvMaxPort)config.ftpServerPasvMaxPort = 10100;
                config.ftpServerUrl = config.ftpServerUrl.replace('{{PORT}}',config.ftpServerPort)

                const ftpServer = new FtpSrv({
                    url: config.ftpServerUrl,
                    // pasv_url must be set to enable PASV; ftp-srv uses its known IP if given 127.0.0.1,
                    // and smart clients will ignore the IP anyway. Some Dahua IP cams require PASV mode.
                    // ftp-srv just wants an IP only (no protocol or port)
                    pasv_url: config.ftpServerPasvUrl,
                    pasv_min: config.ftpServerPasvMinPort,
                    pasv_max: config.ftpServerPasvMaxPort,
                    greeting: "Shinobi FTP dropInEvent Server says hello!",
                    log: require('bunyan').createLogger({
                      name: 'ftp-srv',
                      level: 100
                    }),
                })

                ftpServer.on('login', ({connection, username, password}, resolve, reject) => {
                    s.basicOrApiAuthentication(username,password,function(err,user){
                        if(user){
                            connection.on('STOR', (error, fileName) => {
                                if(!fileName)return;
                                var pathPieces = fileName.replace(s.dir.dropInEvents,'').split('/')
                                var ke = pathPieces[0]
                                var mid = pathPieces[1]
                                var firstDroppedPart = pathPieces[2]
                                var monitorEventDropDir = s.dir.dropInEvents + ke + '/' + mid + '/'
                                var deleteKey = monitorEventDropDir + firstDroppedPart
                                fs.mkdir(pathPieces.join('/'), { recursive: true }, (err) => {
                                    onFileOrFolderFound(monitorEventDropDir + firstDroppedPart,deleteKey,Object.assign({},s.group[ke].rawMonitorConfigurations[mid]))
                                })
                            })
                            resolve({root: s.dir.dropInEvents + user.ke})
                        }else{
                            // reject(new Error('Failed Authorization'))
                        }
                    })
                })
                ftpServer.on('client-error', ({connection, context, error}) => {
                    console.log('client-error',error)
                })
                ftpServer.listen().then(() => {
                    s.systemLog(`FTP Server running on port ${config.ftpServerPort}...`)
                }).catch(function(err){
                    s.systemLog(err)
                })
            }catch(err){
                console.error(err.message)
                console.error('Could not start FTP Server, please run "npm install ftp-srv" inside the Shinobi folder.')
                console.error('The ftp-srv Module is known to have possible vulnerabilities. Due to the nature of the vulnerability you should be unaffected unless the FTP Port is public facing. Use at your own risk.')
            }
        }
        //add extensions
        s.onMonitorInit(onMonitorInit)
        s.onMonitorStop(onMonitorStop)
    }
    // SMTP Server
    // allow starting SMTP server without dropInEventServer
    if(config.smtpServer === true){
        if(config.smtpServerHideStartTls === undefined)config.smtpServerHideStartTls = null
        var SMTPServer = require("smtp-server").SMTPServer;
        if(!config.smtpServerPort && (config.smtpServerSsl && config.smtpServerSsl.enabled !== false || config.ssl)){config.smtpServerPort = 465}else if(!config.smtpServerPort){config.smtpServerPort = 25}
        config.smtpServerOptions = config.smtpServerOptions ? config.smtpServerOptions : {}
        var smtpOptions = Object.assign({
            logger: config.debugLog || config.smtpServerLog,
            hideSTARTTLS: config.smtpServerHideStartTls,
            onAuth(auth, session, callback) {
                var username = auth.username
                var password = auth.password
                s.basicOrApiAuthentication(username,password,function(err,user){
                    if(user){
                        callback(null, {user: user.ke})
                    }else{
                        callback(new Error(lang.failedLoginText2))
                    }
                })
            },
            onRcptTo(address, session, callback) {
                var split = address.address.split('@')
                var monitorId = split[0]
                var ke = session.user
                if(s.group[ke] && s.group[ke].activeMonitors[monitorId] && s.group[ke].activeMonitors[monitorId].isStarted === true){
                    session.monitorId = monitorId
                }else{
                    return callback(new Error(lang['No Monitor Exists with this ID.']))
                }
                callback()
            },
            onData(stream, session, callback) {
                if(session.monitorId){
                    var ke = session.user
                    var monitorId = session.monitorId
                    var details = s.group[ke].rawMonitorConfigurations[monitorId].details
                    var reasonTag = ''
                    var text = ''
                    stream.on('data',function(data){
                        text += data.toString()
                    }) // print message to console
                    stream.on("end", function(){
                        var contentPart = text.split('--PartBoundary12345678')
                        contentPart.forEach(function(part){
                            var parsed = {}
                            var lines = part.split(/\r?\n/)
                            lines.forEach(function(line,n){
                                var pieces = line.split(':')
                                if(pieces[1]){
                                    var nextLine = lines[n + 1]
                                    var keyName = pieces[0].trim().toLowerCase()
                                    pieces.shift()
                                    var parsedValue = pieces.join(':')
                                    parsed[keyName] = parsedValue
                                }
                            })
                            if(parsed['content-type'] && parsed['content-type'].indexOf('image/jpeg') > -1){
                                // console.log(lines)
                            }
                            if(reasonTag)return;
                            if(parsed['alarm event']){
                                reasonTag = parsed['alarm event']
                            }else if(parsed.subject){
                                const subjectString = parsed.subject;
                                reasonTag = isBase64String(subjectString) ? convertBase64ToTextString(subjectString) : subjectString
                            }
                        })
                        triggerEvent({
                            id: monitorId,
                            ke: ke,
                            details: {
                                confidence: 100,
                                name: 'smtpServer',
                                plug: "dropInEvent",
                                reason: reasonTag || 'smtpServer'
                            },
                        },config.dropInEventForceSaveEvent)
                        callback()
                    })
                }else{
                    callback()
                }
            }
        },config.smtpServerOptions)
        if(config.smtpServerSsl && config.smtpServerSsl.enabled !== false || config.ssl && config.ssl.cert && config.ssl.key){
            var key = config.ssl.key || fs.readFileSync(config.smtpServerSsl.key)
            var cert = config.ssl.cert || fs.readFileSync(config.smtpServerSsl.cert)
            smtpOptions = Object.assign(smtpOptions,{
                secure: true,
                key: config.ssl.key,
                cert: config.ssl.cert
            })
        }
        var server = new SMTPServer(smtpOptions)
        server.listen(config.smtpServerPort,function(){
            s.systemLog(`SMTP Server running on port ${config.smtpServerPort}...`)
        })
    }
    require('./dropInEvents/mqtt.js')(s,config,lang,app,io)
}
