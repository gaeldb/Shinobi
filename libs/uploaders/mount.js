const fs = require('fs').promises;
const { createReadStream } = require('fs');
const path = require('path');
const {
    writeReadStream,
    checkDiskPathExists,
} = require('node-fstab');
module.exports = function(s,config,lang){
    if(s.isWin){
        return {}
    }
    function constructFilePath(groupKey, filePath){
        return path.join(s.group[groupKey].init.mnt_path, filePath)
    }
    const deleteObject = async (groupKey, filePath) => {
        const fullPath = constructFilePath(groupKey, filePath)
        const response = { ok: true }
        try{
            await fs.rm(fullPath)
        }catch(err){
            response.ok = false;
            response.err = err.toString();
        }
        return response
    };
    const uploadObject = async (groupKey, { filePath, readStream }) => {
        const fullPath = constructFilePath(groupKey, filePath)
        return await writeReadStream(readStream, fullPath);
    };
    const getObject = async (groupKey, filePath) => {
        const fullPath = constructFilePath(groupKey, filePath)
        return createReadStream(fullPath)
    };
    function beforeAccountSave(d){
        //d = save event
        d.formDetails.mnt_use_global = d.d.mnt_use_global
        d.formDetails.use_mnt = d.d.use_mnt
    }
    function cloudDiskUseStartup(group,userDetails){
        group.cloudDiskUse['mnt'].name = 'Mounted Drive'
        group.cloudDiskUse['mnt'].sizeLimitCheck = (userDetails.use_mnt_size_limit === '1')
        if(!userDetails.mnt_size_limit || userDetails.mnt_size_limit === ''){
            group.cloudDiskUse['mnt'].sizeLimit = 10000
        }else{
            group.cloudDiskUse['mnt'].sizeLimit = parseFloat(userDetails.mnt_size_limit)
        }
    }
    function loadGroupApp(e){
        // e = user
        var userDetails = JSON.parse(e.details)
        if(userDetails.mnt_use_global === '1' && config.cloudUploaders && config.cloudUploaders.WasabiHotCloudStorage){
            userDetails = Object.assign(userDetails,config.cloudUploaders.mountedDrive)
        }
        //Mounted Drive Storage
        if(
           !s.group[e.ke].mnt &&
           userDetails.mnt !== '0' &&
           userDetails.mnt_path
       ){
            checkDiskPathExists(userDetails.mnt_path).then((response) => {
                if(response.exists){
                    s.group[e.ke].mnt = userDetails.mnt_path;
                }
            })
        }
    }
    function unloadGroupApp(user){
        s.group[user.ke].mnt = null
    }
    function deleteVideo(e,video,callback){
        // e = user
        try{
            var videoDetails = JSON.parse(video.details)
        }catch(err){
            var videoDetails = video.details
        }
        if(video.type !== 'mnt'){
            callback()
            return
        }
        deleteObject(video.ke, videoDetails.location).then((response) => {
            if (response.err){
                console.error('Mounted Drive Storage DELETE Error')
                console.error(err);
            }
            callback()
        });
    }
    function onMonitorStart(monitorConfig){
        const groupKey = monitorConfig.ke;
        const monitorId = monitorConfig.mid;
        if(s.group[groupKey].mnt){
            const saveLocation = constructFilePath(groupKey, s.group[groupKey].init.mnt_dir + groupKey + '/' + monitorId);
            fs.mkdir(saveLocation, { recursive: true }).catch((err) => {
                console.error('Making Directory fail', err)
            });
        }
    }
    function uploadVideo(e,k,insertQuery){
        //e = video object
        //k = temporary values
        if(!k)k={};
        //cloud saver - Mounted Drive
        const groupKey = insertQuery.ke
        if(s.group[groupKey].mnt && s.group[groupKey].init.use_mnt !== '0' && s.group[groupKey].init.mnt_save === '1'){
            const filename = `${s.formattedTime(insertQuery.time)}.${insertQuery.ext}`
            var fileStream = createReadStream(k.dir + filename);
            var saveLocation = s.group[groupKey].init.mnt_dir+groupKey+'/'+e.mid+'/'+filename
            uploadObject(groupKey, {
                filePath: saveLocation,
                readStream: fileStream,
            }).then((response) => {
                if(response.err){
                    s.userLog(e,{type:lang['Mounted Drive Storage Upload Error'],msg:response.err})
                }
                if(s.group[groupKey].init.mnt_log === '1' && response.ok){
                    s.knexQuery({
                        action: "insert",
                        table: "Cloud Videos",
                        insert: {
                            mid: e.mid,
                            ke: groupKey,
                            ext: insertQuery.ext,
                            time: insertQuery.time,
                            status: 1,
                            type : 'mnt',
                            details: s.s({
                                location : saveLocation
                            }),
                            size: k.filesize,
                            end: k.endTime,
                            href: ''
                        }
                    })
                    s.setCloudDiskUsedForGroup(groupKey,{
                        amount: k.filesizeMB,
                        storageType: 'mnt'
                    })
                    s.purgeCloudDiskForGroup(e,'mnt')
                }
            });
        }
    }
    function onInsertTimelapseFrame(monitorObject,queryInfo,filePath){
        var e = monitorObject
        if(s.group[e.ke].mnt && s.group[e.ke].init.use_mnt !== '0' && s.group[e.ke].init.mnt_save === '1'){
            var fileStream = createReadStream(filePath)
            fileStream.on('error', function (err) {
                console.error(err)
            })
            var saveLocation = s.group[e.ke].init.mnt_dir + e.ke + '/' + e.mid + '_timelapse/' + queryInfo.filename
            uploadObject(e.ke, {
                filePath: saveLocation,
                readStream: fileStream,
            }).then((response) => {
                if(response.err){
                    s.userLog(e,{type:lang['Wasabi Hot Cloud Storage Upload Error'],msg:response.err})
                }
                if(s.group[e.ke].init.mnt_log === '1' && response.ok){
                    s.knexQuery({
                        action: "insert",
                        table: "Cloud Timelapse Frames",
                        insert: {
                            mid: queryInfo.mid,
                            ke: queryInfo.ke,
                            time: queryInfo.time,
                            filename: queryInfo.filename,
                            type : 'mnt',
                            details: s.s({
                                location : saveLocation
                            }),
                            size: queryInfo.size,
                            href: ''
                        }
                    })
                    s.setCloudDiskUsedForGroup(e.ke,{
                        amount : s.kilobyteToMegabyte(queryInfo.size),
                        storageType : 'mnt'
                    },'timelapseFrames')
                    s.purgeCloudDiskForGroup(e,'mnt','timelapseFrames')
                }
            })
        }
    }
    function onDeleteTimelapseFrameFromCloud(e,frame,callback){
        // e = user
        try{
            var frameDetails = JSON.parse(frame.details)
        }catch(err){
            var frameDetails = frame.details
        }
        if(video.type !== 'mnt'){
            callback()
            return
        }
        if(!frameDetails.location){
            frameDetails.location = frame.href.split(locationUrl)[1]
        }
        deleteObject(e.ke, frameDetails.location).then((response) => {
            if (response.err){
                console.error('Mounted Drive Storage DELETE Error')
                console.error(err);
            }
            callback()
        });
    }
    async function onGetVideoData(video){
        const videoDetails = s.parseJSON(video.details)
        const saveLocation = videoDetails.location
        var fileStream = await getObject(video.ke, saveLocation);
        return fileStream
    }
    //Mounted Drive Storage
    s.addCloudUploader({
        name: 'mnt',
        loadGroupAppExtender: loadGroupApp,
        unloadGroupAppExtender: unloadGroupApp,
        insertCompletedVideoExtender: uploadVideo,
        deleteVideoFromCloudExtensions: deleteVideo,
        cloudDiskUseStartupExtensions: cloudDiskUseStartup,
        beforeAccountSave: beforeAccountSave,
        onAccountSave: cloudDiskUseStartup,
        onInsertTimelapseFrame: onInsertTimelapseFrame,
        onDeleteTimelapseFrameFromCloud: onDeleteTimelapseFrameFromCloud,
        onGetVideoData,
    });
    s.onMonitorStart(onMonitorStart);
    //return fields that will appear in settings
    return {
       "evaluation": "details.use_mnt !== '0'",
       "name": lang["Mounted Drive Storage"],
       "color": "forestgreen",
       "uploaderId": 'mnt',
       "info": [
           {
              "name": "detail=mnt_save",
              "selector":"autosave_mnt",
              "field": lang.Autosave,
              "description": "",
              "default": lang.No,
              "example": "",
              "fieldType": "select",
              "possible": [
                  {
                     "name": lang.No,
                     "value": "0"
                  },
                  {
                     "name": lang.Yes,
                     "value": "1"
                  }
              ]
           },
           {
               "hidden": true,
               "field": lang['Mount Point'],
               "name": "detail=mnt_path",
               "placeholder": "/mnt/yourdrive",
               "form-group-class": "autosave_mnt_input autosave_mnt_1",
           },
          {
              "hidden": true,
             "name": "detail=mnt_log",
             "field": lang['Save Links to Database'],
             "fieldType": "select",
             "selector": "h_mntsld",
             "form-group-class":"autosave_mnt_input autosave_mnt_1",
             "description": "",
             "default": "",
             "example": "",
             "possible": [
                 {
                    "name": lang.No,
                    "value": "0"
                 },
                 {
                    "name": lang.Yes,
                    "value": "1"
                 }
             ]
         },
         {
             "hidden": true,
            "name": "detail=use_mnt_size_limit",
            "field": lang['Use Max Storage Amount'],
            "fieldType": "select",
            "selector": "h_mntzl",
            "form-group-class":"autosave_mnt_input autosave_mnt_1",
            "form-group-class-pre-layer":"h_mntsld_input h_mntsld_1",
            "description": "",
            "default": "",
            "example": "",
            "possible":  [
                {
                   "name": lang.No,
                   "value": "0"
                },
                {
                   "name": lang.Yes,
                   "value": "1"
                }
            ]
         },
         {
             "hidden": true,
            "name": "detail=mnt_size_limit",
            "field": lang['Max Storage Amount'],
            "form-group-class":"autosave_mnt_input autosave_mnt_1",
            "form-group-class-pre-layer":"h_mntsld_input h_mntsld_1",
            "description": "",
            "default": "10000",
            "example": "",
            "possible": ""
         },
         {
             "hidden": true,
            "name": "detail=mnt_dir",
            "field": lang['Save Directory'],
            "form-group-class":"autosave_mnt_input autosave_mnt_1",
            "description": "",
            "default": "/",
            "example": "",
            "possible": ""
         },
       ]
    }
}
