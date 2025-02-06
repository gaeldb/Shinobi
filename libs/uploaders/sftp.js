var fs = require('fs');
const { NodeSSH } = require('node-ssh');
module.exports = function(s,config,lang){
    //SFTP
    var sftpErr = function(groupKey,err){
        s.userLog({mid:'$USER',ke:groupKey},{type:lang['SFTP Error'],msg:err.data || err})
    }
    var beforeAccountSaveForSftp = function(d){
        //d = save event
        d.formDetails.use_sftp = d.d.use_sftp
    }
    var loadSftpForUser = function(e){
        // e = user
        var userDetails = JSON.parse(e.details);
        //SFTP
        if(!s.group[e.ke].sftp &&
            !s.group[e.ke].sftp &&
            userDetails.sftp !== '0' &&
            userDetails.sftp_save === '1' &&
            userDetails.sftp_host &&
            userDetails.sftp_host !== ''&&
            userDetails.sftp_port &&
            userDetails.sftp_port !== ''
          ){
            if(!userDetails.sftp_dir || userDetails.sftp_dir === '/'){
                userDetails.sftp_dir = ''
            }
            if(userDetails.sftp_dir !== ''){
                userDetails.sftp_dir = s.checkCorrectPathEnding(userDetails.sftp_dir)
            }
            const sftp = new NodeSSH();
            const connectionDetails = {
                host: userDetails.sftp_host,
                port: userDetails.sftp_port || 22,
            }
            if(userDetails.sftp_username && userDetails.sftp_username !== '')connectionDetails.username = userDetails.sftp_username
            if(userDetails.sftp_password && userDetails.sftp_password !== '')connectionDetails.password = userDetails.sftp_password
            if(userDetails.sftp_privateKey && userDetails.sftp_privateKey !== '')connectionDetails.privateKey = userDetails.sftp_privateKey
            sftp.connect(connectionDetails).catch((err) => {
                sftpErr(e.ke,err)
            })
            s.group[e.ke].sftp = sftp
        }
    }
    var unloadSftpForUser = function(user){
        if(s.group[user.ke].sftp && s.group[user.ke].sftp.end)s.group[user.ke].sftp.end().then(function(){
            s.group[user.ke].sftp = null
        })
    }
    var uploadVideoToSftp = function(e,k){
        //e = video object
        //k = temporary values
        if(!k)k={};
        //cloud saver - SFTP
        if(s.group[e.ke].sftp && s.group[e.ke].init.use_sftp !== '0' && s.group[e.ke].init.sftp_save === '1'){
            var localPath = k.dir + k.filename
            var saveLocation = s.group[e.ke].init.sftp_dir + e.ke + '/' + e.mid + '/' + k.filename
            s.group[e.ke].sftp.putFile(localPath, saveLocation).catch((err) => {
                sftpErr(e.ke,err)
            })
        }
    }
    var createSftpDirectory = function(monitorConfig){
        var monitorSaveDirectory = s.group[monitorConfig.ke].init.sftp_dir + monitorConfig.ke + '/' + monitorConfig.mid
        s.group[monitorConfig.ke].sftp.mkdir(monitorSaveDirectory, true).catch(function(err){
            if(err.code !== 'ERR_ASSERTION'){
                sftpErr(monitorConfig.ke,err)
            }
        })
    }
    var onMonitorSaveForSftp = function(monitorConfig){
        if(s.group[monitorConfig.ke].sftp && s.group[monitorConfig.ke].init.use_sftp !== '0' && s.group[monitorConfig.ke].init.sftp_save === '1'){
            createSftpDirectory(monitorConfig)
        }
    }
    var onAccountSaveForSftp = function(group,userDetails,user){
        if(s.group[user.ke] && s.group[user.ke].sftp && s.group[user.ke].init.use_sftp !== '0' && s.group[user.ke].init.sftp_save === '1'){
            Object.keys(s.group[user.ke].rawMonitorConfigurations).forEach(function(monitorId){
                createSftpDirectory(s.group[user.ke].rawMonitorConfigurations[monitorId])
            })
        }
    }
    //SFTP (Simple Uploader)
    s.addSimpleUploader({
        name: 'sftp',
        loadGroupAppExtender: loadSftpForUser,
        unloadGroupAppExtender: unloadSftpForUser,
        insertCompletedVideoExtender: uploadVideoToSftp,
        beforeAccountSave: beforeAccountSaveForSftp,
        onAccountSave: onAccountSaveForSftp,
        onMonitorSave: onMonitorSaveForSftp,
    })
    return {
       "evaluation": "details.use_sftp !== '0'",
       "name": lang['SFTP (SSH File Transfer)'],
       "color": "forestgreen",
       "uploaderId": 'sftp',
       "simpleUploader": true,
       "info": [
           {
              "name": "detail=sftp_save",
              "selector":"autosave_sftp",
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
              "field": lang.Host,
              "name": "detail=sftp_host",
              "form-group-class": "autosave_sftp_input autosave_sftp_1",
              "description": "",
              "default": "",
              "example": "",
              "possible": ""
           },
           {
               "hidden": true,
              "field": lang.Port,
              "name": "detail=sftp_port",
              "form-group-class": "autosave_sftp_input autosave_sftp_1",
              "description": "",
              "default": "",
              "example": "",
              "possible": ""
          },
           {
               "hidden": true,
              "field": lang.Username,
              "name": "detail=sftp_username",
              "form-group-class": "autosave_sftp_input autosave_sftp_1",
              "description": "",
              "default": "",
              "example": "",
              "possible": ""
          },
           {
               "hidden": true,
              "field": lang.Password,
              "fieldType": "password",
              "name": "detail=sftp_password",
              "form-group-class": "autosave_sftp_input autosave_sftp_1",
              "description": "",
              "default": "",
              "example": "",
              "possible": ""
          },
           {
               "hidden": true,
              "field": lang.privateKey,
              "fieldType": "textarea",
              "name": "detail=sftp_privateKey",
              "form-group-class": "autosave_sftp_input autosave_sftp_1",
              "description": "",
              "default": "",
              "example": "",
              "possible": ""
          },
          {
              "hidden": true,
             "name": "detail=sftp_dir",
             "field": lang['Save Directory'],
             "form-group-class":"autosave_sftp_input autosave_sftp_1",
             "description": "",
             "default": "/",
             "example": "",
             "possible": ""
          },
       ]
    }
}
