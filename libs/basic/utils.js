const fs = require('fs');
const fsP = require('fs').promises;
const path = require('path');
const moment = require('moment');
const fetch  = require('node-fetch');
const FormData = require('form-data');
const { AbortController } = require('node-abort-controller')
const DigestFetch = require('digest-fetch')
module.exports = (processCwd,config) => {
    const parseJSON = (string) => {
        var parsed
        try{
            parsed = JSON.parse(string)
        }catch(err){

        }
        if(!parsed)parsed = string
        return parsed
    }
    const stringJSON = (json) => {
        try{
            if(json instanceof Object){
                json = JSON.stringify(json)
            }
        }catch(err){

        }
        return json
    }
    const stringContains = (find,string,toLowerCase) => {
        var newString = string + ''
        if(toLowerCase)newString = newString.toLowerCase()
        return newString.indexOf(find) > -1
    }
    function getFileDirectory(filePath){
        const fileParts = filePath.split('/')
        fileParts.pop();
        return fileParts.join('/') + '/';
    }
    const checkCorrectPathEnding = (x) => {
        var length=x.length
        if(x.charAt(length-1)!=='/'){
            x=x+'/'
        }
        return x.replace('__DIR__',processCwd)
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
    const nameToTime = (x) => {
        x = x.split('.')[0].split('T')
        if(x[1])x[1] = x[1].replace(/-/g,':')
        x = x.join(' ')
        return x
    }
    const generateRandomId = (x) => {
        if(!x){x=10};var t = "";var p = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for( var i=0; i < x; i++ )
            t += p.charAt(Math.floor(Math.random() * p.length));
        return t;
    }
    const utcToLocal = (time) => {
        return moment.utc(time).utcOffset(s.utcOffset).format()
    }
    const localToUtc = (time) => {
        return moment(time).utc()
    }
    const formattedTime = (e,x) => {
        if(!e){e=new Date};if(!x){x='YYYY-MM-DDTHH-mm-ss'};
        return moment(e).format(x);
    }
    const fetchTimeout = (url, ms, { signal, ...options } = {}) => {
        const controller = new AbortController();
        const promise = fetch(url, { signal: controller.signal, ...options });
        if (signal) signal.addEventListener("abort", () => controller.abort());
        const timeout = setTimeout(() => controller.abort(), ms);
        return promise.finally(() => clearTimeout(timeout));
    }
    async function fetchDownloadAndWrite(downloadUrl,outputPath,readFileAfterWrite,options){
        const writeStream = fs.createWriteStream(outputPath);
        const downloadBuffer = await fetch(downloadUrl,options).then((res) => res.buffer());
        writeStream.write(downloadBuffer);
        writeStream.end();
        if(readFileAfterWrite === 1){
            return fs.createReadStream(outputPath)
        }else if(readFileAfterWrite === 2){
            return downloadBuffer
        }
        return null
    }
    function fetchWithAuthentication(requestUrl,options,callback){
        let hasDigestAuthEnabled = options.digestAuth;
        let theRequester;
        const hasUsernameAndPassword = options.username && typeof options.password === 'string'
        const requestOptions = {
            method : options.method || 'GET',
            headers: {'Content-Type': 'application/json'}
        }
        if(requestOptions.method !== 'GET'){
            if(typeof options.postData === 'object'){
                requestOptions.body = JSON.stringify(options.postData)
            }else if(options.postData && typeof options.postData === 'string'){
                try{
                    JSON.parse(options.postData)
                    requestOptions.body = options.postData
                }catch(err){

                }
            }
        }
        if(hasUsernameAndPassword && hasDigestAuthEnabled){
            theRequester = (new DigestFetch(options.username, options.password)).fetch
        }else if(hasUsernameAndPassword){
            theRequester = (new DigestFetch(options.username, options.password, { basic: true })).fetch
        }else{
            theRequester = fetch
        }
        return theRequester(requestUrl,requestOptions)
    }
    const checkSubscription = (subscriptionId,callback,suppressCheckNotice = false) => {
        function subscriptionFailed(){
            console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
            console.error('This Install of Shinobi is NOT Activated')
            console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
            console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
            s.systemLog('This Install of Shinobi is NOT Activated')
            console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
            console.log('https://licenses.shinobi.video/subscribe')
        }
        if(subscriptionId && subscriptionId !== 'sub_XXXXXXXXXXXX' && !config.disableOnlineSubscriptionCheck){
            var url = 'https://licenses.shinobi.video/subscribe/check?subscriptionId=' + subscriptionId
            var hasSubcribed = false
            fetchTimeout(url,30000,{
                method: 'GET',
            })
            .then(response => response.text())
            .then(function(body){
                var json = s.parseJSON(body)
                hasSubcribed = json && !!json.ok
                var i;
                for (i = 0; i < s.onSubscriptionCheckExtensions.length; i++) {
                    const extender = s.onSubscriptionCheckExtensions[i]
                    hasSubcribed = extender(hasSubcribed,json,subscriptionId)
                }
                callback(hasSubcribed)
                if(hasSubcribed){
                    if(!suppressCheckNotice){
                        s.systemLog('This Install of Shinobi is Activated')
                        if(!json.expired && json.timeExpires){
                            s.systemLog(`This License expires on ${json.timeExpires}`)
                        }
                    }
                }else{
                    subscriptionFailed()
                }
            }).catch((err) => {
                if(err)console.log(err)
                subscriptionFailed()
                callback(false)
            })
        }else{
            var i;
            for (i = 0; i < s.onSubscriptionCheckExtensions.length; i++) {
                const extender = s.onSubscriptionCheckExtensions[i]
                hasSubcribed = extender(false,{},subscriptionId)
            }
            if(hasSubcribed === false){
                subscriptionFailed()
            }
            callback(hasSubcribed)
        }
    }
    function checkAgainSubscription(){
        let checkCount = 1
        return setInterval(function(){
            if(checkCount === 28){
                checkSubscription(config.subscriptionId || config.peerConnectKey || config.p2pApiKey, function(hasSubcribed){
                    config.userHasSubscribed = hasSubcribed
                }, true);
                checkCount = 1;
            }
            ++checkCount;
        }, 1000 * 60 * 60 * 24);
    }
    function isEven(value) {
        if (value%2 == 0)
            return true;
        else
            return false;
    }
    function asyncSetTimeout(timeoutAmount) {
        return new Promise((resolve,reject) => {
            setTimeout(function(){
                resolve()
            },timeoutAmount)
        })
    }
    function copyFile(inputFilePath,outputFilePath) {
        const response = {ok: true}
        return new Promise((resolve,reject) => {
            function failed(err){
                response.ok = false
                response.err = err
                resolve(response)
            }
            const readStream = fs.createReadStream(inputFilePath)
            const writeStream = fs.createWriteStream(outputFilePath)
            writeStream.on('finish', () => {
                resolve(response)
            })
            writeStream.on('error', failed)
            readStream.on('error', failed)
            readStream.pipe(writeStream)
        })
    }
    async function moveFile(inputFilePath,outputFilePath) {
        try{
            await fsP.rm(outputFilePath)
        }catch(err){}
        await copyFile(inputFilePath, outputFilePath)
        await fsP.rm(inputFilePath)
    }
    function hmsToSeconds(str) {
        var p = str.split(':'),
            s = 0, m = 1;

        while (p.length > 0) {
            s += m * parseFloat(p.pop(), 10);
            m *= 60;
        }

        return s;
    }
    function setDefaultIfUndefined(config, key, defaultValue) {
        const mustDoDefault = !config.userHasSubscribed;
        if (Array.isArray(defaultValue)) {
            if (config[key] === undefined || mustDoDefault) {
                config[key] = [...defaultValue]; // Spread operator to clone the array
            }
        } else {
            if (config[key] === undefined || mustDoDefault) {
                config[key] = defaultValue;
            }
        }
    }
    async function deleteFilesInFolder(folderPath) {
        try {
            const files = await fsP.readdir(folderPath);
            for (const file of files) {
                const filePath = path.join(folderPath, file);
                await fsP.rm(filePath, { recursive: true });
            }
        } catch (error) {
            console.error(`Error deleting files: ${error.message}`);
        }
    }
    return {
        parseJSON: parseJSON,
        stringJSON: stringJSON,
        stringContains: stringContains,
        getFileDirectory: getFileDirectory,
        checkCorrectPathEnding: checkCorrectPathEnding,
        nameToTime: nameToTime,
        mergeDeep: mergeDeep,
        generateRandomId: generateRandomId,
        utcToLocal: utcToLocal,
        localToUtc: localToUtc,
        formattedTime: formattedTime,
        checkSubscription: checkSubscription,
        checkAgainSubscription,
        isEven: isEven,
        fetchTimeout: fetchTimeout,
        fetchDownloadAndWrite: fetchDownloadAndWrite,
        fetchWithAuthentication: fetchWithAuthentication,
        asyncSetTimeout: asyncSetTimeout,
        copyFile: copyFile,
        hmsToSeconds,
        setDefaultIfUndefined,
        deleteFilesInFolder,
        moveFile,
    }
}
