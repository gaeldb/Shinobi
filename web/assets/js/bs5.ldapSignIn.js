$(document).ready(function(){
    $('#settings').on('click','.ldap-sign-in',function(e){
        e.preventDefault()
        var signInWindow = window.open(getApiPrefix('loginTokenAddLDAP'),'popup','width=500,height=700,scrollbars=no,resizable=no');
        if(!signInWindow || signInWindow.closed || typeof signInWindow.closed=='undefined'){
            alert(`Your Popup Blocker is disabling this feature.`)
        }else{
            signInWindow.onbeforeunload = function(){
                drawAlternateLoginsToSettings()
            }
        }
        return false;
    })
})
