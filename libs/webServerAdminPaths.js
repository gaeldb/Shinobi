var fs = require('fs');
var os = require('os');
var moment = require('moment')
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var execSync = require('child_process').execSync;
module.exports = function(s,config,lang,app){
    const {
        deleteMonitor,
    } = require('./monitor/utils.js')(s,config,lang)
    /**
    * API : Administrator : Edit Sub-Account (Account to share cameras with)
    */
    app.all(config.webPaths.adminApiPrefix+':auth/accounts/:ke/edit', function (req,res){
        s.auth(req.params,async (user) => {
            var endData = {
                ok : false
            }
            const {
                isSubAccount,
            } = s.checkPermission(user)
            if(isSubAccount){
                s.closeJsonResponse(res,{ok: false, msg: lang['Not an Administrator Account']});
                return
            }
            var form = s.getPostData(req)
            var uid = form.uid || s.getPostData(req,'uid',false)
            var mail = (form.mail || s.getPostData(req,'mail',false) || '').trim()
            if(form){
                var keys = ['details']
                form.details = s.parseJSON(form.details) || {"sub": 1, "allmonitors": "1"}
                form.details.sub = 1
                const updateQuery = {
                    details: s.stringJSON(form.details)
                }
                if(form.pass && form.pass === form.password_again){
                    updateQuery.pass = s.createHash(form.pass)
                }
                if(form.mail){
                    const userCheck = await s.knexQueryPromise({
                        action: "select",
                        columns: "*",
                        table: "Users",
                        where: [
                            ['mail','=',form.mail],
                        ]
                    })
                    if(userCheck.rows[0]){
                        const foundUser = userCheck.rows[0]
                        if(foundUser.uid === form.uid){
                            updateQuery.mail = form.mail
                        }else{
                            endData.msg = lang['Email address is in use.']
                            s.closeJsonResponse(res,endData)
                            return
                        }
                    }else{
                        updateQuery.mail = form.mail
                    }
                }
                await s.knexQueryPromise({
                    action: "update",
                    table: "Users",
                    update: updateQuery,
                    where: [
                        ['ke','=',req.params.ke],
                        ['uid','=',uid],
                    ]
                })
                s.tx({
                    f: 'edit_sub_account',
                    ke: req.params.ke,
                    uid: uid,
                    mail: mail,
                    form: form
                },'ADM_'+req.params.ke)
                endData.ok = true
                s.knexQuery({
                    action: "select",
                    columns: "*",
                    table: "API",
                    where: [
                        ['ke','=',req.params.ke],
                        ['uid','=',uid],
                    ]
                },function(err,rows){
                    if(rows && rows[0]){
                        rows.forEach(function(row){
                            delete(s.api[row.code])
                        })
                    }
                })
            }else{
                endData.msg = lang.postDataBroken
            }
            s.closeJsonResponse(res,endData)
        },res,req)
    })
    /**
    * API : Administrator : Delete Sub-Account (Account to share cameras with)
    */
    app.all(config.webPaths.adminApiPrefix+':auth/accounts/:ke/delete', function (req,res){
        s.auth(req.params,function(user){
            const groupKey = req.params.ke;
            var endData = {
                ok : false
            }
            const {
                isSubAccount,
            } = s.checkPermission(user)
            if(isSubAccount){
                s.closeJsonResponse(res,{ok: false, msg: lang['Not an Administrator Account']});
                return
            }
            var form = s.getPostData(req) || {}
            var uid = form.uid || s.getPostData(req,'uid',false)
            s.knexQuery({
                action: "select",
                columns: "*",
                table: "Users",
                where: [
                    ['ke','=',groupKey],
                    ['uid','=',uid],
                ]
            },function(err,usersFound){
                const theUserUpForDeletion = usersFound[0]
                if(theUserUpForDeletion){
                    s.knexQuery({
                        action: "delete",
                        table: "Users",
                        where: {
                            ke: groupKey,
                            uid: uid,
                        }
                    })
                    s.knexQuery({
                        action: "select",
                        columns: "*",
                        table: "API",
                        where: [
                            ['ke','=',groupKey],
                            ['uid','=',uid],
                        ]
                    },function(err,rows){
                        if(rows && rows[0]){
                            rows.forEach(function(row){
                                delete(s.api[row.code])
                            })
                            s.knexQuery({
                                action: "delete",
                                table: "API",
                                where: {
                                    ke: groupKey,
                                    uid: uid,
                                }
                            })
                        }
                    })
                    s.tx({
                        f: 'delete_sub_account',
                        ke: groupKey,
                        uid: uid,
                        mail: theUserUpForDeletion.mail
                    },'ADM_'+groupKey)
                    endData.ok = true
                }else{
                    endData.msg = user.lang['User Not Found']
                }
                s.closeJsonResponse(res,endData)
            })
        },res,req)
    })
    /**
    * API : Administrator : Get Sub-Account List
    */
    app.get(config.webPaths.adminApiPrefix+':auth/accounts/:ke', function (req,res){
        s.auth(req.params,function(user){
            var endData = {
                ok : false
            }
            const {
                isSubAccount,
            } = s.checkPermission(user)
            if(isSubAccount){
                s.closeJsonResponse(res,{ok: false, msg: lang['Not an Administrator Account']});
                return
            }else{
                endData.ok = true
                s.knexQuery({
                    action: "select",
                    columns: "ke,uid,mail,details",
                    table: "Users",
                    where: [
                        ['ke','=',req.params.ke],
                        ['details','LIKE','%"sub"%']
                    ]
                },function(err,rows){
                    endData.accounts = rows
                    s.closeJsonResponse(res,endData)
                })
            }
        },res,req)
    })
    /**
    * API : Administrator : Add Sub-Account (Account to share cameras with)
    */
    app.post([
        config.webPaths.adminApiPrefix+':auth/accounts/:ke/register',
        //these two routes are for backwards compatibility
        config.webPaths.adminApiPrefix+':auth/register/:ke/:uid',
        config.webPaths.apiPrefix+':auth/register/:ke/:uid'
    ],function (req,res){
        endData = {
            ok : false
        }
        res.setHeader('Content-Type', 'application/json');
        s.auth(req.params,function(user){
            const {
                isSubAccount,
            } = s.checkPermission(user)
            if(isSubAccount){
                s.closeJsonResponse(res,{ok: false, msg: lang['Not an Administrator Account']});
                return
            }
            var form = s.getPostData(req)
            if(form.mail !== '' && form.pass !== ''){
                if(form.pass === form.password_again || form.pass === form.pass_again){
                    s.knexQuery({
                        action: "select",
                        columns: "*",
                        table: "Users",
                        where: [
                            ['mail','=',form.mail],
                        ]
                    },function(err,r){
                        if(r && r[0]){
                            //found one exist
                            endData.msg = lang['Email address is in use.']
                        }else{
                            //create new
                            endData.msg = 'New Account Created'
                            endData.ok = true
                            var newId = s.gid()
                            var details = s.s(Object.assign({
                                allmonitors: "1"
                            },s.parseJSON(form.details) || {}, {
                                sub: "1",
                            }))
                            s.knexQuery({
                                action: "insert",
                                table: "Users",
                                insert: {
                                    ke: req.params.ke,
                                    uid: newId,
                                    mail: form.mail,
                                    pass: s.createHash(form.pass),
                                    details: details,
                                }
                            })
                            s.tx({
                                f: 'add_sub_account',
                                details: details,
                                ke: req.params.ke,
                                uid: newId,
                                mail: form.mail
                            },'ADM_'+req.params.ke)
                            endData.user = {
                                details: s.parseJSON(details),
                                ke: req.params.ke,
                                uid: newId,
                                mail: form.mail
                            }
                        }
                        res.end(s.prettyPrint(endData))
                    })
                }else{
                    endData.msg = user.lang["Passwords Don't Match"]
                }
            }else{
                endData.msg = user.lang['Fields cannot be empty']
            }
        if(endData.msg){
            res.end(s.prettyPrint(endData))
        }
        },res,req)
    })
    /**
    * API : Administrator : Monitor : Add, Edit, and Delete
    */
    app.all([
        config.webPaths.apiPrefix+':auth/configureMonitor/:ke/:id',
        config.webPaths.apiPrefix+':auth/configureMonitor/:ke/:id/:f',
        config.webPaths.adminApiPrefix+':auth/configureMonitor/:ke/:id',
        config.webPaths.adminApiPrefix+':auth/configureMonitor/:ke/:id/:f'
    ], function (req,res){
        s.auth(req.params,async function(user){
            let endData = {
                ok: false
            }
            const groupKey = req.params.ke
            const monitorId = req.params.id
            const {
                monitorPermissions,
                monitorRestrictions,
            } = s.getMonitorsPermitted(user.details,monitorId)
            const {
                isRestricted,
                isRestrictedApiKey,
                apiKeyPermissions,
                userPermissions,
            } = s.checkPermission(user)
            if(
                userPermissions.monitor_create_disallowed ||
                isRestrictedApiKey && apiKeyPermissions.edit_monitors_disallowed ||
                isRestricted && !monitorPermissions[`${monitorId}_monitor_edit`]
            ){
                s.closeJsonResponse(res,{ok: false, msg: lang['Not Authorized']});
                return
            }
            switch(req.params.f){
                case'delete':
                    endData = await deleteMonitor({
                        ke: groupKey,
                        mid: monitorId,
                        user: user,
                        deleteFiles: req.query.deleteFiles === 'true',
                    });
                break;
                default:
                    var form = s.getPostData(req)
                    if(!form){
                       endData.msg = user.lang.monitorEditText1;
                       s.closeJsonResponse(res,endData)
                       return
                    }
                    form.mid = req.params.id.replace(/[^\w\s]/gi,'').replace(/ /g,'')
                    if(form && form.name){
                        s.checkDetails(form)
                        form.ke = req.params.ke
                        endData = await s.addOrEditMonitor(form,null,user)
                    }else{
                        endData.msg = user.lang.monitorEditText1;
                    }
                break;
            }
            s.closeJsonResponse(res,endData)
        },res,req)
    })
    /**
    * API : Add API Key, binded to the user who created it
    */
    app.all([
        config.webPaths.adminApiPrefix+':auth/api/:ke/add',
        config.webPaths.apiPrefix+':auth/api/:ke/add',
    ],function (req,res){
        var endData = {ok:false}
        res.setHeader('Content-Type', 'application/json');
        s.auth(req.params,function(user){
            var endData = {
                ok : false
            }
            var form = s.getPostData(req)
            if(form){
                const insertQuery = {
                    ke : req.params.ke,
                    uid : user.uid,
                    code : s.gid(30),
                    ip : form.ip,
                    details : s.stringJSON(form.details)
                }
                s.knexQuery({
                    action: "insert",
                    table: "API",
                    insert: insertQuery
                },(err,r) => {
                    insertQuery.time = s.formattedTime(new Date,'YYYY-DD-MM HH:mm:ss');
                    insertQuery.details = s.parseJSON(insertQuery.details)
                    if(!err){
                        s.tx({
                            f: 'api_key_added',
                            uid: user.uid,
                            form: insertQuery
                        },'GRP_' + req.params.ke)
                        endData.ok = true
                    }
                    endData.api = insertQuery
                    s.closeJsonResponse(res,endData)
                })
            }else{
                endData.msg = lang.postDataBroken
                s.closeJsonResponse(res,endData)
            }
        },res,req)
    })
    /**
    * API : Delete API Key
    */
    app.all([
        config.webPaths.adminApiPrefix+':auth/api/:ke/delete',
        config.webPaths.apiPrefix+':auth/api/:ke/delete',
    ],function (req,res){
        var endData = {ok:false}
        res.setHeader('Content-Type', 'application/json');
        s.auth(req.params,function(user){
            var endData = {
                ok : false
            }
            var form = s.getPostData(req) || {}
            const code = form.code || s.getPostData(req,'code',false)
            if(!code){
                s.tx({
                    f:'form_incomplete',
                    uid: user.uid,
                    form:'APIs'
                },'GRP_' + req.params.ke)
                endData.msg = lang.postDataBroken
                s.closeJsonResponse(res,endData)
                return
            }
            if(code){
                s.knexQuery({
                    action: "delete",
                    table: "API",
                    where: {
                        ke: req.params.ke,
                        uid: user.uid,
                        code: code,
                    }
                },(err,r) => {
                    if(!err){
                        s.tx({
                            f: 'api_key_deleted',
                            uid: user.uid,
                            form: {
                                code: code
                            }
                        },'GRP_' + req.params.ke)
                        endData.ok = true
                        delete(s.api[code])
                    }
                    s.closeJsonResponse(res,endData)
                })
            }else{
                endData.msg = lang.postDataBroken
                s.closeJsonResponse(res,endData)
            }
        },res,req)
    })
    /**
    * API : List API Keys for Authenticated user
    */
    app.get([
        config.webPaths.adminApiPrefix+':auth/api/:ke/list',
        config.webPaths.apiPrefix+':auth/api/:ke/list',
    ],function (req,res){
        var endData = {ok:false}
        res.setHeader('Content-Type', 'application/json');
        s.auth(req.params,function(user){
            var endData = {
                ok : false
            }
            const whereQuery = {
                ke : req.params.ke,
                uid : user.uid
            }
            s.knexQuery({
                action: "select",
                columns: "*",
                table: "API",
                where: whereQuery
            },function(err,rows) {
                if(rows && rows[0]){
                    rows.forEach(function(row){
                        row.details = JSON.parse(row.details)
                    })
                    endData.ok = true
                    endData.uid = user.uid
                    endData.ke = user.ke
                    endData.keys = rows
                }
                s.closeJsonResponse(res,endData)
            })
        },res,req)
    })
    /**
    * API : Administrator : Get Monitor State Presets List
    */
    app.all([
        config.webPaths.apiPrefix+':auth/monitorStates/:ke',
        config.webPaths.adminApiPrefix+':auth/monitorStates/:ke'
    ],function (req,res){
        s.auth(req.params,function(user){
            var endData = {
                ok : false
            }
            const groupKey = req.params.ke
            const {
                isRestricted,
                isRestrictedApiKey,
                apiKeyPermissions,
                userPermissions,
            } = s.checkPermission(user)
            if(
                userPermissions.monitor_create_disallowed ||
                isRestrictedApiKey && apiKeyPermissions.control_monitors_disallowed
            ){
                s.closeJsonResponse(res,{ok: false, msg: lang['Not Authorized']});
                return
            }
            s.knexQuery({
                action: "select",
                columns: "*",
                table: "Presets",
                where: [
                    ['ke','=',req.params.ke],
                    ['type','=','monitorStates'],
                ]
            },function(err,presets) {
                if(presets && presets[0]){
                    endData.ok = true
                    presets.forEach(function(preset){
                        preset.details = JSON.parse(preset.details)
                    })
                }
                endData.presets = presets || []
                s.closeJsonResponse(res,endData)
            })
        })
    })
    /**
    * API : Administrator : Change Group Preset. Currently affects Monitors only.
    */
    app.all([
        config.webPaths.apiPrefix+':auth/monitorStates/:ke/:stateName',
        config.webPaths.apiPrefix+':auth/monitorStates/:ke/:stateName/:action',
        config.webPaths.adminApiPrefix+':auth/monitorStates/:ke/:stateName',
        config.webPaths.adminApiPrefix+':auth/monitorStates/:ke/:stateName/:action',
    ],function (req,res){
        s.auth(req.params,function(user){
            var endData = {
                ok : false
            }
            const groupKey = req.params.ke
            const {
                isRestricted,
                isRestrictedApiKey,
                apiKeyPermissions,
                userPermissions,
            } = s.checkPermission(user)
            if(
                userPermissions.monitor_create_disallowed ||
                isRestrictedApiKey && apiKeyPermissions.control_monitors_disallowed
            ){
                s.closeJsonResponse(res,{ok: false, msg: lang['Not Authorized']});
                return
            }
            var presetQueryVals = [req.params.ke,'monitorStates',req.params.stateName]
            switch(req.params.action){
                case'insert':case'edit':
                    var form = s.getPostData(req)
                    s.checkDetails(form)
                    if(!form || !form.monitors){
                        endData.msg = user.lang['Form Data Not Found']
                        s.closeJsonResponse(res,endData)
                        return
                    }
                    s.findPreset(presetQueryVals,function(notFound,preset){
                        if(notFound === true){
                            endData.msg = lang["Inserted State Configuration"]
                            var details = {
                                monitors : form.monitors
                            }
                            var insertData = {
                                ke: req.params.ke,
                                name: req.params.stateName,
                                details: s.s(details),
                                type: 'monitorStates'
                            }
                            s.knexQuery({
                                action: "insert",
                                table: "Presets",
                                insert: insertData
                            })
                            s.tx({
                                f: 'add_group_state',
                                details: details,
                                ke: req.params.ke,
                                name: req.params.stateName
                            },'GRP_'+req.params.ke)
                        }else{
                            endData.msg = lang["Edited State Configuration"]
                            var details = Object.assign(preset.details,{
                                monitors : form.monitors
                            })
                            s.knexQuery({
                                action: "update",
                                table: "Presets",
                                update: {
                                    details: s.s(details)
                                },
                                where: [
                                    ['ke','=',req.params.ke],
                                    ['name','=',req.params.stateName],
                                ]
                            })
                            s.tx({
                                f: 'edit_group_state',
                                details: details,
                                ke: req.params.ke,
                                name: req.params.stateName
                            },'GRP_'+req.params.ke)
                        }
                        endData.ok = true
                        s.closeJsonResponse(res,endData)
                    })
                break;
                case'delete':
                    s.findPreset(presetQueryVals,function(notFound,preset){
                        if(notFound === true){
                            endData.msg = user.lang['State Configuration Not Found']
                            s.closeJsonResponse(res,endData)
                        }else{
                            s.knexQuery({
                                action: "delete",
                                table: "Presets",
                                where: {
                                    ke: req.params.ke,
                                    name: req.params.stateName,
                                }
                            },(err) => {
                                if(!err){
                                    endData.msg = lang["Deleted State Configuration"]
                                    endData.ok = true
                                }
                                s.closeJsonResponse(res,endData)
                            })
                        }
                    })
                break;
                default://change monitors according to state
                    s.activateMonitorStates(req.params.ke,req.params.stateName,user,function(endData){
                        s.closeJsonResponse(res,endData)
                    })
                break;
            }
        },res,req)
    })
}
