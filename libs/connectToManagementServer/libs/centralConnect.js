const { Worker } = require('worker_threads')
const fs = require('fs').promises;
module.exports = (s,config,lang) => {
    const {
        modifyConfiguration,
    } = require('../../system/utils.js')(config)
    const {
        getConnectionDetails,
    } = require('./connectDetails.js')(s,config)
    const configPath = process.cwd() + '/conf.json'
    async function startWorker(){
        if(!config.userHasSubscribed){
            return console.log(lang.centralManagementNotEnabled)
        }
        const configFromFile = JSON.parse(await fs.readFile(configPath, 'utf8'))
        configFromFile.timezone = config.timezone;
        console.log('Central Worker Starting...')
        const worker = new Worker(`${__dirname}/centralConnect/index.js`, {
            workerData: {
                config: configFromFile,
            }
        });
        worker.on('message', (data) => {
            switch(data.f){
                case'connectDetailsRequest':
                    getConnectionDetails().then((connectDetails) => {
                        worker.postMessage({ f: 'connectDetails', connectDetails })
                    }).catch((error) => {
                        console.error('FAILED TO GET connectDetails',error)
                        worker.postMessage({ f: 'connectDetails', connectDetails: {} })
                    })
                break;
                case'modifyConfiguration':
                    console.log('Editing Configuration...', data.data.form)
                    modifyConfiguration(data.data.form)
                break;
                case'restart':
                    s.systemLog('Restarting Central Connection...')
                    worker.terminate()
                break;
            }
        });
        worker.on('error', (err) => {
            console.error('cameraPeer Error', err)
        });
        worker.on('exit', (code) => {
            console.log('cameraPeer Exited, Restarting...', code)
            startWorker()
        });
        s.centralManagementWorker = worker;
    }
    s.onLoadedUsersAtStartup(() => {
        startWorker()
    })
    s.restartCentralManagement = () => {
        if(!s.centralManagementWorker){
            startWorker()
        }else{
            s.centralManagementWorker.terminate()
        }
    };
}
