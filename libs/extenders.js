module.exports = function(s,config){
    s.cloudDiskUseStartupExtensions = {}
    s.cloudDiskUseOnGetVideoDataExtensions = {}
    function createExtension(nameOfExtension,nameOfExtensionContainer,objective){
        nameOfExtensionContainer = nameOfExtensionContainer || `${nameOfExtension}Extensions`
        if(objective){
            s[nameOfExtensionContainer] = []
            s[nameOfExtension] = function(nameOfCallback,callback){
                s[nameOfExtensionContainer][nameOfCallback] = callback
            }
        }else{
            s[nameOfExtensionContainer] = []
            s[nameOfExtension] = function(callback){
                s[nameOfExtensionContainer].push(callback)
            }
        }
    }
    s.runExtensionsForArray = (nameOfExtension, nameOfExtensionContainer, args) => {
        nameOfExtensionContainer = nameOfExtensionContainer || `${nameOfExtension}Extensions`
        const theExtenders = s[nameOfExtensionContainer];
        for(extender of theExtenders){
            extender(...args)
        }
    }
    s.runExtensionsForArrayAwaited = async (nameOfExtension, nameOfExtensionContainer, args) => {
        nameOfExtensionContainer = nameOfExtensionContainer || `${nameOfExtension}Extensions`
        const theExtenders = s[nameOfExtensionContainer];
        for(extender of theExtenders){
            await extender(...args)
        }
    }
    s.runExtensionsForObject = (nameOfExtension, nameOfExtensionContainer, args) => {
        nameOfExtensionContainer = nameOfExtensionContainer || `${nameOfExtension}Extensions`
        const theExtenders = s[nameOfExtensionContainer];
        for(extender in theExtenders){
            extender(...args)
        }
    }
    s.runExtensionsForObjectAwaited = async (nameOfExtension, nameOfExtensionContainer, args) => {
        nameOfExtensionContainer = nameOfExtensionContainer || `${nameOfExtension}Extensions`
        const theExtenders = s[nameOfExtensionContainer];
        for(extender in theExtenders){
            await extender(...args)
        }
    }
    ////// USER //////
    createExtension(`onSocketAuthentication`)
    createExtension(`onUserLog`)
    createExtension(`loadGroupExtender`,`loadGroupExtensions`)
    createExtension(`loadGroupAppExtender`,`loadGroupAppExtensions`)
    createExtension(`unloadGroupAppExtender`,`unloadGroupAppExtensions`)
    createExtension(`onAccountSave`)
    createExtension(`beforeAccountSave`)
    createExtension(`onTwoFactorAuthCodeNotification`)
    createExtension(`onStalePurgeLock`)
    createExtension(`onVideoAccess`)
    createExtension(`onLogout`)
    ////// EVENTS //////
    createExtension(`onEventTrigger`)
    createExtension(`onEventTriggerBeforeFilter`)
    createExtension(`onFilterEvent`)
    ////// MONITOR //////
    createExtension(`onMonitorInit`)
    createExtension(`onMonitorStart`)
    createExtension(`onMonitorStop`)
    createExtension(`onMonitorSave`)
    createExtension(`onMonitorUnexpectedExit`)
    createExtension(`onDetectorNoTriggerTimeout`)
    createExtension(`onFfmpegCameraStringCreation`)
    createExtension(`onFfmpegBuildMainStream`)
    createExtension(`onFfmpegBuildStreamChannel`)
    createExtension(`onMonitorPingFailed`)
    createExtension(`onMonitorDied`)
    createExtension(`onMonitorCreateStreamPipe`)
    ///////// SYSTEM ////////
    createExtension(`onProcessReady`)
    createExtension(`onProcessExit`)
    createExtension(`onLoadedUsersAtStartup`)
    createExtension(`onBeforeDatabaseLoad`)
    createExtension(`onFFmpegLoaded`)
    createExtension(`beforeMonitorsLoadedOnStartup`)
    createExtension(`onWebSocketConnection`)
    createExtension(`onWebSocketDisconnection`)
    createExtension(`onWebsocketMessageSend`)
    createExtension(`onOtherWebSocketMessages`)
    createExtension(`onGetCpuUsage`)
    createExtension(`onGetRamUsage`)
    createExtension(`onSubscriptionCheck`)
    createExtension(`onDataPortMessage`)
    createExtension(`onHttpRequestUpgrade`,null,true)
    createExtension(`onPluginConnected`)
    createExtension(`onPluginDisconnected`)
    /////// CRON ////////
    createExtension(`onCronGroupProcessed`)
    createExtension(`onCronGroupProcessedAwaited`)
    createExtension(`onCronGroupBeforeProcessed`)
    createExtension(`onCronGroupBeforeProcessedAwaited`)
    /////// VIDEOS ////////
    createExtension(`insertCompletedVideoExtender`,`insertCompletedVideoExtensions`)
    createExtension(`onEventBasedRecordingComplete`)
    createExtension(`onEventBasedRecordingStart`)
    createExtension(`onBeforeInsertCompletedVideo`)
    createExtension(`onCloudVideoUploaded`)
    /////// TIMELAPSE ////////
    createExtension(`onInsertTimelapseFrame`)
}
