var monitorEditorSelectedMonitor = null
onMonitorSettingsLoadedExtensions = []
function onMonitorSettingsLoaded(theAction){
    onMonitorSettingsLoadedExtensions.push(theAction)
}
$(document).ready(function(e){

//Monitor Editor
var monitorEditorWindow = $('#tab-monitorSettings')
var monitorEditorTitle = $('#tab-monitorSettings-title')
var monitorsForCopy = $('#copy_settings_monitors')
var monitorSectionInputMaps = $('#monSectionInputMaps')
var monitorStreamChannels = $('#monSectionStreamChannels')
var monSectionPresets = $('#monSectionPresets')
var copySettingsSelector = $('#copy_settings')
var monitorPresetsSelection = $('#monitorPresetsSelection')
var monitorPresetsNameField = $('#monitorPresetsName')
var detectorsSelected = $('#detectorsSelected')
var monitorsList = monitorEditorWindow.find('.monitors_list')
var editorForm = monitorEditorWindow.find('form')
var tagsInput = monitorEditorWindow.find('[name="tags"]')
var triggerTagsInput = monitorEditorWindow.find('[detail=det_trigger_tags]')
var fieldsLoaded = {}
var sections = {}
var loadedPresets = {}
function generateDefaultMonitorSettings(){
    var eventFilterId = generateId(5)
    return {
       "mode": "start",
       "mid": generateId(),
       "name": "Some Stream",
       "type": "h264",
       "host": "",
       "port": "",
       "path": "/",
       "height": "480",
       "width": "640",
       "ext": "mp4",
       "protocol": "http",
       "fps": "1",
       "details": {
           "max_keep_days": "",
           "notes": "",
           "dir": "",
           "rtmp_key": "",
           "auto_host_enable": "1",
           "auto_host": "",
           "rtsp_transport": "tcp",
           "muser": "",
           "mpass": "",
           "port_force": "0",
           "fatal_max": "0",
           "skip_ping": null,
           "is_onvif": null,
           "onvif_port": "",
           "onvif_events": "0",
           "primary_input": "0",
           "aduration": "1000000000",
           "probesize": "1000000000",
           "stream_loop": "0",
           "sfps": "",
           "accelerator": "0",
           "hwaccel": "auto",
           "hwaccel_vcodec": "",
           "hwaccel_device": "",
	   "hwaccel_format": "",
           "use_coprocessor": null,
           "stream_type": "hls",
           "stream_flv_type": "http",
           "stream_flv_maxLatency": "",
           "stream_mjpeg_clients": "",
           "stream_vcodec": "copy",
           "stream_acodec": "no",
           "hls_time": "2",
           "hls_list_size": "3",
           "preset_stream": "ultrafast",
           "signal_check": "10",
           "signal_check_log": "0",
           "stream_quality": "15",
           "stream_fps": "2",
           "stream_scale_x": "",
           "stream_scale_y": "",
           "rotate_stream": "no",
           "svf": "",
           "tv_channel": "0",
           "tv_channel_id": "",
           "tv_channel_group_title": "",
           "stream_timestamp": "0",
           "stream_timestamp_font": "",
           "stream_timestamp_font_size": "",
           "stream_timestamp_color": "",
           "stream_timestamp_box_color": "",
           "stream_timestamp_x": "",
           "stream_timestamp_y": "",
           "stream_watermark": "0",
           "stream_watermark_location": "",
           "stream_watermark_position": "tr",
           "snap": "0",
           "snap_fps": "",
           "snap_scale_x": "",
           "snap_scale_y": "",
           "snap_vf": "",
           "vcodec": "copy",
           "crf": "1",
           "acodec": "no",
           "record_scale_y": "",
           "record_scale_x": "",
           "cutoff": "15",
           "rotate_record": "no",
           "vf": "",
           "timestamp": "0",
           "timestamp_font": "",
           "timestamp_font_size": "10",
           "timestamp_color": "white",
           "timestamp_box_color": "0x00000000@1",
           "timestamp_x": "(w-tw)/2",
           "timestamp_y": "0",
           "watermark": "0",
           "watermark_location": "",
           "watermark_position": "tr",
           "record_timelapse": null,
           "record_timelapse_mp4": null,
           "record_timelapse_fps": null,
           "record_timelapse_scale_x": "",
           "record_timelapse_scale_y": "",
           "record_timelapse_vf": "",
           "record_timelapse_watermark": null,
           "record_timelapse_watermark_location": "",
           "record_timelapse_watermark_position": null,
           "cust_input": "",
           "cust_stream": "",
           "cust_snap": "",
           "cust_record": "",
           "cust_detect": "",
           "cust_sip_record": "",
           "custom_output": "",
           "detector": "0",
           "detector_http_api": null,
           "detector_send_frames": "1",
           "detector_lock_timeout": "",
           "detector_save": "1",
           "detector_fps": "",
           "detector_scale_x": "640",
           "detector_scale_y": "480",
           "detector_record_method": "sip",
           "detector_trigger": "1",
           "detector_motion_save_frame": "1",
           "detector_timeout": "0.5",
           "detector_send_video_length": "",
           "watchdog_reset": "1",
           "detector_delete_motionless_videos": "0",
           "det_trigger_tags": "",
           "detector_webhook": "0",
           "detector_webhook_url": "",
           "detector_webhook_method": null,
           "detector_command_enable": "0",
           "detector_command": "",
           "detector_command_timeout": "",
           "detector_mail": "0",
           "detector_mail_timeout": "",
           "detector_discordbot": null,
           "detector_discordbot_send_video": null,
           "detector_discordbot_timeout": "",
           "use_detector_filters": "0",
           "use_detector_filters_object": "1",
           "cords": "[]",
           "detector_filters": {
              [eventFilterId]: {
                "id": eventFilterId,
                "enabled": "1",
                "filter_name": "Standard Object Detection Filter",
                "where": [
                  {
                    "p1": "tag",
                    "p2": "!indexOf",
                    "p3": "person",
                    "p4": "&&"
                  },
                  {
                    "p1": "tag",
                    "p2": "!indexOf",
                    "p3": "car",
                    "p4": "&&"
                  },
                  {
                    "p1": "tag",
                    "p2": "!indexOf",
                    "p3": "truck",
                    "p4": "&&"
                  }
                ],
                "actions": {
                  "halt": "1",
                  "save": "",
                  "indifference": "",
                  "webhook": "",
                  "command": "",
                  "record": "",
                  "emailClient": "",
                  "global_webhook": ""
                }
              }
           },
           "detector_pam": "1",
           "detector_show_matrix": null,
           "detector_sensitivity": "",
           "detector_max_sensitivity": "",
           "detector_threshold": "1",
           "detector_color_threshold": "",
           "detector_frame": "0",
           "detector_noise_filter": null,
           "detector_noise_filter_range": "",
           "detector_notrigger": "0",
           "detector_notrigger_mail": "0",
           "detector_notrigger_timeout": "",
           "detector_audio": null,
           "detector_audio_min_db": "",
           "detector_audio_max_db": "",
           "detector_use_detect_object": "0",
           "detector_send_frames_object": null,
           "detector_obj_region": null,
           "detector_use_motion": "1",
           "detector_fps_object": "",
           "detector_scale_x_object": "",
           "detector_scale_y_object": "",
           "detector_lisence_plate": "0",
           "detector_lisence_plate_country": "us",
           "detector_buffer_vcodec": "auto",
           "detector_buffer_acodec": null,
           "detector_buffer_fps": "",
           "detector_buffer_hls_time": "",
           "detector_buffer_hls_list_size": "",
           "detector_buffer_start_number": "",
           "detector_buffer_live_start_index": "",
           "detector_ptz_follow": "0",
           "control": "0",
           "control_base_url": "",
           "onvif_non_standard":"1",
           "control_url_method":"ONVIF",
           "control_turn_speed":"0.01",
           "control_digest_auth": null,
           "control_axis_lock": "",
           "control_stop": "1",
           "control_url_stop_timeout": "500",
           "control_url_center": "",
           "control_url_left": "",
           "control_url_left_stop": "",
           "control_url_right": "",
           "control_url_right_stop": "",
           "control_url_up": "",
           "control_url_up_stop": "",
           "control_url_down": "",
           "control_url_down_stop": "",
           "control_url_enable_nv": "",
           "control_url_disable_nv": "",
           "control_url_zoom_out": "",
           "control_url_zoom_out_stop": "",
           "control_url_zoom_in": "",
           "control_url_zoom_in_stop": "",
           "loglevel": "warning",
           "sqllog": "0",
           "detector_cascades": "",
           "stream_channels": "",
           "input_maps": "",
           "input_map_choices": "",
           "substream": {
                "input": {
                    "type": "h264",
                    "fulladdress": "",
                    "sfps": "",
                    "aduration": "",
                    "probesize": "",
                    "stream_loop": null,
                    "rtsp_transport": "",
                    "accelerator": "0",
                    "hwaccel": null,
                    "hwaccel_vcodec": "",
                    "hwaccel_device": "",
		    "hwaccel_format": "",
                    "cust_input": ""
                },
                "output": {
                    "stream_type": "hls",
                    "rtmp_server_url": "",
                    "rtmp_stream_key": "",
                    "stream_mjpeg_clients": "",
                    "stream_vcodec": "copy",
                    "stream_acodec": "no",
                    "hls_time": "",
                    "hls_list_size": "",
                    "preset_stream": "",
                    "stream_quality": "",
                    "stream_v_br": "",
                    "stream_a_br": "",
                    "stream_fps": "",
                    "stream_scale_x": "640",
                    "stream_scale_y": "480",
                    "stream_rotate": null,
                    "svf": "",
                    "cust_stream": ""
                }
            }
        }
    }
}
var getHumanizedMonitorConfig = function(monitor){
    var humanizedMonitorKeys = {}
    $.each(monitor,function(key,value){
        if(key === 'details'){
            humanizedMonitorKeys.details = {}
            $.each(value,function(key,value){
                humanizedMonitorKeys.details[fieldsLoaded[`detail=${key}`] && fieldsLoaded[`detail=${key}`].field ? fieldsLoaded[`detail=${key}`].field + ` (${key})` : key] = value
            })
        }else{
            humanizedMonitorKeys[fieldsLoaded[key] && fieldsLoaded[key].field ? fieldsLoaded[key].field : key] = value
        }
    })
    return humanizedMonitorKeys
}
var getSelectedMonitorInfo = function(){
    var groupKey = monitorEditorWindow.attr('data-ke')
    var monitorId = monitorEditorWindow.attr('data-mid')
    return {
        ke: groupKey,
        mid: monitorId,
        auth: $user.auth_token,
    }
}
var differentiateMonitorConfig = function(firstConfig,secondConfig){
    console.log(firstConfig,secondConfig)
    var diffedConfig = {}
    var firstConfigEditable = Object.assign(firstConfig,{details:safeJsonParse(firstConfig.details)})
    var secondConfigEditable = Object.assign(secondConfig,{details:safeJsonParse(secondConfig.details)})
    var theDiff = diffObject(firstConfigEditable,secondConfigEditable)
    console.log(theDiff)
    return theDiff
}
var copyMonitorSettingsToSelected = function(monitorConfig){
    var monitorDetails = safeJsonParse(monitorConfig.details);
    var copyMonitors = monitorsForCopy.val().filter((monitorId) => {
        return monitorConfig.mid !== monitorId
    });
    var chosenSections = [];
    var chosenMonitors = {};

    if(!copyMonitors||copyMonitors.length===0){
        new PNotify({title:lang['No Monitors Selected'],text:lang.monSavedButNotCopied})
        return
    }

    monitorEditorWindow.find('[copy]').each(function(n,v){
        var el = $(v)
        if(el.val() === '1'){
            chosenSections.push(el.attr('copy'))
        }
    })
    var alterSettings = function(settingsToAlter,monitor){
        monitor.details = safeJsonParse(monitor.details);
        var searchElements = []
        if(settingsToAlter.indexOf('field=') > -1){
            var splitSettingsToAlter = settingsToAlter.split('=')
            if(splitSettingsToAlter[1] === 'detail' && splitSettingsToAlter[2]){
                searchElements = monitorEditorWindow.find(`[detail="${splitSettingsToAlter[2]}"]`)
            }else{
                searchElements = monitorEditorWindow.find(`[name="${splitSettingsToAlter[1]}"]`)
            }
        }else{
            searchElements = monitorEditorWindow.find(settingsToAlter).find('input,select,textarea')
        }
        searchElements.each(function(n,v){
            var el = $(v);
            var name = el.attr('name')
            var detail = el.attr('detail')
            var value
            switch(true){
                case !!name:
                    var value = monitorConfig[name]
                    monitor[name] = value;
                break;
                case !!detail:
                    detail = detail.replace('"','')
                    var value = monitorDetails[detail]
                    monitor.details[detail] = value;
                break;
            }
        })
        monitor.details = JSON.stringify(monitor.details);
        return monitor;
    }
    $.each(copyMonitors,function(n,id){
        var monitor
        if(monitorConfig.id === id)return;
        if(id === '$New'){
            monitor = generateDefaultMonitorSettings();
            //connection
            monitor.name = monitorConfig.name+' - '+monitor.mid
            monitor.type = monitorConfig.type
            monitor.protocol = monitorConfig.protocol
            monitor.host = monitorConfig.host
            monitor.port = monitorConfig.port
            monitor.path = monitorConfig.path
            monitor.details.fatal_max = monitorDetails.fatal_max
            monitor.details.port_force = monitorDetails.port_force
            monitor.details.muser = monitorDetails.muser
            monitor.details.password = monitorDetails.password
            monitor.details.rtsp_transport = monitorDetails.rtsp_transport
            monitor.details.auto_host = monitorDetails.auto_host
            monitor.details.auto_host_enable = monitorDetails.auto_host_enable
            //input
            monitor.details.aduration = monitorDetails.aduration
            monitor.details.probesize = monitorDetails.probesize
            monitor.details.stream_loop = monitorDetails.stream_loop
            monitor.details.sfps = monitorDetails.sfps
            monitor.details.accelerator = monitorDetails.accelerator
            monitor.details.hwaccel = monitorDetails.hwaccel
            monitor.details.hwaccel_vcodec = monitorDetails.hwaccel_vcodec
            monitor.details.hwaccel_device = monitorDetails.hwaccel_device
            monitor.details.hwaccel_format = monitorDetails.hwaccel_format
        }else{
            monitor = Object.assign({},loadedMonitors[id]);
        }
        $.each(chosenSections,function(n,section){
            monitor = alterSettings(section,monitor)
        })
        $.post(getApiPrefix()+'/configureMonitor/'+$user.ke+'/'+monitor.mid,{data:JSON.stringify(monitor)},function(d){
            debugLog(d)
        }).fail(function(xhr, status, error) {
            console.error(error)
        });
        chosenMonitors[monitor.mid] = monitor;
    })
}
window.getMonitorEditFormFields = function(){
    var response = {ok: true}
    var monitorConfig = editorForm.serializeObject()
    var errorsFound = []
    $.each(monitorConfig,function(n,v){monitorConfig[n]=v.trim()});
    $.each(['fps','width','height','port'],function(n,key){
        monitorConfig[key] = !isNaN(monitorConfig[key]) ? parseFloat(monitorConfig[key]) : monitorConfig[key]
    })
    monitorConfig.mid = monitorConfig.mid.replace(/[^\w\s]/gi,'').replace(/ /g,'')
    if(monitorConfig.mid.length < 3){errorsFound.push('Monitor ID too short')}
    if(monitorConfig.port == ''){
        if(monitorConfig.protocol === 'https'){
            monitorConfig.port = 443
        }else{
            monitorConfig.port = 80
        }
    }
    if(monitorConfig.name == ''){errorsFound.push('Monitor Name cannot be blank')}
    //edit details
    monitorConfig.details = getDetailValues(editorForm)
    // monitorConfig.details = safeJsonParse(monitorConfig.details)
    monitorConfig.details.substream = getSubStreamChannelFields()
    monitorConfig.details.input_map_choices = monitorSectionInputMapsave()
    // TODO : Input Maps and Stream Channels (does old way at the moment)


//    if(monitorConfig.protocol=='rtsp'){monitorConfig.ext='mp4',monitorConfig.type='rtsp'}
    if(errorsFound.length > 0){
        response.ok = false
        response.errors = errorsFound
        return response;
    }
    response.monitorConfig = monitorConfig
    return response
}

function drawMonitorSettingsSubMenu(){
    drawSubMenuItems('monitorSettings',definitions['Monitor Settings'])
}

function getAdditionalInputMapFields(tempID,channelId){
    var fieldInfo = monitorSettingsAdditionalInputMapFieldHtml.replaceAll('$[TEMP_ID]',tempID).replaceAll('$[NUMBER]',channelId)
    return fieldInfo
}

function getAdditionalStreamChannelFields(tempID,channelId){
    var fieldInfo = monitorSettingsAdditionalStreamChannelFieldHtml.replaceAll('$[TEMP_ID]',tempID).replaceAll('$[NUMBER]',channelId)
    return fieldInfo
}
addOnTabOpen('monitorSettings', function () {
    setFieldVisibility()
    drawMonitorSettingsSubMenu()
})
addOnTabReopen('monitorSettings', function () {
    setFieldVisibility()
    drawMonitorSettingsSubMenu()
})
function drawInputMapHtml(options){
    var tmp = ''
    var tempID = generateId()
    options = options ? options : {}
    if(!options.channel){
        var numberOfChannelsDrawn = $('#monSectionInputMaps .input-map').length
        options.channel = numberOfChannelsDrawn+1
    }
    tmp+=getAdditionalInputMapFields(tempID,options.channel)
    monitorSectionInputMaps.append(tmp)
    monitorSectionInputMaps.find('.input-map').last().find('[map-detail="aduration"]').change()
    return tempID;
}
function drawStreamChannelHtml(options){
    var tmp = ''
    var tempID = generateId()
    options = options ? options : {}
    if(!options.channel){
        var numberOfChannelsDrawn = $('#monSectionStreamChannels .stream-channel').length
        options.channel=numberOfChannelsDrawn
    }
    tmp+=`${getAdditionalStreamChannelFields(tempID,options.channel)}`
    monitorStreamChannels.append(tmp)
    monitorStreamChannels.find('.stream-channel').last().find('[channel-detail="stream_vcodec"]').change()
    return tempID;
}
function replaceMap(string,mapNumber){
    var newString = string.split(':')
    newString[0] = `${mapNumber}`
    return newString.join(':')
}
function replaceMapInName(string,mapNumber){
    var newString = string.split('(')
    newString[1] = replaceMap(newString[1],mapNumber)
    var lastIndex = newString.length - 1
    if(!newString[lastIndex].endsWith(')')){
        newString[lastIndex] = newString + ')'
    }
    return newString.join('(')
}
function buildMapSelectorOptionsBasedOnAddedMaps(){
    var baseOptionSet = definitions['Monitor Settings'].blocks.Input.info.find((item) => {return item.name === 'detail=primary_input'}).possible
    var newOptGroup = [baseOptionSet]
    var addedInputMaps = monitorEditorWindow.find('.input-map')
    $.each(addedInputMaps,function(n){
        var mapNumber = n + 1
        var newOptionSet = []
        $.each(baseOptionSet,function(nn,option){
            newOptionSet.push({
                "name": replaceMapInName(option.name,mapNumber),
                "value": replaceMap(option.value,mapNumber)
            })
        })
        newOptGroup[mapNumber] = newOptionSet
    })
    return newOptGroup
}
function drawInputMapSelectorHtml(options,parent){
    if(!options.map)options.map = '';
    var availableInputMapSelections = buildMapSelectorOptionsBasedOnAddedMaps()
    var html = `<div class="map-row form-group map-row d-flex flex-row">
        <div class="flex-grow-1">
            <select class="form-control form-control-sm" map-input="map">`
                    $.each(availableInputMapSelections,function(n,optgroup){
                        html += `<optgroup label="${lang['Map']} ${n}">`
                            $.each(optgroup,function(nn,option){
                                html += createOptionHtml({
                                    label: option.name,
                                    value: option.value,
                                    selected: option.value === options.map,
                                })
                            })
                        html += `</optgroup>`
                    })
            html += `</select>
        </div>
        <div>
            <a class="btn btn-danger btn-sm delete_map_row">&nbsp;<i class="fa fa-trash-o"></i>&nbsp;</a>
        </div>
    </div>`
    parent.prepend(html)
}
function getPluginsList(monitorConfig){
    return new Promise((resolve) => {
        const chosenDetectors = safeJsonParse(monitorConfig.details).detectors_selected || [];
        $.get(getApiPrefix('plugins') + '/list',function(data){
            var plugins = data.plugins || {};
            var pluginNames = Object.keys(plugins)
            var disconnectedPlugins = chosenDetectors.filter(item => !pluginNames.includes(item));
            var html = createOptionHtml({
                value: 'all',
                label: `${lang.All} (${lang.Default})`
            });
            $.each(plugins, function(name, pluginInfo){
                html += createOptionHtml({
                    value: name,
                    label: name,
                    selected: chosenDetectors.includes(name),
                })
            });
            $.each(disconnectedPlugins, function(n, name){
                html += createOptionHtml({
                    value: name,
                    label: `${name} (${lang.Disconnected})`,
                    selected: true,
                })
            });
            detectorsSelected.html(html)
            resolve(plugins)
        }).fail((err) => {
            console.error(err);
            resolve({})
        })
    })
}
async function importIntoMonitorEditor(options){
    var monitorConfig = options.values || options
    var monitorId = monitorConfig.mid
    var monitorDetails = safeJsonParse(monitorConfig.details);
    var monitorTags = monitorConfig.tags ? monitorConfig.tags.split(',') : []
    var monitorGroups = monitorDetails.groups ? safeJsonParse(monitorDetails.groups) : []
    monitorTags = monitorTags.concat(monitorGroups)
    loadMonitorGroupTriggerList()
	if (monitorConfig.ke && monitorConfig.mid) {
		$.get(getApiPrefix()+'/hls/'+monitorConfig.ke+'/'+monitorConfig.mid+'/detectorStream.m3u8',function(data){
			$('#monEditBufferPreview').html(data)
		})
	}
    tagsInput.tagsinput('removeAll');
    monitorTags.forEach((tag) => {
        tagsInput.tagsinput('add',tag);
    });
    monitorEditorWindow.find('.edit_id').text(monitorConfig.mid);
    monitorEditorWindow.attr('data-mid',monitorConfig.mid).attr('data-ke',monitorConfig.ke)
    $.each(monitorConfig,function(n,v){
        monitorEditorWindow.find('[name="'+n+'"]').val(v).change()
    })
    //get maps
    monitorSectionInputMaps.empty()
    if(monitorDetails.input_maps && monitorDetails.input_maps !== ''){
        var input_maps = safeJsonParse(monitorDetails.input_maps)
        if(input_maps.length > 0){
            showInputMappingFields()
            $.each(input_maps,function(n,v){
                var tempID = drawInputMapHtml()
                var parent = $('#monSectionMap'+tempID)
                $.each(v,function(m,b){
                    parent.find('[map-detail="'+m+'"]').val(b).change()
                })
            })
        }else{
            showInputMappingFields(false)
        }
    }
    //get channels
    monitorStreamChannels.empty()
    if(monitorDetails.stream_channels&&monitorDetails.stream_channels!==''){
        var stream_channels
        try{
            stream_channels = safeJsonParse(monitorDetails.stream_channels)
        }catch(er){
            stream_channels = monitorDetails.stream_channels;
        }
        $.each(stream_channels,function(n,v){
            var tempID = drawStreamChannelHtml()
            var parent = $('#monSectionChannel'+tempID)
            $.each(v,function(m,b){
                parent.find('[channel-detail="'+m+'"]').val(b)
            })
        })
    }
    //get map choices for outputs
    monitorEditorWindow.find('[input-mapping] .choices').empty()
    if(monitorDetails.input_map_choices&&monitorDetails.input_map_choices!==''){
        var input_map_choices
        try{
            input_map_choices = safeJsonParse(monitorDetails.input_map_choices)
        }catch(er){
            input_map_choices = monitorDetails.input_map_choices;
        }
        $.each(input_map_choices,function(n,v){
            $.each(safeJsonParse(v),function(m,b){
                var parent = $('[input-mapping="'+n+'"] .choices')
                drawInputMapSelectorHtml(b,parent)
            })
        })
    }
    // substream
    $.each(['input','output'],function(n,direction){
        // detail-substream-input
        // detail-substream-output
        var keyName = `detail-substream-${direction}`
        monitorEditorWindow.find(`[${keyName}]`).each(function(n,el){
            var key = $(el).attr(keyName);
            var value = monitorDetails.substream && monitorDetails.substream[direction] ? monitorDetails.substream[direction][key] : ''
            monitorEditorWindow.find(`[${keyName}="${key}"]`).val(value).change();
        })
    })
    //
    monitorEditorWindow.find('[detail]').each(function(n,v){
        v=$(v).attr('detail');if(!monitorDetails[v]){monitorDetails[v]=''}
    })
    $.each(monitorDetails,function(n,v){
        var theVal = v;
        if(v instanceof Object){
            theVal = JSON.stringify(v);
        }
        monitorEditorWindow.find('[detail="'+n+'"]').val(theVal).change();
    });
    $.each(monitorDetails,function(n,v){
        try{
            var variable=safeJsonParse(v)
        }catch(err){
            var variable=v
        }
        if(variable instanceof Object){
            $('[detailContainer="'+n+'"][detailObject]').prop('checked',false)
            $('[detailContainer="'+n+'"][detailObject]').parents('.mdl-js-switch').removeClass('is-checked')
            if(variable instanceof Array){
                $.each(variable,function(m,b,parentOfObject){
                    $('[detailContainer="'+n+'"][detailObject="'+b+'"]').prop('checked',true)
                    parentOfObject=$('[detailContainer="'+n+'"][detailObject="'+b+'"]').parents('.mdl-js-switch')
                    parentOfObject.addClass('is-checked')
                })
            }else{
                $.each(variable,function(m,b){
                    if(typeof b ==='string'){
                       $('[detailContainer="'+n+'"][detailObject="'+m+'"]').val(b).change()
                    }else{
                        $('[detailContainer="'+n+'"][detailObject="'+m+'"]').prop('checked',true)
                        parentOfObject=$('[detailContainer="'+n+'"][detailObject="'+m+'"]').parents('.mdl-js-switch')
                        parentOfObject.addClass('is-checked')
                    }
                })
            }
        }
    });
    //
    await getPluginsList(monitorConfig)
    //
    copySettingsSelector.val('0').change()
    var tmp = '';
    $.each(loadedMonitors,function(n,monitor){
        if(monitor.ke === $user.ke){
            tmp += createOptionHtml({
                value: monitor.mid,
                label: monitor.name
            })
        }
    })
    monitorsForCopy.find('optgroup').html(tmp)
    setFieldVisibility()
    drawMonitorSettingsSubMenu()
    onMonitorSettingsLoadedExtensions.forEach(function(theAction){
        theAction(monitorConfig)
    })
}
//parse "Automatic" field in "Input" Section
monitorEditorWindow.on('change','.auto_host_fill input,.auto_host_fill select',function(e){
    var theSwitch = monitorEditorWindow.find('[detail="auto_host_enable"]').val()
    if(!theSwitch||theSwitch===''){
        theSwitch='1'
    }
    if(theSwitch==='1'){
        return
    }
    if(monitorEditorWindow.find('[name="host"]').val() !== ''){
        monitorEditorWindow.find('[detail="auto_host"]').val(buildMonitorURL())
    }
})
monitorEditorWindow.on('change','[detail="auto_host"]',function(e){
    var isRTSP = false
    var inputType = monitorEditorWindow.find('[name="type"]').val()
    var url = $(this).val()
    var theSwitch = monitorEditorWindow.find('[detail="auto_host_enable"]')
    var disabled = theSwitch.val()
    if(!disabled||disabled===''){
        //if no value, then probably old version of monitor config. Set to Manual to avoid confusion.
        disabled='0'
        theSwitch.val('0').change()
    }
    if(disabled==='0'){
        return
    }
    if(inputType === 'local'){
        monitorEditorWindow.find('[name="path"]').val(url).change()
    }else{
        var urlSplitByDots = url.split('.')
        var has = function(query,searchIn){if(!searchIn){searchIn=url;};return url.indexOf(query)>-1}
        var protocol = url.split('://')[0]
        console.log(url.split('://'))
        //switch RTSP, RTMP and RTMPS to parse URL
        if(has('rtsp://')){
            isRTSP = true;
            url = url.replace('rtsp://','http://')
        }
        if(has('rtmp://')){
            isRTMP = true;
            url = url.replace('rtmp://','http://')
        }
        if(has('rtmps://')){
            isRTMPS = true;
            url = url.replace('rtmps://','http://')
        }
        //parse URL
        var parsedURL = document.createElement('a');
        parsedURL.href = url;
        var pathname = parsedURL.pathname
        if(url.indexOf('?') > -1){
            pathname += '?'+url.split('?')[1]
        }
        monitorEditorWindow.find('[name="protocol"]').val(protocol).change()
        if(isRTSP){
            monitorEditorWindow.find('[detail="rtsp_transport"]').val('tcp').change()
            monitorEditorWindow.find('[detail="aduration"]').val(1000000).change()
            monitorEditorWindow.find('[detail="probesize"]').val(1000000).change()
        }
        monitorEditorWindow.find('[detail="muser"]').val(parsedURL.username).change()
        monitorEditorWindow.find('[detail="mpass"]').val(parsedURL.password).change()
        monitorEditorWindow.find('[name="host"]').val(parsedURL.hostname).change()
        monitorEditorWindow.find('[name="port"]').val(parsedURL.port).change()
        monitorEditorWindow.find('[name="path"]').val(pathname).change()
        delete(parsedURL)
    }
})
editorForm.submit(function(e){
    e.preventDefault();
    var validation = getMonitorEditFormFields()
    if(!validation.ok){
        var errorsFound = validation.errors
        $.sM.e.find('.msg').html(errorsFound.join('<br>'));
        new PNotify({title:'Configuration Invalid',text:errorsFound.join('<br>'),type:'error'});
    }
    var monitorConfig = validation.monitorConfig
    setSubmitButton(editorForm, lang[`Please Wait...`], `spinner fa-pulse`, true)
    $.post(getApiPrefix()+'/configureMonitor/'+$user.ke+'/'+monitorConfig.mid,{data:JSON.stringify(monitorConfig)},function(d){
        if(d.ok === false){
            new PNotify({
                title: lang['Action Failed'],
                text: d.msg,
                type: 'danger'
            })
        }
        debugLog(d)
        setSubmitButton(editorForm, lang.Save, `check`, false)
    }).fail((err) => {
        new PNotify({
            title: lang['Action Failed'],
            text: JSON.stringify(err, null, 3),
            type: 'danger'
        })
        setSubmitButton(editorForm, lang.Save, `check`, false)
    })
    //
    if(copySettingsSelector.val() === '1'){
        copyMonitorSettingsToSelected(monitorConfig)
    }
    monitorEditorWindow.modal('hide')
    return false;
});
//////////////////
//Input Map (Feed)
var mapPlacementInit = function(){
    $('.input-map').each(function(n,v){
        var _this = $(this)
        _this.find('.place').text(n+1)
    })
}
var monitorSectionInputMapsave = function(){
    var mapContainers = monitorEditorWindow.find('[input-mapping]');
    var stringForSave = {}
    mapContainers.each(function(q,t){
        var mapRowElement = $(t).find('.map-row');
        var mapRow = []
        mapRowElement.each(function(n,v){
            var map={}
            $.each($(v).find('[map-input]'),function(m,b){
                map[$(b).attr('map-input')]=$(b).val()
            });
            mapRow.push(map)
        });
        stringForSave[$(t).attr('input-mapping')] = mapRow;
    });
    return stringForSave
}
monitorSectionInputMaps.on('click','.delete',function(){
    $(this).parents('.input-map').remove()
    var inputs = $('[map-detail]')
    if(inputs.length===0){
        monitorEditorWindow.find('[detail="input_maps"]').val('[]').change()
        showInputMappingFields(false)
    }else{
        inputs.first().change()
        showInputMappingFields()
    }
    mapPlacementInit()
})
monitorEditorWindow.on('change','[map-detail]',function(){
    var el = monitorSectionInputMaps.find('.input-map')
    var selectedMaps = []
    el.each(function(n,v){
        var map={}
        $.each($(v).find('[map-detail]'),function(m,b){
            map[$(b).attr('map-detail')]=$(b).val()
        });
        selectedMaps.push(map)
    });
    monitorEditorWindow.find('[detail="input_maps"]').val(JSON.stringify(selectedMaps)).change()
})
monitorEditorWindow.on('click','[input-mapping] .add_map_row',function(){
    drawInputMapSelectorHtml({},$(this).parents('[input-mapping]').find('.choices'))
})
monitorEditorWindow.on('click','[input-mapping] .delete_map_row',function(){
    $(this).parents('.map-row').remove()
})
//////////////////
//Stream Channels
var monitorStreamChannelsave = function(){
    var el = monitorStreamChannels.find('.stream-channel')
    var selectedChannels = []
    el.each(function(n,v){
        var channel={}
        $.each($(v).find('[channel-detail]'),function(m,b){
            channel[$(b).attr('channel-detail')]=$(b).val()
        });
        selectedChannels.push(channel)
    });
    monitorEditorWindow.find('[detail="stream_channels"]').val(JSON.stringify(selectedChannels)).change()
}
var channelPlacementInit = function(){
    $('.stream-channel').each(function(n,v){
        var _this = $(this)
        _this.attr('stream-channel',n)
        _this.find('.place').text(n)
        _this.find('[input-mapping]').attr('input-mapping','stream_channel-'+n)
    })
}
var getSubStreamChannelFields = function(){
    var selectedChannels = {
        input: getPseudoFields('detail-substream-input'),
        output: getPseudoFields('detail-substream-output')
    }
    return selectedChannels
}
var getPseudoFields = function(fieldKey,parent){
    parent = parent || monitorEditorWindow
    fieldKey = fieldKey || 'detail-substream-input'
    var fields = {}
    var fieldsAssociated = parent.find(`[${fieldKey}]`)
    $.each(fieldsAssociated,function(m,b){
        var el = $(b);
        var paramKey = el.attr(fieldKey)
        var value = el.val()
        fields[paramKey] = value
    });
    console.log(fields)
    return fields
}
var buildMonitorURL = function(){
    var user = monitorEditorWindow.find('[detail="muser"]').val();
    var pass = monitorEditorWindow.find('[detail="mpass"]').val();
    var host = monitorEditorWindow.find('[name="host"]').val();
    var protocol = monitorEditorWindow.find('[name="protocol"]').val();
    var port = monitorEditorWindow.find('[name="port"]').val();
    var path = monitorEditorWindow.find('[name="path"]').val();
    var type = monitorEditorWindow.find('[name="type"]').val();
    if(type === 'local'){
        url = path;
    }else{
        if(host.indexOf('@') === -1 && user !== ''){
            host = user + ':' + pass + '@' + host;
        }
        url = compileConnectUrl({
            user: user,
            pass: pass,
            host: host,
            protocol: protocol,
            port: port,
            path: encodeURI(path),
            type: type,
        });
    }
    return url
}
var showInputMappingFields = function(showMaps){
    var el = $('[input-mapping],.input-mapping')
    if(showMaps === undefined)showMaps = true
    if(showMaps){
        el.show()
    }else{
        el.hide()
    }
    setFieldVisibility()
    drawMonitorSettingsSubMenu()
}
function setFieldVisibilityNewWay(){
    var validation = getMonitorEditFormFields()
    if(!validation.ok){
        return console.log('Failed setFieldVisibilityNewWay', validation)
    }
    var monitorConfig = validation.monitorConfig
    var monitorDetails = safeJsonParse(monitorConfig.details)
    var commonChecks = {
        streamSectionCopyModeVisibilities: `monitorDetails.stream_vcodec === 'libx264' ||
        monitorDetails.stream_vcodec === 'libx265' ||
        monitorDetails.stream_vcodec === 'h264_nvenc' ||
        monitorDetails.stream_vcodec === 'hevc_nvenc' ||
        monitorDetails.stream_vcodec === 'no' ||

        monitorDetails.stream_type === 'mjpeg' ||
        monitorDetails.stream_type === 'b64' ||
        ((monitorDetails.stream_type === 'hls' || monitorDetails.stream_type === 'mp4') && monitorDetails.stream_vcodec !== 'copy') ||
        monitorDetails.stream_type === 'gif' ||
        monitorDetails.stream_type === 'flv'`
    }
    editorForm.find('[visibility-conditions]').each(function(n,v){
        var el = $(v)
        var visibilityConditions = el.attr('visibility-conditions')
        var response = true
        var commonCheck = commonChecks[visibilityConditions]
        if(commonCheck){
            response = eval(commonCheck)
        }else{
            response = eval(visibilityConditions)
        }
        if(response){
            el.show()
        }else{
            el.hide()
        }
    })
}
function setFieldVisibilityOldWay(formElement){
    var listToShow = []
    formElement.find('[selector]').each(function(n,v){
        var el = $(this)
        var keyName = el.attr('selector')
        var value = el.val()
        var toShow = `${keyName}_${value}`
        listToShow.push(toShow)
        formElement.find(`.${keyName}_input`).hide()
    })
    for (let i = 0; i < listToShow.length; i++) {
        var item = listToShow[i];
        var elements = formElement.find(`[class*="${item}"]`)
        elements.show()
    }
}
function setFieldVisibility(){
    setFieldVisibilityOldWay(editorForm)
    setFieldVisibilityNewWay()
}
monitorStreamChannels.on('click','.delete',function(){
    $(this).parents('.stream-channel').remove()
    monitorStreamChannelsave()
    channelPlacementInit()
})
monitorEditorWindow.on('change','[channel-detail]',function(){
    monitorStreamChannelsave()
})
monitorEditorWindow.find('.probe-monitor-settings').click(function(){
    $.pB.submit(buildMonitorURL())
})
monitorEditorWindow.find('.save_config').click(function(e){
    //export monior config in view
  var el = $(this);
  var monitorId = el.parents('[mid]').attr('mid');
  var form = editorForm.serializeObject();
    if(!monitorId||monitorId===''){
        monitorId='NewMonitor'
    }
    form.details = safeJsonParse(form.details)
    downloadJSON(form,'Shinobi_'+monitorId+'_config.json')
});
monitorEditorWindow.find('.add-input-to-monitor-settings').click(function(e){
    showInputMappingFields()
    drawInputMapHtml()
});
monitorEditorWindow.find('.add-channel-to-monitor-settings').click(function(e){
    drawStreamChannelHtml()
});
editorForm.find('[detail="stream_type"]').change(function(e){
    var el = $(this);
    if(el.val()==='jpeg')editorForm.find('[detail="snap"]').val('1').change()
})
editorForm.find('[name="type"]').change(function(e){
    var el = $(this);
    if(el.val()==='h264')editorForm.find('[name="protocol"]').val('rtsp').change()
})
// editorForm.find('[detail]').change(function(){
//     onDetailFieldChange(this)
// })
editorForm.on('change','[selector]',function(){
    var el = $(this);
    onSelectorChange(el,editorForm)
    setFieldVisibilityNewWay()
    drawMonitorSettingsSubMenu()
});
editorForm.find('[name="type"]').change(function(e){
    var el = $(this);
    var value = el.val();
    var pathField = editorForm.find('[name="path"]');
    switch(value){
        case'local':case'socket':
            pathField.attr('placeholder','/dev/video0')
        break;
        default:
            pathField.attr('placeholder','/videostream.cgi?1')
        break;
    }
});
    var connectedDetectorPlugins = {}
    function addDetectorPlugin(name,d){
        connectedDetectorPlugins[d.plug] = {
            id: d.id,
            plug: d.plug,
            notice: d.notice,
            connectionType: d.connectionType
        }
        drawPluginElements()
    }
    function removeDetectorPlugin(name){
        delete(connectedDetectorPlugins[name])
        drawPluginElements(name)
    }
    function drawPluginElements(){
        if(Object.keys(connectedDetectorPlugins).length === 0){
            $('.stream-objects .stream-detected-object').remove()
            $('.shinobi-detector').hide()
            $('.shinobi-detector-msg').empty()
            $('.shinobi-detector_name').empty()
            $('.shinobi-detector_plug').hide()
            $('.shinobi-detector-invert').show()
            setFieldVisibility()
            drawMonitorSettingsSubMenu()
        }else{
            var pluginTitle = []
            var pluginNotice = []
            $.each(connectedDetectorPlugins,function(name,d){
                pluginTitle.push(name)
                if(d.notice){
                    pluginNotice.push('<b>' + d.plug + '</b> : ' + d.notice)
                }
                $('.shinobi-detector-'+d.plug).show()
            })
            $('.shinobi-detector').show()
            $('.shinobi-detector-invert').hide()
            $('.shinobi-detector_name').text(pluginTitle.join(', '))
            if(pluginNotice.length > 0)$('.shinobi-detector-msg').text(pluginNotice.join('<br>'))
            setFieldVisibility()
            drawMonitorSettingsSubMenu()
        }
    }
    window.openMonitorEditorPage = function(monitorId){
        var monitorConfigToLoad;
        monitorEditorWindow.find('.am_notice').hide()
        monitorEditorWindow.find('[detailcontainer="detector_cascades"]').prop('checked',false).parents('.mdl-js-switch').removeClass('is-checked')
        if(!loadedMonitors[monitorId]){
            //new monitor
            monitorEditorWindow.find('.am_notice_new').show()
            monitorEditorWindow.find('[monitor="delete"]').hide()
            monitorEditorTitle.find('span').text(lang['Add New'])
            monitorEditorTitle.find('i').attr('class','fa fa-plus')
            monitorConfigToLoad = generateDefaultMonitorSettings()
        }else{
            //edit monitor
            monitorConfigToLoad = loadedMonitors[monitorId]
            monitorEditorWindow.find('.am_notice_edit').show()
            monitorEditorWindow.find('[monitor="delete"]').show()
            monitorEditorTitle.find('span').html(`${monitorConfigToLoad.name} <small>${monitorConfigToLoad.mid}</small>`)
            monitorEditorTitle.find('i').attr('class','fa fa-wrench')
        }
        monitorEditorSelectedMonitor = monitorConfigToLoad
        importIntoMonitorEditor(monitorConfigToLoad)
        openTab(`monitorSettings`,{},null)
        monitorsList.val(monitorConfigToLoad.mid || '')
    }
    function onMonitorEdit(d){
        var monitorId = d.mid || d.id
        var newMonitorData = d.mon
        var loadedMonitor = loadedMonitors[monitorId]
        clearMonitorTimers(monitorId)
        var montageElement = $('#monitor_live_' + monitorId);
        montageElement.find('.stream-detected-object').remove()
        var watchOnInfo = dashboardOptions()['watch_on'] || {};
        if(newMonitorData.details.cords instanceof Object){
            newMonitorData.details.cords = JSON.stringify(newMonitorData.details.cords)
        }
        newMonitorData.details = JSON.stringify(newMonitorData.details);
        if(!loadedMonitor){
            loadedMonitors[monitorId] = {}
            loadedMonitor = loadedMonitors[monitorId]
        }
        loadedMonitor.previousStreamType = newMonitorData.details.stream_type
        $.each(newMonitorData,function(n,v){
            loadedMonitor[n] = n === 'details' ? safeJsonParse(v) : v
        })
        if(d.new === true){
            drawMonitorIconToMenu(newMonitorData)
        }
        switch(newMonitorData.mode){
            case'start':case'record':
                if(watchOnInfo[newMonitorData.ke] && watchOnInfo[newMonitorData.ke][newMonitorData.mid] === 1){
                    mainSocket.f({
                        f: 'monitor',
                        ff: 'watch_on',
                        id: monitorId
                    })
                }
            break;
        }
        setCosmeticMonitorInfo(newMonitorData)
        drawMonitorGroupList()
        if(!d.silenceNote){
            redAlertNotify({
                title: lang['Monitor Saved'],
                text: '<b>'+newMonitorData.name+'</b> <small>'+newMonitorData.mid+'</small> has been saved.',
                type: 'success'
            })
        }
    }
    function clearMonitorTimers(monitorId){
        var theMonitor = loadedMonitors[monitorId]
        if(theMonitor){
            clearTimeout(theMonitor._signal);
            clearInterval(theMonitor.hlsGarbageCollectorTimer)
            clearTimeout(theMonitor.jpegInterval);
            clearInterval(theMonitor.signal);
            clearInterval(theMonitor.m3uCheck);
            if(theMonitor.Base64 && theMonitor.Base64.connected){
                theMonitor.Base64.disconnect()
            }
            if(theMonitor.Poseidon){
                theMonitor.Poseidon.stop()
            }
        }
    }
    function resetMonitorEditor(){
        $.confirm.create({
            title: lang.wannaReset,
            body: lang.undoAllUnsaveChanges,
            clickOptions: {
                title: lang['Reset'],
                class:'btn-danger'
            },
            clickCallback: function(){
                openMonitorEditorPage()
            }
        })
    }
    function loadMonitorGroupTriggerList(){
        var monitorTriggerTags = (monitorEditorSelectedMonitor && monitorEditorSelectedMonitor.details.det_trigger_tags ? monitorEditorSelectedMonitor.details.det_trigger_tags : '').split(',')
        var listOftags = Object.keys(getListOfTagsFromMonitors())
        triggerTagsInput.tagsinput('removeAll');
        monitorTriggerTags.forEach((tag) => {
            triggerTagsInput.tagsinput('add',tag);
        });
    }
    window.writeToMonitorSettingsWindow = function(monitorValues){
        $.each(monitorValues,function(key,value){
            if(key === `details`){
                $.each(value,function(dkey,dvalue){
                    monitorEditorWindow.find(`[detail="${dkey}"]`).val(dvalue).change()
                })
            }else{
                monitorEditorWindow.find(`[name="${key}"]`).val(value).change()
            }
        })
    }
    monitorsList.change(function(){
        var monitorId = monitorsList.val()
        openMonitorEditorPage(monitorId ? monitorId : null)
    });
    tagsInput.on('itemAdded', function(event) {
        drawMonitorGroupList()
        loadMonitorGroupTriggerList()
    });
    triggerTagsInput.on('itemAdded', function(event) {
        var listOftags = getListOfTagsFromMonitors()
        var newTag = event.item
        if(!listOftags[newTag]){
            new PNotify({
                title: lang.tagsCannotAddText,
                text: lang.tagsTriggerCannotAddText,
                type: 'warning'
            })
            triggerTagsInput.tagsinput('remove', newTag);
        }
    });
    $('body')
    .on('tab-open-monitorSettings',function(){
        console.log('Opened Account Settings')
        if(!monitorEditorSelectedMonitor){
            openMonitorEditorPage()
        }
    })
    .on('click','.reset-monitor-settings-form',function(){
        resetMonitorEditor()
    })
    .on('click','.import-into-monitor-settings-window',function(){
        launchImportMonitorWindow(function(monitor){
            var monitorConfig = null
            if(monitor.monitor){
                mergeZoneMinderZonesIntoMonitors(monitor)
                monitorConfig = importZoneMinderMonitor(monitor.monitor.Monitor)
            }else
            //zoneminder multiple monitors
            if(monitor.monitors){
                mergeZoneMinderZonesIntoMonitors(monitor)
                monitorConfig = importZoneMinderMonitor(monitor.monitors[0].Monitor)
            }else{
                if(monitor[0] && monitor.mid){
                    monitorConfig = monitor[0];
                }else if(monitor.mid){
                    monitorConfig = monitor;
                }
            }
            if(monitorConfig){
                importIntoMonitorEditor(monitorConfig)
            }

        })
    })
    .on('click','.delete-monitor-in-settings-window',function(){
        var validation = getMonitorEditFormFields()
        var monitorConfig = validation.monitorConfig
        if(loadedMonitors[monitorConfig.mid]){
            deleteMonitors([monitorConfig],function(){
                openMonitorEditorPage()
                goBackOneTab()
            })
        }else{
            resetMonitorEditor()
        }
    })
    .on('click','.export-from-monitor-settings-window',function(){
        var validation = getMonitorEditFormFields()
        var monitorConfig = validation.monitorConfig
        monitorConfig.details = safeJsonParse(monitorConfig.details)
        downloadJSON(monitorConfig,`${monitorConfig.name}_${monitorConfig.mid}_${formattedTime(new Date(),true)}.json`)
    })
    .on('click','.open-monitor-settings',function(){
        var monitorId
        var thisEl = $(this)
        var doNew = thisEl.attr('do-new')
        var monitorId = thisEl.attr('data-mid')
        if(doNew !== 'true' && !monitorId){
            var el = thisEl.parents('[data-mid]')
            monitorId = el.attr('data-mid')
        }
        console.log(monitorId)
        openMonitorEditorPage(doNew === 'true' ? null : monitorId)
    });
    monitorEditorWindow.find('.probe_config').click(function(){
        $.pB.submit(buildMonitorURL(),true)
    });
    onWebSocketEvent(function (d){
        //     new PNotify({
        //         title: lang['Settings Changed'],
        //         text: lang.SettingsChangedText,
        //         type: 'success'
        //     })
        switch(d.f){
            case'monitor_status':
                loadedMonitors[d.id].code = parseInt(`${d.code}`)
                loadedMonitors[d.id].status = `${d.status}`
                $('[data-mid="'+d.id+'"] .monitor_status').html(monitorStatusCodes[d.code] || d.code || d.status);
            break;
            case'monitor_delete':
                $('[data-mid="'+d.mid+'"]:not(#tab-monitorSettings)').remove();
                clearMonitorTimers(d.mid)
                delete(loadedMonitors[d.mid]);
                setMonitorCountOnUI()
            break;
            case'monitor_edit':
                setMonitorCountOnUI()
                onMonitorEdit(d)
            break;
            case'detector_plugged':
                addDetectorPlugin(d.plug,d)
                if(monitorEditorSelectedMonitor)getPluginsList(monitorEditorSelectedMonitor);
            break;
            case'detector_unplugged':
                removeDetectorPlugin(d.plug)
                if(monitorEditorSelectedMonitor)getPluginsList(monitorEditorSelectedMonitor);
            break;
        }
    })
    function checkToOpenSideMenu(){
        if(isSideBarMenuCollapsed()){
            sideMenuCollapsePoint.collapse('show')
        }
    }
    function onTabMove(){
        var theSelected = `${monitorsList.val() || ''}`
        drawMonitorListToSelector(monitorsList.find('optgroup'),false,'host')
        monitorsList.val(theSelected)
        checkToOpenSideMenu()
        if(monitorEditorSelectedMonitor)getPluginsList(monitorEditorSelectedMonitor)
    }
    addOnTabAway('monitorSettings', function(){
        if(isSideBarMenuCollapsed()){
            sideMenuCollapsePoint.collapse('hide')
        }
    })
    addOnTabOpen('monitorSettings', onTabMove)
    addOnTabReopen('monitorSettings', onTabMove)
    window.generateDefaultMonitorSettings = generateDefaultMonitorSettings
    window.importIntoMonitorEditor = importIntoMonitorEditor
})
