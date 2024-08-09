$(document).ready(function(){
    var alternateLoginsBox = $('#alternate-logins')
    function getAlternateLogins(){
        $.get(getApiPrefix('loginTokens'),function(data){
            var rows = data.rows
            alternateLoginsBox.empty()
            if(rows.length > 0){
                $.each(rows,function(n,row){
                    alternateLoginsBox.append(`<div class="row" login-id="${row.loginId}" style="border-bottom: 1px solid #333;padding-top:1rem;padding-bottom:1rem;display:flex">
                        <div class="col-md-3" style="flex: 3">
                            <i class="fa fa-address-card"></i> &nbsp;
                            <span class="epic-text text-white">${row.type}</span>
                        </div>
                        <div class="col-md-3" style="flex: 3">
                            <div>${row.name}</div>
                        </div>
                        <div class="col-md-3" style="flex: 3">
                            <div title="${lang.lastLogin}">${moment(row.lastLogin).format('YYYY-MM-DD hh:mm:ss A')}</div>
                        </div>
                        <div class="col-md-3 text-right" style="flex: 3">
                            <a class="btn badge-sm badge btn-danger unlink-account"><i class="fa fa-unlink"></i> ${lang.Unlink}</a>
                        </div>
                    </div>`)
                })
            }else{
                alternateLoginsBox.append(`<div class="row">
                    <div class="col-md-12 text-center epic-text" style="margin: 0">
                        ${lang.noLoginTokensAdded}
                    </div>
                </div>`)
            }
        })
    }
    getAlternateLogins()
    alternateLoginsBox.on('click','.unlink-account',function(){
        var loginId = $(this).parents('[login-id]').attr('login-id')
        $.confirm.create({
            title: lang['Unlink Login'],
            body: lang.noUndoForAction,
            clickOptions: {
                title: lang['Unlink'],
                class: 'btn-danger'
            },
            clickCallback: function(){
                $.get(getApiPrefix('loginTokens') + '/' + loginId + '/delete',function(data){
                    if(data.ok){
                        new PNotify({
                            title: lang.Unlinked,
                            text: lang.loginHandleUnbound,
                            type: 'success'
                        })
                        alternateLoginsBox.find(`[login-id="${loginId}"]`).remove()
                    }
                })
            }
        })
    })
    window.drawAlternateLoginsToSettings = getAlternateLogins
})
