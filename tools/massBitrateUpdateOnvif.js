const onvif = require('shinobi-onvif');
const fs = require('fs');
const { getDeviceInformation, mergeDeep, getFunctionParamNames } = require('./onvifUtilsForTest.js');

// Fetch command line arguments
const args = process.argv.slice(2);
const jsonFilePath = args[0];
const streamType = args[1]; // 'main' or 'sub'
const newBitrate = parseInt(args[2]); // Bitrate in kbps

if(!jsonFilePath || !streamType || !newBitrate){
    console.log(`node massBitrateUpdateOnvif.js ./exportedShinobiMonitors.json main 1500`)
    return
}

// Read camera configurations from a JSON file
const cameras = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));

function tokenCheck(token){
    return streamType === 'sub' ?
        token.includes('sub')
        || token.includes('Sub')
        || token.includes('1')
    :
        token.includes('main')
        || token.includes('Main')
        || token.includes('0')
}

// Function to update the bitrate
const updateBitrate = async (camera, newBitrate, streamType) => {
    try {
        const device = new onvif.OnvifDevice({
            xaddr: `http://${camera.host}:${camera.details.onvif_port}/onvif/device_service`,
            user: camera.details.muser,
            pass: camera.details.mpass
        });

        await device.init();

        // Determine which stream type to update
        const configs = (await device.services.media.getVideoEncoderConfigurations()).data.GetVideoEncoderConfigurationsResponse.Configurations;
        const config = configs.find(c => tokenCheck(c.$.token));

        if (!config) {
            console.log(`No ${streamType} stream configuration found for camera ${camera.host}`);
            return;
        }
        const chosenToken = config.$.token;
        const {
            videoEncoders,
            videoEncoderOptions
        } = await getDeviceInformation(device,{
            videoEncoders: true,
            videoEncoderOptions: true
        });
        const videoEncoderIndex = {};
        videoEncoders.forEach((encoder) => {videoEncoderIndex[encoder.$.token] = encoder});
        const videoEncoder = videoEncoderIndex[chosenToken] || {};
        const theChanges = {
            RateControl: {
                BitrateLimit: newBitrate
            }
        };
        const onvifParams = mergeDeep(videoEncoder,theChanges);
        const newConfig = {
            ConfigurationToken: config.$.token,
            Configuration: onvifParams
        };
        if(newBitrate != videoEncoder.RateControl.BitrateLimit){
            console.log(videoEncoder)
            const updateResponse = await device.services.media.setVideoEncoderConfiguration(newConfig);
            console.log('updateResponse',updateResponse.data)
            console.log(`Updated ${streamType} stream bitrate for camera ${camera.host} to ${newBitrate} kbps`);
        }else{
            console.log(`Skipped ${camera.host}`)
        }
    } catch (err) {
        console.error(`Error updating bitrate for camera ${camera.host}:`, err);
    }
};

// Iterate over cameras sequentially and update bitrate for the specified stream type
const updateAllCameras = async () => {
    for (const camera of cameras) {
        await updateBitrate(camera, newBitrate, streamType);
    }
};

updateAllCameras();
