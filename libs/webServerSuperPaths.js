var fs = require('fs');
var os = require('os');
var moment = require('moment')
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var execSync = require('child_process').execSync;
module.exports = function(s,config,lang,app){
    const {
        modifyConfiguration,
        updateSystem,
        getSystemInfo,
     } = require('./system/utils.js')(config)
     const {
         checkSubscription
     } = require('./basic/utils.js')(process.cwd(),config)
    /**
    * API : Superuser : Get Logs
    */
    app.all([config.webPaths.superApiPrefix+':auth/logs'], function (req,res){
        req.ret={ok:false};
        s.superAuth(req.params,function(resp){
            s.getDatabaseRows({
                table: 'Logs',
                groupKey: '$',
                date: req.query.date,
                startDate: req.query.start,
                endDate: req.query.end,
                startOperator: req.query.startOperator,
                endIsStartTo: true,
                limit: req.query.limit,
            },(response) => {
                response.rows.forEach(function(v,n){
                    response.rows[n].info = JSON.parse(v.info)
                })
                s.closeJsonResponse(res,{
                    ok: response.ok,
                    logs: response.rows
                })
            })
        },res,req)
    })
    /**
    * API : Superuser : Log delete.
    */
    app.all(config.webPaths.superApiPrefix+':auth/logs/delete', function (req,res){
        s.superAuth(req.params,function(resp){
            s.knexQuery({
                action: "delete",
                table: "Logs",
                where: {
                    ke: '$'
                }
            },() => {
                s.closeJsonResponse(res,{
                    ok : true
                })
            })
        },res,req)
    })
    /**
    * API : Superuser : Update Shinobi
    */
    app.all(config.webPaths.superApiPrefix+':auth/system/update', function (req,res){
        s.superAuth(req.params,async (resp) => {
            s.systemLog(lang['Shinobi Ordered to Update'],{
                by: resp.$user.mail,
                ip: resp.ip
            })
            const didUpdate = await updateSystem()
            s.systemLog(lang.restartRequired,{
                by: resp.$user.mail,
                ip: resp.ip
            })
            var endData = {
                ok : true
            }
            s.closeJsonResponse(res,endData)
        },res,req)
    })
    /**
    * API : Superuser : Restart Shinobi
    */
    app.all(config.webPaths.superApiPrefix+':auth/system/restart/:script', function (req,res){
        s.superAuth(req.params,function(resp){
            var check = function(x){return req.params.script.indexOf(x)>-1}
            var endData = {
                ok : true
            }
            if(check('system')){
                s.systemLog('Shinobi ordered to restart',{by:resp.$user.mail,ip:resp.ip})
                s.ffmpegKill()
                endData.systemOuput = execSync('pm2 restart '+s.mainDirectory+'/camera.js')
            }
            if(check('cron')){
                s.systemLog('Shinobi CRON ordered to restart',{by:resp.$user.mail,ip:resp.ip})
                endData.cronOuput = execSync('pm2 restart '+s.mainDirectory+'/cron.js')
            }
            if(check('logs')){
                s.systemLog('Flush PM2 Logs',{by:resp.$user.mail,ip:resp.ip})
                endData.logsOuput = execSync('pm2 flush')
            }
            s.closeJsonResponse(res,endData)
        },res,req)
    })
    /**
    * API : Superuser : Get Configuration (conf.json)
    */
    app.get(config.webPaths.superApiPrefix+':auth/system/configure', function (req,res){
        s.superAuth(req.params,async (resp) => {
            var endData = {
                ok: true,
                config: JSON.parse(fs.readFileSync(s.location.config)),
            }
            s.closeJsonResponse(res,endData)
        },res,req)
    })
    /**
    * API : Superuser : Modify Configuration (conf.json)
    */
    app.post(config.webPaths.superApiPrefix+':auth/system/configure', function (req,res){
        s.superAuth(req.params,async (resp) => {
            var endData = {
                ok : true
            }
            var postBody = s.getPostData(req)
            if(!postBody){
                endData.ok = false
                endData.msg = lang.postDataBroken
            }else{
                s.systemLog('conf.json Modified',{
                    by: resp.$user.mail,
                    ip: resp.ip,
                    old: s.parseJSON(fs.readFileSync(s.location.config),{})
                })
                const configError = await modifyConfiguration(postBody)
                if(configError)s.systemLog(configError)
                s.tx({f:'save_configuration'},'$')
            }
            s.closeJsonResponse(res,endData)
        },res,req)
    })
    /**
    * API : Superuser : Activate Key
    */
    app.post(config.webPaths.superApiPrefix+':auth/system/activate', function (req,res){
        s.superAuth(req.params,async (resp) => {
            var endData = {
                ok : true
            }
            const currentConfig = JSON.parse(fs.readFileSync(s.location.config))
            const subscriptionId = s.getPostData(req,'subscriptionId')
            if(!subscriptionId){
                endData.ok = false
                endData.msg = lang.postDataBroken
            }else{
                s.systemLog('conf.json Modified',{
                    by: resp.$user.mail,
                    ip: resp.ip,
                    old: currentConfig
                })
                const configError = await modifyConfiguration(Object.assign(currentConfig,{
                    subscriptionId: subscriptionId,
                }))
                config.subscriptionId = subscriptionId;
                if(configError)s.systemLog(configError)
                s.tx({f:'save_configuration'},'$')
            }
            checkSubscription(subscriptionId,function(hasSubcribed){
                endData.ok = hasSubcribed
                config.userHasSubscribed = hasSubcribed
                s.closeJsonResponse(res,endData)
            })
        },res,req)
    })
    /**
    * API : Superuser : Get users in system
    */
    app.all([
        config.webPaths.superApiPrefix+':auth/accounts/list',
        config.webPaths.superApiPrefix+':auth/accounts/list/:type',
    ], function (req,res){
        s.superAuth(req.params,function(resp){
            var endData = {
                ok : true
            }
            const whereQuery = []
            switch(req.params.type){
                case'admin':case'administrator':
                    whereQuery.push(['details','NOT LIKE','%"sub"%'])
                break;
                case'sub':case'subaccount':
                    whereQuery.push(['details','LIKE','%"sub"%'])
                break;
            }
            s.knexQuery({
                action: "select",
                columns: "ke,uid,auth,mail,details",
                table: "Users",
                where: whereQuery
            },(err,users) => {
                endData.users = users
                s.closeJsonResponse(res,endData)
            })
        },res,req)
    })
    /**
    * API : Superuser : Save Superuser Preferences
    */
    app.all(config.webPaths.superApiPrefix+':auth/accounts/saveSettings', function (req,res){
        s.superAuth(req.params,function(resp){
            var endData = {
                ok : true
            }
            var form = s.getPostData(req)
            if(form){
                const configPath = config.thisIsDocker ? "/config/super.json" : s.location.super;
                var currentSuperUserList = JSON.parse(fs.readFileSync(configPath))
                var currentSuperUser = {}
                var currentSuperUserPosition = -1
                //find this user in current list
                currentSuperUserList.forEach(function(user,pos){
                    if(user.mail === resp.$user.mail){
                        currentSuperUser = user
                        currentSuperUserPosition = pos
                    }
                })
                var logDetails = {
                    by : resp.$user.mail,
                    ip : resp.ip
                }
                //check if pass and pass_again match, if not remove password
                if(form.pass !== '' && form.pass === form.pass_again){
                    form.pass = s.createHash(form.pass)
                }else{
                    delete(form.pass)
                }
                //delete pass_again from object
                delete(form.pass_again)
                //set new values
                currentSuperUser = Object.assign(currentSuperUser,form)
                //reset email and log change of email
                if(form.mail !== resp.$user.mail){
                    logDetails.newEmail = form.mail
                    logDetails.oldEmail = resp.$user.mail
                }
                //log this change
                s.systemLog('super.json Modified',logDetails)
                //modify or add account in temporary master list
                if(currentSuperUserList[currentSuperUserPosition]){
                    currentSuperUserList[currentSuperUserPosition] = currentSuperUser
                }else{
                    currentSuperUserList.push(currentSuperUser)
                }
                //update master list in system
                const configData = JSON.stringify(currentSuperUserList,null,3);
                fs.writeFile(configPath, configData, () => {
                    s.tx({f: 'save_preferences'},'$')
                });

            }else{
                endData.ok = false
                endData.msg = lang.postDataBroken
            }
            s.closeJsonResponse(res,endData)
        },res,req)
    })
    /**
    * API : Superuser : Create Admin account (Account to manage cameras)
    */
    app.all(config.webPaths.superApiPrefix+':auth/accounts/registerAdmin', function (req,res){
        s.superAuth(req.params,function(resp){
            var endData = {
                ok : false
            }
            var close = function(){
                s.closeJsonResponse(res,endData)
            }
            var isCallbacking = false
            var form = s.getPostData(req)
            if(form){
                if(form.mail !== '' && form.pass !== ''){
                    if(form.pass === form.password_again || form.pass === form.pass_again){
                        isCallbacking = true
                        s.knexQuery({
                            action: "select",
                            columns: "*",
                            table: "Users",
                            where: [
                                ['mail','=',form.mail]
                            ]
                        },(err,r) => {
                            if(r&&r[0]){
                                //found address already exists
                                endData.msg = lang['Email address is in use.'];
                            }else{
                                //create new
                                //user id
                                form.uid = s.gid()
                                //check to see if custom key set
                                if(!form.ke){
                                    form.ke = s.gid()
                                }else{
                                    form.ke = form.ke.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '').trim()
                                }
                                if(!s.group[form.ke]){
                                    endData.ok = true
                                    //check if "details" is object
                                    if(form.details instanceof Object){
                                        form.details = JSON.stringify(form.details)
                                    }
                                    //write user to db
                                    s.knexQuery({
                                        action: "insert",
                                        table: "Users",
                                        insert: {
                                            ke: form.ke,
                                            uid: form.uid,
                                            mail: form.mail,
                                            pass: s.createHash(form.pass),
                                            details: form.details
                                        }
                                    });
                                    s.tx({f:'add_account',details:form.details,ke:form.ke,uid:form.uid,mail:form.mail},'$')
                                    endData.user = Object.assign(form,{})
                                    //init user
                                    s.loadGroup(form)
                                }else{
                                    endData.msg = lang["Group with this key exists already"]
                                }
                            }
                            close()
                        })
                    }else{
                        endData.msg = lang["Passwords Don't Match"]
                    }
                }else{
                    endData.msg = lang['Email and Password fields cannot be empty']
                }
            }else{
                endData.msg = lang.postDataBroken
            }
            if(isCallbacking === false)close()
        },res,req)
    })
    /**
    * API : Superuser : Edit Admin account (Account to manage cameras)
    */
    app.all(config.webPaths.superApiPrefix+':auth/accounts/editAdmin', function (req,res){
        s.superAuth(req.params,function(resp){
            var endData = {
                ok : false
            }
            var close = function(){
                s.closeJsonResponse(res,endData)
            }
            var form = s.getPostData(req)
            if(form){
                var account = s.getPostData(req,'account')
                s.knexQuery({
                    action: "select",
                    columns: "*",
                    table: "Users",
                    where: [
                        ['mail','=',account.mail]
                    ]
                },(err,r) => {
                    if(r && r[0]){
                        r = r[0]
                        var details = JSON.parse(r.details)
                        if(form.pass && form.pass !== ''){
                           if(form.pass === form.password_again || form.pass_again){
                               form.pass = s.createHash(form.pass);
                           }else{
                               endData.msg = lang["Passwords Don't Match"]
                               close()
                               return
                           }
                        }else{
                            delete(form.pass);
                        }
                        delete(form.password_again);
                        delete(form.pass_again);
                        delete(form.ke);
                        form.details = s.stringJSON(Object.assign(details,s.parseJSON(form.details)))
                        s.knexQuery({
                            action: "update",
                            table: "Users",
                            update: form,
                            where: [
                                ['mail','=',account.mail],
                            ]
                        },(err,r) => {
                            if(err){
                                console.log(err)
                                endData.error = err
                                endData.msg = lang.AccountEditText1
                            }else{
                                endData.ok = true
                                s.tx({f:'edit_account',form:form,ke:account.ke,uid:account.uid},'$')
                                delete(s.group[account.ke].init);
                                s.loadGroupApps(account)
                            }
                            close()
                        })
                    }else{
                        endData.msg = lang['User Not Found']
                        close()
                    }
                })
            }else{
                endData.msg = lang.postDataBroken
                close()
            }
        },res,req)
    })
    /**
    * API : Superuser : Delete Admin account (Account to manage cameras)
    */
    app.all(config.webPaths.superApiPrefix+':auth/accounts/deleteAdmin', function (req,res){
        s.superAuth(req.params,function(resp){
            var endData = {
                ok : true
            }
            var close = function(){
                s.closeJsonResponse(res,endData)
            }
            var account = s.getPostData(req,'account')
            s.knexQuery({
                action: "delete",
                table: "Users",
                where: {
                    ke: account.ke,
                    uid: account.uid,
                    mail: account.mail,
                }
            })
            s.knexQuery({
                action: "delete",
                table: "API",
                where:  {
                    ke: account.ke,
                    uid: account.uid,
                }
            })
            if(s.getPostData(req,'deleteSubAccounts',false) === '1'){
                s.knexQuery({
                    action: "delete",
                    table: "Users",
                    where:  {
                        ke: account.ke,
                    }
                })
            }
            if(s.getPostData(req,'deleteMonitors',false) == '1'){
                s.knexQuery({
                    action: "select",
                    columns: "*",
                    table: "Monitors",
                    where:  {
                        ke: account.ke,
                    }
                },(err,monitors) => {
                    if(monitors && monitors[0]){
                        monitors.forEach(function(monitor){
                            s.camera('stop',monitor)
                        })
                        s.knexQuery({
                            action: "delete",
                            table: "Monitors",
                            where:  {
                                ke: account.ke,
                            }
                        })
                    }
                })
            }
            if(s.getPostData(req,'deleteVideos',false) == '1'){
                s.knexQuery({
                    action: "delete",
                    table: "Videos",
                    where:  {
                        ke: account.ke,
                    }
                })
                fs.rm(s.dir.videos+account.ke,function(err){
                    s.debugLog(err)
                })
            }
            if(s.getPostData(req,'deleteEvents',false) == '1'){
                s.knexQuery({
                    action: "delete",
                    table: "Events",
                    where:  {
                        ke: account.ke,
                    }
                })
            }
            s.tx({f:'delete_account',ke:account.ke,uid:account.uid,mail:account.mail},'$')
            close()
        },res,req)
    })
    /**
    * API : Superuser : Get Entire System
    */
    app.all(config.webPaths.superApiPrefix+':auth/export/system', function (req,res){
        s.superAuth(req.params,function(resp){
            s.systemLog('Copy of the Database Exported',{
                by: resp.$user.mail,
                ip: resp.ip
            })
            var endData = {
                ok : true
            }
            // var database = s.getPostData(req,'database')
            endData.database = {}
            var tableNames = [
                'Users',
                'Monitors',
                'API',
                'Videos',
                'Cloud Videos',
                'Logs',
                'Files',
                'Presets',
            ]
            var completedTables = 0
            var tableExportLoop = function(callback){
                var tableName = tableNames[completedTables]
                if(tableName){
                    var tableIsSelected = s.getPostData(req,tableName) == 1
                    if(tableIsSelected){
                        s.knexQuery({
                            action: "select",
                            columns: "*",
                            table: tableName
                        },(err,dataRows) => {
                            endData.database[tableName] = dataRows
                            ++completedTables
                            tableExportLoop(callback)
                        })
                    }else{
                        ++completedTables
                        tableExportLoop(callback)
                    }
                }else{
                    callback()
                }
            }
            tableExportLoop(function(){
                s.closeJsonResponse(res,endData)
            })
        },res,req)
    })
    /**
    * API : Superuser : Import Entire System
    */
    app.all(config.webPaths.superApiPrefix+':auth/import/system', function (req,res){
        s.superAuth(req.params,function(resp){
            var endData = {
                ok : false
            }
            console.log(req.files)
            // insert data
            var data = s.getPostData(req)
            var database = s.getPostData(req,'database')
            if(data && data.database)database = data.database
            if(database){
                var rowsExistingAlready = {}
                var countOfRowsInserted = {}
                var countOfRowsExistingAlready = {}
                var insertRow = function(tableName,row,callback){
                    if(!rowsExistingAlready[tableName])rowsExistingAlready[tableName] = []
                    if(!countOfRowsExistingAlready[tableName])countOfRowsExistingAlready[tableName] = 0
                    if(!countOfRowsInserted[tableName])countOfRowsInserted[tableName] = 0
                    var fieldsToCheck = ['ke']
                    switch(tableName){
                        case'API':
                            fieldsToCheck = fieldsToCheck.concat([
                                'code',
                                'uid'
                            ])
                        break;
                        case'Cloud Videos':
                            fieldsToCheck = fieldsToCheck.concat([
                                'href',
                                'mid'
                            ])
                        break;
                        case'Videos':
                            fieldsToCheck = fieldsToCheck.concat([
                                'time',
                                'mid'
                            ])
                        break;
                        case'Users':
                            fieldsToCheck = fieldsToCheck.concat([
                                'uid',
                                'mail'
                            ])
                        break;
                        case'Presets':
                            fieldsToCheck = fieldsToCheck.concat([
                                'name',
                                'type'
                            ])
                        break;
                        case'Logs':
                            fieldsToCheck = fieldsToCheck.concat([
                                'time',
                                'info',
                                'mid'
                            ])
                        break;
                        case'Events':
                            fieldsToCheck = fieldsToCheck.concat([
                                'time',
                                'details',
                                'mid'
                            ])
                        break;
                        case'Files':
                            fieldsToCheck = fieldsToCheck.concat([
                                'details',
                                'name',
                                'mid'
                            ])
                        break;
                        case'Monitors':
                            fieldsToCheck = fieldsToCheck.concat([
                                'host',
                                'protocol',
                                'port',
                                'path',
                                'mid'
                            ])
                        break;
                    }
                    const whereQuery = []
                    fieldsToCheck.forEach(function(key){
                        whereQuery.push([key,'=',row[key]])
                    })
                    s.knexQuery({
                        action: "select",
                        columns: "*",
                        table: tableName,
                        where: whereQuery
                    },(err,selected) => {
                        if(selected && selected[0]){
                            selected = selected[0]
                            rowsExistingAlready[tableName].push(selected)
                            callback()
                        }else{
                            s.knexQuery({
                                action: "insert",
                                table: tableName,
                                insert: row
                            },(err) => {
                                if(!err){
                                    ++countOfRowsInserted[tableName]
                                }
                                callback()
                            })
                        }
                    })
                }
                var actionCount = {}
                var insertTableRows = function(tableName,rows,callback){
                    if(!actionCount[tableName])actionCount[tableName] = 0
                    var insertLoop = function(){
                        var row = rows[actionCount[tableName]]
                        if(row){
                            insertRow(tableName,row,function(){
                                ++actionCount[tableName]
                                insertLoop()
                            })
                        }else{
                            callback()
                        }
                    }
                    insertLoop()
                }
                var databaseTableKeys = Object.keys(database)
                var completedTables = 0
                var tableInsertLoop = function(callback){
                    var tableName = databaseTableKeys[completedTables]
                    var rows = database[databaseTableKeys[completedTables]]
                    if(tableName){
                        insertTableRows(tableName,rows,function(){
                            ++completedTables
                            tableInsertLoop(callback)
                        })
                    }else{
                        callback()
                    }
                }
                tableInsertLoop(function(){
                    endData.ok = true
                    endData.tablesInsertedTo = databaseTableKeys
                    endData.countOfRowsInserted = countOfRowsInserted
                    endData.rowsExistingAlready = rowsExistingAlready
                    s.closeJsonResponse(res,endData)
                })
            }else{
                endData.msg = lang['Database Not Found']
                s.closeJsonResponse(res,endData)
            }
        },res,req)
    })
    /**
    * API : Superuser : Force Check for Stale Purge Locks
    */
    app.all(config.webPaths.superApiPrefix+':auth/system/checkForStalePurgeLocks', function (req,res){
        s.superAuth(req.params,function(resp){
            var endData = {
                ok : true
            }
            s.checkForStalePurgeLocks()
            s.closeJsonResponse(res,endData)
        },res,req)
    })
    /**
    * API : Superuser : Get Child Nodes
    */
    app.all(config.webPaths.superApiPrefix+':auth/getChildNodes', function (req,res){
        s.superAuth(req.params,function(resp){
            var childNodesJson = {}
            Object.values(s.childNodes).forEach(function(activeNode){
                var activeCamerasCount = 0
                var activeCameras = {}
                Object.values(activeNode.activeCameras).forEach(function(monitor){
                    ++activeCamerasCount
                    if(!activeCameras[monitor.ke])activeCameras[monitor.ke] = {}
                    activeCameras[monitor.ke][monitor.mid] = {
                        name: monitor.name,
                        mid: monitor.mid,
                        ke: monitor.ke,
                        details: {
                            accelerator: monitor.details.accelerator,
                            auto_host: monitor.details.auto_host,
                        }
                    }
                })
                childNodesJson[activeNode.ip] = {
                    ip: activeNode.ip,
                    cpu: activeNode.cpu,
                    dead: activeNode.dead,
                    countCount: activeNode.countCount,
                    activeMonitorsCount: activeCamerasCount,
                    activeMonitors: activeCameras,
                }
            })
            var endData = {
                ok : true,
                childNodes: childNodesJson,
            }
            s.closeJsonResponse(res,endData)
        },res,req)
    })
    /**
    * API : Superuser : Get System Info
    */
    app.get(config.webPaths.superApiPrefix+':auth/system/info', function (req,res){
        s.superAuth(req.params,async (resp) => {
            s.closeJsonResponse(res,{
                ok: true,
                info: getSystemInfo(s)
            })
        },res,req)
    })
}
