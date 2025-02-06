const fs = require('fs');
const { Readable } = require('stream');
const B2 = require('shinobi-backblaze-b2')
module.exports = function(s,config,lang){
    //Backblaze B2
    var serviceProvider = 'b2'
    var beforeAccountSaveForBackblazeB2 = function(d){
        //d = save event
        d.formDetails.b2_use_global=d.d.b2_use_global
        d.formDetails.use_bb_b2=d.d.use_bb_b2
    }
    var cloudDiskUseStartupForBackblazeB2 = function(group,userDetails){
        group.cloudDiskUse[serviceProvider].name = 'Backblaze B2'
        group.cloudDiskUse[serviceProvider].sizeLimitCheck = (userDetails.use_bb_b2_size_limit === '1')
        if(!userDetails.bb_b2_size_limit || userDetails.bb_b2_size_limit === ''){
            group.cloudDiskUse[serviceProvider].sizeLimit = 10000
        }else{
            group.cloudDiskUse[serviceProvider].sizeLimit = parseFloat(userDetails.bb_b2_size_limit)
        }
    }
    var loadBackblazeB2ForUser = function(e){
        var userDetails = JSON.parse(e.details);
        try{
            if(userDetails.b2_use_global === '1' && config.cloudUploaders && config.cloudUploaders.BackblazeB2){
                // {
                //     bb_b2_accountId: "",
                //     bb_b2_applicationKey: "",
                //     bb_b2_bucket: "",
                //     bb_b2_dir: "",
                // }
                userDetails = Object.assign(userDetails,config.cloudUploaders.BackblazeB2)
            }
            if(!s.group[e.ke].bb_b2 &&
               userDetails.bb_b2_accountId &&
               userDetails.bb_b2_accountId !=='' &&
               userDetails.bb_b2_applicationKey &&
               userDetails.bb_b2_applicationKey !=='' &&
               userDetails.bb_b2_bucket &&
               userDetails.bb_b2_bucket !== '' &&
               userDetails.bb_b2_save === '1'
              ){
                if(!userDetails.bb_b2_dir || userDetails.bb_b2_dir === '/'){
                  userDetails.bb_b2_dir = ''
                }
                if(userDetails.bb_b2_dir !== ''){
                  userDetails.bb_b2_dir = s.checkCorrectPathEnding(userDetails.bb_b2_dir)
                }
                var backblazeErr = function(err){
                    // console.log(err)
                    const msg = err.stack || err.data || err;
                    delete(msg.data)
                    s.userLog({mid:'$USER',ke:e.ke},{type:lang['Backblaze Error'],msg: msg})
                }
                async function createB2Connection(){
                    const b2 = new B2({
                        accountId: userDetails.bb_b2_accountId,
                        applicationKey: userDetails.bb_b2_applicationKey
                    });
                    const bucketName = userDetails.bb_b2_bucket
                    try{
                        const authResponse = await b2.authorize();
                        const getBucketResponse = await b2.getBucket({bucketName: bucketName})
                        const bucketId = getBucketResponse.data.buckets[0].bucketId
                        s.group[e.ke].bb_b2_bucketId = bucketId
                    }catch(err){
                        console.error('b2.authorize',err)
                        backblazeErr(err)
                    }
                    s.group[e.ke].bb_b2 = b2
                }
                createB2Connection()
                s.group[e.ke].bb_b2_refreshTimer = setInterval(createB2Connection,1000 * 60 * 60)
            }
        }catch(err){
            s.debugLog(err)
        }
    }
    var unloadBackblazeB2ForUser = function(user){
        s.group[user.ke].bb_b2 = null
        clearInterval(s.group[user.ke].bb_b2_refreshTimer)
    }
    var deleteVideoFromBackblazeB2 = function(e,video,callback){
        // e = user
        try{
            var videoDetails = JSON.parse(video.details)
        }catch(err){
            var videoDetails = video.details
        }
        if(video.type !== serviceProvider){
            callback()
            return
        }
        s.group[e.ke].bb_b2.deleteFileVersion({
            fileId: videoDetails.fileId,
            fileName: videoDetails.fileName
        }).then(function(resp){
            // console.log('deleteFileVersion',resp)
            callback()
        }).catch(function(err){
            console.log('deleteFileVersion',err)
            callback()
        })
    }
    var uploadVideoToBackblazeB2 = function(e,k){
        //e = video object
        //k = temporary values
        if(!k)k={};
        //cloud saver - Backblaze B2
        const theGroup = s.group[e.ke]
        if(theGroup.bb_b2 && theGroup.init.use_bb_b2 !== '0' && theGroup.init.bb_b2_save === '1'){
            function backblazeErr(err){
                delete(err.data)
                s.userLog({mid:'$USER',ke:e.ke},{type:lang['Backblaze Error'],msg:err})
                s.debugLog(err)
            }
            fs.readFile(k.dir+k.filename,function(err,data){
                var backblazeSavePath = theGroup.init.bb_b2_dir+e.ke+'/'+e.mid+'/'+k.filename
                var getUploadUrl = function(bucketId,callback){
                    theGroup.bb_b2.getUploadUrl(bucketId).then(function(resp){
                        callback(resp)
                    }).catch(backblazeErr)
                }
                getUploadUrl(theGroup.bb_b2_bucketId,function(req){
                    const uploadUrl = req.data.uploadUrl
                    const authorizationToken = req.data.authorizationToken
                    theGroup.bb_b2.uploadFile({
                        uploadUrl: uploadUrl,
                        uploadAuthToken: authorizationToken,
                        filename: backblazeSavePath,
                        data: data,
                        onUploadProgress: null
                    }).then(function(resp){
                        const uploadResponse = resp.data
                        if(theGroup.init.bb_b2_log === '1' && uploadResponse.fileId){
                            const insertDetails = {
                                bucketId : uploadResponse.bucketId,
                                fileId : uploadResponse.fileId,
                                fileName : uploadResponse.fileName
                            }
                            const insertQuery = {
                                mid: e.mid,
                                ke: e.ke,
                                time: k.startTime,
                                status: 1,
                                type : serviceProvider,
                                details: insertDetails,
                                size: k.filesize,
                                end: k.endTime,
                                href: ''
                            }
                            s.knexQuery({
                                action: "insert",
                                table: "Cloud Videos",
                                insert: Object.assign({},insertQuery,{details: s.s(insertDetails)})
                            })
                            s.setCloudDiskUsedForGroup(e.ke,{
                                amount : k.filesizeMB,
                                storageType : serviceProvider
                            })
                            s.purgeCloudDiskForGroup(e,serviceProvider)
                            s.onCloudVideoUploadedExtensions.forEach((extender) => {
                                extender(insertQuery)
                            })
                        }
                    }).catch(backblazeErr)
                })
            })
        }
    }
    function onGetVideoData(video){
        const videoDetails = s.parseJSON(video.details)
        const fileName = videoDetails.fileName
        const groupKey = video.ke
        const b2 = s.group[video.ke].bb_b2
        const bucketName = s.group[groupKey].init.bb_b2_bucket
        return new Promise((resolve, reject) => {
            b2.downloadFileByName({
                bucketName,
                fileName,
                responseType: 'stream',
                onDownloadProgress: (event) => {
                    s.debugLog(event)
                },
            }).then((response) => {
                const fileStream = Readable.from(response.data);
                resolve(fileStream)
            }).catch((err) => {
                s.debugLog(err)
                reject(err)
            });
        })
    }
    //backblaze b2
    s.addCloudUploader({
        name: serviceProvider,
        loadGroupAppExtender: loadBackblazeB2ForUser,
        unloadGroupAppExtender: unloadBackblazeB2ForUser,
        insertCompletedVideoExtender: uploadVideoToBackblazeB2,
        deleteVideoFromCloudExtensions: deleteVideoFromBackblazeB2,
        cloudDiskUseStartupExtensions: cloudDiskUseStartupForBackblazeB2,
        beforeAccountSave: beforeAccountSaveForBackblazeB2,
        onAccountSave: cloudDiskUseStartupForBackblazeB2,
        onGetVideoData,
    })
    return {
       "evaluation": "details.use_bb_b2 !== '0'",
       "name": lang["Backblaze B2"],
       "color": "forestgreen",
       "uploaderId": 'b2',
       "info": [
           {
              "name": "detail=bb_b2_save",
              "selector":"autosave_bb_b2",
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
              "field": lang['Bucket ID'],
              "name": "detail=bb_b2_bucket",
              "placeholder": "Example : slippery-seal",
              "form-group-class": "autosave_bb_b2_input autosave_bb_b2_1",
              "description": "",
              "default": "",
              "example": "",
              "possible": ""
           },
           {
               "hidden": true,
              "field": lang.keyId,
              "name": "detail=bb_b2_accountId",
              "form-group-class": "autosave_bb_b2_input autosave_bb_b2_1",
              "description": "",
              "default": "",
              "example": "",
              "possible": ""
           },
           {
               "hidden": true,
              "name": "detail=bb_b2_applicationKey",
              "fieldType":"password",
              "placeholder": "XXXXXXXXXXXXXXXXXXXXXXXX.XXXXXXXXXXXXXXX_XXXXXXXXXXXXXXXXXX",
              "field": lang.applicationKey,
              "form-group-class":"autosave_bb_b2_input autosave_bb_b2_1",
              "description": "",
              "default": "",
              "example": "",
              "possible": ""
           },
           {
               "hidden": true,
              "name": "detail=bb_b2_log",
              "field": lang['Save Links to Database'],
              "fieldType": "select",
              "selector": "h_b2sld",
              "form-group-class":"autosave_bb_b2_input autosave_bb_b2_1",
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
             "name": "detail=use_bb_b2_size_limit",
             "field": lang['Use Max Storage Amount'],
             "fieldType": "select",
             "selector": "h_b2zl",
             "form-group-class":"autosave_bb_b2_input autosave_bb_b2_1",
             "form-group-class-pre-layer":"h_b2sld_input h_b2sld_1",
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
             "name": "detail=bb_b2_size_limit",
             "field": lang['Max Storage Amount'],
             "form-group-class":"autosave_bb_b2_input autosave_bb_b2_1",
             "form-group-class-pre-layer":"h_b2sld_input h_b2sld_1",
             "description": "",
             "default": "10000",
             "example": "",
             "possible": ""
          },
          {
              "hidden": true,
             "name": "detail=bb_b2_dir",
             "field": lang['Save Directory'],
             "form-group-class":"autosave_bb_b2_input autosave_bb_b2_1",
             "description": "",
             "default": "/",
             "example": "",
             "possible": ""
          },
       ]
    }
}
