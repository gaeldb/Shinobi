module.exports = function(s,config,lang){
    s.onVideoAccess((videoRow,user,groupKey,monitorId,ip) => {
        s.userLog({
            ke: groupKey,
            mid: '$USER',
        },{
            type: lang['Video Accessed'],
            msg: {
                user: {
                    mail: user.mail,
                    uid: user.uid,
                    ip,
                },
                video: videoRow
            }
        })
    })
    s.onLogout((user,groupKey,userId,ip) => {
        s.userLog({
            ke: groupKey,
            mid: '$USER',
        },{
            type: lang['User Logged Out'],
            msg: {
                mail: user.mail,
                uid: user.uid,
                ip,
            }
        })
    })
}
