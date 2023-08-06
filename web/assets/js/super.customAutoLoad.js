$(document).ready(function(){
    var loadedModules = {}
    var listElement = $('#customAutoLoadList')
    var quickSelectEl = $('#moduleQuickSelect')
    var downloadForm = $('#downloadNewModule')
    var getModules = function(callback) {
        $.get(superApiPrefix + $user.sessionKey + '/package/list',callback)
    }
    function getDownloadableModules(callback) {
        return new Promise((resolve,reject) => {
            const pluginListUrl = `https://gitlab.com/api/v4/projects/Shinobi-Systems%2FcustomAutoLoad-samples/repository/tree?path=samples`
            const filePrefix = `https://gitlab.com/Shinobi-Systems/customAutoLoad-samples/-/`
            $.getJSON(pluginListUrl,function(data){
                var html = ''
                data.forEach(item => {
                    let downloadLink;
                    if (item.type === 'blob') {
                        downloadLink = `${filePrefix}raw/main/samples/${item.name}`;
                        return;
                    } else if (item.type === 'tree') {
                        downloadLink = `${filePrefix}archive/master/customautoload-samples-master.zip,${item.path}`;
                    }
                    html += `<option value="${downloadLink}">${item.name}</option>`
                });
                quickSelectEl.html(html);
            })
        })
    }
    var loadedBlocks = {}
    var drawModuleBlock = function(module){
        var humanName = module.properties.name ? module.properties.name : module.name
        if(listElement.find('[package-name="${module.name}"]').length > 0){
            var existingElement = listElement.find('[package-name="${module.name}"]')
            existingElement.find('.title').text(humanName)
            existingElement.find('[calm-action="status"]').text(module.properties.disabled ? lang.Enable : lang.Disable)
        }else{
            listElement.prepend(`
                <div class="col-md-12">
                    <div class="card bg-dark mb-3" package-name="${module.name}">
                        <div class="card-body">
                            <div><h4 class="title mt-0">${humanName}</h4></div>
                            <div class="pb-2"><b>${lang['Time Created']} :</b> ${module.created}</div>
                            <div class="pb-2"><b>${lang['Last Modified']} :</b> ${module.lastModified}</div>
                            <div class="mb-2">
                                ${!module.isIgnitor ? `
                                    ${module.hasInstaller ? `
                                        <a class="btn btn-sm btn-info" calm-action="install">${lang['Run Installer']}</a>
                                    ` : ''}
                                    <a class="btn btn-sm btn-default" calm-action="status">${module.properties.disabled ? lang.Enable : lang.Disable}</a>
                                ` : ''}
                                <a class="btn btn-sm btn-danger" calm-action="delete">${lang.Delete}</a>
                            </div>
                            <div class="pl-2 pr-2">
                                <div class="install-output row">
                                    <div class="col-md-6 pr-2 mb-2"><pre class="install-output-stdout text-white mb-0"></pre></div>
                                    <div class="col-md-6 pl-2 mb-2"><pre class="install-output-stderr text-white mb-0"></pre></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>`)
            var newBlock = $(`.card[package-name="${module.name}"]`)
            loadedBlocks[module.name] = Object.assign({
                block: newBlock,
                stdout: newBlock.find('.install-output-stdout'),
                stderr: newBlock.find('.install-output-stderr'),
            },module)
            loadedModules[module.name] = module;
        }
    }
    var downloadModule = function(url,packageRoot,callback){
        $.confirm.create({
            title: 'Module Download',
            body: `Do you want to download the module from ${url}? `,
            clickOptions: {
                class: 'btn-success',
                title: lang.Download,
            },
            clickCallback: function(){
                $.post(superApiPrefix + $user.sessionKey + '/package/download',{
                    downloadUrl: url,
                    packageRoot: packageRoot,
                },callback)
            }
        })
    }
    var installModule = function(packageName,callback){
        $.confirm.create({
            title: 'Install Module',
            body: `Do you want to install the module ${packageName}?`,
            clickOptions: {
                class: 'btn-success',
                title: lang.Install,
            },
            clickCallback: function(){
                $.post(superApiPrefix + $user.sessionKey + '/package/install',{
                    packageName: packageName,
                },callback)
            }
        })
    }
    var deleteModule = function(packageName,callback){
        $.confirm.create({
            title: 'Delete Module',
            body: `Do you want to delete the module ${packageName}?`,
            clickOptions: {
                class: 'btn-danger',
                title: lang.Delete,
            },
            clickCallback: function(){
                $.post(superApiPrefix + $user.sessionKey + '/package/delete',{
                    packageName: packageName,
                },callback)
            }
        })
    }
    var setModuleStatus = function(packageName,status,callback){
        $.post(superApiPrefix + $user.sessionKey + '/package/status',{
            status: status,
            packageName: packageName,
        },callback)
    }
    $('body').on(`click`,`[calm-action]`,function(e){
        e.preventDefault()
        var el = $(this)
        var action = el.attr('calm-action')
        var card = el.parents('[package-name]')
        console.log(card.length)
        var packageName = card.attr('package-name')
        switch(action){
            case'install':
                installModule(packageName,function(data){
                    if(data.ok){
                        console.log(data)
                    }
                })
            break;
            case'status':
                setModuleStatus(packageName,!!!loadedModules[packageName].properties.disabled,function(data){
                    if(data.ok){
                        loadedModules[packageName].properties.disabled = !!!loadedModules[packageName].properties.disabled
                        el.text(loadedModules[packageName].properties.disabled ? lang.Enable : lang.Disable)
                    }
                })
            break;
            case'delete':
                deleteModule(packageName,function(data){
                    if(data.ok){
                        card.remove()
                    }
                })
            break;
        }
    })
    downloadForm.submit(function(e){
        e.preventDefault();
        var el = $(this)
        var form = el.serializeObject()
        downloadModule(form.downloadUrl,form.packageRoot,function(data){
            console.log(data)
            if(data.ok){
                data.newModule.properties.disabled = true
                drawModuleBlock(data.newModule)
            }
        })
        return false
    })
    $('#moduleQuickSelectExec').click(function(){
        var currentVal = quickSelectEl.val()
        var valParts = currentVal.split(',')
        var packageUrl = `${valParts[0]}`
        var packageRoot = valParts[1]
        downloadForm.find(`[name="downloadUrl"]`).val(packageUrl)
        downloadForm.find(`[name="packageRoot"]`).val(packageRoot)
        downloadForm.find(`[name="downloadUrl"]`).val(packageUrl)
        downloadForm.submit()
    })
    setTimeout(function(){
        getModules(function(data){
            loadedModules = data.modules
            console.log(loadedModules)
            $.each(data.modules,function(n,module){
                drawModuleBlock(module)
            })
        })
    },2000)
    $.ccio.ws.on('f',function(data){
        switch(data.f){
            case'module-info':
                var name = data.module
                switch(data.process){
                    case'install-stdout':
                        loadedBlocks[name].stdout.append(`<div class="line">${data.data}</div>`)
                        // if(loadedBlocks[name].stdout.find('.line').length > 10){
                        //     loadedBlocks[name].stdout.children().first().remove()
                        // }
                    break;
                    case'install-stderr':
                        loadedBlocks[name].stderr.append(`<div class="line">${data.data}</div>`)
                        // if(loadedBlocks[name].stderr.find('.line').length > 10){
                        //     loadedBlocks[name].stderr.children().first().remove()
                        // }
                    break;
                }
            break;
        }
    })
    getDownloadableModules()
})
