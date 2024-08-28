var os = require('os');
const async = require('async');
const onvif = require("shinobi-onvif");
const {
    addCredentialsToUrl,
    stringContains,
    getBuffer,
} = require('../common.js')
const scanStatus = {
    current: [],
    allSuccessful: {},
    cancelPromises: null,
    abortController: null
};

module.exports = (s,config,lang) => {
    const ipRange = (start_ip, end_ip) => {
        const startLong = toLong(start_ip);
        const endLong = toLong(end_ip);
        if (startLong > endLong) {
            const tmp = startLong;
            startLong = endLong;
            endLong = tmp;
        }
        const rangeArray = [];
        for (let i = startLong; i <= endLong; i++) {
            rangeArray.push(fromLong(i));
        }
        return rangeArray;
    };

    const portRange = (lowEnd, highEnd) => {
        const list = [];
        for (let i = lowEnd; i <= highEnd; i++) {
            list.push(i);
        }
        return list;
    };

    const toLong = (ip) => {
        let ipl = 0;
        ip.split('.').forEach(function(octet) {
            ipl <<= 8;
            ipl += parseInt(octet);
        });
        return (ipl >>> 0);
    };

    const fromLong = (ipl) => {
        return ((ipl >>> 24) + '.' +
            (ipl >> 16 & 255) + '.' +
            (ipl >> 8 & 255) + '.' +
            (ipl & 255));
    };

    const getNetworkAddresses = () => {
        const interfaces = os.networkInterfaces();
        const addresses = [];
        for (const k in interfaces) {
            for (const k2 in interfaces[k]) {
                const address = interfaces[k][k2];
                if (address.family === 'IPv4' && !address.internal) {
                    addresses.push(address.address);
                }
            }
        }
        return addresses;
    };

    const getAddressRange = (addresses) => {
        const addressRange = [];
        addresses.forEach((address) => {
            if (address.indexOf('0.0.0') > -1) return;
            const addressPrefix = address.split('.').slice(0, 3).join('.');
            addressRange.push(`${addressPrefix}.1-${addressPrefix}.254`);
        });
        return addressRange.join(',');
    };

    const getPorts = (ports) => {
        if (ports === '') {
            return '80,8080,8000,7575,8081,9080,8090,8999,8899'.split(',');
        }
        if (ports.indexOf('-') > -1) {
            const [start, end] = ports.split('-');
            return portRange(start, end);
        }
        return ports.split(',');
    };

    const getIpList = (ip) => {
        const ipList = [];
        ip.split(',').forEach((range) => {
            const [start, end] = range.indexOf('-') > -1 ? range.split('-') : [range, range];
            ipList.push(...ipRange(start, end));
        });
        return ipList;
    };

    const createHitList = (ipList, ports, onvifUsername = '', onvifPassword = '') => {
        const hitList = [];
        const usernameVariants = onvifUsername.split(',');
        const passwordVariants = onvifPassword.split(',');
        for (const username of usernameVariants) {
            for (const password of passwordVariants) {
                hitList.push(...ipList.flatMap((ipEntry) =>
                    ports.map((portEntry) => ({
                        xaddr: `http://${ipEntry}:${portEntry}/onvif/device_service`,
                        user: username,
                        pass: password,
                        ip: ipEntry,
                        port: portEntry,
                    }))
                ));
            }
        }
        return hitList;
    };

    const takeSnapshot = async (cameraResponse, device) => {
        try {
            const snapUri = addCredentialsToUrl({
                username: cameraResponse.user,
                password: cameraResponse.pass,
                url: (await device.services.media.getSnapshotUri({ ProfileToken: device.current_profile.token })).data.GetSnapshotUriResponse.MediaUri.Uri,
            });
            const imgBuffer = await getBuffer(snapUri);
            cameraResponse.snapShot = imgBuffer.toString('base64');
        } catch (err) {
            console.error('Failed to get snapshot via ONVIF:', err);
        }
        return cameraResponse;
    }

    const fetchCameraDetails = async (camera, onvifUsername, onvifPassword, foundCameraCallback, failedCameraCallback) => {
        // const previousSuccess = scanStatus.allSuccessful[camera.ip];
        // if (previousSuccess) {
        //     // console.log('FOUND PREVIOUS', camera.ip);
        //     foundCameraCallback(previousSuccess);
        //     return;
        // }
        try {
            const device = new onvif.OnvifDevice(camera);
            const info = await device.init();
            const stream = await device.services.media.getStreamUri({
                ProfileToken: device.current_profile.token,
                Protocol: 'RTSP'
            });

            const cameraResponse = {
                ip: camera.ip,
                port: camera.port,
                user: camera.user,
                pass: camera.pass,
                info: info,
                uri: stream.data.GetStreamUriResponse.MediaUri.Uri
            };

            try {
                const camPtzConfigs = (await device.services.ptz.getConfigurations()).data.GetConfigurationsResponse;
                if (camPtzConfigs.PTZConfiguration && (camPtzConfigs.PTZConfiguration.PanTiltLimits || camPtzConfigs.PTZConfiguration.ZoomLimits)) {
                    cameraResponse.isPTZ = true;
                }
            } catch (err) {
                console.error(er)
                // s.debugLog(err);
            }
            await takeSnapshot(cameraResponse, device)
            scanStatus.allSuccessful[camera.ip] = cameraResponse;
            foundCameraCallback(cameraResponse);

            return cameraResponse;
        } catch (err) {
            return handleCameraError(camera, err, failedCameraCallback);
        }
    };

    const handleCameraError = (camera, err, failedCameraCallback) => {
        // const previousSuccess = scanStatus.allSuccessful[camera.ip];
        // if (previousSuccess) {
        //     // console.log('FOUND PREVIOUS AFTER ERROR', camera.ip);
        //     return previousSuccess;
        // }
        const searchError = (find) => stringContains(find, err.message, true);
        const commonIgnoredErrors = ['ECONNREFUSED', 'socket hang up'];
        let foundDevice = false;
        let errorMessage = '';

        switch (true) {
            case searchError('ECONNREFUSED'):
                errorMessage = `ECONNREFUSED`;
                return {refused: true}
                break;
            case searchError('TIMEDOUT'):
                foundDevice = true;
                errorMessage = lang.ONVIFErr401;
                break;
            case searchError('401'):
                foundDevice = true;
                errorMessage = lang.ONVIFErr401;
                break;
            case searchError('400'):
                foundDevice = true;
                errorMessage = lang.ONVIFErr400;
                break;
            case searchError('405'):
                foundDevice = true;
                errorMessage = lang.ONVIFErr405;
                break;
            case searchError('404'):
                foundDevice = true;
                errorMessage = lang.ONVIFErr404;
                break;
            default:
                break;
        }

        if (foundDevice) {
            const cameraResponse = {
                ip: camera.ip,
                port: camera.port,
                error: errorMessage,
                failedConnection: true,
            };
            failedCameraCallback(cameraResponse);
            return cameraResponse;
        }

        return null;
    };

    function isValidOnvifResult(result) {
        return result.info || result.uri;
    }

    function detectAndReplaceReolinkRTSP(camera, url){
        const possibilities = [`/h264Preview_01_main`, `/h265Preview_01_main`]
        for(possible of possibilities){
            // console.log(url, possible, url.indexOf(possible) > -1)
            if(url.indexOf(possible) > -1){
                return `rtmp://${camera.user}:${camera.pass}@${camera.ip}:1935/bcs/channel0_main.bcs?token=sdasdasd&channel=0&stream=0&user=${camera.user}&password=${camera.pass}`
            }
        }
        return url
    }

    const runOnvifScanner = async (options, foundCameraCallback, failedCameraCallback) => {
        if (scanStatus.isActive) return scanStatus.current;

        scanStatus.isActive = true;
        scanStatus.abortController = new AbortController();
        const { signal } = scanStatus.abortController;
        const cancelPromises = [];
        scanStatus.cancelPromises = cancelPromises;
        let ip = options.ip.replace(/ /g, '');
        let ports = options.port.replace(/ /g, '');
        const onvifUsername = options.user || 'admin';
        const onvifPassword = options.pass || '';

        if (ip === '') {
            const addresses = getNetworkAddresses();
            ip = getAddressRange(addresses);
        }

        ports = getPorts(ports);

        const ipList = getIpList(ip);
        const hitList = createHitList(ipList, ports, onvifUsername, onvifPassword);

        const ipQueues = {};
        const responseList = [];
        const allPingSuccess = {};

        const fetchWithTimeout = async (camera, onvifUsername, onvifPassword, foundCameraCallback, failedCameraCallback, signal) => {
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Timeout')), 2500); // Adjust the timeout as needed
                fetchCameraDetails(camera, onvifUsername, onvifPassword, foundCameraCallback, failedCameraCallback, signal)
                    .then(result => {
                        clearTimeout(timeout);
                        resolve(result);
                    })
                    .catch(error => {
                        clearTimeout(timeout);
                        reject(error);
                    });
            });
        };

        try {
            for (const camera of hitList) {
                if (!ipQueues[camera.ip]) {
                    ipQueues[camera.ip] = async.queue(async (task) => {
                        if (signal.aborted) {
                            throw new Error('Aborted');
                        }
                        // if(!scanStatus.allSuccessful[camera.ip]){
                            const cameraIp = task.camera.ip;
                            const hasPingSuccess = allPingSuccess[cameraIp];
                            if (hasPingSuccess !== false) {
                                const fetchPromise = fetchWithTimeout(task.camera, task.onvifUsername, task.onvifPassword, task.foundCameraCallback, task.failedCameraCallback, signal);
                                cancelPromises.push(fetchPromise);
                                const result = await fetchPromise;
                                if (result.refused) allPingSuccess[cameraIp] = !result.refused;
                                if (result.uri){
                                    try{
                                        result.uri = detectAndReplaceReolinkRTSP(task.camera, addCredentialsToUrl({ url: result.uri, username: task.camera.user, password: task.camera.pass }));
                                    }catch(err){
                                        console.error(err)
                                    }
                                }
                                responseList.push({...result});
                            }
                        // }
                    }, 1);
                }
                ipQueues[camera.ip].push({
                    camera,
                    onvifUsername: camera.user,
                    onvifPassword: camera.pass,
                    foundCameraCallback,
                    failedCameraCallback
                });
            }
            await Promise.all(Object.values(ipQueues).map(queue => new Promise((resolve) => queue.drain(resolve))));
        } catch (err) {
            if (err.message === 'Aborted') {
                console.log('Scan aborted');
            } else {
                console.error('big error', err);
            }
        }

        scanStatus.isActive = false;
        scanStatus.abortController = null;
        scanStatus.cancelPromises = null;
        s.debugLog('Done Scan');
        return responseList;
    };

    const stopOnvifScanner = () => {
        if (scanStatus.isActive && scanStatus.abortController) {
            scanStatus.abortController.abort();
            scanStatus.cancelPromises.forEach(promise => promise.catch(() => {}));
            scanStatus.isActive = false;
            s.debugLog('Scan stopped');
        }
    };

    function expandIPRange(rangeStr) {
        const ipRangeToArray = (start, end) => {
            const startParts = start.split('.').map(Number);
            const endParts = end.split('.').map(Number);
            const ips = [];
            for (let a = startParts[0]; a <= endParts[0]; a++) {
                for (let b = startParts[1]; b <= endParts[1]; b++) {
                    for (let c = startParts[2]; c <= endParts[2]; c++) {
                        for (let d = startParts[3]; d <= endParts[3]; d++) {
                            ips.push([a, b, c, d].join('.'));
                        }
                    }
                }
            }
            return ips;
        };

        return rangeStr.split(',')
            .flatMap(range => {
                const [start, end] = range.split('-');
                return ipRangeToArray(start.trim(), end.trim());
            });
    }

    return {
        expandIPRange,
        ipRange,
        portRange,
        scanStatus,
        runOnvifScanner,
        stopOnvifScanner,
    };
}
