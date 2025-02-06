const path = require('path')
module.exports = (s,config,lang,app,io) => {
    // for unix-based systems only (has /etc/fstab)
    if(s.isWin){
        app.all([
            'list',
            'mount',
            'removeMount',
            'setVideosDir',
        ].map(item => `${config.webPaths.superApiPrefix}:auth/mountManager/${item}`), function (req,res){
            s.closeJsonResponse(res, {
                ok: false,
                msg: lang.windowsCantUseFeature,
                error: lang.windowsCantUseFeature
            });
        });
        return;
    }
    const {
        modifyConfiguration,
     } = require('./system/utils.js')(config)
    const {
        mount,
        update,
        remove,
        list,
        remountAll,
        remount,
        unmount,
        createMountPoint,
        checkDiskPathExists,
    } = require('node-fstab');
    /**
    * API : Remount All in fstab
     */
    app.get(config.webPaths.superApiPrefix+':auth/mountManager/list', function (req,res){
        s.superAuth(req.params, async (resp) => {
            const response = await list();
            s.closeJsonResponse(res, response);
        },res,req);
    });
    /**
    * API : Add Mount to fstab
     */
    app.post(config.webPaths.superApiPrefix+':auth/mountManager/mount', function (req,res){
        s.superAuth(req.params, async (resp) => {
            const { sourceTarget, localPath, mountType, options } = req.body;
            const response = { ok: false }
            if(sourceTarget && localPath){
                try{
                    const createDirResponse = await createMountPoint(localPath)
                    response.createDirResponse = createDirResponse
                }catch(err){
                    console.error(err)
                }
                try{
                    const { exists } = await checkDiskPathExists(localPath)
                    if(exists){
                        const unmountResponse = await unmount(localPath)
                        response.unmountResponse = unmountResponse
                    }
                }catch(err){
                    console.error(err)
                }
                const updateResponse = await update(sourceTarget, localPath, mountType, options);
                response.updateResponse = updateResponse
                response.ok = updateResponse.ok
                const remountResponse = await remount(localPath)
                response.remountResponse = remountResponse
                if(!remountResponse.ok){
                    await remove(localPath);
                    response.ok = false;
                    response.error = remountResponse.error;
                }
                response.mount = {
                    device: sourceTarget,
                    mountPoint: localPath,
                    type: mountType,
                    options,
                }
            }else{
                response.error = lang['Invalid Data']
            }
            s.closeJsonResponse(res, response);
        },res,req);
    });
    /**
    * API : Remove Mount to fstab
     */
    app.post(config.webPaths.superApiPrefix+':auth/mountManager/removeMount', function (req,res){
        s.superAuth(req.params, async (resp) => {
            const { localPath } = req.body;
            try{
                await unmount(localPath)
                if(config.videosDir.startsWith(localPath)){
                    const configError = await modifyConfiguration({
                        videosDir: '__DIR__/videos',
                    }, true);
                }
            }catch(err){
                console.error(err)
            }
            const response = await remove(localPath);
            s.closeJsonResponse(res, response);
        },res,req);
    });
    /**
    * API : Set Mount Point as Videos Directory (videosDir)
     */
    app.post(config.webPaths.superApiPrefix+':auth/mountManager/setVideosDir', function (req,res){
        s.superAuth(req.params, async (resp) => {
            const { localPath, pathInside } = req.body;
            const isDefaultDir = localPath === '__DIR__/videos';
            const response = { ok: false }
            try{
                const { exists } = isDefaultDir ? { exists: true } : await checkDiskPathExists(localPath)
                if(exists){
                    const newVideosDirPath = pathInside ? path.join(localPath, pathInside) : localPath;
                    const createDirResponse = isDefaultDir ? true : await createMountPoint(newVideosDirPath)
                    const configError = await modifyConfiguration({
                        videosDir: newVideosDirPath,
                    }, true);
                    response.ok = true;
                    response.configError = configError;
                    response.createDirResponse = createDirResponse;
                }
            }catch(err){
                console.error(err)
            }
            s.closeJsonResponse(res, response);
        },res,req);
    });
}
