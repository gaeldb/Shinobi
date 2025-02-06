const fs = require('fs');
const spawn = require('child_process').spawn;
const {
    mergeDeep,
} = require('../common.js')
module.exports = (config) => {
    var currentlyUpdating = false
    return {
        getSystemInfo: (s) => {
            const response = {
                "Time Started": s.timeStarted,
                "Time Ready": s.timeReady,
                Versions: {
                    "Shinobi": s.currentVersion,
                    "Node.js": process.version,
                    "FFmpeg": s.ffmpegVersion,
                    "isActivated": config.userHasSubscribed,
                    "previousShinobi": s.versionsUsed,
                },
                Machine: {
                    "CPU Core Count": s.coreCount,
                    "Total RAM": s.totalmem,
                    "Operating System Platform": s.platform,
                },

            }
            if(s.expiryDate)response.Versions["License Expires On"] = s.expiryDate
            return response
        },
        getConfiguration: () => {
            return new Promise((resolve,reject) => {
                const configPath = config.thisIsDocker ? "/config/conf.json" : s.location.config;

                fs.readFile(configPath, 'utf8', (err, data) => {
                    resolve(JSON.parse(data))
                });
            });
        },
        modifyConfiguration: (postBody, useBase) => {
            return new Promise((resolve, reject) => {
                console.log(config)
                const configPath = config.thisIsDocker ? "/config/conf.json" : s.location.config;
                let configToPost = postBody;
                if(useBase){
                    try{
                        const configBase = s.parseJSON(fs.readFileSync(configPath),{});
                        configToPost = mergeDeep(configBase, postBody)
                    }catch(err){
                        console.error('modifyConfiguration : Failed to use Config base!')
                    }
                }
                const configData = JSON.stringify(configToPost, null, 3);
                fs.writeFile(configPath, configData, resolve);
            });
        },
        updateSystem: () => {
            return new Promise((resolve,reject) => {
                if(!config.thisIsDocker){
                    if(currentlyUpdating){
                        resolve(true)
                        return
                    };
                    currentlyUpdating = true
                    const updateProcess = spawn('sh',[s.mainDirectory + '/UPDATE.sh'])
                    updateProcess.stderr.on('data',(data) => {
                        s.systemLog('UPDATE.sh',data.toString())
                    })
                    updateProcess.stdout.on('data',(data) => {
                        s.systemLog('UPDATE.sh',data.toString())
                    })
                    updateProcess.on('exit',(data) => {
                        resolve(true)
                        currentlyUpdating = false
                    })
                }else{
                    resolve(false)
                }
            })
        }
    }
}
