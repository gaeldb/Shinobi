var fs = require('fs')
var moment = require('moment')
var crypto = require('crypto')
var exec = require('child_process').exec
var spawn = require('child_process').spawn;
var events = require('events')
var http = require('http')
var https = require('https')
const async = require("async")
module.exports = function(s,config){
    //kill any ffmpeg running
    s.ffmpegKill=function(){
        var cmd=''
        if(s.isWin===true){
            cmd = "Taskkill /IM ffmpeg.exe /F"
        }else{
            cmd = "pkill -9 ffmpeg"
        }
        exec(cmd,{detached: true})
    };
    process.on('exit',s.ffmpegKill.bind(null,{cleanup:true}));
    process.on('SIGINT',s.ffmpegKill.bind(null, {exit:true}));
    s.checkRelativePath = function(x){
        if(x.charAt(0)!=='/'){
            x=s.mainDirectory+'/'+x
        }
        return x
    }
    s.checkDetails = function(e){
        if(!e.id && e.mid){e.id = e.mid}
        if(e.details&&(e.details instanceof Object)===false){
            try{e.details=JSON.parse(e.details)}catch(err){}
        }
    }
    s.parseJSON = function(string){
        var parsed
        try{
            parsed = JSON.parse(string)
        }catch(err){

        }
        if(!parsed)parsed = string
        return parsed
    }
    s.stringJSON = function(json){
        try{
            if(json instanceof Object){
                json = JSON.stringify(json)
            }
        }catch(err){

        }
        return json
    }
    s.addUserPassToUrl = function(url,user,pass){
        var splitted = url.split('://')
        splitted[1] = user + ':' + pass + '@' + splitted[1]
        return splitted.join('://')
    }
    s.checkCorrectPathEnding = function(x,reverse){
        var newString = `${x}`
        var length = x.length
        if(reverse && x.charAt(length-1) === '/'){
            newString = x.slice(0, -1)
        }else if(x.charAt(length-1) !== '/'){
            newString = x + '/'
        }
        return newString.replace('__DIR__',s.mainDirectory)
    }
    s.mergeDeep = function(...objects) {
      const isObject = obj => obj && typeof obj === 'object';

      return objects.reduce((prev, obj) => {
        Object.keys(obj).forEach(key => {
          const pVal = prev[key];
          const oVal = obj[key];

          if (Array.isArray(pVal) && Array.isArray(oVal)) {
            prev[key] = pVal.concat(...oVal);
          }
          else if (isObject(pVal) && isObject(oVal)) {
            prev[key] = s.mergeDeep(pVal, oVal);
          }
          else {
            prev[key] = oVal;
          }
        });

        return prev;
      }, {});
    }
    s.md5 = function(x){return crypto.createHash('md5').update(x).digest("hex")}
    s.createHash = s.md5
    switch(config.passwordType){
        case'sha512':
            if(config.passwordSalt){
                s.createHash = function(x){return crypto.pbkdf2Sync(x, config.passwordSalt, 100000, 64, 'sha512').toString('hex')}
            }
        break;
        case'sha256':
            s.createHash = function(x){return crypto.createHash('sha256').update(x).digest("hex")}
        break;
    }
    //load camera controller vars
    s.nameToTime=function(x){
        x = x.split('.')[0].split('T')
        if(x[1])x[1] = x[1].replace(/-/g,':')
        x = x.join(' ')
        return x
    }
    s.ratio=function(width,height,ratio){ratio = width / height;return ( Math.abs( ratio - 4 / 3 ) < Math.abs( ratio - 16 / 9 ) ) ? '4:3' : '16:9';}
    s.randomNumber=function(x){
        if(!x){x=10};
        return Math.floor((Math.random() * x) + 1);
    };
    s.gid=function(x){
        if(!x){x=10};var t = "";var p = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for( var i=0; i < x; i++ )
            t += p.charAt(Math.floor(Math.random() * p.length));
        return t;
    };
    s.nid=function(x){
        if(!x){x=6};var t = "";var p = "0123456789";
        for( var i=0; i < x; i++ )
            t += p.charAt(Math.floor(Math.random() * p.length));
        return t;
    };
    s.formattedTime_withOffset=function(e,x){
        if(!e){e=new Date};if(!x){x='YYYY-MM-DDTHH-mm-ss'};
        e=s.timeObject(e);if(config.utcOffset){e=e.utcOffset(config.utcOffset)}
        return e.format(x);
    }
    s.formattedTime=function(e,x){
        if(!e){e=new Date};if(!x){x='YYYY-MM-DDTHH-mm-ss'};
        return s.timeObject(e).format(x);
    }
    s.utcToLocal = function(time){
        return moment.utc(time).utcOffset(s.utcOffset).format()
    }
    s.localTimeObject = function(e,x){
        return moment(e)
    }
    if(config.useUTC === true){
        s.timeObject = function(time){
            return moment(time).utc()
        }
    }else{
        s.timeObject = moment
    }
    s.getFunctionParamNames = function(func) {
      var fnStr = func.toString().replace(/((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg, '');
      var result = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(/([^\s,]+)/g);
      if(result === null)
         result = [];
      return result;
    }
    s.getRequest = function(url,callback){
        return http.get(url, function(res){
            var body = '';
            res.on('data', function(chunk){
                body += chunk;
            });
            res.on('end',function(){
                try{body = JSON.parse(body)}catch(err){}
                callback(body)
            });
        }).on('error', function(e){
    //                              s.systemLog("Get Snapshot Error", e);
        });
    }
    //system log
    s.systemLog = function(q,w,e){
        if(!w){w=''}
        if(!e){e=''}
        if(config.systemLog===true){
            if(typeof q==='string'&&s.databaseEngine){
                s.knexQuery({
                    action: "insert",
                    table: "Logs",
                    insert: {
                        ke: '$',
                        mid: '$SYSTEM',
                        info: s.s({type:q,msg:w}),
                    }
                })
                s.tx({f:'log',log:{time:s.timeObject(),ke:'$',mid:'$SYSTEM',time:s.timeObject(),info:s.s({type:q,msg:w})}},'$');
            }
            return console.log(s.timeObject().format(),q,w,e)
        }
    }
    //system log
    s.debugLog = function(...args){
        if(config.debugLog === true){
            var logRow = ([s.timeObject().format()]).concat(...args)
            console.log(...logRow)
            if(config.debugLogVerbose === true){
                console.log(new Error('VERBOSE STACK TRACE, THIS IS NOT AN '))
            }
        }
    }
    s.getOriginalUrl = function(req){
        var url
        if(config.baseURL || config.baseURL === ''){
            url = config.baseURL
        }else{
            url = req.protocol + '://' + req.get('host') + '/'
        }
        return url
    }
    s.file = async function(x,e,callback){
        if(!e){e={}};
        switch(x){
            case'size':
                 return fs.statSync(e.filename)["size"];
            break;
            case'delete':
                if (!e) { return false; }
                try{
                    return await fs.promises.rm(e, { force: true })
                }catch(err){
                    s.debugLog(err)
                    if(s.isWin){
                        exec('rd /s /q "' + e + '"', { detached: true }, function (err) {
                            if (callback) callback(err)
                        })
                    }else{
                        exec('rm -rf ' + e, { detached: true }, function (err) {
                            if (callback) callback(err)
                        })
                    }
                }
            break;
            case'deleteFolder':
                if(!e){return false;}
                if(s.isWin){
                    exec('rd /s /q "' + e + '"',{detached: true},function(err){
                        if(callback)callback(err)
                    })
                }else{
                    exec('rm -rf '+e,{detached: true},function(err){
                        if(callback)callback(err)
                    })
                }
            break;
            case'deleteFiles':
                if(!e.age_type){e.age_type='min'};if(!e.age){e.age='1'};
                exec('find '+e.path+' -type f -c'+e.age_type+' +'+e.age+' -exec rm -f {} +',{detached: true},function(err){
                    if(callback)callback(err)
                })
            break;
        }
    }
    s.createTimeout = function(timeoutVar,parentVar,timeoutLength,defaultLength,multiplier,callback){
        var theTimeout
        if(!multiplier)multiplier = 1000 * 60
        if(!timeoutLength || timeoutLength === ''){
            theTimeout = defaultLength
        }else{
            theTimeout = parseFloat(timeoutLength) * multiplier
        }
        clearTimeout(parentVar[timeoutVar])
        parentVar[timeoutVar] = setTimeout(function(){
            clearTimeout(parentVar[timeoutVar])
            delete(parentVar[timeoutVar])
            if(callback)callback()
        },theTimeout)
        return parentVar[timeoutVar]
    }
    s.handleFolderError = function(err){
        if(err){
            switch(err.code){
                case'EEXIST':
                break;
                default:
                    console.log(err)
                break;
            }
        }
    }
    s.isCorrectFilenameSyntax = function(string){
        return RegExp('[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]-[0-9][0-9]-[0-9][0-9]').test(string)
    }
    var readFile = async.queue(function(filename, callback) {
        fs.readFile(filename,"utf-8",callback)
    }, 4);
    s.readFile = function(filename, callback){
        return readFile.push(filename, callback)
    }
    var fileStats = async.queue(function(filename, callback) {
        fs.stat(filename,callback)
    }, 4);
    s.fileStats = function(filename, callback){
        return fileStats.push(filename, callback)
    }
    s.kilobyteToMegabyte = function(kb,places){
        if(!places)places = 2
        return (kb/1048576).toFixed(places)
    }
    Object.defineProperty(Array.prototype, 'chunk', {
        value: function(chunkSize){
            var temporal = [];

            for (var i = 0; i < this.length; i+= chunkSize){
                temporal.push(this.slice(i,i+chunkSize));
            }

            return temporal;
        }
    });
}
