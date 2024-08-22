module.exports = function(s){
    const configLocation = process.argv[2]
    const superLocation = process.argv[3]
    s.location = {
        super : superLocation && superLocation.endsWith('.json') ? superLocation : s.mainDirectory+'/super.json',
        config : configLocation && configLocation.endsWith('.json') ? configLocation : s.mainDirectory+'/conf.json',
        languages : s.mainDirectory+'/languages'
    }
    try{
        var config = require(s.location.config)
    }catch(err){
        console.log('FAILED TO OPEN CONFIGURATION FILE')
        console.log('CHECK SYNTAX!')
        var config = {}
    }
    if(!config.productType){
        config.productType = 'CE'
    }
    //config defaults
    if(config.cpuUsageMarker === undefined){config.cpuUsageMarker='%Cpu'}
    if(config.customCpuCommand === undefined){config.customCpuCommand=null}
    if(config.autoDropCache === undefined){config.autoDropCache=false}
    if(config.doSnapshot === undefined){config.doSnapshot=true}
    if(config.restart === undefined){config.restart={}}
    if(config.systemLog === undefined){config.systemLog=true}
    if(config.deleteCorruptFiles === undefined){config.deleteCorruptFiles=true}
    if(config.restart.onVideoNotExist === undefined){config.restart.onVideoNotExist=true}
    if(config.ip === undefined||config.ip===''||config.ip.indexOf('0.0.0.0')>-1){config.ip='localhost'}else{config.bindip=config.ip};
    if(config.cron === undefined)config.cron={};
    if(config.cron.enabled === undefined)config.cron.enabled=true;
    if(config.cron.deleteOld === undefined)config.cron.deleteOld=true;
    if(config.cron.deleteNoVideo === undefined)config.cron.deleteNoVideo=true;
    if(config.cron.deleteNoVideoRecursion === undefined)config.cron.deleteNoVideoRecursion=false;
    if(config.cron.deleteOverMax === undefined)config.cron.deleteOverMax=true;
    if(config.cron.deleteOverMaxOffset === undefined)config.cron.deleteOverMaxOffset=0.9;
    if(config.cron.deleteLogs === undefined)config.cron.deleteLogs=true;
    if(config.cron.deleteEvents === undefined)config.cron.deleteEvents=true;
    if(config.cron.deleteFileBins === undefined)config.cron.deleteFileBins=true;
    if(config.deleteFileBinsOverMax === undefined)config.deleteFileBinsOverMax=true;
    if(config.cron.interval === undefined)config.cron.interval=1;
    if(config.databaseType === undefined){config.databaseType='mysql'}
    if(config.pluginKeys === undefined)config.pluginKeys={};
    if(config.databaseLogs === undefined){config.databaseLogs=false}
    if(config.useUTC === undefined){config.useUTC=false}
    if(config.iconURL === undefined){config.iconURL = "https://shinobi.video/libs/assets/icon/apple-touch-icon-152x152.png"}
    if(config.pipeAddition === undefined){config.pipeAddition=10}else{config.pipeAddition=parseInt(config.pipeAddition)}
    if(config.hideCloudSaveUrls === undefined){config.hideCloudSaveUrls = true}
    if(config.insertOrphans === undefined){config.insertOrphans = true}
    if(config.orphanedVideoCheckMax === undefined){config.orphanedVideoCheckMax = 2}
    if(config.detectorMergePamRegionTriggers === undefined){config.detectorMergePamRegionTriggers = false}
    if(config.probeMonitorOnStart === undefined){config.probeMonitorOnStart = true}
    if(config.showLoginTypeSelector === undefined){config.showLoginTypeSelector = true}
    if(config.timezone === undefined){config.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone}
    //Child Nodes
    if(config.childNodes === undefined)config.childNodes = {};
        //enabled
        if(config.childNodes.enabled === undefined)config.childNodes.enabled = false;
        //mode, set value as `child` for all other machines in the cluster
        if(config.childNodes.mode === undefined)config.childNodes.mode = 'master';
        //child node connection port
        if(config.childNodes.port === undefined)config.childNodes.port = 8288;
        //child node connection key
        if(config.childNodes.key === undefined)config.childNodes.key = [
            '3123asdasdf1dtj1hjk23sdfaasd12asdasddfdbtnkkfgvesra3asdsd3123afdsfqw345'
        ];

    if(!config.timeZones){
        config.timeZones = [
               {
                  "text": "UTC−12:00, Y",
                  "value": -720
               },
               {
                  "text": "UTC−11:00, X",
                  "value": -660
               },
               {
                  "text": "UTC−10:00, W",
                  "value": -600
               },
               {
                  "text": "UTC−09:30, V†",
                  "value": -570
               },
               {
                  "text": "UTC−09:00, V",
                  "value": -540
               },
               {
                  "text": "UTC−08:00, U",
                  "value": -480
               },
               {
                  "text": "UTC−07:00, T",
                  "value": -420
               },
               {
                  "text": "UTC−06:00, S",
                  "value": -360
               },
               {
                  "text": "UTC−05:00, R",
                  "value": -300
               },
               {
                  "text": "UTC−04:00, Q",
                  "value": -240
               },
               {
                  "text": "UTC−03:30, P†",
                  "value": -210
               },
               {
                  "text": "UTC−03:00, P",
                  "value": -180
               },
               {
                  "text": "UTC−02:00, O",
                  "value": -120
               },
               {
                  "text": "UTC−01:00, N",
                  "value": -60
               },
               {
                  "text": "UTC±00:00, Z",
                  "value": 0,
                  "selected": true
               },
               {
                  "text": "UTC+01:00, A",
                  "value": 60
               },
               {
                  "text": "UTC+02:00, B",
                  "value": 120
               },
               {
                  "text": "UTC+03:00, C",
                  "value": 180
               },
               {
                  "text": "UTC+03:30, C†",
                  "value": 210
               },
               {
                  "text": "UTC+04:00, D",
                  "value": 240
               },
               {
                  "text": "UTC+04:30, D†",
                  "value": 270
               },
               {
                  "text": "UTC+05:00, E",
                  "value": 300
               },
               {
                  "text": "UTC+05:30, E†",
                  "value": 330
               },
               {
                  "text": "UTC+05:45, E*",
                  "value": 345
               },
               {
                  "text": "UTC+06:00, F",
                  "value": 360
               },
               {
                  "text": "UTC+06:30, F†",
                  "value": 390
               },
               {
                  "text": "UTC+07:00, G",
                  "value": 420
               },
               {
                  "text": "UTC+08:00, H",
                  "value": 480
               },
               {
                  "text": "UTC+08:45, H*",
                  "value": 525
               },
               {
                  "text": "UTC+09:00, I",
                  "value": 540
               },
               {
                  "text": "UTC+09:30, I†",
                  "value": 570
               },
               {
                  "text": "UTC+10:00, K",
                  "value": 600
               },
               {
                  "text": "UTC+10:30, K†",
                  "value": 630
               },
               {
                  "text": "UTC+11:00, L",
                  "value": 660
               },
               {
                  "text": "UTC+12:00, M",
                  "value": 720
               },
               {
                  "text": "UTC+12:45, M*",
                  "value": 765
               },
               {
                  "text": "UTC+13:00, M†",
                  "value": 780
               },
               {
                  "text": "UTC+14:00, M†",
                  "value": 840
               }
        ]
    }
    return config
}
