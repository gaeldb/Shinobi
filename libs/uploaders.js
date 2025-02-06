module.exports = function(s,config,lang,app,io){
    s.uploaderFields = []
    s.cloudDisksLoaded = []
    require('./uploaders/loader.js')(s,config,lang,app,io)
    const loadedLibraries = {
        //cloud storage
        s3based: require('./uploaders/s3based.js'),
        backblazeB2: require('./uploaders/backblazeB2.js'),
        amazonS3: require('./uploaders/amazonS3.js'),
        webdav: require('./uploaders/webdav.js'),
        //local storage
        mnt: require('./uploaders/mount.js'),
        //oauth
        googleDrive: require('./uploaders/googleDrive.js'),
        //simple storage
        sftp: require('./uploaders/sftp.js'),
    }
    Object.keys(loadedLibraries).forEach((key) => {
        var loadedLib = loadedLibraries[key](s,config,lang,app,io)
        if(loadedLib.info){
            loadedLib.isFormGroupGroup = true
            s.definitions["Account Settings"].blocks["Uploaders"].info.push(loadedLib)
        }
    })
}
