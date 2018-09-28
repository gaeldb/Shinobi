var fs = require('fs');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
module.exports = function(s,config){
    s.video=function(x,e,k){
        if(!e){e={}};
        switch(x){
            case'getDir':
                if(e.mid&&!e.id){e.id=e.mid};
                if(e.details&&(e.details instanceof Object)===false){
                    try{e.details=JSON.parse(e.details)}catch(err){}
                }
                if(e.details&&e.details.dir&&e.details.dir!==''){
                    return s.checkCorrectPathEnding(e.details.dir)+e.ke+'/'+e.id+'/'
                }else{
                    return s.dir.videos+e.ke+'/'+e.id+'/';
                }
            break;
        }
        if(!k)k={};
        if(x!=='getDir'){e.dir=s.video('getDir',e)}
        switch(x){
            case'fix':
                e.sdir=s.dir.streams+e.ke+'/'+e.id+'/';
                if(!e.filename&&e.time){e.filename=s.formattedTime(e.time)}
                if(e.filename.indexOf('.')===-1){
                    e.filename=e.filename+'.'+e.ext
                }
                s.tx({f:'video_fix_start',mid:e.mid,ke:e.ke,filename:e.filename},'GRP_'+e.ke)
                s.group[e.ke].mon[e.id].fixingVideos[e.filename]={}
                switch(e.ext){
                    case'mp4':
                        e.fixFlags='-vcodec libx264 -acodec aac -strict -2';
                    break;
                    case'webm':
                        e.fixFlags='-vcodec libvpx -acodec libvorbis';
                    break;
                }
                e.spawn=spawn(config.ffmpegDir,('-i '+e.dir+e.filename+' '+e.fixFlags+' '+e.sdir+e.filename).split(' '),{detached: true})
                e.spawn.stdout.on('data',function(data){
                    s.tx({f:'video_fix_data',mid:e.mid,ke:e.ke,filename:e.filename},'GRP_'+e.ke)
                });
                e.spawn.on('close',function(data){
                    exec('mv '+e.dir+e.filename+' '+e.sdir+e.filename,{detached: true}).on('exit',function(){
                        s.tx({f:'video_fix_success',mid:e.mid,ke:e.ke,filename:e.filename},'GRP_'+e.ke)
                        delete(s.group[e.ke].mon[e.id].fixingVideos[e.filename]);
                    })
                });
            break;
            case'delete':
                if(!e.filename && e.time){
                    e.filename = s.formattedTime(e.time)
                }
                var filename,
                    time
                if(e.filename.indexOf('.')>-1){
                    filename = e.filename
                }else{
                    filename = e.filename+'.'+e.ext
                }
                if(e.filename && !e.time){
                    time = s.nameToTime(filename)
                }else{
                    time = e.time
                }
                time = new Date(time)
                e.save=[e.id,e.ke,time];
                s.sqlQuery('SELECT * FROM Videos WHERE `mid`=? AND `ke`=? AND `time`=?',e.save,function(err,r){
                    if(r&&r[0]){
                        r=r[0]
                        var dir=s.video('getDir',r)
                        s.sqlQuery('DELETE FROM Videos WHERE `mid`=? AND `ke`=? AND `time`=?',e.save,function(){
                            fs.stat(dir+filename,function(err,file){
                                if(err){
                                    s.systemLog('File Delete Error : '+e.ke+' : '+' : '+e.mid,err)
                                }
                                s.init('diskUsedSet',e,-(r.size/1000000))
                            })
                            s.tx({f:'video_delete',filename:filename,mid:e.mid,ke:e.ke,time:s.nameToTime(filename),end:s.formattedTime(new Date,'YYYY-MM-DD HH:mm:ss')},'GRP_'+e.ke);
                            s.file('delete',dir+filename)
                        })
                    }else{
    //                    console.log('Delete Failed',e)
    //                    console.error(err)
                    }
                })
            break;
            case'deleteFromCloud':
                s.sqlQuery('DELETE FROM `Cloud Videos` WHERE `mid`=? AND `ke`=? AND `time`=?',[e.id,e.ke,new Date(e.time)],function(){
                    s.tx({f:'video_delete_cloud',mid:e.mid,ke:e.ke,time:e.time,end:e.end},'GRP_'+e.ke);
                })
            break;
    //        case'open':
    //            //on video open
    //            e.save=[e.id,e.ke,s.nameToTime(e.filename),e.ext];
    //            if(!e.status){e.save.push(0)}else{e.save.push(e.status)}
    //            k.details={}
    //            if(e.details&&e.details.dir&&e.details.dir!==''){
    //                k.details.dir=e.details.dir
    //            }
    //            e.save.push(s.s(k.details))
    //            s.sqlQuery('INSERT INTO Videos (mid,ke,time,ext,status,details) VALUES (?,?,?,?,?,?)',e.save)
    //            s.tx({f:'video_build_start',filename:e.filename+'.'+e.ext,mid:e.id,ke:e.ke,time:s.nameToTime(e.filename),end:s.formattedTime(new Date,'YYYY-MM-DD HH:mm:ss')},'GRP_'+e.ke);
    //        break;
    //        case'close':
    //            //video function : close
    //            if(s.group[e.ke]&&s.group[e.ke].mon[e.id]){
    //                if(s.group[e.ke].mon[e.id].open&&!e.filename){
    //                    e.filename=s.group[e.ke].mon[e.id].open;
    //                    e.ext=s.group[e.ke].mon[e.id].open_ext
    //                }
    //                if(s.group[e.ke].mon[e.id].childNode){
    //                    s.cx({f:'close',d:s.init('noReference',e)},s.group[e.ke].mon[e.id].childNodeId);
    //                }else{
    //                    k.file = e.filename+'.'+e.ext
    //                    k.dir = e.dir.toString()
    //                    //get file directory
    //                    k.fileExists = fs.existsSync(k.dir+k.file)
    //                    if(k.fileExists!==true){
    //                        k.dir=s.dir.videos+'/'+e.ke+'/'+e.id+'/'
    //                        k.fileExists=fs.existsSync(k.dir+k.file)
    //                        if(k.fileExists!==true){
    //                            s.dir.addStorage.forEach(function(v){
    //                                if(k.fileExists!==true){
    //                                    k.dir=s.checkCorrectPathEnding(v.path)+e.ke+'/'+e.id+'/'
    //                                    k.fileExists=fs.existsSync(k.dir+k.file)
    //                                }
    //                            })
    //                        }
    //                    }
    //                    if(k.fileExists===true){
    //                        //close video row
    //                        k.stat = fs.statSync(k.dir+k.file)
    //                        e.filesize = k.stat.size
    //                        e.filesizeMB = parseFloat((e.filesize/1000000).toFixed(2))
    //                        e.end_time = s.formattedTime(k.stat.mtime,'YYYY-MM-DD HH:mm:ss')
    //                        var save = [
    //                            e.filesize,
    //                            1,
    //                            e.end_time,
    //                            e.id,
    //                            e.ke,
    //                            s.nameToTime(e.filename)
    //                        ]
    //                        if(!e.status){
    //                            save.push(0)
    //                        }else{
    //                            save.push(e.status)
    //                        }
    //                        s.sqlQuery('UPDATE Videos SET `size`=?,`status`=?,`end`=? WHERE `mid`=? AND `ke`=? AND `time`=? AND `status`=?',save)
    //                        //send event for completed recording
    //                        s.txWithSubPermissions({
    //                            f:'video_build_success',
    //                            hrefNoAuth:'/videos/'+e.ke+'/'+e.mid+'/'+k.file,
    //                            filename:k.file,
    //                            mid:e.id,
    //                            ke:e.ke,
    //                            time:s.timeObject(s.nameToTime(e.filename)).format(),
    //                            size:e.filesize,
    //                            end:s.timeObject(e.end_time).format()
    //                        },'GRP_'+e.ke,'video_view');
    //                        //send new diskUsage values
    //                        s.video('diskUseUpdate',e,k)
    //                    }else{
    //                        s.video('delete',e);
    //                        s.log(e,{type:lang['File Not Exist'],msg:lang.FileNotExistText,ffmpeg:s.group[e.ke].mon[e.id].ffmpeg})
    //                        if(e.mode && config.restart.onVideoNotExist === true){
    //                            delete(s.group[e.ke].mon[e.id].open);
    //                            s.log(e,{
    //                                type : lang['Camera is not recording'],
    //                                msg : {
    //                                    msg : lang.CameraNotRecordingText
    //                                }
    //                            });
    //                            if(s.group[e.ke].mon[e.id].started===1){
    //                                s.camera('restart',e)
    //                            }
    //                        }
    //                    }
    //                }
    //            }
    //            delete(s.group[e.ke].mon[e.id].open);
    //        break;
            case'linkBuild':
                //e = video rows
                //k = auth key
                e.forEach(function(v){
                    var details = JSON.parse(v.details)
                    var queryString = []
                    if(details.isUTC === true){
                        queryString.push('isUTC=true')
                    }else{
                        v.time = s.utcToLocal(v.time)
                        v.end = s.utcToLocal(v.end)
                    }
                    if(queryString.length > 0){
                        queryString = '?'+queryString.join('&')
                    }else{
                        queryString = ''
                    }
                    if(!v.ext && v.href){
                        v.ext = v.href.split('.')
                        v.ext = v.ext[v.ext.length - 1]
                    }
                    v.filename = s.formattedTime(v.time)+'.'+v.ext;
                    if(!k.videoParam)k.videoParam = 'videos'
                    var href = '/'+k.auth+'/'+k.videoParam+'/'+v.ke+'/'+v.mid+'/'+v.filename;
                    v.actionUrl = href
                    v.links = {
                        deleteVideo : href+'/delete' + queryString,
                        changeToUnread : href+'/status/1' + queryString,
                        changeToRead : href+'/status/2' + queryString
                    }
                    if(!v.href || k.hideRemote === true)v.href = href + queryString
                    v.details = details
                })
            break;
            case'diskUseUpdate'://sizePurgeQueue
                if(s.group[e.ke].init){
                    s.group[e.ke].diskUsedEmitter.emit('purge',k)
                }
            break;
            case'insertCompleted':
                k.dir = e.dir.toString()
                if(s.group[e.ke].mon[e.id].childNode){
                    s.cx({f:'insertCompleted',d:s.group[e.ke].mon_conf[e.id],k:k},s.group[e.ke].mon[e.id].childNodeId);
                }else{
                    //get file directory
                    k.fileExists = fs.existsSync(k.dir+k.file)
                    if(k.fileExists!==true){
                        k.dir = s.dir.videos+'/'+e.ke+'/'+e.id+'/'
                        k.fileExists = fs.existsSync(k.dir+k.file)
                        if(k.fileExists !== true){
                            s.dir.addStorage.forEach(function(v){
                                if(k.fileExists !== true){
                                    k.dir = s.checkCorrectPathEnding(v.path)+e.ke+'/'+e.id+'/'
                                    k.fileExists = fs.existsSync(k.dir+k.file)
                                }
                            })
                        }
                    }
                    if(k.fileExists===true){
                        //close video row
                        k.stat = fs.statSync(k.dir+k.file)
                        k.filesize = k.stat.size
                        k.filesizeMB = parseFloat((k.filesize/1000000).toFixed(2))

                        k.startTime = new Date(s.nameToTime(k.file))
                        k.endTime = new Date(k.stat.mtime)
                        if(config.useUTC === true){
                            fs.rename(k.dir+k.file, k.dir+s.formattedTime(k.startTime)+'.'+e.ext, (err) => {
                                if (err) return console.error(err);
                            });
                            k.filename = s.formattedTime(k.startTime)+'.'+e.ext
                        }else{
                            k.filename = k.file
                        }
                        if(!e.ext){e.ext = k.filename.split('.')[1]}
                        //send event for completed recording
                        if(config.childNodes.enabled === true && config.childNodes.mode === 'child' && config.childNodes.host){
                            fs.createReadStream(k.dir+k.filename)
                            .on('data',function(data){
                                s.cx({
                                    f:'created_file_chunk',
                                    mid:e.id,
                                    ke:e.ke,
                                    chunk:data,
                                    filename:k.filename,
                                    d:s.init('noReference',e),
                                    filesize:e.filesize,
                                    time:s.timeObject(k.startTime).format(),
                                    end:s.timeObject(k.endTime).format()
                                })
                            })
                            .on('close',function(){
                                clearTimeout(s.group[e.ke].mon[e.id].checker)
                                clearTimeout(s.group[e.ke].mon[e.id].checkStream)
                                s.cx({
                                    f:'created_file',
                                    mid:e.id,
                                    ke:e.ke,
                                    filename:k.filename,
                                    d:s.init('noReference',e),
                                    filesize:k.filesize,
                                    time:s.timeObject(k.startTime).format(),
                                    end:s.timeObject(k.endTime).format()
                                })
                            });
                        }else{
                            var href = '/videos/'+e.ke+'/'+e.mid+'/'+k.filename
                            if(config.useUTC === true)href += '?isUTC=true';
                            s.txWithSubPermissions({
                                f:'video_build_success',
                                hrefNoAuth:href,
                                filename:k.filename,
                                mid:e.mid,
                                ke:e.ke,
                                time:k.startTime,
                                size:k.filesize,
                                end:k.endTime
                            },'GRP_'+e.ke,'video_view');
                        }
                        //cloud auto savers - webdav
                       var wfs = s.group[e.ke].webdav
                       if(wfs && s.group[e.ke].init.use_webdav !== '0' && s.group[e.ke].init.webdav_save === "1"){
                           var webdavUploadDir = s.group[e.ke].init.webdav_dir+e.ke+'/'+e.mid+'/'
                           var startWebDavUpload = function(){
                               s.group[e.ke].mon[e.id].webdavDirExist = true
                               var wfsWriteStream =
                               fs.createReadStream(k.dir + k.filename).pipe(wfs.createWriteStream(webdavUploadDir + k.filename))
                               if(s.group[e.ke].init.webdav_log === '1'){
                                   var webdavRemoteUrl = s.addUserPassToUrl(s.checkCorrectPathEnding(s.group[e.ke].init.webdav_url),s.group[e.ke].init.webdav_user,s.group[e.ke].init.webdav_pass) + s.group[e.ke].init.webdav_dir + e.ke + '/'+e.mid+'/'+k.filename
                                   var save = [
                                       e.mid,
                                       e.ke,
                                       k.startTime,
                                       1,
                                       s.s({
                                           type : 'webdav'
                                       }),
                                       k.filesize,
                                       k.endTime,
                                       webdavRemoteUrl
                                   ]
                                   s.sqlQuery('INSERT INTO `Cloud Videos` (mid,ke,time,status,details,size,end,href) VALUES (?,?,?,?,?,?,?,?)',save)
                               }
                           }
                           if(s.group[e.ke].mon[e.id].webdavDirExist !== true){
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
                                               s.log(e,{type:lang['Webdav Error'],msg:reply})
                                               wfs.mkdir(stitchPieces, function(error) {
                                                   if(error){
                                                       reply = {
                                                           status : error.status,
                                                           msg : lang.WebdavErrorTextCreatingDir,
                                                           dir : stitchPieces,
                                                       }
                                                       s.log(e,{type:lang['Webdav Error'],msg:reply})
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
                        //cloud auto savers - amazon s3
                        if(s.group[e.ke].aws_s3 && s.group[e.ke].init.use_aws_s3 !== '0' && s.group[e.ke].init.aws_s3_save === '1'){
                            var fileStream = fs.createReadStream(k.dir+k.filename);
                            fileStream.on('error', function (err) {
                                console.error(err)
                            })
                            s.group[e.ke].aws_s3.upload({
                                Bucket: s.group[e.ke].init.aws_s3_bucket,
                                Key: s.group[e.ke].init.aws_s3_dir+e.ke+'/'+e.mid+'/'+k.filename,
                                Body:fileStream,
                                ACL:'public-read'
                            },function(err,data){
                                if(err){
                                    s.log(e,{type:lang['Amazon S3 Upload Error'],msg:err})
                                }
                                if(s.group[e.ke].init.aws_s3_log === '1' && data && data.Location){
                                    var save = [
                                        e.mid,
                                        e.ke,
                                        k.startTime,
                                        1,
                                        '{}',
                                        k.filesize,
                                        k.endTime,
                                        data.Location
                                    ]
                                    s.sqlQuery('INSERT INTO `Cloud Videos` (mid,ke,time,status,details,size,end,href) VALUES (?,?,?,?,?,?,?,?)',save)
                                }
                            })
                        }
                        k.details = {}
                        if(e.details&&e.details.dir&&e.details.dir!==''){
                            k.details.dir = e.details.dir
                        }
                        if(config.useUTC === true)k.details.isUTC = config.useUTC;
                        var save = [
                            e.mid,
                            e.ke,
                            k.startTime,
                            e.ext,
                            1,
                            s.s(k.details),
                            k.filesize,
                            k.endTime,
                        ]
                        s.sqlQuery('INSERT INTO Videos (mid,ke,time,ext,status,details,size,end) VALUES (?,?,?,?,?,?,?,?)',save)
                        //send new diskUsage values
                        s.video('diskUseUpdate',e,k)
                    }
                }
            break;
        }
    }
}
