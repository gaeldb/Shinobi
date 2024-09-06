const { Worker } = require('worker_threads');
const moment = require('moment');
module.exports = (s,config,lang) => {
    const {
        legacyFilterEvents
    } = require('./events/utils.js')(s,config,lang)
    if(config.doCronAsWorker===undefined)config.doCronAsWorker = true;
    const startWorker = () => {
        const pathToWorkerScript = __dirname + `/cron/worker.js`
        const workerProcess = new Worker(pathToWorkerScript,{
            workerData: config
        })
        workerProcess.on('message',function(data){
            if(data.time === 'moment()')data.time = moment();
            switch(data.f){
                case'knexQuery':
                    s.knexQuery(...data.args, function(...args){
                        workerProcess.postMessage({
                            f: 'callback',
                            rid: data.rid,
                            args,
                        })
                    });
                break;
                case'debugLog':
                    s.debugLog(...data.data)
                break;
                case'systemLog':
                    s.systemLog(...data.data)
                break;
                case'filters':
                    legacyFilterEvents(data.ff,data)
                break;
                case's.tx':
                    s.tx(data.data,data.to)
                break;
                case's.deleteVideo':
                    s.deleteVideo(data.file)
                break;
                case's.deleteCloudVideo':
                    s.deleteVideo(data.file)
                break;
                case's.deleteFileBinEntry':
                    s.deleteFileBinEntry(data.file)
                break;
                case's.onCronGroupBeforeProcessed':
                    s.runExtensionsForArray('onCronGroupBeforeProcessed', null, data.args)
                break;
                case's.onCronGroupBeforeProcessedAwaited':
                    s.runExtensionsForArrayAwaited('onCronGroupBeforeProcessedAwaited', null, data.args)
                break;
                case's.onCronGroupProcessed':
                    s.runExtensionsForArray('onCronGroupProcessed', null, data.args)
                break;
                case's.onCronGroupProcessedAwaited':
                    s.runExtensionsForArrayAwaited('onCronGroupProcessedAwaited', null, data.args)
                break;
                case's.setDiskUsedForGroup':
                   function doOnMain(){
                       s.setDiskUsedForGroup(data.ke,data.size,data.target || undefined)
                   }
                   if(data.videoRow){
                       let storageIndex = s.getVideoStorageIndex(data.videoRow);
                       if(storageIndex){
                           s.setDiskUsedForGroupAddStorage(data.ke,{
                               size: data.size,
                               storageIndex: storageIndex
                           })
                       }else{
                           doOnMain()
                       }
                   }else{
                       doOnMain()
                   }
                break;
                default:
                    s.debugLog('CRON.js MESSAGE : ',data)
                break;
            }
        })
        setTimeout(() => {
            workerProcess.postMessage({
                f: 'init',
            })
        },2000)
        return workerProcess
    }
    if(config.doCronAsWorker === true)startWorker()
}
