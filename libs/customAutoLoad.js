const fs = require('fs-extra');
const express = require('express')
const unzipper = require('unzipper')
const fetch = require("node-fetch")
const spawn = require('child_process').spawn
module.exports = async (s,config,lang,app,io) => {
    const { fetchDownloadAndWrite } = require('./basic/utils.js')(process.cwd(),config)
    s.debugLog(`+++++++++++CustomAutoLoad Modules++++++++++++`)
    const runningInstallProcesses = {}
    const modulesBasePath = __dirname + '/customAutoLoad/'
    const extractNameFromPackage = (filePath) => {
        const filePathParts = filePath.split('/')
        const packageName = filePathParts[filePathParts.length - 1].split('.')[0]
        return packageName
    }
    const getModulePath = (name) => {
        return modulesBasePath + name + '/'
    }
    const getModule = (moduleName) => {
        s.debugLog(`+++++++++++++++++++++++`)
        s.debugLog(`Getting Module : ${moduleName}`)
        const modulePath = modulesBasePath + moduleName
        const stats = fs.lstatSync(modulePath)
        const isDirectory = stats.isDirectory()
        const newModule = {
            name: moduleName,
            path: modulePath + '/',
            size: stats.size,
            lastModified: stats.mtime,
            created: stats.ctime,
            isDirectory: isDirectory,
        }
        if(isDirectory){
            var hasInstaller = false
            if(!fs.existsSync(modulePath + '/index.js')){
                hasInstaller = true
                newModule.noIndex = true
            }
            if(fs.existsSync(modulePath + '/package.json')){
                hasInstaller = true
                newModule.properties = getModuleProperties(moduleName)
            }else{
                newModule.properties = {
                    name: moduleName
                }
            }
            newModule.hasInstaller = hasInstaller
        }else{
            newModule.isIgnitor = (moduleName.indexOf('.js') > -1)
            newModule.properties = {
                name: moduleName
            }
        }
        return newModule
    }
    const getModules = (asArray) => {
        const foundModules = {}
        fs.readdirSync(modulesBasePath).forEach((moduleName) => {
            foundModules[moduleName] = getModule(moduleName)
        })
        return asArray ? Object.values(foundModules) : foundModules
    }
    const downloadModule = (downloadUrl,packageName) => {
        const downloadPath = modulesBasePath + packageName
        fs.mkdirSync(downloadPath)
        return new Promise(async (resolve, reject) => {
            fs.mkdir(downloadPath, () => {
                fetchDownloadAndWrite(downloadUrl,downloadPath + '.zip', 1)
                .then((readStream) => {
                    readStream.pipe(unzipper.Parse())
                    .on('entry', async (file) => {
                        if(file.type === 'Directory'){
                            try{
                                fs.mkdirSync(modulesBasePath + file.path, { recursive: true })
                            }catch(err){

                            }
                        }else{
                            const content = await file.buffer();
                            fs.writeFile(modulesBasePath + file.path,content,(err) => {
                                if(err)console.log(err)
                            })
                        }
                    })
                    .promise()
                    .then(() => {
                        fs.remove(downloadPath + '.zip', () => {})
                        resolve()
                    })
                })
            })
        })
    }
    const getModuleProperties = (name) => {
        const modulePath = getModulePath(name)
        const propertiesPath = modulePath + 'package.json'
        const properties = fs.existsSync(propertiesPath) ? s.parseJSON(fs.readFileSync(propertiesPath)) : {
            name: name
        }
        return properties
    }
    const installModule = (name) => {
        return new Promise((resolve, reject) => {
            if(!runningInstallProcesses[name]){
                //depending on module this may only work for Ubuntu
                const modulePath = getModulePath(name)
                const properties = getModuleProperties(name);
                const installerPath = modulePath + `INSTALL.sh`
                const propertiesPath = modulePath + 'package.json'
                var installProcess
                // check for INSTALL.sh (ubuntu only)
                if(fs.existsSync(installerPath)){
                    installProcess = spawn(`sh`,[installerPath])
                }else if(fs.existsSync(propertiesPath)){
                    // no INSTALL.sh found, check for package.json and do `npm install --unsafe-perm`
                    installProcess = spawn(`npm`,['install','--unsafe-perm','--prefix',modulePath])
                }else{
                    resolve()
                }
                if(installProcess){
                    const sendData = (data,channel) => {
                        const clientData = {
                            f: 'module-info',
                            module: name,
                            process: 'install-' + channel,
                            data: data.toString(),
                        }
                        s.tx(clientData,'$')
                        s.debugLog(clientData)
                    }
                    installProcess.stderr.on('data',(data) => {
                        sendData(data,'stderr')
                    })
                    installProcess.stdout.on('data',(data) => {
                        sendData(data,'stdout')
                    })
                    installProcess.on('exit',(data) => {
                        runningInstallProcesses[name] = null;
                        resolve()
                    })
                    runningInstallProcesses[name] = installProcess
                }
            }else{
                resolve(lang['Already Installing...'])
            }
        })
    }
    const disableModule = (name,status) => {
        // set status to `false` to enable
        const modulePath = getModulePath(name)
        const properties = getModuleProperties(name);
        const propertiesPath = modulePath + 'package.json'
        var packageJson = {
            name: name
        }
        try{
            packageJson = JSON.parse(fs.readFileSync(propertiesPath))
        }catch(err){

        }
        packageJson.disabled = status;
        fs.writeFileSync(propertiesPath,s.prettyPrint(packageJson))
    }
    const deleteModule = (name) => {
        // requires restart for changes to take effect
        try{
            const modulePath = modulesBasePath + name
            fs.remove(modulePath, (err) => {
                console.log(err)
            })
            return true
        }catch(err){
            console.log(err)
            return false
        }
    }
    const loadModule = (shinobiModule) => {
        s.debugLog(`+++++++++++++++++++++++`)
        const moduleName = shinobiModule.name
        s.debugLog(`Loading Module : ${moduleName}`)
        s.customAutoLoadModules[moduleName] = {}
        var customModulePath = modulesBasePath + '/' + moduleName
        s.debugLog(customModulePath)
        s.debugLog(JSON.stringify(shinobiModule,null,3))
        if(shinobiModule.isIgnitor){
            s.customAutoLoadModules[moduleName].type = 'file'
            try{
                require(customModulePath)(s,config,lang,app,io)
            }catch(err){
                s.systemLog('Failed to Load Module : ' + moduleName)
                s.systemLog(err)
            }
        }else if(shinobiModule.isDirectory){
            s.customAutoLoadModules[moduleName].type = 'folder'
            try{
                require(customModulePath)(s,config,lang,app,io)
                fs.readdir(customModulePath,function(err,folderContents){
                    folderContents.forEach(function(name){
                        switch(name){
                            case'web':
                                var webFolder = s.checkCorrectPathEnding(customModulePath) + 'web/'
                                fs.readdir(webFolder,function(err,webFolderContents){
                                    webFolderContents.forEach(function(name){
                                        switch(name){
                                            case'assets':
                                            case'libs':
                                            case'pages':
                                                if(name === 'libs'){
                                                    if(config.webPaths.home !== '/'){
                                                        app.use('/libs',express.static(webFolder + '/libs'))
                                                    }
                                                    app.use(s.checkCorrectPathEnding(config.webPaths.home)+'libs',express.static(webFolder + '/libs'))
                                                    app.use(s.checkCorrectPathEnding(config.webPaths.super)+'libs',express.static(webFolder + '/libs'))
                                                }else if(name === 'assets'){
                                                    if(config.webPaths.home !== '/'){
                                                        app.use('/assets',express.static(webFolder + '/assets'))
                                                    }
                                                    app.use(s.checkCorrectPathEnding(config.webPaths.home)+'assets',express.static(webFolder + '/assets'))
                                                    app.use(s.checkCorrectPathEnding(config.webPaths.super)+'assets',express.static(webFolder + '/assets'))
                                                }
                                                var libFolder = webFolder + name + '/'
                                                fs.readdir(libFolder,function(err,webFolderContents){
                                                    webFolderContents.forEach(function(libName){
                                                        var thirdLevelName = libFolder + libName
                                                        switch(libName){
                                                            case'js':
                                                            case'css':
                                                            case'blocks':
                                                                fs.readdir(thirdLevelName,function(err,webFolderContents){
                                                                    webFolderContents.forEach(function(filename){
                                                                        if(!filename)return;
                                                                        var fullPath = thirdLevelName + '/' + filename
                                                                        var blockPrefix = ''
                                                                        switch(true){
                                                                            case filename.indexOf('super.') > -1:
                                                                                blockPrefix = 'super'
                                                                            break;
                                                                        }
                                                                        if(name === 'libs'){
                                                                            switch(libName){
                                                                                case'js':
                                                                                    s.customAutoLoadTree[blockPrefix + 'LibsJs'].push(filename)
                                                                                break;
                                                                                case'css':
                                                                                    s.customAutoLoadTree[blockPrefix + 'LibsCss'].push(filename)
                                                                                break;
                                                                            }
                                                                        }else if(name === 'assets'){
                                                                            switch(libName){
                                                                                case'js':
                                                                                    s.customAutoLoadTree[blockPrefix + 'AssetsJs'].push(filename)
                                                                                break;
                                                                                case'css':
                                                                                    s.customAutoLoadTree[blockPrefix + 'AssetsCss'].push(filename)
                                                                                break;
                                                                            }
                                                                        }else if(name === 'pages' && libName === 'blocks'){
                                                                            s.customAutoLoadTree[blockPrefix + 'PageBlocks'].push(fullPath)
                                                                        }
                                                                    })
                                                                })
                                                            break;
                                                            default:
                                                                if(libName.indexOf('.ejs') > -1){
                                                                    s.customAutoLoadTree.pages.push(thirdLevelName)
                                                                }
                                                            break;
                                                        }
                                                    })
                                                })
                                            break;
                                        }
                                    })
                                })
                            break;
                            case'languages':
                                var languagesFolder = s.checkCorrectPathEnding(customModulePath) + 'languages/'
                                fs.readdir(languagesFolder,function(err,files){
                                    if(err)return console.log(err);
                                    files.forEach(function(filename){
                                        var fileData = require(languagesFolder + filename)
                                        var rule = filename.replace('.json','')
                                        if(config.language === rule){
                                            lang = Object.assign(lang,fileData)
                                        }
                                        if(!s.languageModifications[rule])s.languageModifications[rule] = [];
                                        s.languageModifications[rule].push(fileData);
                                        // if(s.loadedLanguages[rule]){
                                        //     s.loadedLanguages[rule] = Object.assign(s.loadedLanguages[rule],fileData)
                                        // }else{
                                        //     s.loadedLanguages[rule] = Object.assign(s.copySystemDefaultLanguage(),fileData)
                                        // }
                                    })
                                })
                            break;
                            case'definitions':
                                console.error('This Method has been deprecated. Could not load : ', customModulePath + 'defintions/')
                                console.error('Make your module\'s index.js file make the changes directly.')
                                // var definitionsFolder = s.checkCorrectPathEnding(customModulePath) + 'definitions/'
                                // fs.readdir(definitionsFolder,function(err,files){
                                //     if(err)return console.log(err);
                                //     files.forEach(function(filename){
                                //         var fileData = require(definitionsFolder + filename)
                                //         var rule = filename.replace('.json','').replace('.js','')
                                //         if(config.language === rule){
                                //             s.definitions = s.mergeDeep(s.definitions,fileData)
                                //         }
                                //         if(s.loadedDefinitons[rule]){
                                //             s.loadedDefinitons[rule] = s.mergeDeep(s.loadedDefinitons[rule],fileData)
                                //         }else{
                                //             s.loadedDefinitons[rule] = s.mergeDeep(s.copySystemDefaultDefinitions(),fileData)
                                //         }
                                //     })
                                // })
                            break;
                        }
                    })
                })
            }catch(err){
                s.systemLog('Failed to Load Module : ' + moduleName)
                s.systemLog(err)
            }
        }
    }
    const moveModuleToNameInProperties = (modulePath,packageRoot,properties) => {
        return new Promise((resolve,reject) => {
            const packageRootParts = packageRoot.split('/')
            const filename = packageRootParts[packageRootParts.length - 1]
            fs.move(modulePath + packageRoot,modulesBasePath + filename,(err) => {
                if(packageRoot){
                    fs.remove(modulePath, (err) => {
                        if(err)console.log(err)
                        resolve(filename)
                    })
                }else{
                    resolve(filename)
                }
            })
        })
    }
    const initializeAllModules = async () => {
        s.customAutoLoadModules = {}
        s.customAutoLoadTree = {
            pages: [],
            PageBlocks: [],
            LibsJs: [],
            LibsCss: [],
            AssetsJs: [],
            AssetsCss: [],
            superPageTabs: [],
            superPageBlocks: [],
            superLibsJs: [],
            superRawJs: [],
            superLibsCss: [],
            superAssetsJs: [],
            superAssetsCss: []
        }
        fs.readdir(modulesBasePath,function(err,folderContents){
            if(!err && folderContents.length > 0){
                getModules(true).forEach((shinobiModule) => {
                    if(shinobiModule.properties.disabled){
                        return;
                    }
                    loadModule(shinobiModule)
                    s.reloadLanguages()
                    s.reloadDefinitions()
                })
            }else{
                fs.mkdir(modulesBasePath,() => {})
            }
        })
    }
    /**
    * API : Superuser : Custom Auto Load Package Download.
    */
    app.get(config.webPaths.superApiPrefix+':auth/package/list', async (req,res) => {
        s.superAuth(req.params, async (resp) => {
            s.closeJsonResponse(res,{
                ok: true,
                modules: getModules()
            })
        },res,req)
    })
    /**
    * API : Superuser : Custom Auto Load Package Download.
    */
    app.post(config.webPaths.superApiPrefix+':auth/package/download', async (req,res) => {
        s.superAuth(req.params, async (resp) => {
            try{
                const url = req.body.downloadUrl
                const packageRoot = req.body.packageRoot || ''
                const packageName = req.body.packageName || extractNameFromPackage(url)
                const modulePath = getModulePath(packageName)
                await downloadModule(url,packageName)
                const properties = getModuleProperties(packageName)
                const newName = await moveModuleToNameInProperties(modulePath,packageRoot,properties)
                const chosenName = newName ? newName : packageName
                disableModule(chosenName,true)
                s.closeJsonResponse(res,{
                    ok: true,
                    moduleName: chosenName,
                    newModule: getModule(chosenName)
                })
            }catch(err){
                s.closeJsonResponse(res,{
                    ok: false,
                    error: err
                })
            }
        },res,req)
    })
    // /**
    // * API : Superuser : Custom Auto Load Package Update.
    // */
    // app.post(config.webPaths.superApiPrefix+':auth/package/update', async (req,res) => {
    //     s.superAuth(req.params, async (resp) => {
    //         try{
    //             const url = req.body.downloadUrl
    //             const packageRoot = req.body.packageRoot || ''
    //             const packageName = req.body.packageName || extractNameFromPackage(url)
    //             const modulePath = getModulePath(packageName)
    //             await downloadModule(url,packageName)
    //             const properties = getModuleProperties(packageName)
    //             const newName = await moveModuleToNameInProperties(modulePath,packageRoot,properties)
    //             const chosenName = newName ? newName : packageName
    //
    //             disableModule(chosenName,true)
    //             s.closeJsonResponse(res,{
    //                 ok: true,
    //                 moduleName: chosenName,
    //                 newModule: getModule(chosenName)
    //             })
    //         }catch(err){
    //             s.closeJsonResponse(res,{
    //                 ok: false,
    //                 error: err
    //             })
    //         }
    //     },res,req)
    // })
    /**
    * API : Superuser : Custom Auto Load Package Install.
    */
    app.post(config.webPaths.superApiPrefix+':auth/package/install', (req,res) => {
        s.superAuth(req.params, async (resp) => {
            const packageName = req.body.packageName
            const response = {ok: true}
            const error = await installModule(packageName)
            if(error){
                response.ok = false
                response.msg = error
            }
            s.closeJsonResponse(res,response)
        },res,req)
    })
    /**
    * API : Superuser : Custom Auto Load Package set Status (Enabled or Disabled).
    */
    app.post(config.webPaths.superApiPrefix+':auth/package/status', (req,res) => {
        s.superAuth(req.params, async (resp) => {
            const status = req.body.status
            const packageName = req.body.packageName
            const selection = status == 'true' ? true : false
            disableModule(packageName,selection)
            s.closeJsonResponse(res,{ok: true, status: selection})
        },res,req)
    })
    /**
    * API : Superuser : Custom Auto Load Package Delete
    */
    app.post(config.webPaths.superApiPrefix+':auth/package/delete', async (req,res) => {
        s.superAuth(req.params, async (resp) => {
            const packageName = req.body.packageName
            const response = deleteModule(packageName)
            s.closeJsonResponse(res,{ok: response})
        },res,req)
    })
    /**
    * API : Superuser : Custom Auto Load Package Reload All
    */
    app.post(config.webPaths.superApiPrefix+':auth/package/reloadAll', async (req,res) => {
        s.superAuth(req.params, async (resp) => {
            await initializeAllModules();
            s.closeJsonResponse(res,{ok: true})
        },res,req)
    })
    // Initialize Modules on Start
    await initializeAllModules();
}
