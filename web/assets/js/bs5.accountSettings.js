$(document).ready(function(){
    var accountSettingsWereSaved = false;
    var theBlock = $('#tab-accountSettings')
    var theContainer = $('#accountSettingsContainer')
    var theForm = $('#settings')
    var addStorageMaxAmounts = $('#add_storage_max_amounts')
    var addStorageMaxAmountsField = theForm.find('[detail="addStorage"]')
    function drawAddStorageFields(){
        try{
            var addStorageData = safeJsonParse($user.details.addStorage || '{}')
            var html = ''
            $.each(addStorage,function(n,storage){
                var theStorage = addStorageData[storage.path] || {}
                html += `
                <div addStorageFields="${storage.path}">
                    <div class="form-group">
                        <div class="mb-2"><span>${lang['Max Storage Amount']} : ${storage.name}</span></div>
                        <div><input class="form-control" placeholder="10000" addStorageItem="limit" value="${theStorage.limit || ''}"></div>
                    </div>
                    <div class="form-group">
                        <div class="mb-2"><span>${lang["Video Share"]} : ${storage.name}</span></div>
                        <div><input class="form-control" placeholder="95" addStorageItem="videoPercent" value="${theStorage.videoPercent || ''}"></div>
                    </div>
                    <div class="form-group">
                        <div class="mb-2"><span>${lang["Timelapse Frames Share"]} : ${storage.name}</span></div>
                        <div><input class="form-control" placeholder="5" addStorageItem="timelapsePercent" value="${theStorage.timelapsePercent || ''}"></div>
                    </div>
                </div>`
            })
            addStorageMaxAmounts.html(html)
        }catch(err){
            console.log(err)
        }
    }
    function fillFormFields(){
        $.each($user,function(n,v){
            theForm.find(`[name="${n}"]`).val(v).change()
        })
        $.each($user.details,function(n,v){
            theForm.find(`[detail="${n}"]`).val(v).change()
        })
        accountSettings.onLoadFieldsExtensions.forEach(function(extender){
            extender(theForm)
        })
    }
    function getAddStorageFields(){
        var json = {}
        $.each(addStorage,function(n,storage){
            var storageId = storage.path
            var miniContainer = addStorageMaxAmounts.find(`[addStorageFields="${storageId}"]`)
            var fields = miniContainer.find('[addStorageItem]')
            json[storageId] = {
                name: storage.name,
                path: storage.path,
            }
            $.each(fields,function(n,el){
                var field = $(el)
                var keyName = field.attr('addStorageItem')
                var value = field.val()
                json[storageId][keyName] = value
            })
        })
        return json
    }
    theForm.find('[detail]').change(onDetailFieldChange)
    theForm.find('[detail]').change(function(){
        onDetailFieldChange(this)
    })
    theForm.find('[selector]').change(function(){
        onSelectorChange(this,theForm)
    })
    theForm.submit(function(e){
        e.preventDefault()
        var formData = theForm.serializeObject()
        var errors = []
        if(formData.pass !== '' && formData.password_again !== formData.pass){
            errors.push(lang[`Passwords don't match`])
        }
        if(errors.length > 0){
            new PNotify({
                title: lang.accountSettingsError,
                text: errors.join('<br>'),
                type: 'danger'
            })
            return
        }
        $.each(formData,function(n,v){
            formData[n] = v.trim()
        })
        var details = getDetailValues(theForm)
        formData.details = details
        formData.details.addStorage = getAddStorageFields()
        accountSettings.onSaveFieldsExtensions.forEach(function(extender){
            extender(formData)
        })
        $.post(getApiPrefix('accounts') + '/edit',{
            data: JSON.stringify(formData)
        },function(data){
            if(data.ok){
                // new PNotify({
                //     title: lang['Settings Changed'],
                //     text: lang.SettingsChangedText,
                //     type: 'success'
                // })
            }
        })
        if(details.googd_save === '1' && details.googd_code && details.googd_code !== '***************'){
            theForm.find('[detail="googd_code"]').val('***************')
        }
        return false
    })
    fillFormFields()
    drawAddStorageFields()
    drawSubMenuItems('accountSettings',definitions['Account Settings'])
    onWebSocketEvent(function (d){
        switch(d.f){
            case'user_settings_change':
                new PNotify({
                    title: lang['Settings Changed'],
                    text: lang.SettingsChangedText,
                    type: 'success'
                })
                // $.ccio.init('id',d.form);
                d.form.details = safeJsonParse(d.form.details)
                $('#custom_css').html(d.form.details.css)
                if(d.form.details){
                    $user.details = d.form.details
                }
                sortListMonitors()
                accountSettingsWereSaved = true;
            break;
        }
    })
    addOnTabReopen('accountSettings', function () {
        if(accountSettingsWereSaved){
            accountSettingsWereSaved = false;
            fillFormFields()
        }
    })
})
