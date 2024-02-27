const fs = require('fs')
const URL = require('url')
const monitorBasePath = process.argv[2];
const importFilePath = process.argv[3];
if(!importFilePath){
    console.error('Missing Import File Path.')
    return console.error(`Example Use : node ./createMonitorsJsonFromTxt.js MONITOR_BASE.json PLAIN_LIST.txt`)
}
const monitorBase = require(monitorBasePath)
function generateId(x){
    if(!x){x=10};var t = "";var p = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for( var i=0; i < x; i++ )
        t += p.charAt(Math.floor(Math.random() * p.length));
    return t;
}
function getUrlProtocol(urlString){
    let modifiedUrlString = `${urlString}`.split('://')
    const originalProtocol = `${modifiedUrlString[0]}`
    return originalProtocol
}
function modifyUrlProtocol(urlString,newProtocol){
    let modifiedUrlString = `${urlString}`.split('://')
    const originalProtocol = `${modifiedUrlString[0]}`
    modifiedUrlString[0] = newProtocol;
    modifiedUrlString = modifiedUrlString.join('://')
    return modifiedUrlString
}
function getUrlParts(urlString){
    const originalProtocol = getUrlProtocol(urlString)
    const modifiedUrlString = modifyUrlProtocol(urlString,'http')
    const url = URL.parse(modifiedUrlString)
    const data = {}
    Object.keys(url).forEach(function(key){
        const value = url[key];
        if(value && typeof value !== 'function')data[key] = url[key];
    });
    data.href = `${urlString}`
    data.origin = modifyUrlProtocol(data.origin,originalProtocol)
    data.protocol = `${originalProtocol}:`
    return data
}
function makeConfig(streamUrl){
    // streamUrl = 'rtsp://1.1.1.1:554/'
    const copyOfBaseConfig = Object.assign({},monitorBase)
    const urlParts = getUrlParts(streamUrl)
    copyOfBaseConfig.mid = generateId()
    copyOfBaseConfig.name = urlParts.hostname
    copyOfBaseConfig.host = urlParts.hostname
    copyOfBaseConfig.port = urlParts.port
    copyOfBaseConfig.path = urlParts.pathname
    copyOfBaseConfig.details.auto_host = streamUrl
    copyOfBaseConfig.details.rtsp_transport = 'tcp'
    return copyOfBaseConfig
}

function run(){
    const importList = fs.readFileSync(importFilePath,'utf8').split('\n')
    const newMonitorsList = []
    const fileName = `${importFilePath}.json`
    importList.forEach((streamUrl) => {
        newMonitorsList.push(makeConfig(streamUrl))
    })
    console.log(`New JSON written to ${fileName}`)
    fs.writeFileSync(fileName,JSON.stringify(newMonitorsList));
}
run()
