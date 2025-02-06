var fs = require('fs');
const {google} = require('googleapis');
module.exports = (s,config,lang,app,io) => {
    const initializeOAuth = (credentials) => {
        const creds = s.parseJSON(credentials)
        if(!creds || !creds.installed)return;
        const {client_secret, client_id, redirect_uris} = creds.installed;
        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
        return oAuth2Client
    }
    const getVideoDirectoryId = (video) => {
        return new Promise((resolve, reject) => {
            const videoDirectory = s.group[video.ke].init.googd_dir + video.ke + '/' + video.mid
            if(!s.group[video.ke].googleDriveFolderIds[video.ke + video.mid]){
                var pageToken = null;
                s.group[video.ke].googleDrive.files.list({
                  q: `name='${videoDirectory}'`,
                  fields: 'nextPageToken, files(id, name)',
                  spaces: 'drive',
                  pageToken: pageToken
                }, function (err, res) {
                  if (err) {
                      reject(err)
                  } else {
                      var file = res.data.files
                      if(file[0]){
                          file = file[0]
                          s.group[video.ke].googleDriveFolderIds[video.ke + video.mid] = file.id
                          resolve(file.id)
                      }else{
                          s.group[video.ke].googleDrive.files.create({
                            resource: {
                              'name': videoDirectory,
                              'mimeType': 'application/vnd.google-apps.folder'
                            },
                            fields: 'id'
                          }, function (err, response) {
                            if (err) {
                              reject(err)
                            } else {
                                s.group[video.ke].googleDriveFolderIds[video.ke + video.mid] = response.data.id
                                resolve(response.data.id)
                            }
                          })
                      }
                  }
                })
            }else{
                resolve(s.group[video.ke].googleDriveFolderIds[video.ke + video.mid])
            }

        })
    }
    //Google Drive Storage
    var beforeAccountSaveForGoogleDrive = function(d){
        //d = save event
        d.formDetails.googd_use_global = d.d.googd_use_global
        d.formDetails.use_googd = d.d.use_googd
    }
    var cloudDiskUseStartupForGoogleDrive = function(group,userDetails){
        group.cloudDiskUse['googd'].name = 'Google Drive Storage'
        group.cloudDiskUse['googd'].sizeLimitCheck = (userDetails.use_googd_size_limit === '1')
        if(!userDetails.googd_size_limit || userDetails.googd_size_limit === ''){
            group.cloudDiskUse['googd'].sizeLimit = 10000
        }else{
            group.cloudDiskUse['googd'].sizeLimit = parseFloat(userDetails.googd_size_limit)
        }
    }
    var loadGoogleDriveForUser = async function(e){
        // e = user
        var userDetails = JSON.parse(e.details)
        if(userDetails.googd_use_global === '1' && config.cloudUploaders && config.cloudUploaders.GoogleDrive){
            // {
            //     googd_accessKeyId: "",
            //     googd_secretAccessKey: "",
            //     googd_region: "",
            //     googd_bucket: "",
            //     googd_dir: "",
            // }
            userDetails = Object.assign(userDetails,config.cloudUploaders.GoogleDrive)
        }
        if(userDetails.googd_save === '1'){
            s.group[e.ke].googleDriveFolderIds = {}
            var oAuth2Client
            if(!s.group[e.ke].googleDriveOAuth2Client){
                oAuth2Client = initializeOAuth(userDetails.googd_credentials)
                s.group[e.ke].googleDriveOAuth2Client = oAuth2Client
            }else{
                oAuth2Client = s.group[e.ke].googleDriveOAuth2Client
            }
            if(userDetails.googd_code && userDetails.googd_code !== 'Authorized. Token Set.' && userDetails.googd_code !== '***************' && !s.group[e.ke].googleDrive){
                oAuth2Client.getToken(userDetails.googd_code, (err, token) => {
                    if (err) return console.error('Error retrieving access token', err)
                    oAuth2Client.setCredentials(token)
                    s.accountSettingsEdit({
                        ke: e.ke,
                        uid: e.uid,
                        form: {
                            details: JSON.stringify(Object.assign(userDetails,{
                                googd_code: '***************',
                                googd_token: token,
                            }))
                        },
                    },true)
                })
            }else if(userDetails.googd_token && !s.group[e.ke].googleDrive){
                oAuth2Client.setCredentials(userDetails.googd_token)
                const auth = oAuth2Client
                const drive = google.drive({version: 'v3', auth});
                s.group[e.ke].googleDrive = drive
            }
        }
    }
    var unloadGoogleDriveForUser = function(user){
        s.group[user.ke].googleDrive = null
        s.group[user.ke].googleDriveOAuth2Client = null
    }
    var deleteVideoFromGoogleDrive = function(e,video,callback){
        // e = user
        const groupKey = e.ke
        var videoDetails = s.parseJSON(video.details)
        if(video.type !== 'googd'){
            callback()
            return
        }
        s.group[groupKey].googleDrive.files.delete({
            fileId: videoDetails.id
        }, function(err, resp){
            if (err) {
                console.log('Error code:', err.code)
            } else {
                // console.log('Successfully deleted', file);
            }
            callback()
        })
    }
    var uploadVideoToGoogleDrive = async function(e,k){
        //e = video object
        //k = temporary values
        if(!k)k={};
        //cloud saver - Google Drive Storage
        if(s.group[e.ke].googleDrive && s.group[e.ke].init.use_googd !== '0' && s.group[e.ke].init.googd_save === '1'){
            var ext = k.filename.split('.')
            ext = ext[ext.length - 1]
            var fileStream = fs.createReadStream(k.dir+k.filename);
            fileStream.on('error', function (err) {
                console.error(err)
            })
            var bucketName = s.group[e.ke].init.googd_bucket
            var saveLocation = s.group[e.ke].init.googd_dir+e.ke+'/'+e.mid+'/'+k.filename
            s.group[e.ke].googleDrive.files.create({
                  requestBody: {
                    name: k.filename,
                    parents: [await getVideoDirectoryId(e)],
                    mimeType: 'video/'+ext
                  },
                  media: {
                    mimeType: 'video/'+ext,
                    body: fileStream
                  }
              }).then(function(response){
                  const data = response.data

                    if(s.group[e.ke].init.googd_log === '1' && data && data.id){
                        s.knexQuery({
                            action: "insert",
                            table: "Cloud Videos",
                            insert: {
                                mid: e.mid,
                                ke: e.ke,
                                time: k.startTime,
                                status: 1,
                                type: 'googd',
                                details: s.s({
                                    id: data.id
                                }),
                                size: k.filesize,
                                end: k.endTime,
                                href: ''
                            }
                        })
                        s.setCloudDiskUsedForGroup(e.ke,{
                            amount : k.filesizeMB,
                            storageType : 'googd'
                        })
                        s.purgeCloudDiskForGroup(e,'googd')
                    }
                }).catch((err) => {
                    if(err){
                        s.userLog(e,{type:lang['Google Drive Storage Upload Error'],msg:err})
                    }
                    console.log(err)
                })
        }
    }
    var onInsertTimelapseFrame = function(monitorObject,queryInfo,filePath){
        var e = monitorObject
        if(s.group[e.ke].googd && s.group[e.ke].init.use_googd !== '0' && s.group[e.ke].init.googd_save === '1'){
            var fileStream = fs.createReadStream(filePath)
            fileStream.on('error', function (err) {
                console.error(err)
            })
            var saveLocation = s.group[e.ke].init.googd_dir + e.ke + '/' + e.mid + '_timelapse/' + queryInfo.filename
            s.group[e.ke].googleDrive.files.create({
                  requestBody: {
                    name: saveLocation,
                    mimeType: 'image/jpeg'
                  },
                  media: {
                    mimeType: 'image/jpeg',
                    body: fileStream
                  }
              }).then(function(response){
                  const data = response.data
                if(err){
                    s.userLog(e,{type:lang['Google Drive Storage Upload Error'],msg:err})
                }
                if(s.group[e.ke].init.googd_log === '1' && data && data.id){
                    s.knexQuery({
                        action: "insert",
                        table: "Cloud Timelapse Frames",
                        insert: {
                            mid: queryInfo.mid,
                            ke: queryInfo.ke,
                            time: queryInfo.time,
                            type : 'googd',
                            details: s.s({
                                id : data.id,
                            }),
                            size: queryInfo.size,
                            href: ''
                        }
                    })
                    s.setCloudDiskUsedForGroup(e.ke,{
                        amount : s.kilobyteToMegabyte(queryInfo.size),
                        storageType : 'googd'
                    },'timelapseFrames')
                    s.purgeCloudDiskForGroup(e,'googd','timelapseFrames')
                }
            })
        }
    }
    var onDeleteTimelapseFrameFromCloud = function(e,frame,callback){
        // e = user
        var frameDetails = s.parseJSON(frame.details)
        if(frame.type !== 'googd'){
            return
        }
        s.group[e.ke].googleDrive.files.delete({
            fileId: frameDetails.id
        }, function(err, resp){
            if (err) console.log(err);
            callback()
        });
    }
    var onGetVideoData = async (video) => {
        // e = user
        var videoDetails = s.parseJSON(video.details)
        const fileId = videoDetails.id
        return new Promise((resolve, reject) => {
            s.group[video.ke].googleDrive.files
                .get({fileId, alt: 'media'}, {responseType: 'stream'})
                .then(res => {
                    resolve(res.data)
                }).catch(reject)
        })
    }
    //
    app.get([config.webPaths.apiPrefix+':auth/googleDriveOAuthRequest/:ke'], (req,res) => {
        s.auth(req.params,async (user) => {
            var response = {ok: false}
            var oAuth2Client = s.group[req.params.ke].googleDriveOAuth2Client
            if(!oAuth2Client){
                oAuth2Client = initializeOAuth(s.group[req.params.ke].googd_credentials)
                s.group[req.params.ke].googleDriveOAuth2Client = oAuth2Client
            }
            if(oAuth2Client){
                const authUrl = oAuth2Client.generateAuthUrl({
                    access_type: 'offline',
                    scope: ['https://www.googleapis.com/auth/drive.file'],
                })
                response.ok = true
                response.authUrl = authUrl
            }
            s.closeJsonResponse(res,response)
        })
    });
    //wasabi
    s.addCloudUploader({
        name: 'googd',
        loadGroupAppExtender: loadGoogleDriveForUser,
        unloadGroupAppExtender: unloadGoogleDriveForUser,
        insertCompletedVideoExtender: uploadVideoToGoogleDrive,
        deleteVideoFromCloudExtensions: deleteVideoFromGoogleDrive,
        cloudDiskUseStartupExtensions: cloudDiskUseStartupForGoogleDrive,
        beforeAccountSave: beforeAccountSaveForGoogleDrive,
        onAccountSave: cloudDiskUseStartupForGoogleDrive,
        onInsertTimelapseFrame: (() => {}) || onInsertTimelapseFrame,
        onDeleteTimelapseFrameFromCloud: (() => {}) || onDeleteTimelapseFrameFromCloud,
        onGetVideoData: onGetVideoData
    })
    return {
       "evaluation": "details.use_googd !== '0'",
       "name": lang["Google Drive"],
       "color": "forestgreen",
       "uploaderId": 'googd',
       "info": [
           {
              "name": "detail=googd_save",
              "selector":"autosave_googd",
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
              "field": lang['OAuth Credentials'],
              "name": "detail=googd_credentials",
              "form-group-class": "autosave_googd_input autosave_googd_1",
              "description": "",
              "default": "",
              "example": "",
              "possible": ""
           },
           {
               "hidden": true,
              "fieldType": "btn",
              "attribute": `style="margin-bottom:1em" href="javascript:$.get(getApiPrefix() + '/googleDriveOAuthRequest/' + $user.ke,function(data){window.open(data.ok ? data.authUrl : 'https://hub.shinobi.video/articles/view/oEIDEGXLlzmSsCk', 'Google Drive', 'width=800,height=400');})"`,
              "class": `btn-success`,
              "form-group-class": "autosave_googd_input autosave_googd_1",
              "btnContent": `<i class="fa fa-plus"></i> &nbsp; ${lang['Get Code']}`,
           },
           {
              "hidden": true,
              "field": lang['OAuth Code'],
              "name": "detail=googd_code",
              "form-group-class": "autosave_googd_input autosave_googd_1",
              "description": "",
              "default": "",
              "example": "",
              "possible": ""
           },
           {
             "hidden": true,
             "name": "detail=googd_log",
             "field": lang['Save Links to Database'],
             "fieldType": "select",
             "selector": "h_googdsld",
             "form-group-class":"autosave_googd_input autosave_googd_1",
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
            "name": "detail=use_googd_size_limit",
            "field": lang['Use Max Storage Amount'],
            "fieldType": "select",
            "selector": "h_googdzl",
            "form-group-class":"autosave_googd_input autosave_googd_1",
            "form-group-class-pre-layer":"h_googdsld_input h_googdsld_1",
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
            "name": "detail=googd_size_limit",
            "field": lang['Max Storage Amount'],
            "form-group-class":"autosave_googd_input autosave_googd_1",
            "form-group-class-pre-layer":"h_googdsld_input h_googdsld_1",
            "description": "",
            "default": "10000",
            "example": "",
            "possible": ""
         },
         {
             "hidden": true,
            "name": "detail=googd_dir",
            "field": lang['Save Directory'],
            "form-group-class":"autosave_googd_input autosave_googd_1",
            "description": "",
            "default": "/",
            "example": "",
            "possible": ""
         },
       ]
    }
}
