const fs = require('fs');
const exec = require('child_process').exec;
const spawn = require('child_process').spawn;
const treekill = require('tree-kill');
const {
    arrayContains,
} = require('../common.js')
module.exports = (s,config,lang) => {
    const {
        validateDimensions,
    } = require('./utils.js')(s,config,lang)
    const {
        parseJSON,
    } = require('../basic/utils.js')(process.cwd(),config)
    if(!config.outputsWithAudio)config.outputsWithAudio = ['hls','flv','mp4','rtmp'];
    if(!config.outputsNotCapableOfPresets)config.outputsNotCapableOfPresets = [];
    const hasCudaEnabled = (monitor) => {
        return monitor.details.accelerator === '1' && monitor.details.hwaccel === 'cuvid' && monitor.details.hwaccel_vcodec === ('h264_cuvid' || 'hevc_cuvid' || 'mjpeg_cuvid' || 'mpeg4_cuvid')
    }
    const inputTypeIsStreamer = (monitor) => {
        return monitor.type === 'dashcam'|| monitor.type === 'socket'
    }
    const getInputTypeFlags = (inputType) => {
        switch(inputType){
            case'socket':case'jpeg':case'pipe'://case'webpage':
                return `-pattern_type glob -f image2pipe -vcodec mjpeg`
            break;
            case'mjpeg':
                return `-reconnect 1 -f mjpeg`
            break;
            case'mxpeg':
                return `-reconnect 1 -f mxg`
            break;
            default:
                return ``
            break;
        }
    }
    const buildConnectionFlagsFromConfiguration = (monitor) => {
        const url = s.buildMonitorUrl(monitor);
        switch(monitor.type){
            case'dashcam':
                return `-i -`
            break;
            case'socket':case'jpeg':case'pipe'://case'webpage':
                return `-pattern_type glob -f image2pipe -vcodec mjpeg -i -`
            break;
            case'mjpeg':
                return `-reconnect 1 -f mjpeg -i "${url}"`
            break;
            case'mxpeg':
                return `-reconnect 1 -f mxg -i "${url}"`
            break;
            case'rtmp':
                if(!monitor.details.rtmp_key)monitor.details.rtmp_key = ''
                return `-i "rtmp://127.0.0.1:1935/${monitor.ke}_${monitor.mid}_${monitor.details.rtmp_key}"`
            break;
            case'h264':case'hls':case'mp4':
                return `-i "${url}"`
            break;
            case'local':
                return `-i "${monitor.path}"`
            break;
        }
    }
    const hasInputMaps = (e) => {
        return (e.details.input_maps && e.details.input_maps.length > 0)
    }
    const buildInputMap = function(e,arrayOfMaps){
        //`e` is the monitor object
        var string = '';
        if(hasInputMaps(e)){
            if(arrayOfMaps && arrayOfMaps instanceof Array && arrayOfMaps.length>0){
                arrayOfMaps.forEach(function(v){
                    if(v.map==='')v.map='0'
                    string += ' -map '+v.map
                })
            }else{
                var primaryMap = '0'
                if(e.details.primary_input && e.details.primary_input !== ''){
                    var primaryMap = e.details.primary_input || '0'
                    string += ' -map ' + primaryMap
                }
            }
        }
        return string;
    }
    const buildWatermarkFiltersFromConfiguration = (prefix,monitor,detail,detailKey) => {
        prefix = prefix ? prefix : ''
        const parameterContainer = detail ? detailKey ?  monitor.details[detail][detailKey] :  monitor.details[detail] : monitor.details
        const watermarkLocation = parameterContainer[`${prefix}watermark_location`]
        //bottom right is default
        var watermarkPosition = '(main_w-overlay_w-10)/2:(main_h-overlay_h-10)/2'
        switch(parameterContainer[`${prefix}watermark_position`]){
            case'tl'://top left
                watermarkPosition = '10:10'
            break;
            case'tr'://top right
                watermarkPosition = 'main_w-overlay_w-10:10'
            break;
            case'bl'://bottom left
                watermarkPosition = '10:main_h-overlay_h-10'
            break;
        }
        return `movie=${watermarkLocation}[watermark],[in][watermark]overlay=${watermarkPosition}[out]`
    }
    const buildRotationFiltersFromConfiguration = (prefix,monitor,detail,detailKey) => {
        prefix = prefix ? prefix : ''
        const parameterContainer = detail ? detailKey ?  monitor.details[detail][detailKey] :  monitor.details[detail] : monitor.details
        const userChoice = parameterContainer[`${prefix}rotate`]
        switch(userChoice){
            case'2,transpose=2':
            case'0':
            case'1':
            case'2':
            case'3':
                return `transpose=${userChoice}`
            break;
        }
        return ``
    }
    const buildTimestampFiltersFromConfiguration = (prefix,monitor,detail,detailKey) => {
        prefix = prefix ? prefix : ''
        const parameterContainer = detail ? detailKey ?  monitor.details[detail][detailKey] :  monitor.details[detail] : monitor.details
        const timestampFont = parameterContainer[`${prefix}timestamp_font`] ? parameterContainer[`${prefix}timestamp_font`] : '/usr/share/fonts/truetype/freefont/FreeSans.ttf'
        const timestampX = parameterContainer[`${prefix}timestamp_x`] ? parameterContainer[`${prefix}timestamp_x`] : '(w-tw)/2'
        const timestampY = parameterContainer[`${prefix}timestamp_y`] ? parameterContainer[`${prefix}timestamp_y`] : '0'
        const timestampColor = parameterContainer[`${prefix}timestamp_color`] ? parameterContainer[`${prefix}timestamp_color`] : 'white'
        const timestampBackgroundColor = parameterContainer[`${prefix}timestamp_box_color`] ? parameterContainer[`${prefix}timestamp_box_color`] : '0x00000000@1'
        const timestampFontSize = parameterContainer[`${prefix}timestamp_font_size`] ? parameterContainer[`${prefix}timestamp_font_size`] : '10'
        return `drawtext=fontfile=${timestampFont}:text='%{localtime}':x=${timestampX}:y=${timestampY}:fontcolor=${timestampColor}:box=1:boxcolor=${timestampBackgroundColor}:fontsize=${timestampFontSize}`
    }
    const createInputMap = (e, number, input) => {
        // inputs, input map
        //`e` is the monitor object
        //`x` is an object used to contain temporary values.
        const inputFlags = []
        const inputTypeIsH264 = input.type === 'h264'
        const inputTypeCanLoop = input.type === 'mp4' || input.type === 'local'
        const hardwareAccelerationEnabled = input.accelerator==='1'
        const rtspTransportIsManual = input.rtsp_transport && input.rtsp_transport !== 'no'
        const monitorCaptureRate = !isNaN(parseFloat(input.sfps)) && input.sfps !== '0' ? parseFloat(input.sfps) : null
        const casualDecodingRequired = input.type === 'mp4' || input.type === 'mjpeg'
        if(input.cust_input)inputFlags.push(input.cust_input)
        if(monitorCaptureRate){
            inputFlags.push(`-r ${monitorCaptureRate}`)
        }
        if(input.aduration){
            inputFlags.push(`-analyzeduration ${input.aduration}`)
        }
        if(input.probesize){
            inputFlags.push(`-probesize ${input.probesize}`)
        }
        if(input.stream_loop === '1' && inputTypeCanLoop){
            inputFlags.push(`-stream_loop -1`)
        }
        if(
            (input.type === 'h264' || input.type === 'mp4') &&
            input.fulladdress.indexOf('rtsp://') >- 1 &&
            input.rtsp_transport &&
            input.rtsp_transport !== 'no'
        ){
            inputFlags.push(`-rtsp_transport ${input.rtsp_transport}`)
        }
        //hardware acceleration
        if(hardwareAccelerationEnabled){
            if(input.hwaccel){
                inputFlags.push(`-hwaccel ${input.hwaccel}`)
            }
            if(input.hwaccel_vcodec){
                inputFlags.push(`-c:v ${input.hwaccel_vcodec}`)
            }
            if(input.hwaccel_device){
                switch(input.hwaccel){
                    case'vaapi':
                        inputFlags.push(`-vaapi_device ${input.hwaccel_device}`)
                    break;
                    default:
                        inputFlags.push(`-hwaccel_device ${input.hwaccel_device}`)
                    break;
                }
            }
	    if(input.hwaccel_format){
		inputFlags.push(`-hwaccel_output_format ${input.hwaccel_format}`)
	    }
        }
        //custom - input flags
        return `${getInputTypeFlags(input.type)} ${inputFlags.join(' ')} -i "${input.fulladdress}"`
    }
    //create sub stream channel
    const createStreamChannel = function(e,number,channel){
        //`e` is the monitor object
        //`x` is an object used to contain temporary values.
        const channelStreamDirectory = !isNaN(parseInt(number)) ? `${e.sdir || s.getStreamsDirectory(e)}channel${number}/` : e.sdir
        if(channelStreamDirectory !== e.sdir && !fs.existsSync(channelStreamDirectory)){
            try {
                fs.mkdirSync(channelStreamDirectory)
            }catch(err){
                // s.debugLog(err)
            }
        }
        const channelNumber = number - config.pipeAddition
        const isCudaEnabled = hasCudaEnabled(e)
        const streamFlags = []
        const streamFilters = []
        const videoCodecisCopy = channel.stream_vcodec === 'copy'
        const audioCodecisCopy = channel.stream_acodec === 'copy'
        const videoCodec = channel.stream_vcodec ? channel.stream_vcodec : 'libx264'
        const audioCodec = channel.stream_acodec ? channel.stream_acodec : 'aac'
        const videoQuality = channel.stream_quality ? channel.stream_quality : '1'
        const streamType = channel.stream_type ? channel.stream_type : 'hls'
        const videoFps = !isNaN(parseFloat(channel.stream_fps)) && channel.stream_fps !== '0' ? parseFloat(channel.stream_fps) : streamType === 'rtmp' ? '30' : null
        const inputMap = buildInputMap(e,e.details.input_map_choices[`stream_channel-${channelNumber}`])
        const outputCanHaveAudio = config.outputsWithAudio.indexOf(streamType) > -1;
        const outputRequiresEncoding = streamType === 'mjpeg' || streamType === 'b64'
        const outputIsPresetCapable = outputCanHaveAudio
        const { videoWidth, videoHeight } = validateDimensions(channel.stream_scale_x,channel.stream_scale_y)
        if(inputMap)streamFlags.push(inputMap)
        if(channel.cust_stream)streamFlags.push(channel.cust_stream)
        if(streamFlags.indexOf('-strict -2') === -1)streamFlags.push(`-strict -2`)
        if(channel.stream_timestamp === "1" && !videoCodecisCopy){
            streamFilters.push(buildTimestampFiltersFromConfiguration('stream_',e,`stream_channels`,channelNumber))
        }
        if(channel.stream_watermark === "1" && channel.stream_watermark_location){
            streamFilters.push(buildWatermarkFiltersFromConfiguration(`stream_`,e,`stream_channels`,channelNumber))
        }
        if(channel.stream_rotate && channel.stream_rotate !== "no" && channel.stream_vcodec !== 'copy'){
            streamFilters.push(buildRotationFiltersFromConfiguration(`stream_`,e,`stream_channels`,channelNumber))
        }
        if(outputCanHaveAudio && audioCodec !== 'no'){
            streamFlags.push(`-c:a ` + audioCodec)
        }else{
            streamFlags.push(`-an`)
        }
        if(videoCodec === 'h264_vaapi'){
            streamFilters.push('format=nv12,hwupload');
            if(channel.stream_scale_x && channel.stream_scale_y){
                streamFilters.push('scale_vaapi=w='+channel.stream_scale_x+':h='+channel.stream_scale_y)
            }
        }
        if(isCudaEnabled && (streamType === 'mjpeg' || streamType === 'b64')){
            streamFilters.push('hwdownload,format=nv12')
        }
        if(!outputRequiresEncoding && videoCodec !== 'no'){
            streamFlags.push(`-c:v ${videoCodec === 'libx264' ? 'h264' : videoCodec}`)
        }
        if(!videoCodecisCopy || outputRequiresEncoding){
            if(videoWidth && videoHeight && !e.details.hwaccel_format) streamFlags.push(`-s ${videoWidth}x${videoHeight}`)
            if(videoFps && streamType === 'mjpeg' || videoFps && streamType === 'b64'){
                streamFilters.push(`fps=${videoFps}`)
            }
        }
        if(channel.stream_vf){
            streamFilters.push(channel.stream_vf)
        }
        if(outputIsPresetCapable){
            const streamPreset = config.outputsNotCapableOfPresets.indexOf(streamType) === -1 && channel.preset_stream ? channel.preset_stream : null
            if(streamPreset){
                streamFlags.push(`-preset ${streamPreset}`)
            }
            if(!videoCodecisCopy){
                streamFlags.push(`-q:v ${videoQuality}`)
            }
        }else{
            streamFlags.push(`-q:v ${videoQuality}`)
        }
        if((!videoCodecisCopy || outputRequiresEncoding) && streamFilters.length > 0){
            streamFlags.push(`-vf "${streamFilters.join(',')}"`)
        }
        switch(streamType){
            case'rtmp':
                const rtmpServerUrl = s.checkCorrectPathEnding(channel.rtmp_server_url)
                if(channel.stream_v_br && !videoCodecisCopy){
                    streamFlags.push(`-b:v ${channel.stream_v_br}`)
                }
                if(!audioCodecisCopy && audioCodec !== 'no'){
                    streamFlags.push(`-ab ${channel.stream_a_br || '128k'}`)
                }
                streamFlags.push(`-f flv "${rtmpServerUrl + channel.rtmp_stream_key}"`)
            break;
            case'mp4':
                streamFlags.push(`-f mp4 -movflags +frag_keyframe+empty_moov+default_base_moof -metadata title="Poseidon Stream from Shinobi" -reset_timestamps 1 pipe:${number}`)
            break;
            case'flv':
                streamFlags.push(`-f flv pipe:${number}`)
            break;
            case'hls':
                const hlsTime = !isNaN(parseInt(channel.hls_time)) ? `${parseInt(channel.hls_time)}` : '2'
                const hlsListSize = !isNaN(parseInt(channel.hls_list_size)) ? `${parseInt(channel.hls_list_size)}` : '2'
                if(videoCodec !== 'h264_nvmpi' && videoCodec !== 'h264_vaapi' && !videoCodecisCopy){
                    if(!arrayContains('-tune',streamFlags)){
                        streamFlags.push(`-tune zerolatency`)
                    }
                    if(!arrayContains('-g ',streamFlags)){
                        streamFlags.push(`-g 1`)
                    }
                }
                streamFlags.push(`-f hls -hls_time ${hlsTime} -hls_list_size ${hlsListSize} -start_number 0 -hls_allow_cache 0 -hls_flags +delete_segments+omit_endlist+discont_start "${channelStreamDirectory}s.m3u8"`)
            break;
            case'mjpeg':
                streamFlags.push(`-an -c:v mjpeg -f mpjpeg -boundary_tag shinobi pipe:${number}`)
            break;
            case'b64':case'':case undefined:case null://base64
                streamFlags.push(`-an -c:v mjpeg -f image2pipe pipe:${number}`)
            break;
        }
        s.onFfmpegBuildStreamChannelExtensions.forEach(function(extender){
            extender(streamType,streamFlags,number,e)
        });
        return ' ' + streamFlags.join(' ')
    }
    const buildMainInput = function(e){
        //e = monitor object
        //x = temporary values
        const isStreamer = inputTypeIsStreamer(e)
        const isCudaEnabled = hasCudaEnabled(e)
        const inputFlags = []
        const useWallclockTimestamp = e.details.wall_clock_timestamp_ignore !== '1' || config.wallClockTimestampAsDefault && !e.details.wall_clock_timestamp_ignore
        const inputTypeIsH264 = e.type === 'h264'
        const protocolIsRtsp = e.protocol === 'rtsp'
        const inputTypeCanLoop = e.type === 'mp4' || e.type === 'local'
        const hardwareAccelerationEnabled = e.details.accelerator==='1'
        const rtspTransportIsManual = e.details.rtsp_transport && e.details.rtsp_transport !== 'no'
        const monitorCaptureRate = !isNaN(parseFloat(e.details.sfps)) && e.details.sfps !== '0' ? parseFloat(e.details.sfps) : null
        const logLevel = e.details.loglevel ? e.details.loglevel : 'warning'
        const casualDecodingRequired = e.type === 'mp4' || e.type === 'mjpeg'
        const inputMaps = s.parseJSON(e.details.input_maps) || []
        if(e.details.cust_input)inputFlags.push(e.details.cust_input)
        if(useWallclockTimestamp && inputTypeIsH264 && !arrayContains('-use_wallclock_as_timestamps',inputFlags)){
            inputFlags.push('-use_wallclock_as_timestamps 1')
        }
        if(monitorCaptureRate){
            inputFlags.push(`-r ${monitorCaptureRate}`)
        }
        if(e.details.aduration){
            inputFlags.push(`-analyzeduration ${e.details.aduration}`)
        }
        if(e.details.probesize){
            inputFlags.push(`-probesize ${e.details.probesize}`)
        }
        if(e.details.stream_loop === '1' && inputTypeCanLoop){
            inputFlags.push(`-stream_loop -1`)
        }
        if(!arrayContains('-fflags',inputFlags)){
            inputFlags.push(`-fflags +igndts`)
        }
        if(inputTypeIsH264 && protocolIsRtsp && rtspTransportIsManual){
            inputFlags.push(`-rtsp_transport ${e.details.rtsp_transport}`)
        }
        //hardware acceleration
        if(hardwareAccelerationEnabled && !isStreamer){
            if(e.details.hwaccel){
                inputFlags.push(`-hwaccel ${e.details.hwaccel}`)
            }
            if(e.details.hwaccel_vcodec){
                inputFlags.push(`-c:v ${e.details.hwaccel_vcodec}`)
            }
            if(e.details.hwaccel_device){
                switch(e.details.hwaccel){
                    case'vaapi':
                        inputFlags.push(`-vaapi_device ${e.details.hwaccel_device}`)
                    break;
                    default:
                        inputFlags.push(`-hwaccel_device ${e.details.hwaccel_device}`)
                    break;
                }
            }
	    if(e.details.hwaccel_format){
		inputFlags.push(`-hwaccel_output_format ${e.details.hwaccel_format}`)
	    }
        }
        inputFlags.push(`-loglevel ${logLevel}`)
        //add main input
        if(casualDecodingRequired && !arrayContains('-re',inputFlags)){
            inputFlags.push(`-re`)
        }
        inputFlags.push(buildConnectionFlagsFromConfiguration(e))
        if(inputMaps){
            inputMaps.forEach(function(v,n){
                inputFlags.push(createInputMap(e,n+1,v))
            })
        }
        return inputFlags.join(' ')
    }
    const buildMainStream = function(e){
        //e = monitor object
        //x = temporary values
        const streamFlags = []
        const streamType = e.details.stream_type ? e.details.stream_type : 'hls'
        if(streamType !== 'jpeg' && streamType !== 'useSubstream'){
            const isCudaEnabled = hasCudaEnabled(e)
            const streamFilters = []
            const videoCodecisCopy = e.details.stream_vcodec === 'copy'
            const videoCodec = e.details.stream_vcodec ? e.details.stream_vcodec : 'no'
            const audioCodec = e.details.stream_acodec ? e.details.stream_acodec : 'no'
            const videoQuality = e.details.stream_quality ? e.details.stream_quality : '1'
            const videoFps = !isNaN(parseFloat(e.details.stream_fps)) && e.details.stream_fps !== '0' ? parseFloat(e.details.stream_fps) : null
            const inputMap = buildInputMap(e,e.details.input_map_choices.stream)
            const outputCanHaveAudio = config.outputsWithAudio.indexOf(streamType) > -1;
            const outputRequiresEncoding = streamType === 'mjpeg' || streamType === 'b64'
            const outputIsPresetCapable = outputCanHaveAudio
            const streamChannels = s.parseJSON(e.details.stream_channels) || []
            const { videoWidth, videoHeight } = validateDimensions(e.details.stream_scale_x,e.details.stream_scale_y)
            if(inputMap)streamFlags.push(inputMap)
            if(e.details.cust_stream)streamFlags.push(e.details.cust_stream)
            if(streamFlags.indexOf('-strict -2') === -1)streamFlags.push(`-strict -2`)
            //stream - timestamp
            if(e.details.stream_timestamp === "1" && !videoCodecisCopy){
                streamFilters.push(buildTimestampFiltersFromConfiguration('stream_',e))
            }
            if(e.details.stream_watermark === "1" && e.details.stream_watermark_location){
                streamFilters.push(buildWatermarkFiltersFromConfiguration(`stream_`,e))
            }
            //stream - rotation
            if(e.details.stream_rotate && e.details.stream_rotate !== "no" && e.details.stream_vcodec !== 'copy'){
                streamFilters.push(buildRotationFiltersFromConfiguration(`stream_`,e))
            }
            if(outputCanHaveAudio && audioCodec !== 'no'){
                streamFlags.push(`-c:a ` + audioCodec)
            }else{
                streamFlags.push(`-an`)
            }
            if(videoCodec === 'h264_vaapi'){
		if (!e.details.hwaccel_format) {
                    streamFilters.push('format=nv12,hwupload');
		}
                if(e.details.stream_scale_x && e.details.stream_scale_y){
		    if (!e.details.hwaccel_format) {
			streamFilters.push(',')
		    }
                    streamFilters.push('scale_vaapi=w='+e.details.stream_scale_x+':h='+e.details.stream_scale_y)
                }
        	}
            if(isCudaEnabled && (streamType === 'mjpeg' || streamType === 'b64')){
                streamFilters.push('hwdownload,format=nv12')
            }
            if(!outputRequiresEncoding && videoCodec !== 'no'){
                streamFlags.push(`-c:v ` + videoCodec)
            }
            if((!videoCodecisCopy || outputRequiresEncoding) && !e.details.hwaccel_format){
                if(videoWidth && videoHeight)streamFlags.push(`-s ${videoWidth}x${videoHeight}`)
                if(videoFps && streamType === 'mjpeg' || videoFps && streamType === 'b64' || videoFps && !videoCodecisCopy){
                    streamFilters.push(`fps=${videoFps}`)
                }
            }
            if(e.details.stream_vf){
                streamFilters.push(e.details.stream_vf)
            }
            if(outputIsPresetCapable){
                const streamPreset = config.outputsNotCapableOfPresets.indexOf(streamType) === -1 && e.details.preset_stream ? e.details.preset_stream : null
                if(streamPreset){
                    streamFlags.push(`-preset ${streamPreset}`)
                }
                if(!videoCodecisCopy){
                    streamFlags.push(`-q:v ${videoQuality}`)
                }
            }else{
                streamFlags.push(`-q:v ${videoQuality}`)
            }
            if((!videoCodecisCopy || outputRequiresEncoding) && streamFilters.length > 0){
                streamFlags.push(`-vf "${streamFilters.join(',')}"`)
            }
            switch(streamType){
                case'mp4':
                    streamFlags.push('-f mp4 -movflags +frag_keyframe+empty_moov+default_base_moof -metadata title="Poseidon Stream from Shinobi" -reset_timestamps 1 pipe:1')
                break;
                case'flv':
                    streamFlags.push(`-f flv`,'pipe:1')
                break;
                case'hls':
                    const hlsTime = !isNaN(parseInt(e.details.hls_time)) ? `${parseInt(e.details.hls_time)}` : '2'
                    const hlsListSize = !isNaN(parseInt(e.details.hls_list_size)) ? `${parseInt(e.details.hls_list_size)}` : '2'
                    if(videoCodec !== 'h264_nvmpi' && videoCodec !== 'h264_vaapi' && !videoCodecisCopy){
                        if(!arrayContains('-tune',streamFlags)){
                            streamFlags.push(`-tune zerolatency`)
                        }
                        if(!arrayContains('-g ',streamFlags)){
                            streamFlags.push(`-g 1`)
                        }
                    }
                    streamFlags.push(`-f hls -hls_time ${hlsTime} -hls_list_size ${hlsListSize} -start_number 0 -hls_allow_cache 0 -hls_flags +delete_segments+omit_endlist+discont_start "${e.sdir}s.m3u8"`)
                break;
                case'mjpeg':
                    streamFlags.push(`-an -c:v mjpeg -f mpjpeg -boundary_tag shinobi pipe:1`)
                break;
                case'b64':case'':case undefined:case null://base64
                    streamFlags.push(`-an -c:v mjpeg -f image2pipe pipe:1`)
                break;
            }
            s.onFfmpegBuildMainStreamExtensions.forEach(function(extender){
                extender(streamType,streamFlags,e)
            });
            if(e.details.custom_output){
                streamFlags.push(e.details.custom_output)
            }
            if(streamChannels){
                streamChannels.forEach(function(v,n){
                    streamFlags.push(createStreamChannel(e,n + config.pipeAddition,v))
                })
            }
        }
        return streamFlags.join(' ')
    }
    const buildJpegApiOutput = function(e){
        if(e.details.snap === '1'){
            const isCudaEnabled = hasCudaEnabled(e)
            const videoFlags = []
            const videoFilters = []
            const inputMap = buildInputMap(e,e.details.input_map_choices.snap)
            const { videoWidth, videoHeight } = validateDimensions(e.details.snap_scale_x,e.details.snap_scale_y)
            if(inputMap)videoFlags.push(inputMap)
            if(e.details.snap_vf)videoFilters.push(e.details.snap_vf)
            if(isCudaEnabled){
                videoFilters.push('hwdownload,format=nv12')
            }
            videoFilters.push(`fps=${e.details.snap_fps || '1'}`)
            //-vf "thumbnail_cuda=2,hwdownload,format=nv12"
            videoFlags.push(`-vf "${videoFilters.join(',')}"`)
            if(videoWidth && videoHeight)videoFlags.push(`-s ${videoWidth}x${videoHeight}`)
            if(e.details.cust_snap)videoFlags.push(e.details.cust_snap)
            videoFlags.push(`-update 1 "${e.sdir}s.jpg" -y`)
            return videoFlags.join(' ')
        }
        return ``
    }
    const buildMainRecording = function(e){
        //e = monitor object
        //x = temporary values
        if(e.mode === 'record'){
            const recordingFlags = []
            const recordingFilters = []
            const customRecordingFlags = []
            const videoCodecisCopy = e.details.vcodec === 'copy'
            const videoExtIsMp4 = e.ext === 'mp4'
            const defaultVideoCodec = videoExtIsMp4 ? 'libx264' : 'libvpx'
            const defaultAudioCodec = videoExtIsMp4 ? 'aac' : 'libvorbis'
            const videoCodec = e.details.vcodec === 'default' ? defaultVideoCodec : e.details.vcodec ? e.details.vcodec : defaultVideoCodec
            const audioCodec = e.details.acodec === 'default' ? defaultAudioCodec : e.details.acodec ? e.details.acodec : defaultAudioCodec
            const videoQuality = e.details.crf ? e.details.crf : '1'
            const videoFps = !isNaN(parseFloat(e.fps)) && e.fps !== '0' ? parseFloat(e.fps) : null
            const segmentLengthInMinutes = !isNaN(parseFloat(e.details.cutoff)) ? parseFloat(e.details.cutoff) : '15'
            const inputMap = buildInputMap(e,e.details.input_map_choices.record)
            const { videoWidth, videoHeight } = validateDimensions(e.details.record_scale_x,e.details.record_scale_y)
            const isNotCertainHwAccel = videoCodec !== 'h264_nvmpi' && videoCodec !== 'h264_vaapi';
            if(inputMap)recordingFlags.push(inputMap)
            if(e.details.cust_record)customRecordingFlags.push(e.details.cust_record)
            //record - resolution
            if(customRecordingFlags.indexOf('-strict -2') === -1)customRecordingFlags.push(`-strict -2`)
            // if(customRecordingFlags.indexOf('-threads') === -1)customRecordingFlags.push(`-threads 10`)
            if(!videoCodecisCopy) {
                if(videoWidth && videoHeight){
                    recordingFlags.push(`-s ${videoWidth}x${videoHeight}`)
                }
                if(isNotCertainHwAccel && videoExtIsMp4){
                    recordingFlags.push(`-crf ${videoQuality}`)
                }else{
                    recordingFlags.push(`-q:v ${videoQuality}`)
                }
                if(videoFps){
                    recordingFilters.push(`fps=${videoFps}`)
                }
            }
            if(videoExtIsMp4 && !config.noDefaultRecordingSegmentFormatOptions){
                customRecordingFlags.push(`-segment_format_options movflags=faststart`)
            }
            if(videoCodec === 'h264_vaapi'){
                recordingFilters.push('format=nv12,hwupload')
            }
            switch(e.type){
                case'h264':case'hls':case'mp4':case'local':
                    if(audioCodec === 'no'){
                        recordingFlags.push(`-an`)
                    }else if(audioCodec !== 'none'){
                        recordingFlags.push(`-acodec ` + audioCodec)
                    }
                break;
            }
            if(videoCodec !== 'none'){
                recordingFlags.push(`-vcodec ` + videoCodec)
            }
            //record - timestamp options for -vf
            if(e.details.timestamp === "1" && !videoCodecisCopy){
                recordingFilters.push(buildTimestampFiltersFromConfiguration('',e))
            }
            //record - watermark for -vf
            if(e.details.watermark === "1" && e.details.watermark_location){
                recordingFilters.push(buildWatermarkFiltersFromConfiguration('',e))
            }
            if(e.details.rotate && e.details.rotate !== "no" && !videoCodecisCopy){
                recordingFilters.push(buildRotationFiltersFromConfiguration(``,e))
            }
            if(e.details.vf){
                recordingFilters.push(e.details.vf)
            }
            if(recordingFilters.length > 0){
               recordingFlags.push(`-vf "${recordingFilters.join(',')}"`)
            }
            if(videoExtIsMp4 && e.details.preset_record){
                recordingFlags.push(`-preset ${e.details.preset_record}`)
            }
            if(customRecordingFlags.length > 0){
                recordingFlags.push(...customRecordingFlags)
            }
            //record - segmenting
            recordingFlags.push(`-f segment -segment_atclocktime 1 -reset_timestamps 1 -strftime 1 -segment_list pipe:8 -segment_time ${(60 * segmentLengthInMinutes)} "${e.dir}%Y-%m-%dT%H-%M-%S.${e.ext || 'mp4'}"`);
            return recordingFlags.join(' ')
        }
        return ``
    }
    const buildAudioDetector = function(e){
        const outputFlags = []
        if(e.details.detector_audio === '1'){
            if(e.details.input_map_choices&&e.details.input_map_choices.detector_audio){
                //add input feed map
                outputFlags.push(buildInputMap(e,e.details.input_map_choices.detector_audio))
            }else{
                outputFlags.push('-map 0:a')
            }
            outputFlags.push('-acodec pcm_s16le -f s16le -ac 1 -ar 16000 pipe:6')
        }
        return outputFlags.join(' ')
    }
    const buildMainDetector = function(e){
        //e = monitor object
        //x = temporary values
        const isCudaEnabled = hasCudaEnabled(e)
        const detectorFlags = []
        const inputMapsRequired = (e.details.input_map_choices && e.details.input_map_choices.detector)
        const sendFramesGlobally = (e.details.detector_send_frames === '1')
        const objectDetectorOutputIsEnabled = (e.details.detector_use_detect_object === '1')
        const builtInMotionDetectorIsEnabled = (e.details.detector_pam === '1')
        const objectDetectorSendFrames = e.details.detector_send_frames_object !== '0' || e.details.detector_pam !== '1'
        const sendFramesToObjectDetector = (objectDetectorSendFrames && e.details.detector_use_detect_object === '1')
        const baseWidth = e.details.detector_scale_x ? e.details.detector_scale_x : '640'
        const baseHeight = e.details.detector_scale_y ? e.details.detector_scale_y : '480'
        const baseDimensionsFlag = `-s ${baseWidth}x${baseHeight}`
        const baseFps = e.details.detector_fps ? e.details.detector_fps : '2'
        const baseFpsFilter = 'fps=' + baseFps
        const objectDetectorDimensionsFlag = `-s ${e.details.detector_scale_x_object ? e.details.detector_scale_x_object : baseWidth}x${e.details.detector_scale_y_object ? e.details.detector_scale_y_object : baseHeight}`
        const objectDetectorFpsFilter = 'fps=' + (e.details.detector_fps_object ? e.details.detector_fps_object : baseFps)
        const cudaVideoFilters = 'hwdownload,format=nv12'
        const videoFilters = []
        let addedVideoFilters = false
        if(e.details.detector === '1' && (sendFramesGlobally || sendFramesToObjectDetector)){
            const addVideoFilters = () => {
                if(addedVideoFilters)return;
                addedVideoFilters = true
                if(videoFilters.length > 0)detectorFlags.push(' -vf "' + videoFilters.join(',') + '"');
                detectorFlags.push(baseDimensionsFlag)
            }
            const addInputMap = () => {
                detectorFlags.push(buildInputMap(e,e.details.input_map_choices.detector))
            }
            const addObjectDetectorInputMap = () => {
                detectorFlags.push(buildInputMap(e,e.details.input_map_choices.detector_object || e.details.input_map_choices.detector))
            }
            const addObjectDetectValues = () => {
                const objVideoFilters = [objectDetectorFpsFilter]
                if(e.details.cust_detect_object)detectorFlags.push(e.details.cust_detect_object)
                if(isCudaEnabled)objVideoFilters.push(cudaVideoFilters)
                detectorFlags.push(objectDetectorDimensionsFlag + ' -vf "' + objVideoFilters.join(',') + '"')
            }
            if(sendFramesGlobally){
                if(builtInMotionDetectorIsEnabled)addInputMap();
                if(isCudaEnabled)videoFilters.push(cudaVideoFilters);
                videoFilters.push(baseFpsFilter)
                if(e.details.cust_detect)detectorFlags.push(e.details.cust_detect)
                if(!objectDetectorOutputIsEnabled && !sendFramesToObjectDetector){
                    addVideoFilters()
                }
                if(builtInMotionDetectorIsEnabled){
                    addVideoFilters()
                    detectorFlags.push('-an -c:v pam -pix_fmt gray -f image2pipe pipe:3')
                    if(objectDetectorOutputIsEnabled){
                        addObjectDetectorInputMap()
                        addObjectDetectValues()
                        detectorFlags.push('-an -f mjpeg pipe:4')
                    }
                }else if(sendFramesToObjectDetector){
                    addObjectDetectorInputMap()
                    addObjectDetectValues()
                    detectorFlags.push('-an -f mjpeg pipe:4')
                }else{
                    addInputMap()
                    detectorFlags.push('-an -f mjpeg pipe:4')
                }
            }else if(sendFramesToObjectDetector){
                addObjectDetectorInputMap()
                addObjectDetectValues()
                detectorFlags.push('-an -f mjpeg pipe:4')
            }
            return detectorFlags.join(' ')
        }
        return ``
    }
    const buildEventRecordingOutput = (e) => {
        const outputFlags = []
        if(e.details.detector === '1' && e.details.detector_trigger === '1' && e.details.detector_record_method === 'sip'){
            const isCudaEnabled = hasCudaEnabled(e)
            const outputFilters = []
            var videoCodec = e.details.detector_buffer_vcodec
            var liveStartIndex = e.details.detector_buffer_live_start_index || '-3'
            var audioCodec = e.details.detector_buffer_acodec ? e.details.detector_buffer_acodec : 'no'
            const videoCodecisCopy = videoCodec === 'copy'
            const videoFps = !isNaN(parseFloat(e.details.stream_fps)) && e.details.stream_fps !== '0' ? parseFloat(e.details.stream_fps) : null
            const inputMap = buildInputMap(e,e.details.input_map_choices.detector_sip_buffer)
            const { videoWidth, videoHeight } = validateDimensions(e.details.event_record_scale_x,e.details.event_record_scale_y)
            const hlsTime = !isNaN(parseInt(e.details.detector_buffer_hls_time)) ? `${parseInt(e.details.detector_buffer_hls_time)}` : '2'
            // const hlsListSize = !isNaN(parseInt(e.details.detector_buffer_hls_list_size)) ? `${parseInt(e.details.detector_buffer_hls_list_size)}` : '4'
            const secondsBefore = parseInt(e.details.detector_buffer_seconds_before) || 5
            let hlsListSize = parseInt(secondsBefore / 2 + 3)
            // hlsListSize = hlsListSize < 5 ? 5 : hlsListSize;
            if(inputMap)outputFlags.push(inputMap)
            if(e.details.cust_sip_record)outputFlags.push(e.details.cust_sip_record)
            if(videoCodec === 'auto'){
                if(e.type === 'h264' || e.type === 'hls' || e.type === 'mp4'){
                    videoCodec = `copy`
                }else if(e.details.accelerator === '1' && isCudaEnabled){
                    videoCodec = 'h264_nvenc'
                }else{
                    videoCodec = 'libx264'
                }
            }
            if(audioCodec === 'auto'){
                if(e.type === 'mjpeg' || e.type === 'jpeg' || e.type === 'socket'){
                    audioCodec = `no`
                }else if(e.type === 'h264' || e.type === 'hls' || e.type === 'mp4'){
                    audioCodec = 'copy'
                }else{
                    audioCodec = 'aac'
                }
            }
            if(videoCodec !== 'copy'){
                if(videoCodec.indexOf('_vaapi') >- 1){
                    if(!arrayContains('-vaapi_device',outputFlags)){
                        outputFilters.push('format=nv12')
                        outputFilters.push('hwupload')
                    }
                }
                if(videoFps){
                    outputFilters.push(`fps=${videoFps}`)
                }
                if(videoWidth && videoHeight){
                    outputFlags.push(`-s ${videoWidth}x${videoHeight}`)
                }
            }
            if(videoCodec !== 'none'){
                outputFlags.push(`-vcodec ` + videoCodec)
            }
            if(audioCodec === 'no'){
                outputFlags.push(`-an`)
            }else if(audioCodec && audioCodec !== 'auto'){
                outputFlags.push(`-c:a ` + audioCodec)
            }
            if(outputFilters.length > 0){
                outputFlags.push(`-vf "${outputFilters.join(',')}"`)
            }
            if(videoCodec !== 'h264_nvmpi' && videoCodec !== 'h264_vaapi' && !videoCodecisCopy){
                if(!arrayContains('-tune',outputFlags)){
                    outputFlags.push(`-tune zerolatency`)
                }
                if(!arrayContains('-g ',outputFlags)){
                    outputFlags.push(`-g 1`)
                }
            }
            outputFlags.push(`-f hls -live_start_index -3 -hls_time ${hlsTime} -hls_list_size ${hlsListSize} -start_number 0 -hls_allow_cache 0 -hls_flags +delete_segments+omit_endlist+discont_start "${e.sdir}detectorStream.m3u8"`)
        }
        return outputFlags.join(' ')
    }
    const buildTimelapseOutput = function(e){
        if(e.details.record_timelapse === '1'){
            const videoFilters = []
            const videoFlags = []
            const inputMap = buildInputMap(e,e.details.input_map_choices.record_timelapse)
            const { videoWidth, videoHeight } = validateDimensions(e.details.record_timelapse_scale_x,e.details.record_timelapse_scale_y)
            const creationFps = (1 / (!isNaN(parseFloat(e.details.record_timelapse_fps)) ? parseFloat(e.details.record_timelapse_fps) : 900)).toFixed(3);
            if(videoWidth && videoHeight)videoFlags.push(`-s ${videoWidth}x${videoHeight}`)
            if(inputMap)videoFlags.push(inputMap)
            videoFilters.push(`fps=${creationFps}`)
            if(e.details.record_timelapse_vf)videoFilters.push(e.details.record_timelapse_vf)
            if(e.details.record_timelapse_watermark === "1" && e.details.record_timelapse_watermark_location){
                videoFilters.push(buildWatermarkFiltersFromConfiguration('record_timelapse_',e))
            }
            if(videoFilters.length > 0){
                videoFlags.push(`-vf "${videoFilters.join(',')}"`)
            }
            videoFlags.push(`-f mjpeg -an -q:v 1 pipe:7`)
            return videoFlags.join(' ')
        }
        return ``
    }
    const getDefaultSubstreamFields = function(monitor){
        const otherInputFlags = []
        const otherOutputFlags = []
        const subStreamFields = parseJSON(monitor.details.substream || {input:{},output:{}})
        const inputAndConnectionFields = Object.assign({
           "type":"h264",
           "fulladdress":"",
           "sfps":"",
           "aduration":"",
           "probesize":"",
           "stream_loop":"0",
           "rtsp_transport":"",
           "accelerator":"0",
           "hwaccel":"",
           "hwaccel_vcodec":"auto",
           "hwaccel_device":"",
           "cust_input":""
       },subStreamFields.input);
       const outputFields = Object.assign({
           "stream_type":"hls",
           "rtmp_server_url":"",
           "rtmp_stream_key":"",
           "stream_mjpeg_clients":"",
           "stream_vcodec":"copy",
           "stream_acodec":"no",
           "stream_fps":"",
           "hls_time":"",
           "preset_stream":"",
           "hls_list_size":"",
           "stream_quality":"",
           "stream_v_br":"",
           "stream_a_br":"",
           "stream_scale_x":"",
           "stream_scale_y":"",
           "rotate_stream":"no",
           "svf":"",
           "cust_stream":""
       },subStreamFields.output);
       const isMp4Input = inputAndConnectionFields.type === 'mp4';
       const inputTypeCanLoop = isMp4Input || inputAndConnectionFields.type === 'local'
       if(inputTypeCanLoop){
           otherInputFlags.push('-stream_loop', '-1');
           if(isMp4Input)otherInputFlags.push('-re');
       }
       return {
           otherInputFlags,
           otherOutputFlags,
           inputAndConnectionFields,
           outputFields,
       }
    }
    const buildSubstreamString = function(channelNumber,monitor){
        let ffmpegParts = []
        const {
            inputAndConnectionFields,
            outputFields,
        } = getDefaultSubstreamFields(monitor)
        ffmpegParts.push(`-loglevel ${monitor.details.loglevel || 'warning'}`)
        ffmpegParts.push(createInputMap(monitor,channelNumber,inputAndConnectionFields))
        ffmpegParts.push(createStreamChannel(monitor,channelNumber,outputFields))
        return ffmpegParts.join(' ')
    }
    return {
        createStreamChannel: createStreamChannel,
        buildMainInput: buildMainInput,
        buildMainStream: buildMainStream,
        buildJpegApiOutput: buildJpegApiOutput,
        buildMainRecording: buildMainRecording,
        buildAudioDetector: buildAudioDetector,
        buildMainDetector: buildMainDetector,
        buildEventRecordingOutput: buildEventRecordingOutput,
        buildTimelapseOutput: buildTimelapseOutput,
        getDefaultSubstreamFields: getDefaultSubstreamFields,
        buildSubstreamString: buildSubstreamString,
    }
}
