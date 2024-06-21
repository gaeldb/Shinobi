const LdapAuth = require('ldapauth-fork');
module.exports = (s,config,lang,app) => {
    const {
        basicAuth,
    } = require('./utils.js')(s,config,lang)
    const {
        getLoginToken,
        deleteLoginToken,
        bindLoginIdToUser,
        refreshLoginTokenAccessDate,
    } = require('./alternateLogins.js')(s,config,lang)
    async function ldapAuth(params) {
        return new Promise((resolve,reject) => {
            const response = { ok: false }
            let ldapUrl = params.url
            ldapUrl = ldapUrl.startsWith('ldap://') ? ldapUrl : `ldap://${ldapUrl}`
            const host = ldapUrl.split('://')[1]
            const username = params.username// || 'ubuntu2'
            const password = params.password// || 'moeiscool'
            const bindDN = params.bindDN// || 'uid=ubuntu2,ou=People,dc=example,dc=com'
            const searchBase = params.searchBase// || 'ou=People,dc=example,dc=com'
            let searchFilter = params.searchFilter// || '(uid={{username}})'
            searchFilter = searchFilter.startsWith('(') ? searchFilter : '(' + searchFilter
            searchFilter = searchFilter.endsWith(')') ? searchFilter : searchFilter + ')'
            const ldap = new LdapAuth({
              url: ldapUrl,
              bindDN: bindDN,
              bindCredentials: password,
              searchBase: searchBase,
              searchFilter: searchFilter,
              reconnect: true
            })

            ldap.authenticate(username, password, function(err, user) {
                if(err){
                    response.err = err
                }else{
                    response.ok = true
                    response.user = {
                        id: host + '_' + user.uidNumber,
                        name: user.givenName + ' ' + user.sn,
                    }
                }
                resolve(response)
            })
        })
    }
    async function loginWithLdapAccount(params) {
        const response = {ok: false, ldapSignedIn: false}
        const tokenResponse = await ldapAuth(params)
        if(tokenResponse.ok){
            const user = tokenResponse.user
            response.ldapSignedIn = true
            response.ldapUser = user
            const foundToken = await getLoginToken(user.id,'ldap')
            if(foundToken){
                const userResponse = await s.knexQueryPromise({
                    action: "select",
                    columns: '*',
                    table: "Users",
                    where: [
                        ['uid','=',foundToken.uid],
                        ['ke','=',foundToken.ke],
                    ],
                    limit: 1
                })
                response.ok = true
                userResponse.rows[0].details = s.parseJSON(userResponse.rows[0].details)
                response.user = userResponse.rows[0]
            }else{
                response.msg = lang.tokenNotUserBound
                // make new if no users?
            }
        }
        return response
    }
    async function updateLdapBaseDetails(params,updateFields){
        const url = updateFields.ldap_url
        const bindDN = updateFields.ldap_bindDN
        const searchBase = updateFields.ldap_searchBase
        const searchFilter = updateFields.ldap_searchFilter
        const userResponse = await s.knexQueryPromise({
            action: "select",
            columns: "*",
            table: "Users",
            where: [
                ['ke','=',params.groupKey],
                ['uid','=',params.userId],
            ],
        })
        const userDetails = JSON.parse(userResponse.rows[0].details)
        userDetails.ldap_url = url
        userDetails.ldap_bindDN = bindDN
        userDetails.ldap_searchBase = searchBase
        userDetails.ldap_searchFilter = searchFilter
        await s.knexQueryPromise({
            action: "update",
            table: "Users",
            update: {
                details: JSON.stringify(userDetails)
            },
            where: [
                ['ke','=',params.groupKey],
                ['uid','=',params.userId],
            ]
        })
    }
    s.onProcessReady(() => {
        config.renderPaths.loginTokenAddLDAP = `pages/blocks/loginTokenAddLDAP`
        s.alternateLogins['ldap'] = async (params) => {
            const response = { ok: false }
            const groupKey = params.key
            const userResponse = await s.knexQueryPromise({
                action: "select",
                columns: "*",
                table: "Users",
                where: [
                    ['ke','=',params.key],
                    ['details','NOT LIKE','%"sub"%'],
                ],
            })
            if(userResponse.rows[0]){
                const userDetails = JSON.parse(userResponse.rows[0].details)
                const url = userDetails.ldap_url
                const bindDN = userDetails.ldap_bindDN
                const searchBase = userDetails.ldap_searchBase
                const searchFilter = userDetails.ldap_searchFilter
                const username = params.mail
                const password = params.pass
                const ldapLoginResponse = await loginWithLdapAccount({
                    url: url,
                    username: username,
                    password: password,
                    bindDN: bindDN,
                    searchBase: searchBase,
                    searchFilter: searchFilter,
                })
                if(ldapLoginResponse.user){
                    const user = ldapLoginResponse.user
                    response.ok = true
                    response.user = user
                    refreshLoginTokenAccessDate(ldapLoginResponse.ldapUser.id,'ldap')
                }else{
                    response.msg = ldapLoginResponse.msg
                }
            }
            return response
        }
        const alternateLoginsFieldList = s.definitions["Account Settings"].blocks["AlternateLogins"].info
        alternateLoginsFieldList[alternateLoginsFieldList.length - 1].btns.push({
           "class": `btn-info ldap-sign-in`,
           "btnContent": `<i class="fa fa-group"></i> &nbsp; ${lang['Link LDAP Account']}`,
        });
        s.customAutoLoadTree['AssetsJs'].push(`bs5.ldapSignIn.js`)
    })
    /**
    * API : Add Token Window (Sign-In to LDAP) (GET)
     */
    app.get(config.webPaths.apiPrefix+':auth/loginTokenAddLDAP/:ke', function (req,res){
        s.auth(req.params,(user) => {
            s.renderPage(req,res,config.renderPaths.loginTokenAddLDAP,{
                lang: lang,
                define: s.getDefinitonFile(user.details.lang),
                config: s.getConfigWithBranding(req.hostname),
                $user: user
            })
        },res,req);
    });
    /**
    * API : Add Token Window (Sign-In to LDAP) (POST)
     */
    app.post(config.webPaths.apiPrefix+':auth/loginTokenAddLDAP/:ke', function (req,res){
        const response = {ok: false};
        s.auth(req.params,async (user) => {
            const userId = user.uid
            const groupKey = req.params.ke
            const url = req.body.ldap_url
            const bindDN = req.body.ldap_bindDN
            const searchBase = req.body.ldap_searchBase
            const searchFilter = req.body.ldap_searchFilter
            const username = req.body.username
            const password = req.body.password
            const authPostBody = {
                url: url,
                username: username,
                password: password,
                bindDN: bindDN,
                searchBase: searchBase,
                searchFilter: searchFilter,
            }
            const tokenResponse = await ldapAuth(authPostBody)
            if(tokenResponse.ok){
                const ldapUser = tokenResponse.user
                const loginId = ldapUser.id
                if(!user.details.sub){
                    updateLdapBaseDetails({
                        groupKey: groupKey,
                        userId: user.uid,
                    },req.body)
                }
                const bindResponse = await bindLoginIdToUser({
                    loginId: loginId,
                    ke: groupKey,
                    uid: userId,
                    name: ldapUser.name,
                    type: 'ldap'
                })
                response.ok = bindResponse.ok
                response.msg = bindResponse.msg
            }
            s.closeJsonResponse(res,response)
        },res,req);
    });
    return {
        loginWithLdapAccount: loginWithLdapAccount,
    }
}
