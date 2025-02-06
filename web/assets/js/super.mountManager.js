$(document).ready(function(){
    const loadedMounts = {}
    const theEnclosure = $('#superMountManager')
    const theSearch = $('#mountManagerListSearch')
    const theTable = $('#mountManagerListTable tbody')
    const newMountForm = $('#mountManagerNewMount')
    function getMountId(theMount){
        return `${theMount.mountPoint.split('/').join('_')}`
    }
    function drawMountToTable(theMount){
        var html = `
        <tr row-mounted="${getMountId(theMount)}">
            <td class="align-middle">
                <div>${theMount.device}</div>
                <div><small>${theMount.mountPoint}</small></div>
            </td>
            <td class="align-middle">
                ${theMount.type}
            </td>
            <td class="align-middle">
                ${theMount.options}
            </td>
            <td class="align-middle">
                <a class="btn btn-primary btn-sm cursor-pointer edit" title="${lang.Edit}"><i class="fa fa-pencil-square-o"></i></a>
                <a class="btn btn-success btn-sm cursor-pointer setVideosDir" title="${lang.videosDir}"><i class="fa fa-download"></i></a>
                <a class="btn btn-danger btn-sm cursor-pointer delete" title="${lang.Delete}"><i class="fa fa-trash-o"></i></a>
            </td>
        </tr>`
        theTable.append(html)
    }
    function drawMountsTable(data){
        theTable.empty()
        $.each(data,function(n,theMount){
            drawMountToTable(theMount)
        });
    }
    function filterMountsTable(theSearch = '') {
        var searchQuery = theSearch.trim().toLowerCase();
        if(searchQuery === ''){
            theTable.find(`[row-mounted]`).show()
            return;
        }
        var rows = Object.values(loadedMounts);
        var filtered = []
        rows.forEach((row) => {
            var searchInString = JSON.stringify(row).toLowerCase();
            var theElement = theTable.find(`[row-mounted="${getMountId(row)}"]`)
            if(searchInString.indexOf(searchQuery) > -1){
                theElement.show()
            }else{
                theElement.hide()
            }
        })
        return filtered
    }
    function loadMounts(callback) {
        return new Promise((resolve,reject) => {
            $.getJSON(superApiPrefix + $user.sessionKey + '/mountManager/list',function(data){
                $.each(data.mounts,function(n,theMount){
                    loadedMounts[getMountId(theMount)] = theMount;
                })
                drawMountsTable(data.mounts)
                resolve(data)
            })
        })
    }
    function addMount(form) {
        return new Promise((resolve,reject) => {
            // const { sourceTarget, localPath, mountType, options } = form;
            $.post(superApiPrefix + $user.sessionKey + '/mountManager/mount', form,function(data){
                resolve(data)
            })
        })
    }
    function removeMount(localPath) {
        return new Promise((resolve,reject) => {
            $.post(superApiPrefix + $user.sessionKey + '/mountManager/removeMount',{
                localPath
            },function(data){
                resolve(data)
            })
        })
    }
    function setVideosDir(localPath, pathInside) {
        return new Promise((resolve,reject) => {
            $.post(superApiPrefix + $user.sessionKey + '/mountManager/setVideosDir',{
                localPath,
                pathInside
            },function(data){
                resolve(data)
            })
        })
    }
    function launchSetVideoDirConfirm(localPath){
        $.confirm.create({
            title: lang['Set New Videos Directory'],
            body: `<b>${lang['Mount Path']} : ${localPath}</b><br>${lang.setVideosDirWarning} ${lang.restartRequired}<br><br><input placeholder="${lang['Path Inside Mount']}" class="form-control" id="newVideosDirInnerPath">`,
            clickOptions: {
                class: 'btn-success',
                title: lang.Save,
            },
            clickCallback: async function(){
                const pathInside = $('#newVideosDirInnerPath').val().trim();
                const response = await setVideosDir(localPath, pathInside);
                if(response.ok){
                    new PNotify({
                        title: lang['New Videos Directory Set'],
                        text: lang.restartRequired,
                        type: 'success'
                    })
                }else{
                    new PNotify({
                        title: lang['Action Failed'],
                        text: lang['See System Logs'],
                        type: 'danger'
                    })
                }
            }
        })
    }
    newMountForm.submit(async function(e){
        e.preventDefault();
        const form = newMountForm.serializeObject();
        $.each(form, function(key,val){form[key] = val.trim()});
        const response = await addMount(form);
        const notify = {
            title: lang['Mount Added'],
            text: lang.mountAddedText,
            type: 'success'
        }
        if(!response.ok){
            notify.title = lang['Failed to Add Mount']
            notify.text = response.error
            notify.type = 'danger'
        }else{
            const theMount = response.mount
            const mountId = getMountId(theMount);
            theTable.find(`[row-mounted="${mountId}"]`).remove()
            loadedMounts[mountId] = theMount;
            drawMountToTable(theMount);
        }
        new PNotify(notify)
        return false;
    });
    theTable.on('click','.delete', async function(e){
        const el = $(this).parents('[row-mounted]')
        const mountId = el.attr('row-mounted');
        const theMount = loadedMounts[mountId]
        const localPath = theMount.mountPoint
        $.confirm.create({
            title: lang['Delete Mount'],
            body: `<b>${lang['Mount Path']} : ${localPath} (${theMount.type})</b><br><small>${theMount.device}</small><br>${lang.setVideosDirWarning}`,
            clickOptions: {
                class: 'btn-danger',
                title: lang.Delete,
            },
            clickCallback: async function(){
                const response = await removeMount(localPath);
                if(response.ok){
                    el.remove()
                }else{
                    new PNotify({
                        title: lang['Failed to Remove Mount'],
                        text: lang['See System Logs'],
                        type: 'danger'
                    })
                }
            }
        })
    })
    theTable.on('click','.edit', async function(e){
        const el = $(this).parents('[row-mounted]')
        const mountId = el.attr('row-mounted');
        const theMount = loadedMounts[mountId]
        newMountForm.find('[name="sourceTarget"]').val(theMount.device)
        newMountForm.find('[name="localPath"]').val(theMount.mountPoint)
        newMountForm.find('[name="mountType"]').val(theMount.type)
        newMountForm.find('[name="options"]').val(theMount.options)
    })
    theTable.on('click','.setVideosDir', function(e){
        const el = $(this).parents('[row-mounted]')
        const mountId = el.attr('row-mounted');
        const theMount = loadedMounts[mountId]
        const localPath = theMount.mountPoint
        launchSetVideoDirConfirm(localPath)
    })
    theEnclosure.on('click','.setDefaultVideosDir', function(e){
        launchSetVideoDirConfirm('__DIR__/videos')
    })
    theSearch.keydown(function(){
        const value = $(this).val().trim()
        filterMountsTable(value)
    })
    onInitSuccess(loadMounts)
})
