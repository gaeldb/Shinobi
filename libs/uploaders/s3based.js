// https://us-east-1.console.aws.amazon.com/iamv2/home#/users

const fs = require('fs');
const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");

module.exports = function(s,config,lang){
    const genericRequest = async (groupKey,requestOptions) => {
        const response = {ok: true}
        try {
            await s.group[groupKey].whcs.send(requestOptions);
        } catch (err) {
            console.error('AMZ genericRequest',groupKey,requestOptions)
            console.error('AMZ genericRequest ERR',err)
            response.ok = false
            response.err = err
        }
        return response;
    };
    const deleteObject = async (groupKey,options) => {
        return await genericRequest(groupKey,new DeleteObjectCommand(options))
    };
    const uploadObject = async (groupKey,options) => {
        return await genericRequest(groupKey,new PutObjectCommand(options))
    };
    const getObject = async (groupKey,options) => {
        // returns createReadStream
        return await s.group[groupKey].whcs.send(new GetObjectCommand(options))
    };
    function beforeAccountSave(d){
        //d = save event
        d.formDetails.whcs_use_global=d.d.whcs_use_global
        d.formDetails.use_whcs=d.d.use_whcs
    }
    function cloudDiskUseStartup(group,userDetails){
        group.cloudDiskUse['whcs'].name = 'S3-Based Network Storage'
        group.cloudDiskUse['whcs'].sizeLimitCheck = (userDetails.use_whcs_size_limit === '1')
        if(!userDetails.whcs_size_limit || userDetails.whcs_size_limit === ''){
            group.cloudDiskUse['whcs'].sizeLimit = 10000
        }else{
            group.cloudDiskUse['whcs'].sizeLimit = parseFloat(userDetails.whcs_size_limit)
        }
    }
    function loadGroupApp(e){
        // e = user
        var userDetails = JSON.parse(e.details)
        if(userDetails.whcs_use_global === '1' && config.cloudUploaders && config.cloudUploaders.WasabiHotCloudStorage){
            // {
            //     whcs_accessKeyId: "",
            //     whcs_secretAccessKey: "",
            //     whcs_region: "",
            //     whcs_bucket: "",
            //     whcs_dir: "",
            // }
            userDetails = Object.assign(userDetails,config.cloudUploaders.WasabiHotCloudStorage)
        }
        //S3-Based Network Storage
        if(
           !s.group[e.ke].whcs &&
           userDetails.whcs !== '0' &&
           userDetails.whcs_accessKeyId !== ''&&
           userDetails.whcs_secretAccessKey &&
           userDetails.whcs_secretAccessKey !== ''&&
           userDetails.whcs_bucket !== ''
          ){
            if(!userDetails.whcs_dir || userDetails.whcs_dir === '/'){
                userDetails.whcs_dir = ''
            }
            if(userDetails.whcs_dir){
                userDetails.whcs_dir = s.checkCorrectPathEnding(userDetails.whcs_dir)
            }
            if(!userDetails.whcs_endpoint ){
                userDetails.whcs_endpoint = 's3.wasabisys.com'
            }
            if(userDetails.whcs_endpoint.indexOf('://') === -1){
                userDetails.whcs_endpoint = `https://${userDetails.whcs_endpoint}`
            }
            s.group[e.ke].whcs = new S3Client({
                endpoint: userDetails.whcs_endpoint,
                credentials: {
                    accessKeyId: userDetails.whcs_accessKeyId,
                    secretAccessKey: userDetails.whcs_secretAccessKey,
                },
                region: userDetails.whcs_region || null
            });
        }
    }
    function unloadGroupApp(user){
        s.group[user.ke].whcs = null
    }
    function deleteVideo(e,video,callback){
        // e = user
        try{
            var videoDetails = JSON.parse(video.details)
        }catch(err){
            var videoDetails = video.details
        }
        if(video.type !== 'whcs'){
            callback()
            return
        }
        deleteObject(video.ke,{
            Bucket: s.group[video.ke].init.whcs_bucket,
            Key: videoDetails.location,
        }).then((response) => {
            if (response.err){
                console.error('S3-Based Network Storage DELETE Error')
                console.error(err);
            }
            callback()
        });
    }
    function uploadVideo(e,k,insertQuery){
        //e = video object
        //k = temporary values
        if(!k)k={};
        //cloud saver - S3-Based Network Storage
        const groupKey = insertQuery.ke
        if(s.group[groupKey].whcs && s.group[groupKey].init.use_whcs !== '0' && s.group[groupKey].init.whcs_save === '1'){
            const filename = `${s.formattedTime(insertQuery.time)}.${insertQuery.ext}`
            var fileStream = fs.createReadStream(k.dir+filename);
            fileStream.on('error', function (err) {
                console.error(err)
            })
            var saveLocation = s.group[groupKey].init.whcs_dir+groupKey+'/'+e.mid+'/'+filename
            uploadObject(groupKey,{
                Bucket: s.group[groupKey].init.whcs_bucket,
                Key: saveLocation,
                Body: fileStream,
                ContentType: 'video/'+e.ext
            }).then((response) => {
                if(response.err){
                    s.userLog(e,{type:lang['S3-Based Network Storage Upload Error'],msg:response.err})
                }
                if(s.group[groupKey].init.whcs_log === '1' && response.ok){
                    s.knexQuery({
                        action: "insert",
                        table: "Cloud Videos",
                        insert: {
                            mid: e.mid,
                            ke: groupKey,
                            ext: insertQuery.ext,
                            time: insertQuery.time,
                            status: 1,
                            type : 'whcs',
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
                        storageType: 'whcs'
                    })
                    s.purgeCloudDiskForGroup(e,'whcs')
                }
            });
        }
    }
    function onInsertTimelapseFrame(monitorObject,queryInfo,filePath){
        var e = monitorObject
        if(s.group[e.ke].whcs && s.group[e.ke].init.use_whcs !== '0' && s.group[e.ke].init.whcs_save === '1'){
            var fileStream = fs.createReadStream(filePath)
            fileStream.on('error', function (err) {
                console.error(err)
            })
            var saveLocation = s.group[e.ke].init.whcs_dir + e.ke + '/' + e.mid + '_timelapse/' + queryInfo.filename
            uploadObject(e.ke,{
                Bucket: s.group[e.ke].init.whcs_bucket,
                Key: saveLocation,
                Body: fileStream,
                ContentType:'image/jpeg'
            }).then((response) => {
                if(response.err){
                    s.userLog(e,{type:lang['Wasabi Hot Cloud Storage Upload Error'],msg:response.err})
                }
                if(s.group[e.ke].init.whcs_log === '1' && response.ok){
                    s.knexQuery({
                        action: "insert",
                        table: "Cloud Timelapse Frames",
                        insert: {
                            mid: queryInfo.mid,
                            ke: queryInfo.ke,
                            time: queryInfo.time,
                            filename: queryInfo.filename,
                            type : 'whcs',
                            details: s.s({
                                location : saveLocation
                            }),
                            size: queryInfo.size,
                            href: ''
                        }
                    })
                    s.setCloudDiskUsedForGroup(e.ke,{
                        amount : s.kilobyteToMegabyte(queryInfo.size),
                        storageType : 'whcs'
                    },'timelapseFrames')
                    s.purgeCloudDiskForGroup(e,'whcs','timelapseFrames')
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
        if(video.type !== 'whcs'){
            callback()
            return
        }
        if(!frameDetails.location){
            frameDetails.location = frame.href.split(locationUrl)[1]
        }
        deleteObject(e.ke,{
            Bucket: s.group[e.ke].init.whcs_bucket,
            Key: frameDetails.location,
        }).then((response) => {
            if (response.err){
                console.error('S3-Based Network Storage DELETE Error')
                console.error(err);
            }
            callback()
        });
    }
    async function onGetVideoData(video){
        const videoDetails = s.parseJSON(video.details)
        const saveLocation = videoDetails.location
        var fileStream = await getObject(video.ke,{
            Bucket: s.group[video.ke].init.whcs_bucket,
            Key: saveLocation,
        });
        return fileStream.Body
    }
    //S3-Based Network Storage
    s.addCloudUploader({
        name: 'whcs',
        loadGroupAppExtender: loadGroupApp,
        unloadGroupAppExtender: unloadGroupApp,
        insertCompletedVideoExtender: uploadVideo,
        deleteVideoFromCloudExtensions: deleteVideo,
        cloudDiskUseStartupExtensions: cloudDiskUseStartup,
        beforeAccountSave: beforeAccountSave,
        onAccountSave: cloudDiskUseStartup,
        onInsertTimelapseFrame: (() => {}) || onInsertTimelapseFrame,
        onDeleteTimelapseFrameFromCloud: (() => {}) || onDeleteTimelapseFrameFromCloud,
        onGetVideoData
    })
    //return fields that will appear in settings
    return {
       "evaluation": "details.use_whcs !== '0'",
       "name": lang["S3-Based Network Storage"],
       "color": "forestgreen",
       "uploaderId": 'whcs',
       "info": [
           {
              "name": "detail=whcs_save",
              "selector":"autosave_whcs",
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
               "field": lang['Endpoint Address'],
               "name": "detail=whcs_endpoint",
               "placeholder": "s3.wasabisys.com",
               "form-group-class": "autosave_whcs_input autosave_whcs_1",
               "form-group-class-pre-layer":"h_whcs_endpoint_input h_whcs_endpoint_"
           },
           {
              "hidden": true,
              "field": lang.Bucket,
              "name": "detail=whcs_bucket",
              "placeholder": "Example : slippery-seal",
              "form-group-class": "autosave_whcs_input autosave_whcs_1",
              "description": "",
              "default": "",
              "example": "",
              "possible": ""
           },
           {
               "hidden": true,
              "field": lang.aws_accessKeyId,
              "name": "detail=whcs_accessKeyId",
              "form-group-class": "autosave_whcs_input autosave_whcs_1",
              "description": "",
              "default": "",
              "example": "",
              "possible": ""
           },
           {
               "hidden": true,
              "name": "detail=whcs_secretAccessKey",
              "fieldType":"password",
              "placeholder": "",
              "field": lang.aws_secretAccessKey,
              "form-group-class":"autosave_whcs_input autosave_whcs_1",
              "description": "",
              "default": "",
              "example": "",
              "possible": ""
           },
           {
               "hidden": true,
              "name": "detail=whcs_region",
              "field": lang.Region,
              "fieldType": "select",
              "form-group-class":"autosave_whcs_input autosave_whcs_1",
              "description": "",
              "default": "",
              "example": "",
              "possible": [
                    {
                       "name": lang['No Region'],
                       "value": ""
                    },
                    {
                        "name": "US West (N. California)",
                        "value": "us-west-1"
                    },
                    {
                        "name": "US West (Oregon)",
                        "value": "us-west-2"
                    },
                    {
                        "name": "US East (Ohio)",
                        "value": "us-east-2"
                    },
                    {
                        "name": "US East (N. Virginia)",
                        "value": "us-east-1"
                    },
                    {
                        "name": "Canada (Central)",
                        "value": "ca-central-1"
                    },
                    {
                        "name": "South America (São Paulo)",
                        "value": "sa-east-1"
                    },
                    {
                        "name": "EU (Frankfurt)",
                        "value": "eu-central-1"
                    },
                    {
                        "name": "EU (Ireland)",
                        "value": "eu-west-1"
                    },
                    {
                        "name": "EU (London)",
                        "value": "eu-west-2"
                    },
                    {
                        "name": "EU (Paris)",
                        "value": "eu-west-3"
                    },
                    {
                        "name": "Europe (Milan)",
                        "value": "eu-south-1"
                    },
                    {
                        "name": "Europe (Spain)",
                        "value": "eu-south-2"
                    },
                    {
                        "name": "Europe (Zurich)",
                        "value": "eu-central-2"
                    },
                    {
                        "name": "Asia Pacific (Mumbai)",
                        "value": "ap-south-1"
                    },
                    {
                        "name": "Asia Pacific (Seoul)",
                        "value": "ap-northeast-2"
                    },
                    {
                        "name": "Asia Pacific (Osaka-Local)**",
                        "value": "ap-northeast-3"
                    },
                    {
                        "name": "Asia Pacific (Singapore)",
                        "value": "ap-southeast-1"
                    },
                    {
                        "name": "Asia Pacific (Sydney)",
                        "value": "ap-southeast-2"
                    },
                    {
                        "name": "Asia Pacific (Tokyo)",
                        "value": "ap-northeast-1"
                    },
                    {
                        "name": "Asia Pacific (Hong Kong)",
                        "value": "ap-east-1"
                    },
                    {
                        "name": "Asia Pacific (Hyderabad)",
                        "value": "ap-south-2"
                    },
                    {
                        "name": "Asia Pacific (Jakarta)",
                        "value": "ap-southeast-3"
                    },
                    {
                        "name": "Asia Pacific (Melbourne)",
                        "value": "ap-southeast-4"
                    },
                    {
                        "name": "China (Beijing)",
                        "value": "cn-north-1"
                    },
                    {
                        "name": "China (Ningxia)",
                        "value": "cn-northwest-1"
                    },
                    {
                        "name": "Africa (Cape Town)",
                        "value": "af-south-1"
                    },
                    {
                        "name": "Middle East (Bahrain)",
                        "value": "me-south-1"
                    },
                    {
                        "name": "Middle East (UAE)",
                        "value": "me-central-1"
                    },
                    {
                        "name": "il-central-1",
                        "value": "il-central-1"
                    }
               ]
          },
          {
              "hidden": true,
             "name": "detail=whcs_log",
             "field": lang['Save Links to Database'],
             "fieldType": "select",
             "selector": "h_whcssld",
             "form-group-class":"autosave_whcs_input autosave_whcs_1",
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
            "name": "detail=use_whcs_size_limit",
            "field": lang['Use Max Storage Amount'],
            "fieldType": "select",
            "selector": "h_whcszl",
            "form-group-class":"autosave_whcs_input autosave_whcs_1",
            "form-group-class-pre-layer":"h_whcssld_input h_whcssld_1",
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
            "name": "detail=whcs_size_limit",
            "field": lang['Max Storage Amount'],
            "form-group-class":"autosave_whcs_input autosave_whcs_1",
            "form-group-class-pre-layer":"h_whcssld_input h_whcssld_1",
            "description": "",
            "default": "10000",
            "example": "",
            "possible": ""
         },
         {
             "hidden": true,
            "name": "detail=whcs_dir",
            "field": lang['Save Directory'],
            "form-group-class":"autosave_whcs_input autosave_whcs_1",
            "description": "",
            "default": "/",
            "example": "",
            "possible": ""
         },
       ]
    }
}
