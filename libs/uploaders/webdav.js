var fs = require('fs');
module.exports = async function(s,config,lang){
    if(config.webDavUpload){
        try{
            const webdav = await import("webdav-fs");
            console.error('WARNING : WebDAV is enabled.')
            // WebDAV
            var beforeAccountSaveForWebDav = function(d){
                //d = save event
                d.formDetails.webdav_use_global=d.d.webdav_use_global
                d.formDetails.use_webdav=d.d.use_webdav
            }
            var cloudDiskUseStartupForWebDav = function(group,userDetails){
                group.cloudDiskUse['webdav'].name = 'WebDAV'
                group.cloudDiskUse['webdav'].sizeLimitCheck = (userDetails.use_webdav_size_limit === '1')
                if(!userDetails.webdav_size_limit || userDetails.webdav_size_limit === ''){
                    group.cloudDiskUse['webdav'].sizeLimit = 10000
                }else{
                    group.cloudDiskUse['webdav'].sizeLimit = parseFloat(userDetails.webdav_size_limit)
                }
            }
            var loadWebDavForUser = function(e){
                // e = user
                var userDetails = JSON.parse(e.details);
                if(userDetails.webdav_use_global === '1' && config.cloudUploaders && config.cloudUploaders.WebDAV){
                    // {
                    //     webdav_user: "",
                    //     webdav_pass: "",
                    //     webdav_url: "",
                    //     webdav_dir: "",
                    // }
                    userDetails = Object.assign(userDetails,config.cloudUploaders.WebDAV)
                }
                //owncloud/webdav
                if(!s.group[e.ke].webdav &&
                   userDetails.webdav_user&&
                   userDetails.webdav_user!==''&&
                   userDetails.webdav_pass&&
                   userDetails.webdav_pass!==''&&
                   userDetails.webdav_url&&
                   userDetails.webdav_url!==''
                  ){
                    if(!userDetails.webdav_dir||userDetails.webdav_dir===''){
                        userDetails.webdav_dir='/'
                    }
                    userDetails.webdav_dir = s.checkCorrectPathEnding(userDetails.webdav_dir)
                    s.group[e.ke].webdav = webdav.createAdapter(userDetails.webdav_url, {
                        username: userDetails.webdav_user,
                        password: userDetails.webdav_pass
                    })
                }
            }
            var unloadWebDavForUser = function(user){
                s.group[user.ke].webdav = null
            }
            var deleteVideoFromWebDav = function(groupKey,video,callback){
                // e = user
                try{
                    var videoDetails = JSON.parse(video.details)
                }catch(err){
                    var videoDetails = video.details
                }
                if(video.type !== 'webdav'){
                    callback()
                    return
                }
                if(!videoDetails.location){
                    var prefix = s.addUserPassToUrl(s.checkCorrectPathEnding(s.group[groupKey].init.webdav_url),s.group[groupKey].init.webdav_user,s.group[groupKey].init.webdav_pass)
                    videoDetails.location = video.href.replace(prefix,'')
                }
                s.group[groupKey].webdav.unlink(videoDetails.location, function(err) {
                    if (err) console.log(videoDetails.location,err)
                    callback()
                })
            }
            var uploadVideoToWebDav = function(e,k){
                //e = video object
                //k = temporary values
                if(!k)k={};
                //cloud saver - webdav
               var wfs = s.group[e.ke].webdav
               if(wfs && s.group[e.ke].init.use_webdav !== '0' && s.group[e.ke].init.webdav_save === "1"){
                   var webdavUploadDir = s.group[e.ke].init.webdav_dir+e.ke+'/'+e.mid+'/'
                   var startWebDavUpload = function(){
                       s.group[e.ke].activeMonitors[e.id].webdavDirExist = true
                       var wfsWriteStream =
                       fs.createReadStream(k.dir + k.filename).pipe(wfs.createWriteStream(webdavUploadDir + k.filename))
                       if(s.group[e.ke].init.webdav_log === '1'){
                           var webdavRemoteUrl = s.addUserPassToUrl(s.checkCorrectPathEnding(s.group[e.ke].init.webdav_url),s.group[e.ke].init.webdav_user,s.group[e.ke].init.webdav_pass) + s.group[e.ke].init.webdav_dir + e.ke + '/'+e.mid+'/'+k.filename
                           s.knexQuery({
                               action: "insert",
                               table: "Cloud Videos",
                               insert: {
                                   mid: e.mid,
                                   ke: e.ke,
                                   time: k.startTime,
                                   status: 1,
                                   type : 'webdav',
                                   details: s.s({
                                       location : webdavUploadDir + k.filename
                                   }),
                                   size: k.filesize,
                                   end: k.endTime,
                                   href: ''
                               }
                           })
                           s.setCloudDiskUsedForGroup(e.ke,{
                               amount: k.filesizeMB,
                               storageType: 'webdav'
                           })
                           s.purgeCloudDiskForGroup(e,'webdav')
                       }
                   }
                   if(s.group[e.ke].activeMonitors[e.id].webdavDirExist !== true){
                       //check if webdav dir exist
                       var parentPoint = 0
                       var webDavParentz = webdavUploadDir.split('/')
                       var webDavParents = []
                       webDavParentz.forEach(function(v){
                           if(v && v !== '')webDavParents.push(v)
                       })
                       var stitchPieces = './'
                       var lastParentCheck = function(){
                           ++parentPoint
                           if(parentPoint === webDavParents.length){
                               startWebDavUpload()
                           }
                           checkPathPiece(webDavParents[parentPoint])
                       }
                       var checkPathPiece = function(pathPiece){
                           if(pathPiece && pathPiece !== ''){
                               stitchPieces += pathPiece + '/'
                               wfs.stat(stitchPieces, function(error, stats) {
                                   if(error){
                                       reply = {
                                           status : error.status,
                                           msg : lang.WebdavErrorTextTryCreatingDir,
                                           dir : stitchPieces,
                                       }
                                       s.userLog(e,{type:lang['Webdav Error'],msg:reply})
                                       wfs.mkdir(stitchPieces, function(error) {
                                           if(error){
                                               reply = {
                                                   status : error.status,
                                                   msg : lang.WebdavErrorTextCreatingDir,
                                                   dir : stitchPieces,
                                               }
                                               s.userLog(e,{type:lang['Webdav Error'],msg:reply})
                                           }else{
                                               lastParentCheck()
                                           }
                                       })
                                   }else{
                                       lastParentCheck()
                                   }
                               })
                           }else{
                               ++parentPoint
                           }
                       }
                       checkPathPiece(webDavParents[0])
                   }else{
                       startWebDavUpload()
                   }
               }
            }
            function onInsertTimelapseFrame(monitorObject,queryInfo,filePath){
                var e = monitorObject
                if(s.group[e.ke].webdav && s.group[e.ke].init.use_webdav !== '0' && s.group[e.ke].init.webdav_save === '1'){
                    const wfs = s.group[e.ke].webdav
                    const saveLocation = s.group[e.ke].init.webdav_dir+e.ke+'/'+e.mid+'_timelapse/' + queryInfo.filename
                    fs.createReadStream(filePath).pipe(wfs.createWriteStream(saveLocation))
                    if(s.group[e.ke].init.webdav_log === '1'){
                        s.knexQuery({
                            action: "insert",
                            table: "Cloud Timelapse Frames",
                            insert: {
                                mid: queryInfo.mid,
                                ke: queryInfo.ke,
                                time: queryInfo.time,
                                filename: queryInfo.filename,
                                type : 'webdav',
                                details: s.s({
                                    location : saveLocation
                                }),
                                size: queryInfo.size,
                                href: ''
                            }
                        })
                        s.setCloudDiskUsedForGroup(e.ke,{
                            amount : s.kilobyteToMegabyte(queryInfo.size),
                            storageType : 'webdav'
                        },'timelapseFrames')
                        s.purgeCloudDiskForGroup(e,'webdav','timelapseFrames')
                    }
                }
            }
            function onDeleteTimelapseFrameFromCloud(e,frame,callback){
                // e = user
                try{
                    var frameDetails = JSON.parse(frame.details)
                }catch(err){
                    var frameDetails = frame.details
                }
                if(frame.type !== 'webdav'){
                    callback()
                    return
                }
                if(!frameDetails.location){
                    frameDetails.location = frame.href.split(locationUrl)[1]
                }
                s.group[e.ke].webdav.unlink(frameDetails.location, function(err) {
                    if (err) console.log(frameDetails.location,err)
                    callback()
                })
            }
            async function onGetVideoData(video){
                const wfs = s.group[video.ke].webdav
                const videoDetails = s.parseJSON(video.details)
                const saveLocation = videoDetails.location
                const fileStream = wfs.createReadStream(saveLocation);
                return fileStream
            }
            //webdav
            s.addCloudUploader({
                name: 'webdav',
                loadGroupAppExtender: loadWebDavForUser,
                unloadGroupAppExtender: unloadWebDavForUser,
                insertCompletedVideoExtender: uploadVideoToWebDav,
                deleteVideoFromCloudExtensions: deleteVideoFromWebDav,
                cloudDiskUseStartupExtensions: cloudDiskUseStartupForWebDav,
                beforeAccountSave: beforeAccountSaveForWebDav,
                onAccountSave: cloudDiskUseStartupForWebDav,
                onInsertTimelapseFrame: () => {},
                onDeleteTimelapseFrameFromCloud: () => {},
                onGetVideoData
            })
            return {
               "evaluation": "details.use_webdav !== '0'",
               "name": lang.WebDAV,
               "color": "forestgreen",
               "uploaderId": 'webdav',
               "info": [
                   {
                      "name": "detail=webdav_save",
                      "selector":"autosave_webdav",
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
                      "field": lang.URL,
                      "name": "detail=webdav_url",
                      "form-group-class": "autosave_webdav_input autosave_webdav_1",
                      "description": "",
                      "default": "",
                      "example": "",
                      "possible": ""
                   },
                   {
                      "hidden": true,
                      "field": lang.Username,
                      "name": "detail=webdav_user",
                      "form-group-class": "autosave_webdav_input autosave_webdav_1",
                      "description": "",
                      "default": "",
                      "example": "",
                      "possible": ""
                  },
                   {
                       "hidden": true,
                      "field": lang.Password,
                      "fieldType": "password",
                      "name": "detail=webdav_pass",
                      "form-group-class": "autosave_webdav_input autosave_webdav_1",
                      "description": "",
                      "default": "",
                      "example": "",
                      "possible": ""
                  },
                  {
                      "hidden": true,
                     "name": "detail=webdav_log",
                     "field": lang['Save Links to Database'],
                     "fieldType": "select",
                     "selector": "h_webdavsld",
                     "form-group-class":"autosave_webdav_input autosave_webdav_1",
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
                    "name": "detail=use_webdav_size_limit",
                    "field": lang['Use Max Storage Amount'],
                    "fieldType": "select",
                    "selector": "h_webdavzl",
                    "form-group-class":"autosave_webdav_input autosave_webdav_1",
                    "form-group-class-pre-layer":"h_webdavsld_input h_webdavsld_1",
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
                    "name": "detail=webdav_size_limit",
                    "field": lang['Max Storage Amount'],
                    "form-group-class":"autosave_webdav_input autosave_webdav_1",
                    "form-group-class-pre-layer":"h_webdavsld_input h_webdavsld_1",
                    "description": "",
                    "default": "10000",
                    "example": "",
                    "possible": ""
                 },
                 {
                     "hidden": true,
                    "name": "detail=webdav_dir",
                    "field": lang['Save Directory'],
                    "form-group-class":"autosave_webdav_input autosave_webdav_1",
                    "description": "",
                    "default": "/",
                    "example": "",
                    "possible": ""
                 },
               ]
            }
        }catch(err){
            console.error(err.message)
            console.error('Could not start WebDAV Uploader, please run "npm install webdav-fs" inside the Shinobi folder.')
            console.error('The webdav-fs Module is known to have possible vulnerabilities. Due to the nature of the vulnerability you should be unaffected unless Shinobi is public facing. Use at your own risk.')
        }
    }else{
        try{
            const webdav = await import("webdav-fs");
            console.error('!! Looks like you have webdav-fs installed but its not enabled. Due to a vulnerability with it you now need to add "webDavUpload": true to your conf.json to enable it.')
        }catch(err){

        }
    }
}
