$(document).ready(function(){
    var theEnclosure = $('#centralManagement')
    var theForm = theEnclosure.find('form')
    theEnclosure.find('.submit').click(function(){
        theForm.submit()
    })
    theForm.submit(function(e){
        e.preventDefault()
        var formValues = $(this).serializeObject()
        $.post(superApiPrefix + $user.sessionKey + '/mgmt/save',{
            data: JSON.stringify(formValues)
        },function(data){
            console.log(data)
            if(data.ok){
                new PNotify({
                    type: 'success',
                    title: lang['Settings Changed'],
                    text: lang.centralManagementSaved,
                })
            }
        })
        return false
    })
})
