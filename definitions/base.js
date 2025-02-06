module.exports = function(s,config,lang){
    const Theme = {
        isDark: true,
    }
    const mainBackgroundColor = Theme.isDark ? 'bg-dark' : Theme.isDarkDefaultBg || 'bg-light'
    const textWhiteOnBgDark = Theme.isDark ? 'text-white' : ''
    return Object.assign({
        Theme: Theme,
    },{
        "Monitor Status Codes": {
            "0": lang["Disabled"],
            "1": lang["Starting"],
            "2": lang["Watching"],
            "3": lang["Recording"],
            "4": lang["Restarting"],
            "5": lang["Stopped"],
            "6": lang["Idle"],
            "7": lang["Died"],
            "8": lang["Stopping"],
            "9": lang["Started"],
        },
       "Monitor Settings": {
          "section": "Monitor Settings",
          "blocks": {
              "Page Control": {
                 name: lang.Monitor,
                 headerTitle: `<div id="tab-monitorSettings-title">${lang['Monitor Settings']} : <span>Add New</span></div>`,
                "color": "blue",
                 isSection: false,
                "info": [
                    {
                        "field": lang.Monitor,
                        "fieldType": "select",
                        "class": "monitors_list",
                        "possible": [
                            {
                               "name": lang['Add New'],
                               "value": ""
                            },
                            {
                               "name": lang.Saved,
                               "optgroup": []
                            },
                        ]
                    },
                    {
                       "fieldType": "btn",
                       "class": `btn-success reset-monitor-settings-form`,
                       "btnContent": `<i class="fa fa-refresh"></i> &nbsp; ${lang['Reset Form']}`,
                    },
                ]
             },
             "Identity": {
                "name": lang.Identity,
                "color": "grey",
                "isSection": true,
                "id":"monSectionIdentity",
                "blockquoteClass": "global_tip",
                "blockquote": `<div class="am_notice am_notice_new">${lang.IdentityText1}</div><div class="am_notice am_notice_edit">${lang.IdentityText2}</div>`,
                "info": [
                   {
                      "name": "mode",
                      "field": lang.Mode,
                      "fieldType": "select",
                      "description": lang["fieldTextMode"],
                      "default": "start",
                      "example": "",
                      "selector": "h_m",
                      "possible": [
                         {
                            "name": lang.Disabled,
                            "value": "stop",
                            "info": lang["fieldTextModeDisabled"]
                         },
                         {
                            "name": lang["Watch-Only"],
                            "value": "start",
                            "info": lang["fieldTextModeWatchOnly"]
                         },
                         {
                            "name": lang.Record,
                            "value": "record",
                            "info": lang["fieldTextModeRecord"]
                         },
                         {
                            "name": lang.Idle,
                            "value": "idle",
                            "info": ""
                         }
                      ]
                   },
                   {
                      "name": "mid",
                      "field": lang["Monitor ID"],
                      "description": lang["fieldTextMid"],
                      "example": s.gid()
                   },
                   {
                      "name": "name",
                      "field": lang.Name,
                      "description": lang["fieldTextName"],
                      "example": "Home-Front"
                   },
                   {
                      "name": "tags",
                      "field": lang['Tags'],
                      "description": lang.tagsFieldText,
                   },
                   {
                      "name": "detail=max_keep_days",
                      "field": lang["Number of Days to keep"] + ' ' + lang['Videos'],
                      "placeholder": "Default is Global value.",
                      "description": lang["fieldTextMaxKeepDays"],
                   },
                   {
                      "name": "detail=notes",
                      "field": lang.Notes,
                      "description": lang["fieldTextNotes"],
                      "fieldType": "textarea",
                   },
                   {
                      "name": "detail=dir",
                      "field": lang["Storage Location"],
                      "description": lang["fieldTextDir"],
                      "fieldType": "select",
                      "possible": s.listOfStorage
                  },
                  {
                     "name": "detail=ptz_id",
                     "field": lang["PTZ Control ID"],
                     "example": "1",
                     "description": lang["ptzControlIdFieldText"],
                  },
                  {
                     "name": "detail=auto_compress_videos",
                     "field": lang['Compress Completed Videos'],
                     "description": lang.compressCompletedVideosFieldText,
                     "fieldType": "select",
                     "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                     ]
                 },
                 {
                    "name": "detail=geolocation",
                    "field": lang["Geolocation"],
                    "example": "49.2578298,-123.2634732",
                    "description": lang["fieldTextGeolocation"],
                 },
                 {
                     "id": "monitor-settings-monitor-map-container",
                     "style": "position: relative",
                     "fieldType": "div",
                     divContent: `
                     <div id="monitor-settings-geolocation-options" class="p-2" style="background: rgba(0,0,0,0.4);position: absolute; top: 0; right: 0; border-radius: 0 0 0 15px; z-index: 405;">
                         <label for="direction">${lang.Direction} <span class="badge" map-option-value="direction"></span></label>
                         <div class="slider-container">
                             <input type="range" map-option="direction" class="slider" min="0" max="360" value="90">
                         </div>
                         <label for="fov">${lang['Field of View']} <span class="badge"><span map-option-value="fov"></span>°</span></label>
                         <div class="slider-container">
                             <input type="range" map-option="fov" class="slider" min="0" max="180" value="60">
                         </div>
                         <label for="range">${lang.Range} <span class="badge"><span map-option-value="range"></span> km</span></label>
                         <div class="slider-container">
                             <input type="range" map-option="range" class="slider" min="0" max="10" value="1" step="0.1">
                         </div>
                     </div>
                     <div id="monitor-settings-monitor-map" style="width: 100%;height: 300px;border-radius:15px;"></div>`,
                 },
                ]
             },
             "Connection": {
                "name": lang.Connection,
                "color": "orange",
                "id": "monSectionConnection",
                "isSection": true,
                "blockquote":`<p>${lang.InputText1}</p>\
                ${lang.InputText2}\
                <p>${lang.InputText3}</p>`,
                "blockquoteClass":"global_tip",
                "info": [
                    {
                       "name": "type",
                       "fieldType": "select",
                       "selector": "h_t",
                       "field": lang["Input Type"],
                       "description": lang["fieldTextType"],
                       "default": "h264",
                       "example": "",
                       "possible": [
                            {
                               "name": "JPEG",
                               "value": "jpeg",
                               "info": lang["fieldTextTypeJPEG"]
                            },
                            {
                               "name": "MJPEG",
                               "value": "mjpeg",
                               "info": lang["fieldTextTypeMJPEG"]
                            },
                            {
                               "name": "H.264 / H.265 / H.265+",
                               "value": "h264",
                               "info": lang["fieldTextTypeH.264/H.265/H.265+"]
                            },
                            {
                               "name": "HLS (.m3u8)",
                               "value": "hls",
                               "info": lang["fieldTextTypeHLS(.m3u8)"]
                            },
                            {
                               "name": "MPEG-4 (.mp4 / .ts)",
                               "value": "mp4",
                               "info": lang["fieldTextTypeMPEG4(.mp4/.ts)"]
                            },
                            {
                               "name": "Shinobi Streamer",
                               "value": "socket",
                               "info": lang["fieldTextTypeShinobiStreamer"]
                            },
                            {
                               "name": "Dashcam (Streamer v2)",
                               "value": "dashcam",
                               "info": lang["fieldTextTypeDashcam(StreamerV2)"]
                            },
                            {
                               "name": lang.Local,
                               "value": "local",
                               "info": lang["fieldTextTypeLocal"]
                            },
                            {
                               "evaluation": "!!config.rtmpServer",
                               "name": "RTMP",
                               "value": "rtmp",
                               "info": `Learn to connect here : <a href="https://shinobi.video/articles/2019-02-14-how-to-push-streams-to-shinobi-with-rtmp" target="_blank">Article : How to Push Streams via RTMP to Shinobi</a>`
                            },
                            {
                               "name": "MxPEG",
                               "value": "mxpeg",
                               "info": lang["fieldTextTypeMxPEG"]
                            },
                         ]
                    },
                    {
                        hidden:true,
                       "name": "detail=rtmp_key",
                       "form-group-class": "h_t_input h_t_rtmp",
                       "field": lang['Stream Key'],
                       "description": lang["fieldTextRtmpKey"],
                       "default": "",
                       "example": "",
                       "possible": ""
                    },
                    {
                        hidden:true,
                       "name": "detail=auto_host_enable",
                       "field": lang.Automatic,
                       "description": lang["fieldTextAutoHostEnable"],
                       "selector": "h_auto_host",
                       "form-group-class": "h_t_input h_t_h264 h_t_hls h_t_mp4 h_t_jpeg h_t_mjpeg h_t_mxpeg",
                       "form-group-class-pre-layer":"h_t_input h_t_h264 h_t_hls h_t_mp4 h_t_jpeg h_t_mjpeg h_t_mxpeg h_t_local",
                       "default": "",
                       "example": "",
                       "fieldType": "select",
                       "possible": [
                           {
                              "name": lang.No,
                              "value": "0"
                           },
                           {
                              "name": lang.Yes,
                              "value": "1"
                           }
                       ]
                    },
                    {
                        hidden:true,
                       "name": "detail=auto_host",
                       "field": lang["Full URL Path"],
                       "form-group-class": "h_auto_host_input h_auto_host_1",
                       "description": lang["fieldTextAutoHost"],
                       "default": "",
                       "example": "rtsp://username:password@123.123.123.123/stream/1",
                       "possible": ""
                    },
                    {
                        hidden:true,
                       "name": "protocol",
                       "field": lang["Connection Type"],
                       "description": lang["fieldTextProtocol"],
                       "default": "RTSP",
                       "example": "",
                       "form-group-class": "h_t_input h_t_h264 h_t_hls h_t_mp4 h_t_jpeg h_t_mjpeg",
                       "form-group-class-pre-layer": "h_auto_host_input h_auto_host_0 auto_host_fill",
                       "fieldType": "select",
                       "possible": [
                           {
                              "name": "HTTP",
                              "value": "http"
                           },
                           {
                              "name": "HTTPS",
                              "value": "https"
                           },
                           {
                              "name": "RTSP",
                              "value": "rtsp"
                           },
                           {
                              "name": "SRT",
                              "value": "srt"
                           },
                           {
                              "name": "RTMP",
                              "value": "rtmp"
                           },
                           {
                              "name": "RTMPS",
                              "value": "rtmps"
                           },
                           {
                              "name": "UDP",
                              "value": "udp"
                           }
                        ]
                    },
                    {
                        hidden:true,
                       "name": "detail=rtsp_transport",
                       "field": lang["RTSP Transport"],
                       "description": lang["fieldTextRtspTransport"],
                       "default": "",
                       "example": "",
                       "form-group-class": "h_t_input h_t_h264 h_t_hls h_t_mp4 h_t_jpeg h_t_mjpeg",
                       "form-group-class-pre-layer":"h_p_input h_p_rtsp",
                       "form-group-class-pre-pre-layer":"h_auto_host_input h_auto_host_0 auto_host_fill",
                       "fieldType": "select",
                       "possible": [
                           {
                              "name": lang.Auto,
                              "value": "no",
                              "info": lang["fieldTextRtspTransportAuto"]
                           },
                           {
                              "name": "TCP",
                              "value": "tcp",
                              "info": lang["fieldTextRtspTransportTCP"]
                           },
                           {
                              "name": "UDP",
                              "value": "udp",
                              "info": lang["fieldTextRtspTransportUDP"]
                           },
                           {
                              "name": "HTTP",
                              "value": "http",
                              "info": lang["fieldTextRtspTransportHTTP"]
                           }
                        ]
                    },
                    {
                        hidden:true,
                       "name": "detail=muser",
                       "field": lang.Username,
                       "description": lang["fieldTextMuser"],
                       "default": "",
                       "example": "kittenFinder",
                       "form-group-class": "h_t_input h_t_h264 h_t_hls h_t_mp4 h_t_jpeg h_t_mjpeg",
                       "form-group-class-pre-layer": "h_auto_host_input h_auto_host_0 auto_host_fill",
                       "possible": ""
                    },
                    {
                        hidden:true,
                       "name": "detail=mpass",
                       "fieldType": "password",
                       "field": lang.Password,
                       "description": lang["fieldTextMpass"],
                       "default": "",
                       "example": "kittenCuddler",
                       "form-group-class": "h_t_input h_t_h264 h_t_hls h_t_mp4 h_t_jpeg h_t_mjpeg",
                       "form-group-class-pre-layer": "h_auto_host_input h_auto_host_0 auto_host_fill",
                       "possible": ""
                    },
                    {
                        hidden:true,
                       "name": "host",
                       "field": lang.Host,
                       "description": lang["fieldTextHost"],
                       "default": "",
                       "example": "111.111.111.111",
                       "form-group-class": "h_t_input h_t_h264 h_t_hls h_t_mp4 h_t_jpeg h_t_mjpeg",
                       "form-group-class-pre-layer": "h_auto_host_input h_auto_host_0 auto_host_fill",
                       "possible": ""
                    },
                    {
                        hidden:true,
                       "name": "port",
                       "field": lang.Port,
                       "description": lang["fieldTextPort"],
                       "default": "80",
                       "example": "554",
                       "possible": "1-65535",
                       "form-group-class": "h_t_input h_t_h264 h_t_hls h_t_mp4 h_t_jpeg h_t_mjpeg",
                       "form-group-class-pre-layer": "h_auto_host_input h_auto_host_0 auto_host_fill",
                    },
                    {
                        hidden:true,
                       "name": "detail=port_force",
                       "field": lang["Force Port"],
                       "description": lang["fieldTextPortForce"],
                       "default": "0",
                       "example": "",
                       "form-group-class": "h_t_input h_t_h264 h_t_hls h_t_mp4 h_t_jpeg h_t_mjpeg",
                       "form-group-class-pre-layer": "h_auto_host_input h_auto_host_0 auto_host_fill",
                       "fieldType": "select",
                       "possible": [
                           {
                              "name": lang.No,
                              "value": "0"
                           },
                           {
                              "name": lang.Yes,
                              "value": "1"
                           }
                       ]
                    },
                    {
                        hidden:true,
                       "name": "path",
                       "field": lang.Path,
                       "description": lang["fieldTextPath"],
                       "default": "",
                       "example": "/videostream.cgi?1",
                       "possible": "",
                       "form-group-class": "h_t_input h_t_h264 h_t_hls h_t_mp4 h_t_jpeg h_t_mjpeg h_t_local",
                       "form-group-class-pre-layer": "h_auto_host_input h_auto_host_0 auto_host_fill",
                    },
                    {
                       "name": "detail=fatal_max",
                       "field": lang['Retry Connection'],
                       "description": lang["fieldTextFatalMax"],
                       "example": "10",
                    },
                    {
                       "name": "detail=skip_ping",
                       "field": lang['Skip Ping'],
                       "description": lang["fieldTextSkipPing"],
                       "default": "0",
                       "example": "",
                       "fieldType": "select",
                       "possible": [
                           {
                              "name": lang.No,
                              "value": "0"
                           },
                           {
                              "name": lang.Yes,
                              "value": "1"
                           }
                       ]
                    },
                    {
                       "name": "detail=is_onvif",
                       "field": lang.ONVIF,
                       "description": lang["fieldTextIsOnvif"],
                       "default": "0",
                       "example": "",
                       "selector": "h_onvif",
                       "fieldType": "select",
                       "possible": [
                           {
                              "name": lang.No,
                              "value": "0"
                           },
                           {
                              "name": lang.Yes,
                              "value": "1"
                           }
                       ]
                    },
                    {
                        hidden: true,
                       "name": "detail=onvif_port",
                       "field": lang['ONVIF Port'],
                       "description": `ONVIF is usually run on port <code>8000</code>. This can be <code>80</code> as well depending on your camera model.`,
                       "default": "8000",
                       "example": "",
                       "form-group-class": "h_onvif_input h_onvif_1",
                    },
                    {
                       "fieldType": "btn",
                       "class": `btn-success probe_config`,
                       "btnContent": `<i class="fa fa-search"></i> &nbsp; ${lang.FFprobe}`,
                    },
                    {
                       "fieldType": "btn",
                       "attribute": `style="margin-top:1rem"`,
                       "form-group-class-pre-layer": "h_onvif_input h_onvif_1",
                       "class": `btn-warning am_notice_edit open-onvif-device-manager`,
                       "btnContent": `<i class="fa fa-gears"></i> &nbsp; ${lang['ONVIF Device Manager']}`,
                    },
                ]
            },
             "Input": {
                "name": lang.Input,
                "color": "forestgreen",
                "id": "monSectionInput",
                "isSection": true,
                "info": [
                   {
                       hidden:true,
                      "name": "detail=primary_input",
                      "field": lang['Primary Input'],
                      "description": "",
                      "default": "0:0",
                      "example": "",
                      "fieldType": "select",
                      "form-group-class": "input-mapping",
                      "possible": [
                           {
                              "name": lang['All streams in first feed'] + ' (0, ' + lang.Default + ')',
                              "value": "0"
                           },
                           {
                              "name": lang['First stream in feed'] + ' (0:0)',
                              "value": "0:0"
                           },
                           {
                              "name": lang['Second stream in feed'] + " (0:1)",
                              "value": "0:1"
                           },
                           {
                              "name": lang['Video streams only'] + " (0:v)",
                              "value": "0:v"
                           },
                           {
                              "name": lang['Video stream only from first feed'] + " (0:v:0)",
                              "value": "0:v:0"
                           }
                        ]
                   },
                   {
                      "name": "detail=aduration",
                      "field": lang["Analyzation Duration"],
                      "description": lang["fieldTextAduration"],
                      "default": "",
                      "example": "100000",
                      "possible": ""
                   },
                   {
                      "name": "detail=probesize",
                      "field": lang["Probe Size"],
                      "description": lang["fieldTextProbesize"],
                      "default": "",
                      "example": "100000",
                      "possible": ""
                   },
                   {
                       hidden: true,
                      "name": "detail=stream_loop",
                      "field": lang['Loop Stream'],
                      "description": lang["fieldTextStreamLoop"],
                      "default": "1",
                      "example": "",
                      "form-group-class": "h_t_input h_t_mp4 h_t_local",
                      "fieldType": "select",
                      "possible": [
                          {
                             "name": lang.No,
                             "value": "0"
                          },
                          {
                             "name": lang.Yes,
                             "value": "1"
                          }
                      ]
                   },
                   {
                      "name": "detail=sfps",
                      "field": lang['Monitor Capture Rate'],
                      "description": lang["fieldTextSfps"],
                      "default": "",
                      "example": "25",
                      "possible": ""
                   },
                   {
                      "name": "detail=wall_clock_timestamp_ignore",
                      "field": lang['Use Camera Timestamps'],
                      "description": lang["fieldTextWallClockTimestampIgnore"],
                      "default": "0",
                      "example": "",
                      "form-group-class": "h_t_input h_t_h264",
                      "fieldType": "select",
                      "possible": [
                          {
                             "name": lang.No,
                             "value": "0"
                          },
                          {
                             "name": lang.Yes,
                             "value": "1"
                          }
                      ]
                   },
                   {
                       hidden: true,
                      "name": "height",
                      "field": lang["Height"],
                      "description": lang["fieldTextHeight"],
                      "default": "480",
                      "example": "720, 0 for Auto",
                      "possible": ""
                   },
                   {
                       hidden: true,
                      "name": "width",
                      "field": lang["Width"],
                      "description": lang["fieldTextWidth"],
                      "default": "640",
                      "example": "1280, 0 for Auto",
                      "possible": ""
                   },
                   {
                     "name": "detail=accelerator",
                     "field": lang.Accelerator,
                     "description": lang["fieldTextAccelerator"],
                     "default": "",
                     "example": "",
                     "selector": "h_gpud",
                     "fieldType": "select",
                     "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                     ]
                   },
                   {
                        "name": "detail=hwaccel",
                        "field": lang.hwaccel,
                        "description": lang["fieldTextHwaccel"],
                        "default": "",
                        "example": "",
                        "form-group-class": "h_gpud_input h_gpud_1",
                        "fieldType": "select",
                        "possible": s.listOfHwAccels
                    },
                   {
                        "name": "detail=hwaccel_vcodec",
                        "field": lang.hwaccel_vcodec,
                        "description": lang["fieldTextHwaccelVcodec"],
                        "default": "",
                        "example": "",
                        "form-group-class": "h_gpud_input h_gpud_1",
                        "fieldType": "select",
                        "possible": [
                           {
                              "name": lang.Auto + '('+lang.Recommended+')',
                              "value": ""
                           },
                           {
                              "name": lang.NVIDIA,
                              "optgroup": [
                                  {
                                     "name": lang.h264_cuvid,
                                     "value": "h264_cuvid"
                                  },
                                  {
                                     "name": lang.hevc_cuvid,
                                     "value": "hevc_cuvid"
                                  },
                                  {
                                     "name": lang.mjpeg_cuvid,
                                     "value": "mjpeg_cuvid"
                                  },
                                  {
                                     "name": lang.mpeg4_cuvid,
                                     "value": "mpeg4_cuvid"
                                  },
                              ]
                           },
                           {
                              "name": lang["Quick Sync Video"],
                              "optgroup": [
                                  {
                                     "name": lang.h264_qsv,
                                     "value": "h264_qsv"
                                  },
                                  {
                                     "name": lang.hevc_qsv,
                                     "value": "hevc_qsv"
                                  },
                                  {
                                     "name": lang.mpeg2_qsv,
                                     "value": "mpeg2_qsv"
                                  },
                              ]
                           },
                           {
                              "name": lang['Raspberry Pi'],
                              "optgroup": [
                                  {
                                     "name": lang.h264_mmal,
                                     "value": "h264_mmal"
                                  },
                                  {
                                     "name": lang.mpeg2_mmal,
                                     "value": "mpeg2_mmal"
                                  },
                                  {
                                     "name": lang["MPEG-4 (Raspberry Pi)"],
                                     "value": "mpeg4_mmal"
                                  }
                              ]
                           },
                        ]
                    },
                    {
                         "name": "detail=hwaccel_device",
                         "field": lang.hwaccel_device,
                         "description": "",
                         "default": "",
                         "example": "",
                         "form-group-class": "h_gpud_input h_gpud_1",
                         "possible": ""
                     },
                    {
                         "name": "detail=hwaccel_format",
                         "field": lang.hwaccel_format,
                         "description": "Hardware Acceleration Format",
                         "default": "",
                         "example": "vaapi",
                         "form-group-class": "h_gpud_input h_gpud_1",
                         "possible": ""
                     },
                ]
             },
             "Input Maps": {
                "name": lang["Additional Inputs"],
                "color": "orange",
                "id": "monSectionInputMaps",
                "section-class": "pb-0",
                "emptyDiv": true
            },
             "Stream": {
                "name": lang.Stream,

                "color": "navy",
                "id": "monSectionStream",
                "isSection": true,
                "input-mapping": "stream",
                "blockquoteClass": "global_tip",
                "blockquote": lang.StreamText,
                "info": [
                   {
                      "name": "detail=stream_type",
                      "field": lang["Stream Type"],
                      "description": lang["fieldTextStreamType"],
                      "default": "hls",
                      "selector": "h_st",
                      "fieldType": "select",
                      "attribute": `triggerChange="#add_monitor [detail=stream_vcodec]" triggerChangeIgnore="b64,mjpeg,jpeg,gif"`,
                      "possible": [
                           {
                              "name": lang.Poseidon,
                              "value": "mp4",
                              "info": lang["fieldTextStreamTypePoseidon"]
                           },
                           {
                              "name": lang['Base64 over Websocket'],
                              "value": "b64",
                              "info": lang["fieldTextStreamTypeBase64OverWebsocket"]
                           },
                           {
                              "name": lang['JPEG (Auto Enables JPEG API)'],
                              "value": "jpeg"
                           },
                           {
                              "name": lang['MJPEG'],
                              "value": "mjpeg",
                              "info": lang["fieldTextStreamTypeMJPEG"]
                           },
                           {
                              "name": lang['FLV'],
                              "value": "flv",
                              "info": lang["fieldTextStreamTypeFLV"]
                           },
                           {
                              "name": lang['HLS (includes Audio)'],
                              "value": "hls",
                              "info": lang["fieldTextStreamTypeHLS(includesAudio)"]
                          },
                           {
                              "name": lang.useSubStreamOnlyWhenWatching,
                              "value": "useSubstream",
                           }
                        ]
                   },
                   {
                       isAdvanced: true,
                       hidden:true,
                       "name": "detail=stream_flv_type",
                       "field": lang["Connection Type"],
                       "description": lang["fieldTextStreamFlvType"],
                       "default": "0",
                       "example": "",
                       "fieldType": "select",
                       "form-group-class": "h_st_input h_st_flv h_st_mp4",
                       "possible": [
                          {
                             "name": lang.HTTP,
                             "value": "http",
                          },
                          {
                             "name": lang.Websocket,
                             "value": "ws",
                          }
                       ]
                   },
                   {
                       isAdvanced: true,
                       hidden:true,
                      "name": "detail=stream_flv_maxLatency",
                      "field": lang["Max Latency"],
                      "description": "",
                      "default": "10",
                      "example": "20000",
                      "form-group-class": "h_st_lat_input h_st_lat_ws",
                      "form-group-class-pre-layer": "h_st_input h_st_mjpeg",
                      "possible": ""
                   },
                   {
                       isAdvanced: true,
                       hidden:true,
                      "name": "detail=stream_mjpeg_clients",
                      "field": lang["# of Allow MJPEG Clients"],
                      "description": "",
                      "default": "20",
                      "example": "",
                      "form-group-class": "h_st_input h_st_mjpeg",
                      "possible": ""
                   },
                   {
                      "name": "detail=stream_vcodec",
                      "field": lang['Video Codec'],
                      "description": lang["fieldTextStreamVcodec"],
                      "default": "copy",
                      "example": "",
                      "form-group-class": "h_st_input h_st_hls h_st_flv h_st_mp4",
                      "fieldType": "select",
                      "selector": "h_hls_v",
                      "possible": [
                         {
                            "name": lang.Auto,
                            "value": "no",
                            "info": lang["fieldTextStreamVcodecAuto"]
                         },
                         {
                            "name": "libx264",
                            "value": "libx264",
                            "info": lang["fieldTextStreamVcodecLibx264"]
                         },
                         {
                            "name": "libx265",
                            "value": "libx265",
                            "info": lang["fieldTextStreamVcodecLibx265"]
                         },
                         {
                            "name": lang.copy,
                            "value": "copy",
                            "info": lang["fieldTextStreamVcodecCopy"]
                         },
                         {
                             "name": lang['Hardware Accelerated'],
                             "optgroup": [
                                 {
                                    "name": "H.264 VA-API (Intel HW Accel)",
                                    "value": "h264_vaapi"
                                 },
                                 {
                                    "name": "H.265 VA-API (Intel HW Accel)",
                                    "value": "hevc_vaapi"
                                 },
                                 {
                                    "name": "H.264 NVENC (NVIDIA HW Accel)",
                                    "value": "h264_nvenc"
                                 },
                                 {
                                    "name": "H.264 NVENC Jetson (NVIDIA HW Accel NVMPI)",
                                    "value": "h264_nvmpi"
                                 },
                                 {
                                    "name": "H.265 NVENC (NVIDIA HW Accel)",
                                    "value": "hevc_nvenc"
                                 },
                                 {
                                    "name": "H.264 (Quick Sync Video)",
                                    "value": "h264_qsv"
                                 },
                                 {
                                    "name": "H.265 (Quick Sync Video)",
                                    "value": "hevc_qsv"
                                 },
                                 {
                                    "name": "MPEG2 (Quick Sync Video)",
                                    "value": "mpeg2_qsv"
                                 },
                                 {
                                    "name": "H.264 (Quick Sync Video)",
                                    "value": "h264_qsv"
                                 },
                                 {
                                    "name": "H.265 (Quick Sync Video)",
                                    "value": "hevc_qsv"
                                 },
                                 {
                                    "name": "MPEG2 (Quick Sync Video)",
                                    "value": "mpeg2_qsv"
                                 },
                                 {
                                    "name": "H.264 openMAX (Raspberry Pi)",
                                    "value": "h264_omx"
                                 }
                             ]
                         },
                      ]
                   },
                   {
                      "name": "detail=stream_acodec",
                      "field": lang["Audio Codec"],
                      "description": lang["fieldTextStreamAcodec"],
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "form-group-class": "h_st_input h_st_hls h_st_flv h_st_mp4",
                      "possible": [
                         {
                            "name": lang.Auto,
                            "info": lang["fieldTextStreamAcodecAuto"],
                            "value": ""
                         },
                         {
                            "name": lang["No Audio"],
                            "info": lang["fieldTextStreamAcodecNoAudio"],
                            "value": "no"
                         },
                         {
                            "name": "libvorbis",
                            "info": lang["fieldTextStreamAcodecLibvorbis"],
                            "value": "libvorbis"
                         },
                         {
                            "name": "libopus",
                            "info": lang["fieldTextStreamAcodecLibopus"],
                            "value": "libopus"
                         },
                         {
                            "name": "libmp3lame",
                            "info": lang["fieldTextStreamAcodecLibmp3lame"],
                            "value": "libmp3lame"
                         },
                         {
                            "name": "aac",
                            "info": lang["fieldTextStreamAcodecAac"],
                            "value": "aac"
                         },
                         {
                            "name": "ac3",
                            "info": lang["fieldTextStreamAcodecAc3"],
                            "value": "ac3"
                         },
                         {
                            "name": "copy",
                            "info": lang["fieldTextStreamAcodecCopy"],
                            "value": "copy"
                         }
                      ]
                   },
                   {
                       isAdvanced: true,
                      "name": "detail=hls_time",
                      "field": "HLS Segment Length",
                      "description": lang["fieldTextHlsTime"],
                      "default": "2",
                      "form-group-class": "h_st_input h_st_hls",
                   },
                   {
                       isAdvanced: true,
                      "name": "detail=hls_list_size",
                      "field": "HLS List Size",
                      "description": lang["fieldTextHlsListSize"],
                      "default": "2",
                      "form-group-class": "h_st_input h_st_hls",
                   },
                   {
                       isAdvanced: true,
                      "name": "detail=preset_stream",
                      "field": "HLS Preset",
                      "description": lang["fieldTextPresetStream"],
                      "example": "ultrafast",
                      "form-group-class": "h_st_input h_st_hls h_st_flv h_st_mp4",
                   },
                   {
                      "name": "detail=stream_quality",
                      "field": lang.Quality,
                      "description": lang["fieldTextStreamQuality"],
                      "default": "15",
                      "example": "1",
                      uiVisibilityConditions: 'streamSectionCopyModeVisibilities',
                      "possible": "1-23"
                   },
                   {
                      "name": "detail=stream_fps",
                      "field": lang['Frame Rate'],
                      "description": lang["fieldTextStreamFps"],
                      "default": "",
                      "example": "1",
                      uiVisibilityConditions: 'streamSectionCopyModeVisibilities',
                      "possible": ""
                   },
                   {
                      "name": "detail=stream_scale_x",
                      "field": lang.Width,
                      "description": lang["fieldTextStreamScaleX"],
                      "default": "",
                      "fieldType": "number",
                      "numberMin": "1",
                      "example": "640",
                      uiVisibilityConditions: 'streamSectionCopyModeVisibilities',
                      "possible": ""
                   },
                   {
                      "name": "detail=stream_scale_y",
                      "field": lang.Height,
                      "description": lang["fieldTextStreamScaleY"],
                      "default": "",
                      "fieldType": "number",
                      "numberMin": "1",
                      "example": "480",
                      uiVisibilityConditions: 'streamSectionCopyModeVisibilities',
                      "possible": ""
                   },
                   {
                      "name": "detail=stream_rotate",
                      "field": lang["Rotate"],
                      "description": lang["fieldTextStreamRotate"],
                      "default": "",
                      "example": "",
                      "fieldType": "select",
                      uiVisibilityConditions: 'streamSectionCopyModeVisibilities',
                      "possible": [
                           {
                              "name": lang["No Rotation"],
                              "value": "no"
                           },
                           {
                              "name": lang["180 Degrees"],
                              "value": "2,transpose=2"
                           },
                           {
                              "name": lang["90 Counter Clockwise and Vertical Flip (default)"],
                              "value": "0"
                           },
                           {
                              "name": lang["90 Clockwise"],
                              "value": "1"
                           },
                           {
                              "name": lang["90 Counter Clockwise"],
                              "value": "2"
                           },
                           {
                              "name": lang["90 Clockwise and Vertical Flip"],
                              "value": "3"
                           }
                        ]
                   },
                   {
                       isAdvanced: true,
                      "name": "detail=signal_check",
                      "field": lang["Check Signal Interval"],
                      "description": lang["fieldTextSignalCheck"],
                      "default": "0",
                      "example": "",
                      "possible": ""
                   },
                   {
                       isAdvanced: true,
                      "name": "detail=signal_check_log",
                      "field": lang["Log Signal Event"],
                      "description": lang["fieldTextSignalCheckLog"],
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0",
                         },
                         {
                            "name": lang.Yes,
                            "value": "1",
                         }
                      ]
                   },
                   {
                       isAdvanced: true,
                      "name": "detail=stream_vf",
                      "field": lang["Video Filter"],
                      "description": lang["fieldTextStreamVf"],
                      "default": "",
                      "example": "",
                      uiVisibilityConditions: 'streamSectionCopyModeVisibilities',
                      "possible": ""
                   },
                   {
                       isAdvanced: true,
                      "name": "detail=tv_channel",
                      "field": lang["TV Channel"],
                      "description": lang["fieldTextTvChannel"],
                      "default": "",
                      "selector": "h_tvc",
                      "fieldType": "select",
                      "example": "",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0",
                         },
                         {
                            "name": lang.Yes,
                            "value": "1",
                         }
                      ]
                   },
                   {
                       isAdvanced: true,
                      "name": "detail=tv_channel_id",
                      "field": lang["TV Channel ID"],
                      "description": lang["fieldTextTvChannelId"],
                      "default": "",
                      "example": "",
                      "form-group-class": "h_tvc_input h_tvc_1",
                      "possible": ""
                   },
                   {
                       isAdvanced: true,
                      "name": "detail=tv_channel_group_title",
                      "field": lang["TV Channel Group"],
                      "description": lang["fieldTextTvChannelGroupTitle"],
                      "default": "",
                      "example": "",
                      "form-group-class": "h_tvc_input h_tvc_1",
                      "possible": ""
                   },
                ]
             },
             "Stream Timestamp": {
                "id": "monSectionStreamTimestamp",
                "name": lang["Stream Timestamp"],
                "color": "blue",
                isAdvanced: true,
                "section-class": "h_hls_v_input h_hls_v_libx264 h_hls_v_libx265 h_hls_v_h264_nvenc h_hls_v_hevc_nvenc h_hls_v_no",
                "isSection": true,
                "info": [
                    {
                       "name": "detail=stream_timestamp",
                       "selector":"h_stm",
                       "field": lang.Enabled,
                       "description": lang["fieldTextStreamTimestamp"],
                       "default": "0",
                       "example": "",
                       "fieldType": "select",
                       "possible": [
                           {
                              "name": lang.No,
                              "value": "0"
                           },
                           {
                              "name": lang.Yes,
                              "value": "1"
                           }
                       ]
                   },
                   {
                       hidden: true,
                      "name": "detail=stream_timestamp_font",
                      "field": "Font Path",
                      "description": lang["fieldTextStreamTimestampFont"],
                      "default": "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
                      "example": "",
                      "form-group-class": "h_stm_input h_stm_1",
                      "possible": ""
                   },
                   {
                       hidden: true,
                      "name": "detail=stream_timestamp_font_size",
                      "field": "Font Size",
                      "description": lang["fieldTextStreamTimestampFontSize"],
                      "default": "10",
                      "example": "",
                      "form-group-class": "h_stm_input h_stm_1",
                      "possible": ""
                   },
                   {
                       hidden: true,
                      "name": "detail=stream_timestamp_color",
                      "field": "Text Color",
                      "description": lang["fieldTextStreamTimestampColor"],
                      "default": "white",
                      "example": "",
                      "form-group-class": "h_stm_input h_stm_1",
                      "possible": ""
                   },
                   {
                       hidden: true,
                      "name": "detail=stream_timestamp_box_color",
                      "field": "Text Box Color",
                      "description": lang["fieldTextStreamTimestampBoxColor"],
                      "default": "0x00000000@1",
                      "example": "",
                      "form-group-class": "h_stm_input h_stm_1",
                      "possible": ""
                   },
                   {
                       hidden: true,
                      "name": "detail=stream_timestamp_x",
                      "field": "Position X",
                      "description": lang["fieldTextStreamTimestampX"],
                      "default": "(w-tw)/2",
                      "example": "",
                      "form-group-class": "h_stm_input h_stm_1",
                      "possible": ""
                   },
                   {
                       hidden: true,
                      "name": "detail=stream_timestamp_y",
                      "field": "Position Y",
                      "description": lang["fieldTextStreamTimestampY"],
                      "default": "0",
                      "example": "",
                      "form-group-class": "h_stm_input h_stm_1",
                      "possible": ""
                   }
                ]
             },
             "Stream Watermark": {
                "id": "monSectionStreamWatermark",
                "name": lang['Stream Watermark'],
                "color": "blue",
                isAdvanced: true,
                "section-class": "h_hls_v_input h_hls_v_libx264 h_hls_v_libx265 h_hls_v_h264_nvenc h_hls_v_hevc_nvenc h_hls_v_no",
                "isSection": true,
                "info": [
                    {
                       "name": "detail=stream_watermark",
                       "field": lang.Enabled,
                       "description": lang["fieldTextStreamWatermark"],
                       "default": "0",
                       "example": "",
                       "fieldType": "select",
                       "selector": "h_wat",
                       "possible": [
                           {
                              "name": lang.No,
                              "value": "0"
                           },
                           {
                              "name": lang.Yes,
                              "value": "1"
                           }
                       ]
                   },
                   {
                       hidden: true,
                      "name": "detail=stream_watermark_location",
                      "field": lang['Image Location'],
                      "description": lang["fieldTextStreamWatermarkLocation"],
                      "default": "0",
                      "example": "/usr/share/watermark.logo",
                      "form-group-class": "h_wat_input h_wat_1",
                      "possible": ""
                   },
                   {
                       hidden: true,
                       "name": "detail=stream_watermark_position",
                       "field": lang['Image Position'],
                       "description": lang["fieldTextStreamWatermarkPosition"],
                       "default": "0",
                       "example": "",
                       "fieldType": "select",
                       "form-group-class": "h_wat_input h_wat_1",
                       "possible": [
                           {
                              "name": lang["Top Right"],
                              "value": "tr"
                           },
                           {
                              "name": lang["Top Left"],
                              "value": "tl"
                           },
                           {
                              "name": lang["Bottom Right"],
                              "value": "br"
                           },
                           {
                              "name": lang["Bottom Left"],
                              "value": "bl"
                           }
                        ]
                   },
                ]
             },
             "Stream Channels": {
                "name": "Stream Channels",
                "color": "blue",
                "id": "monSectionStreamChannels",
                "section-class": "pb-0",
                "emptyDiv": true
            },
            "Substream": {
               "name": lang['Substream'],
               "color": "blue",
               "isSection": true,
               "id": "monSectionSubstream",
               "blockquote": lang.substreamText,
               "blockquoteClass": 'global_tip',
               "info": [
                   {
                       isAdvanced: true,
                       "name": lang['Connection'],
                       "color": "orange",
                       id: "monSectionSubstreamInput",
                       "blockquote": lang.substreamConnectionText,
                       "blockquoteClass": 'global_tip',
                       isSection: true,
                       isFormGroupGroup: true,
                       "info": [
                           {
                               name:'detail-substream-input=type',
                               field:lang['Input Type'],
                               default:'h264',
                               attribute:'selector="h_i_SUBSTREAM_FIELDS"',
                               "fieldType": "select",
                               type:'selector',
                               possible:[
                                 {
                                    "name": "H.264 / H.265 / H.265+",
                                    "value": "h264",
                                    selected: true,
                                 },
                                 {
                                    "name": "JPEG",
                                    "value": "jpeg"
                                 },
                                 {
                                    "name": "MJPEG",
                                    "value": "mjpeg"
                                 },
                                 {
                                    "name": "HLS (.m3u8)",
                                    "value": "hls"
                                 },
                                 {
                                    "name": "MPEG-4 (.mp4 / .ts)",
                                    "value": "mp4"
                                 },
                                 {
                                    "name": "Local",
                                    "value": "local"
                                 },
                                 {
                                    "name": "Raw",
                                    "value": "raw"
                                 }
                              ]
                           },
                           {
                               name:'detail-substream-input=stream_flv_type',
                               field:lang['Loop Stream'],
                               class:'h_i_SUBSTREAM_FIELDS_input h_i_SUBSTREAM_FIELDS_mp4',
                               hidden:true,
                               default:'0',
                               "fieldType": "select",
                               type:'selector',
                               possible:[
                                   {
                                      "name": lang.HTTP,
                                      "value": "http",
                                   },
                                   {
                                      "name": lang.Websocket,
                                      "value": "ws",
                                   }
                               ]
                           },
                           {
                               name:'detail-substream-input=fulladdress',
                               field:lang['Full URL Path'],
                               placeholder:'Example : rtsp://admin:password@123.123.123.123/stream/1',
                               type:'text',
                           },
                           {
                               name:'detail-substream-input=sfps',
                               field:lang['Monitor Capture Rate'],
                               placeholder:'',
                               type:'text',
                           },
                           {
                               name:'detail-substream-input=aduration',
                               field:lang['Analyzation Duration'],
                               placeholder:'Example : 1000000',
                               type:'text',
                           },
                           {
                               name:'detail-substream-input=probesize',
                               field:lang['Probe Size'],
                               placeholder:'Example : 1000000',
                               type:'text',
                           },
                           {
                               name:'detail-substream-input=stream_loop',
                               field:lang['Loop Stream'],
                               class:'h_i_SUBSTREAM_FIELDS_input h_i_SUBSTREAM_FIELDS_mp4 h_i_SUBSTREAM_FIELDS_raw',
                               hidden:true,
                               default:'0',
                               "fieldType": "select",
                               type:'selector',
                               possible:[
                                   {
                                      "name": lang.No,
                                      "value": "0",
                                   },
                                   {
                                      "name": lang.Yes,
                                      "value": "1",
                                      selected: true,
                                   }
                               ]
                           },
                           {
                               name:'detail-substream-input=rtsp_transport',
                               field:lang['RTSP Transport'],
                               class:'h_i_SUBSTREAM_FIELDS_input h_i_SUBSTREAM_FIELDS_h264',
                               default:'',
                               "fieldType": "select",
                               type:'selector',
                               possible:[
                                   {
                                      "name": lang.Auto,
                                      "value": "",
                                      "info": lang["fieldTextDetailSubstreamInputRtspTransportAuto"],
                                      selected: true,
                                   },
                                   {
                                      "name": "TCP",
                                      "value": "tcp",
                                      "info": lang["fieldTextDetailSubstreamInputRtspTransportTCP"]
                                   },
                                   {
                                      "name": "UDP",
                                      "value": "udp",
                                      "info": lang["fieldTextDetailSubstreamInputRtspTransportUDP"]
                                   }
                               ]
                           },
                           {
                               name:'detail-substream-input=accelerator',
                               field:lang['Accelerator'],
                               attribute:'selector="h_accel_SUBSTREAM_FIELDS"',
                               default:'0',
                               "fieldType": "select",
                               type:'selector',
                               possible:[
                                   {
                                      "name": lang.No,
                                      "value": "0",
                                      selected: true,
                                   },
                                   {
                                      "name": lang.Yes,
                                      "value": "1",
                                   }
                               ]
                           },
                           {
                               name:'detail-substream-input=hwaccel',
                               field:lang['hwaccel'],
                               class:'h_accel_SUBSTREAM_FIELDS_input h_accel_SUBSTREAM_FIELDS_1',
                               hidden:true,
                               default:'',
                               "fieldType": "select",
                               type:'selector',
                               possible: s.listOfHwAccels
                           },
                           {
                               name:'detail-substream-input=hwaccel_vcodec',
                               field:lang['hwaccel_vcodec'],
                               class:'h_accel_SUBSTREAM_FIELDS_input h_accel_SUBSTREAM_FIELDS_1',
                               hidden:true,
                               default:'auto',
                               "fieldType": "select",
                               type:'selector',
                               possible:[
                                   {
                                      "name": lang.Auto + '('+lang.Recommended+')',
                                      "value": "",
                                      selected: true,
                                   },
                                   {
                                      "name": lang.NVIDIA,
                                      "optgroup": [
                                          {
                                             "name": lang.h264_cuvid,
                                             "value": "h264_cuvid"
                                          },
                                          {
                                             "name": lang.hevc_cuvid,
                                             "value": "hevc_cuvid"
                                          },
                                          {
                                             "name": lang.mjpeg_cuvid,
                                             "value": "mjpeg_cuvid"
                                          },
                                          {
                                             "name": lang.mpeg4_cuvid,
                                             "value": "mpeg4_cuvid"
                                          },
                                      ]
                                   },
                                   {
                                      "name": lang["Quick Sync Video"],
                                      "optgroup": [
                                          {
                                             "name": lang.h264_qsv,
                                             "value": "h264_qsv"
                                          },
                                          {
                                             "name": lang.hevc_qsv,
                                             "value": "hevc_qsv"
                                          },
                                          {
                                             "name": lang.mpeg2_qsv,
                                             "value": "mpeg2_qsv"
                                          },
                                      ]
                                   },
                                   {
                                      "name": lang['Raspberry Pi'],
                                      "optgroup": [
                                          {
                                             "name": lang.h264_mmal,
                                             "value": "h264_mmal"
                                          },
                                          {
                                             "name": lang.mpeg2_mmal,
                                             "value": "mpeg2_mmal"
                                          },
                                          {
                                             "name": lang["MPEG-4 (Raspberry Pi)"],
                                             "value": "mpeg4_mmal"
                                          }
                                      ]
                                   },
                                  ]
                           },
                           {
                               name:'detail-substream-input=hwaccel_device',
                               field:lang['hwaccel_device'],
                               class:'h_accel_SUBSTREAM_FIELDS_input h_accel_SUBSTREAM_FIELDS_1',
                               hidden:true,
                               placeholder:'Example : /dev/dri/video0',
                               type:'text',
                           },
                           {
                               name:'detail-substream-input=cust_input',
                               field:lang['Input Flags'],
                               type:'text',
                           },
                       ]
                   },
                   {
                       "name": lang['Output'],
                       "color": "blue",
                       id: "monSectionSubstreamOutput",
                       "blockquote": lang.substreamOutputText,
                       "blockquoteClass": 'global_tip',
                       isSection: true,
                       isFormGroupGroup: true,
                       "info": [
                           {
                              "field": lang["Stream Type"],
                              "name": `detail-substream-output="stream_type"`,
                              "description": lang["fieldTextDetailSubstreamOutputStreamType"],
                              "default": "hls",
                              "selector": "h_st_channel_SUBSTREAM_FIELDS",
                              "fieldType": "select",
                              "attribute": `triggerChange="#monSectionChannelSUBSTREAM_FIELDS [detail-substream-output=stream_vcodec]" triggerChangeIgnore="b64,mjpeg"`,
                              "possible": [
                                   {
                                      "name": lang.Poseidon,
                                      "value": "mp4",
                                   },
                                   {
                                      "name": lang['MJPEG'],
                                      "value": "mjpeg",
                                   },
                                   {
                                      "name": lang['FLV'],
                                      "value": "flv",
                                   },
                                   {
                                      "name": lang['HLS (includes Audio)'],
                                      "value": "hls",
                                      selected: true,
                                   }
                                ]
                           },
                           {
                              "field": lang['# of Allow MJPEG Clients'],
                              "name": `detail-substream-output="stream_mjpeg_clients"`,
                              "form-group-class": "h_st_channel_SUBSTREAM_FIELDS_input h_st_channel_SUBSTREAM_FIELDS_mjpeg",
                              "placeholder": "20",
                           },
                           {
                              "field": lang['Video Codec'],
                              "name": `detail-substream-output="stream_vcodec"`,
                              "description": lang["fieldTextDetailSubstreamOutputStreamVcodec"],
                              "default": "copy",
                              "form-group-class": "h_st_channel_SUBSTREAM_FIELDS_input h_st_channel_SUBSTREAM_FIELDS_hls h_st_channel_SUBSTREAM_FIELDS_rtmp h_st_channel_SUBSTREAM_FIELDS_flv h_st_channel_SUBSTREAM_FIELDS_mp4 h_st_channel_SUBSTREAM_FIELDS_h264",
                              "fieldType": "select",
                              "selector": "h_hls_v_channel_SUBSTREAM_FIELDS",
                              "possible": [
                                 {
                                    "name": lang.Auto,
                                    "value": "no",
                                    "info": lang["fieldTextDetailSubstreamOutputStreamVcodecAuto"],
                                    selected: true,
                                 },
                                 {
                                    "name": "libx264",
                                    "value": "libx264",
                                    "info": lang["fieldTextDetailSubstreamOutputStreamVcodecLibx264"]
                                 },
                                 {
                                    "name": "libx265",
                                    "value": "libx265",
                                    "info": lang["fieldTextDetailSubstreamOutputStreamVcodecLibx265"]
                                 },
                                 {
                                    "name": lang.copy,
                                    "value": "copy",
                                    "info": lang["fieldTextDetailSubstreamOutputStreamVcodecCopy"]
                                 },
                                 {
                                     "name": lang['Hardware Accelerated'],
                                     "optgroup": [
                                         {
                                            "name": "H.264 VA-API (Intel HW Accel)",
                                            "value": "h264_vaapi"
                                         },
                                         {
                                            "name": "H.265 VA-API (Intel HW Accel)",
                                            "value": "hevc_vaapi"
                                         },
                                         {
                                            "name": "H.264 NVENC (NVIDIA HW Accel)",
                                            "value": "h264_nvenc"
                                         },
                                         {
                                            "name": "H.264 NVENC Jetson (NVIDIA HW Accel NVMPI)",
                                            "value": "h264_nvmpi"
                                         },
                                         {
                                            "name": "H.265 NVENC (NVIDIA HW Accel)",
                                            "value": "hevc_nvenc"
                                         },
                                         {
                                            "name": "H.264 (Quick Sync Video)",
                                            "value": "h264_qsv"
                                         },
                                         {
                                            "name": "H.265 (Quick Sync Video)",
                                            "value": "hevc_qsv"
                                         },
                                         {
                                            "name": "MPEG2 (Quick Sync Video)",
                                            "value": "mpeg2_qsv"
                                         },
                                         {
                                            "name": "H.264 (Quick Sync Video)",
                                            "value": "h264_qsv"
                                         },
                                         {
                                            "name": "H.265 (Quick Sync Video)",
                                            "value": "hevc_qsv"
                                         },
                                         {
                                            "name": "MPEG2 (Quick Sync Video)",
                                            "value": "mpeg2_qsv"
                                         },
                                         {
                                            "name": "H.264 openMAX (Raspberry Pi)",
                                            "value": "h264_omx"
                                         }
                                     ]
                                 },
                              ]
                           },
                           {
                              "field": lang["Audio Codec"],
                              "name": `detail-substream-output="stream_acodec"`,
                              "description": lang["fieldTextDetailSubstreamOutputStreamAcodec"],
                              "default": "",
                              "example": "",
                              "fieldType": "select",
                              "form-group-class": "h_st_channel_SUBSTREAM_FIELDS_input h_st_channel_SUBSTREAM_FIELDS_hls h_st_channel_SUBSTREAM_FIELDS_rtmp h_st_channel_SUBSTREAM_FIELDS_flv h_st_channel_SUBSTREAM_FIELDS_mp4 h_st_channel_SUBSTREAM_FIELDS_h264",
                              "possible": [
                                 {
                                    "name": lang.Auto,
                                    "info": lang["fieldTextDetailSubstreamOutputStreamAcodecAuto"],
                                    "value": "",
                                    selected: true,
                                 },
                                 {
                                    "name": lang["No Audio"],
                                    "info": lang["fieldTextDetailSubstreamOutputStreamAcodecNoAudio"],
                                    "value": "no"
                                 },
                                 {
                                    "name": "libvorbis",
                                    "info": lang["fieldTextDetailSubstreamOutputStreamAcodecLibvorbis"],
                                    "value": "libvorbis"
                                 },
                                 {
                                    "name": "libopus",
                                    "info": lang["fieldTextDetailSubstreamOutputStreamAcodecLibopus"],
                                    "value": "libopus"
                                 },
                                 {
                                    "name": "libmp3lame",
                                    "info": lang["fieldTextDetailSubstreamOutputStreamAcodecLibmp3lame"],
                                    "value": "libmp3lame"
                                 },
                                 {
                                    "name": "aac",
                                    "info": lang["fieldTextDetailSubstreamOutputStreamAcodecAac"],
                                    "value": "aac"
                                 },
                                 {
                                    "name": "ac3",
                                    "info": lang["fieldTextDetailSubstreamOutputStreamAcodecAc3"],
                                    "value": "ac3"
                                 },
                                 {
                                    "name": "copy",
                                    "info": lang["fieldTextDetailSubstreamOutputStreamAcodecCopy"],
                                    "value": "copy"
                                 }
                              ]
                           },
                           {
                              "name": "detail-substream-output=hls_time",
                              "field": lang["HLS Segment Length"],
                              "description": lang["fieldTextDetailSubstreamOutputHlsTime"],
                              "default": "2",
                              "form-group-class": "h_st_channel_SUBSTREAM_FIELDS_input h_st_channel_SUBSTREAM_FIELDS_hls",
                           },
                           {
                              "name": "detail-substream-output=hls_list_size",
                              "field": lang["HLS List Size"],
                              "description": lang["fieldTextDetailSubstreamOutputHlsListSize"],
                              "default": "2",
                              "form-group-class": "h_st_channel_SUBSTREAM_FIELDS_input h_st_channel_SUBSTREAM_FIELDS_hls",
                           },
                           {
                              "name": "detail-substream-output=preset_stream",
                              "field": lang["HLS Preset"],
                              "description": lang["fieldTextDetailSubstreamOutputPresetStream"],
                              "example": "ultrafast",
                              "form-group-class": "h_st_channel_SUBSTREAM_FIELDS_input h_st_channel_SUBSTREAM_FIELDS_hls",
                           },
                           {
                              "name": "detail-substream-output=stream_quality",
                              "field": lang.Quality,
                              "description": lang["fieldTextDetailSubstreamOutputStreamQuality"],
                              "default": "15",
                              "example": "1",
                              // "form-group-class-pre-layer": "h_hls_v_channel_SUBSTREAM_FIELDS_input h_hls_v_channel_SUBSTREAM_FIELDS_libx264 h_hls_v_channel_SUBSTREAM_FIELDS_libx265 h_hls_v_channel_SUBSTREAM_FIELDS_h264_nvenc h_hls_v_channel_SUBSTREAM_FIELDS_hevc_nvenc h_hls_v_channel_SUBSTREAM_FIELDS_no",
                              "form-group-class": "h_st_channel_SUBSTREAM_FIELDS_input h_st_channel_SUBSTREAM_FIELDS_mjpeg h_st_channel_SUBSTREAM_FIELDS_hls h_st_channel_SUBSTREAM_FIELDS_rtmp h_st_channel_SUBSTREAM_FIELDS_jsmpeg h_st_channel_SUBSTREAM_FIELDS_flv h_st_channel_SUBSTREAM_FIELDS_mp4 h_st_channel_SUBSTREAM_FIELDS_h264",
                              "possible": "1-23"
                           },
                           {
                              "name": "detail-substream-output=stream_v_br",
                              "field": lang["Video Bit Rate"],
                              "placeholder": "",
                              "form-group-class-pre-layer": "h_hls_v_channel_SUBSTREAM_FIELDS_input h_hls_v_channel_SUBSTREAM_FIELDS_libx264 h_hls_v_channel_SUBSTREAM_FIELDS_libx265 h_hls_v_channel_SUBSTREAM_FIELDS_h264_nvenc h_hls_v_channel_SUBSTREAM_FIELDS_hevc_nvenc h_hls_v_channel_SUBSTREAM_FIELDS_no",
                              "form-group-class": "h_st_channel_SUBSTREAM_FIELDS_input h_st_channel_SUBSTREAM_FIELDS_mjpeg h_st_channel_SUBSTREAM_FIELDS_hls h_st_channel_SUBSTREAM_FIELDS_rtmp h_st_channel_SUBSTREAM_FIELDS_jsmpeg h_st_channel_SUBSTREAM_FIELDS_flv h_st_channel_SUBSTREAM_FIELDS_mp4 h_st_channel_SUBSTREAM_FIELDS_h264",
                           },
                           {
                              "name": "detail-substream-output=stream_a_br",
                              "field": lang["Audio Bit Rate"],
                              "placeholder": "128k",
                              "form-group-class-pre-layer": "h_hls_v_channel_SUBSTREAM_FIELDS_input h_hls_v_channel_SUBSTREAM_FIELDS_libx264 h_hls_v_channel_SUBSTREAM_FIELDS_libx265 h_hls_v_channel_SUBSTREAM_FIELDS_h264_nvenc h_hls_v_channel_SUBSTREAM_FIELDS_hevc_nvenc h_hls_v_channel_SUBSTREAM_FIELDS_no",
                              "form-group-class": "h_st_channel_SUBSTREAM_FIELDS_input h_st_channel_SUBSTREAM_FIELDS_mjpeg h_st_channel_SUBSTREAM_FIELDS_hls h_st_channel_SUBSTREAM_FIELDS_rtmp h_st_channel_SUBSTREAM_FIELDS_jsmpeg h_st_channel_SUBSTREAM_FIELDS_flv h_st_channel_SUBSTREAM_FIELDS_mp4 h_st_channel_SUBSTREAM_FIELDS_h264",
                           },
                           {
                              "name": "detail-substream-output=stream_fps",
                              "field": lang['Frame Rate'],
                              "description": lang["fieldTextDetailSubstreamOutputStreamFps"],
                              // "form-group-class-pre-layer": "h_hls_v_channel_SUBSTREAM_FIELDS_input h_hls_v_channel_SUBSTREAM_FIELDS_libx264 h_hls_v_channel_SUBSTREAM_FIELDS_libx265 h_hls_v_channel_SUBSTREAM_FIELDS_h264_nvenc h_hls_v_channel_SUBSTREAM_FIELDS_hevc_nvenc h_hls_v_channel_SUBSTREAM_FIELDS_no",
                              "form-group-class": "h_st_channel_SUBSTREAM_FIELDS_input h_st_channel_SUBSTREAM_FIELDS_mjpeg h_st_channel_SUBSTREAM_FIELDS_hls h_st_channel_SUBSTREAM_FIELDS_rtmp h_st_channel_SUBSTREAM_FIELDS_jsmpeg h_st_channel_SUBSTREAM_FIELDS_flv h_st_channel_SUBSTREAM_FIELDS_mp4 h_st_channel_SUBSTREAM_FIELDS_h264",
                           },
                           {
                              "name": "detail-substream-output=stream_scale_x",
                              "field": lang.Width,
                              "description": lang["fieldTextDetailSubstreamOutputStreamScaleX"],
                              "fieldType": "number",
                              "numberMin": "1",
                              "example": "640",
                              // "form-group-class-pre-layer": "h_hls_v_channel_SUBSTREAM_FIELDS_input h_hls_v_channel_SUBSTREAM_FIELDS_libx264 h_hls_v_channel_SUBSTREAM_FIELDS_libx265 h_hls_v_channel_SUBSTREAM_FIELDS_h264_nvenc h_hls_v_channel_SUBSTREAM_FIELDS_hevc_nvenc h_hls_v_channel_SUBSTREAM_FIELDS_no",
                              "form-group-class": "h_st_channel_SUBSTREAM_FIELDS_input h_st_channel_SUBSTREAM_FIELDS_mjpeg h_st_channel_SUBSTREAM_FIELDS_hls h_st_channel_SUBSTREAM_FIELDS_rtmp h_st_channel_SUBSTREAM_FIELDS_jsmpeg h_st_channel_SUBSTREAM_FIELDS_flv h_st_channel_SUBSTREAM_FIELDS_mp4 h_st_channel_SUBSTREAM_FIELDS_h264",
                           },
                           {
                              "name": "detail-substream-output=stream_scale_y",
                              "field": lang.Height,
                              "description": lang["fieldTextDetailSubstreamOutputStreamScaleY"],
                              "fieldType": "number",
                              "numberMin": "1",
                              "example": "480",
                              // "form-group-class-pre-layer": "h_hls_v_channel_SUBSTREAM_FIELDS_input h_hls_v_channel_SUBSTREAM_FIELDS_libx264 h_hls_v_channel_SUBSTREAM_FIELDS_libx265 h_hls_v_channel_SUBSTREAM_FIELDS_h264_nvenc h_hls_v_channel_SUBSTREAM_FIELDS_hevc_nvenc h_hls_v_channel_SUBSTREAM_FIELDS_no",
                              "form-group-class": "h_st_channel_SUBSTREAM_FIELDS_input h_st_channel_SUBSTREAM_FIELDS_mjpeg h_st_channel_SUBSTREAM_FIELDS_hls h_st_channel_SUBSTREAM_FIELDS_rtmp h_st_channel_SUBSTREAM_FIELDS_jsmpeg h_st_channel_SUBSTREAM_FIELDS_flv h_st_channel_SUBSTREAM_FIELDS_mp4 h_st_channel_SUBSTREAM_FIELDS_h264",
                           },
                           {
                              "name": "detail-substream-output=stream_rotate",
                              "field": lang["Rotate"],
                              "description": lang["fieldTextDetailSubstreamOutputStreamRotate"],
                              "fieldType": "select",
                              // "form-group-class-pre-layer": "h_hls_v_channel_SUBSTREAM_FIELDS_input h_hls_v_channel_SUBSTREAM_FIELDS_libx264 h_hls_v_channel_SUBSTREAM_FIELDS_libx265 h_hls_v_channel_SUBSTREAM_FIELDS_h264_nvenc h_hls_v_channel_SUBSTREAM_FIELDS_hevc_nvenc h_hls_v_channel_SUBSTREAM_FIELDS_no",
                              "form-group-class": "h_st_channel_SUBSTREAM_FIELDS_input h_st_channel_SUBSTREAM_FIELDS_mjpeg h_st_channel_SUBSTREAM_FIELDS_hls h_st_channel_SUBSTREAM_FIELDS_rtmp h_st_channel_SUBSTREAM_FIELDS_jsmpeg h_st_channel_SUBSTREAM_FIELDS_flv h_st_channel_SUBSTREAM_FIELDS_mp4 h_st_channel_SUBSTREAM_FIELDS_h264",
                              "possible": [
                                   {
                                      "name": lang["No Rotation"],
                                      "value": "no"
                                   },
                                   {
                                      "name": lang["180 Degrees"],
                                      "value": "2,transpose=2"
                                   },
                                   {
                                      "name": lang["90 Counter Clockwise and Vertical Flip (default)"],
                                      "value": "0"
                                   },
                                   {
                                      "name": lang["90 Clockwise"],
                                      "value": "1"
                                   },
                                   {
                                      "name": lang["90 Counter Clockwise"],
                                      "value": "2"
                                   },
                                   {
                                      "name": lang["90 Clockwise and Vertical Flip"],
                                      "value": "3"
                                   }
                                ]
                           },
                           {
                               isAdvanced: true,
                              "name": "detail-substream-output=svf",
                              "field": lang["Video Filter"],
                              "description": lang["fieldTextDetailSubstreamOutputSvf"],
                              // "form-group-class-pre-layer": "h_hls_v_channel_SUBSTREAM_FIELDS_input h_hls_v_channel_SUBSTREAM_FIELDS_libx264 h_hls_v_channel_SUBSTREAM_FIELDS_libx265 h_hls_v_channel_SUBSTREAM_FIELDS_h264_nvenc h_hls_v_channel_SUBSTREAM_FIELDS_hevc_nvenc h_hls_v_channel_SUBSTREAM_FIELDS_no",
                              "form-group-class": "h_st_channel_SUBSTREAM_FIELDS_input h_st_channel_SUBSTREAM_FIELDS_mjpeg h_st_channel_SUBSTREAM_FIELDS_hls h_st_channel_SUBSTREAM_FIELDS_rtmp h_st_channel_SUBSTREAM_FIELDS_jsmpeg h_st_channel_SUBSTREAM_FIELDS_flv h_st_channel_SUBSTREAM_FIELDS_mp4 h_st_channel_SUBSTREAM_FIELDS_h264",
                          },
                          {
                              "name": "detail-substream-output=cust_stream",
                              "field": lang["Stream Flags"],
                          },
                       ]
                   },
               ]
           },
             "JPEG API": {
                "name": lang['JPEG API'],
                "headerTitle": `${lang['JPEG API']} <small>${lang.Snapshot} (cgi-bin)</small>`,
                "id": "monSectionJPEGAPI",
                "color": "forestgreen",
                "isSection": true,
                "input-mapping": "snap",
                "info": [
                    {
                       "name": "detail=snap",
                       "field": lang.Enabled,
                       "description": lang["fieldTextSnap"],
                       "default": "0",
                       "example": "",
                       "fieldType": "select",
                       "selector": "h_sn",
                       "possible": [
                           {
                              "name": lang.No,
                              "value": "0"
                           },
                           {
                              "name": lang.Yes,
                              "value": "1"
                           }
                       ]
                   },
                   {
                       hidden: true,
                      "name": "detail=snap_fps",
                      "field": lang['Frame Rate'],
                      "description": "",
                      "default": "1",
                      "example": "",
                      "form-group-class": "h_sn_input h_sn_1",
                      "possible": ""
                   },
                   {
                       hidden: true,
                      "name": "detail=snap_scale_x",
                      "field": lang['Image Width'],
                      "description": "",
                      "default": "",
                      "example": "",
                      "form-group-class": "h_sn_input h_sn_1",
                      "possible": ""
                   },
                   {
                       hidden: true,
                      "name": "detail=snap_scale_y",
                      "field": lang['Image Height'],
                      "description": "",
                      "default": "",
                      "example": "",
                      "form-group-class": "h_sn_input h_sn_1",
                      "possible": ""
                   },
                   {
                       isAdvanced: true,
                       hidden: true,
                      "name": "detail=snap_vf",
                      "field": lang['Video Filter'],
                      "description": "",
                      "default": "",
                      "example": "",
                      "form-group-class": "h_sn_input h_sn_1",
                      "possible": ""
                   },
                ]
             },
             "Recording": {
                "id": "monSectionRecording",
                "name": lang.Recording,
                "color": "red",
                "isSection": true,
                "input-mapping": "record",
                "blockquote": lang.RecordingText,
                "blockquoteClass": 'global_tip',
                "section-class": 'h_m_input h_m_record h_m_idle',
                "info": [
                    // {
                    //    "name": "height",
                    //    "field": lang.Height,
                    //    "description": lang["fieldTextRecordScaleY"],
                    //    "default": "640",
                    //    "example": "1280",
                    //    "possible": ""
                    // },
                    // {
                    //    "name": "width",
                    //    "field": lang.Width,
                    //    "description": lang["fieldTextRecordScaleX"],
                    //    "default": "480",
                    //    "example": "720",
                    //    "possible": ""
                    // },
                   {
                      "name": "ext",
                      "field": lang["Record File Type"],
                      "description": lang["fieldTextExt"],
                      "default": "MP4",
                      "example": "",
                      "selector": "h_f",
                      "fieldType": "select",
                      "possible": [
                         {
                            "name": "MP4",
                            "value": "mp4",
                            "info": lang["fieldTextExtMP4"]
                         },
                         {
                            "name": "WebM",
                            "value": "webm",
                            "info": lang["fieldTextExtWebM"]
                         }
                      ]
                   },
                   {
                      "name": "detail=vcodec",
                      "field": lang["Video Codec"],
                      "description": lang["fieldTextVcodec"],
                      "default": "copy",
                      "example": "",
                      "selector": "h_vc",
                      "fieldType": "select",
                      "possible": [
                           {
                              "name": lang.Default,
                              "value": "default"
                           },
                           {
                              "name": lang.Auto,
                              "value": "none"
                           },
                           {
                              "name": "WebM",
                              "optgroup": [
                                 {
                                    "name": "libvpx (Default)",
                                    "value": "libvpx"
                                 },
                                 {
                                    "name": "libvpx-vp9",
                                    "value": "libvpx-vp9"
                                 }
                              ]
                           },
                           {
                              "name": "MP4",
                              "optgroup": [
                                 {
                                    "name": "libx265",
                                    "value": "libx265"
                                 },
                                 {
                                    "name": "libx264 (Default)",
                                    "value": "libx264"
                                 },
                                 {
                                    "name": "copy",
                                    "value": "copy"
                                 }
                              ]
                           },
                           {
                              "name": "MP4 Hardware Accelerated",
                              "optgroup": [
                                 {
                                    "name": "H.264 VA-API (Intel HW Accel)",
                                    "value": "h264_vaapi"
                                 },
                                 {
                                    "name": "H.265 VA-API (Intel HW Accel)",
                                    "value": "hevc_vaapi"
                                 },
                                 {
                                    "name": "H.264 NVENC (NVIDIA HW Accel)",
                                    "value": "h264_nvenc"
                                 },
                                 {
                                    "name": "H.264 NVENC Jetson (NVIDIA HW Accel NVMPI)",
                                    "value": "h264_nvmpi"
                                 },
                                 {
                                    "name": "H.265 NVENC (NVIDIA HW Accel)",
                                    "value": "hevc_nvenc"
                                 },
                                 {
                                    "name": "H.264 (Quick Sync Video)",
                                    "value": "h264_qsv"
                                 },
                                 {
                                    "name": "H.265 (Quick Sync Video)",
                                    "value": "hevc_qsv"
                                 },
                                 {
                                    "name": "MPEG2 (Quick Sync Video)",
                                    "value": "mpeg2_qsv"
                                 },
                                 {
                                    "name": "H.264 openMAX (Raspberry Pi)",
                                    "value": "h264_omx"
                                 }
                              ]
                           },
                           {
                              "name": "WebM Hardware Accelerated",
                              "optgroup": [
                                 {
                                    "name": "VP8 NVENC (NVIDIA HW Accel)",
                                    "value": "vp8_cuvid"
                                 },
                                 {
                                    "name": "VP9 NVENC (NVIDIA HW Accel)",
                                    "value": "vp9_cuvid"
                                 },
                                 {
                                    "name": "VP8 (Quick Sync Video)",
                                    "value": "vp8_qsv"
                                 }
                              ]
                           }
                        ]
                   },
                   {
                      "name": "detail=crf",
                      "field": lang.Quality,
                      "description": lang["fieldTextCrf"],
                      "default": "15",
                      "example": "1",
                      "form-group-class": "h_vc_input h_vc_libvpx h_vc_libvpx-vp9 h_vc_libx264 h_vc_libx265 h_vc_hevc_nvenc h_vc_h264_nvenc h_vc_h264_nvmpi h_vc_h264_vaapi h_vc_hevc_vaapi h_vc_h264_qsv h_vc_hevc_qsv h_vc_mpeg2_qsv h_vc_default h_vc_none",
                      "possible": "1-23"
                   },
                   {
                       isAdvanced: true,
                      "name": "detail=preset_record",
                      "field": lang.Preset,
                      "description": lang["fieldTextPresetRecord"],
                      "default": "",
                      "example": "ultrafast",
                      "form-group-class": "h_vc_input h_vc_libvpx h_vc_libvpx-vp9 h_vc_libx264 h_vc_libx265 h_vc_hevc_nvenc h_vc_h264_nvenc h_vc_h264_nvmpi h_vc_h264_vaapi h_vc_hevc_vaapi h_vc_h264_qsv h_vc_hevc_qsv h_vc_mpeg2_qsv h_vc_default h_vc_none",
                      "possible": ""
                   },
                   {
                      "name": "detail=acodec",
                      "field": lang['Audio Codec'],
                      "description": lang["fieldTextAcodec"],
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "possible": [
                         {
                            "name": lang.Default,
                            "value": "default"
                         },
                         {
                            "name": lang.Auto,
                            "value": "none"
                         },
                         {
                            "name": lang["No Audio"],
                            "value": "no"
                         },
                         {
                            "name": "WebM",
                            "optgroup": [
                               {
                                  "name": `libvorbis (${lang.Default})`,
                                  "value": "libvorbis"
                               },
                               {
                                  "name": "libopus",
                                  "value": "libopus"
                               }
                            ]
                         },
                         {
                            "name": "MP4",
                            "optgroup": [
                               {
                                  "name": "libmp3lame",
                                  "value": "libmp3lame"
                               },
                               {
                                  "name": `aac (${lang.Default})`,
                                  "value": "aac"
                               },
                               {
                                  "name": "ac3",
                                  "value": "ac3"
                               },
                               {
                                  "name": "copy",
                                  "value": "copy"
                               }
                            ]
                         }
                      ]
                   },
                   {
                      "name": "fps",
                      "field": lang["Video Record Rate"],
                      "description": lang["fieldTextFps"],
                      "default": "",
                      "example": "2",
                      "form-group-class": "h_vc_input h_vc_libvpx h_vc_libvpx-vp9 h_vc_libx264 h_vc_libx265 h_vc_hevc_nvenc h_vc_h264_nvenc h_vc_h264_nvmpi h_vc_h264_vaapi h_vc_hevc_vaapi h_vc_h264_qsv h_vc_hevc_qsv h_vc_mpeg2_qsv h_vc_default h_vc_none",
                      "possible": ""
                   },
                   {
                      "name": "detail=record_scale_y",
                      "field": lang["Record Height"],
                      "description": "Height of the stream image.",
                      "default": "",
                      "example": "720",
                      "form-group-class": "h_vc_input h_vc_libvpx h_vc_libvpx-vp9 h_vc_libx264 h_vc_libx265 h_vc_hevc_nvenc h_vc_h264_nvenc h_vc_h264_nvmpi h_vc_h264_vaapi h_vc_hevc_vaapi h_vc_h264_qsv h_vc_hevc_qsv h_vc_mpeg2_qsv h_vc_default h_vc_none",
                      "possible": ""
                   },
                   {
                      "name": "detail=record_scale_x",
                      "field": lang["Record Width"],
                      "description": "Width of the stream image.",
                      "default": "",
                      "example": "1280",
                      "form-group-class": "h_vc_input h_vc_libvpx h_vc_libvpx-vp9 h_vc_libx264 h_vc_libx265 h_vc_hevc_nvenc h_vc_h264_nvenc h_vc_h264_nvmpi h_vc_h264_vaapi h_vc_hevc_vaapi h_vc_h264_qsv h_vc_hevc_qsv h_vc_mpeg2_qsv h_vc_default h_vc_none",
                      "possible": ""
                   },
                   {
                      "name": "detail=cutoff",
                      "field": lang['Recording Segment Interval'],
                      "description": lang["fieldTextCutoff"],
                      "default": "15",
                      "example": "60",
                      "attribute": `triggerChange="#add_monitor [detail=vcodec]"`,
                      "possible": ""
                   },
                   {
                      "name": "detail=rotate",
                      "field": lang["Rotate"],
                      "description": lang["fieldTextRotate"],
                      "default": "copy",
                      "example": "",
                      "selector": "h_vc",
                      "fieldType": "select",
                      "form-group-class": "h_vc_input h_vc_libvpx h_vc_libvpx-vp9 h_vc_libx264 h_vc_libx265 h_vc_hevc_nvenc h_vc_h264_nvenc h_vc_h264_nvmpi h_vc_h264_vaapi h_vc_hevc_vaapi h_vc_h264_qsv h_vc_hevc_qsv h_vc_mpeg2_qsv h_vc_default h_vc_none",
                      "possible": [
                           {
                              "name": lang["No Rotation"],
                              "value": "no"
                           },
                           {
                              "name": lang["180 Degrees"],
                              "value": "2,transpose=2"
                           },
                           {
                              "name": lang["90 Counter Clockwise and Vertical Flip (default)"],
                              "value": "0"
                           },
                           {
                              "name": lang["90 Clockwise"],
                              "value": "1"
                           },
                           {
                               "name": lang["90 Counter Clockwise"],
                               "value": "2"
                           },
                           {
                              "name": lang["90 Clockwise and Vertical Flip"],
                              "value": "3"
                           }
                        ]
                   },
                   {
                       isAdvanced: true,
                      "name": "detail=vf",
                      "field": lang['Record Video Filter'],
                      "description": lang["fieldTextVf"],
                      "default": "",
                      "example": "",
                      "form-group-class": "h_vc_input h_vc_libvpx h_vc_libvpx-vp9 h_vc_libx264 h_vc_libx265 h_vc_hevc_nvenc h_vc_h264_nvenc h_vc_h264_nvmpi h_vc_h264_vaapi h_vc_hevc_vaapi h_vc_h264_qsv h_vc_hevc_qsv h_vc_mpeg2_qsv h_vc_default h_vc_none",
                      "possible": ""
                   }
                ]
             },
             "Recording Timestamp": {
                "id": "monSectionRecordingTimestamp",
                "name": lang['Recording Timestamp'],
                "color": "red",
                isAdvanced: true,
                "section-pre-class": "h_vc_input h_vc_libvpx h_vc_libvpx-vp9 h_vc_libx264 h_vc_libx265 h_vc_hevc_nvenc h_vc_h264_nvenc h_vc_h264_nvmpi h_vc_h264_vaapi h_vc_hevc_vaapi h_vc_h264_qsv h_vc_hevc_qsv h_vc_mpeg2_qsv h_vc_default h_vc_none",
                "section-class": "h_m_input h_m_record h_m_idle",
                "isSection": true,
                "info": [
                    {
                       "name": "detail=timestamp",
                       "selector":"h_rtm",
                       "field": lang.Enabled,
                       "description": lang["fieldTextTimestamp"],
                       "default": "0",
                       "example": "",
                       "fieldType": "select",
                       "possible": [
                           {
                              "name": lang.No,
                              "value": "0"
                           },
                           {
                              "name": lang.Yes,
                              "value": "1"
                           }
                       ]
                   },
                   {
                       hidden: true,
                      "name": "detail=timestamp_font",
                      "field": "Font Path",
                      "description": lang["fieldTextTimestampFont"],
                      "default": "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
                      "example": "",
                      "form-group-class": "h_rtm_input h_rtm_1",
                      "possible": ""
                   },
                   {
                       hidden: true,
                      "name": "detail=timestamp_font_size",
                      "field": "Font Size",
                      "description": lang["fieldTextTimestampFontSize"],
                      "default": "10",
                      "example": "",
                      "form-group-class": "h_rtm_input h_rtm_1",
                      "possible": ""
                   },
                   {
                       hidden: true,
                      "name": "detail=timestamp_color",
                      "field": "Text Color",
                      "description": lang["fieldTextTimestampColor"],
                      "default": "white",
                      "example": "",
                      "form-group-class": "h_rtm_input h_rtm_1",
                      "possible": ""
                   },
                   {
                       hidden: true,
                      "name": "detail=timestamp_box_color",
                      "field": "Text Box Color",
                      "description": lang["fieldTextTimestampBoxColor"],
                      "default": "0x00000000@1",
                      "example": "",
                      "form-group-class": "h_rtm_input h_rtm_1",
                      "possible": ""
                   },
                   {
                       hidden: true,
                      "name": "detail=timestamp_x",
                      "field": "Position X",
                      "description": lang["fieldTextTimestampX"],
                      "default": "(w-tw)/2",
                      "example": "",
                      "form-group-class": "h_rtm_input h_rtm_1",
                      "possible": ""
                   },
                   {
                       hidden: true,
                      "name": "detail=timestamp_y",
                      "field": "Position Y",
                      "description": lang["fieldTextTimestampY"],
                      "default": "0",
                      "example": "",
                      "form-group-class": "h_rtm_input h_rtm_1",
                      "possible": ""
                   }
                ]
             },
             "Recording Watermark": {
                "id": "monSectionRecordingWatermark",
                "name": lang['Recording Watermark'],
                "color": "red",
                isAdvanced: true,
                "section-pre-class": "h_vc_input h_vc_libvpx h_vc_libvpx-vp9 h_vc_libx264 h_vc_libx265 h_vc_hevc_nvenc h_vc_h264_nvenc h_vc_h264_nvmpi h_vc_h264_vaapi h_vc_hevc_vaapi h_vc_h264_qsv h_vc_hevc_qsv h_vc_mpeg2_qsv h_vc_default h_vc_none",
                "section-class": "h_m_input h_m_record h_m_idle",
                "isSection": true,
                "info": [
                    {
                       "name": "detail=watermark",
                       "field": lang.Enabled,
                       "description": lang["fieldTextWatermark"],
                       "default": "0",
                       "example": "",
                       "fieldType": "select",
                       "selector": "h_wat",
                       "possible": [
                           {
                              "name": lang.No,
                              "value": "0"
                           },
                           {
                              "name": lang.Yes,
                              "value": "1"
                           }
                       ]
                   },
                   {
                       hidden: true,
                      "name": "detail=watermark_location",
                      "field": lang['Image Location'],
                      "description": lang["fieldTextWatermarkLocation"],
                      "default": "0",
                      "example": "/usr/share/watermark.logo",
                      "form-group-class": "h_wat_input h_wat_1",
                      "possible": ""
                   },
                   {
                       hidden: true,
                       "name": "detail=watermark_position",
                       "field": lang['Image Position'],
                       "description": lang["fieldTextWatermarkPosition"],
                       "default": "0",
                       "example": "",
                       "fieldType": "select",
                       "form-group-class": "h_wat_input h_wat_1",
                       "possible": [
                           {
                              "name": lang["Top Right"],
                              "value": "tr"
                           },
                           {
                              "name": lang["Top Left"],
                              "value": "tl"
                           },
                           {
                              "name": lang["Bottom Right"],
                              "value": "br"
                           },
                           {
                              "name": lang["Bottom Left"],
                              "value": "bl"
                           }
                        ]
                   },
                ]
             },
             "Timelapse": {
                "name": lang['Timelapse'],
                "id": "monSectionTimelapse",
                "color": "red",
                "isSection": true,
                "input-mapping": "record_timelapse",
                "info": [
                    {
                       "name": "detail=record_timelapse",
                       "field": lang.Enabled,
                       "description": lang["fieldTextRecordTimelapse"],
                       "default": "0",
                       "example": "",
                       "fieldType": "select",
                       "selector": "h_rec_ti",
                       "possible": [
                           {
                              "name": lang.No,
                              "value": "0"
                           },
                           {
                              "name": lang.Yes,
                              "value": "1"
                           }
                       ]
                   },
                   {
                       hidden: true,
                      "name": "detail=record_timelapse_mp4",
                      "field": lang.Enabled,
                      "description": lang["fieldTextRecordTimelapseMp4"],
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "possible": [
                          {
                             "name": lang.No,
                             "value": "0"
                          },
                          {
                             "name": lang.Yes,
                             "value": "1"
                          }
                      ]
                   },
                   {
                       hidden: true,
                      "name": "detail=record_timelapse_fps",
                      "field": lang['Creation Interval'],
                      "default": "900",
                      "form-group-class": "h_rec_ti_input h_rec_ti_1",
                      "fieldType": "select",
                      "possible": [
                        {
                            "name": `.1 ${lang.minutes}`,
                            "value": "6"
                        },
                        {
                            "name": `.25 ${lang.minutes}`,
                            "value": "15"
                        },
                        {
                            "name": `.5 ${lang.minutes}`,
                            "value": "30"
                        },
                        {
                            "name": `1 ${lang.minute}`,
                            "value": "60"
                        },
                        {
                            "name": `5 ${lang.minutes}`,
                            "value": "300"
                        },
                        {
                            "name": `10 ${lang.minutes}`,
                            "value": "600"
                        },
                        {
                            "name": `15 ${lang.minutes}`,
                            "value": "900"
                        },
                        {
                            "name": `30 ${lang.minutes}`,
                            "value": "1800"
                        },
                        {
                            "name": `45 ${lang.minutes}`,
                            "value": "2700"
                        },
                        {
                            "name": `60 ${lang.minutes}`,
                            "value": "3600"
                         }
                      ]
                   },
                   {
                       hidden: true,
                      "name": "detail=record_timelapse_scale_x",
                      "field": lang['Image Width'],
                      "form-group-class": "h_rec_ti_input h_rec_ti_1",
                   },
                   {
                       hidden: true,
                      "name": "detail=record_timelapse_scale_y",
                      "field": lang['Image Height'],
                      "form-group-class": "h_rec_ti_input h_rec_ti_1",
                   },
                   {
                       isAdvanced: true,
                       hidden: true,
                      "name": "detail=record_timelapse_vf",
                      "field": lang['Video Filter'],
                      "form-group-class": "h_rec_ti_input h_rec_ti_1",
                   },
                ]
             },
             "Timelapse Watermark": {
                "id": "monSectionRecordingWatermark",
                "name": lang['Timelapse Watermark'],

                "color": "red",
                isAdvanced: true,
                "section-class": "h_rec_ti_input h_rec_ti_1",
                "isSection": true,
                "info": [
                    {
                       "name": "detail=record_timelapse_watermark",
                       "field": lang.Enabled,
                       "description": lang["fieldTextRecordTimelapseWatermark"],
                       "default": "0",
                       "example": "",
                       "fieldType": "select",
                       "selector": "h_wat_timelapse",
                       "possible": [
                           {
                              "name": lang.No,
                              "value": "0"
                           },
                           {
                              "name": lang.Yes,
                              "value": "1"
                           }
                       ]
                   },
                   {
                       hidden: true,
                      "name": "detail=record_timelapse_watermark_location",
                      "field": lang['Image Location'],
                      "description": lang["fieldTextRecordTimelapseWatermarkLocation"],
                      "default": "0",
                      "example": "/usr/share/watermark.logo",
                      "form-group-class": "h_wat_timelapse_input h_wat_timelapse_1",
                      "possible": ""
                   },
                   {
                       hidden: true,
                       "name": "detail=record_timelapse_watermark_position",
                       "field": lang['Image Position'],
                       "description": lang["fieldTextRecordTimelapseWatermarkPosition"],
                       "default": "0",
                       "example": "",
                       "fieldType": "select",
                       "form-group-class": "h_wat_timelapse_input h_wat_timelapse_1",
                       "possible": [
                           {
                              "name": lang["Top Right"],
                              "value": "tr"
                           },
                           {
                              "name": lang["Top Left"],
                              "value": "tl"
                           },
                           {
                              "name": lang["Bottom Right"],
                              "value": "br"
                           },
                           {
                              "name": lang["Bottom Left"],
                              "value": "bl"
                           }
                        ]
                   },
                ]
             },
             "Detector": {
                "name": lang['Detector Settings'],
                "headerTitle": `${lang['Detector Settings']} <small>${lang['Primary Engine']} : <b class="h_det_pam_input h_det_pam_1">Pixel Array</b><span class="h_det_pam_input h_det_pam_0"><b class="shinobi-detector_name"></b> <b class="shinobi-detector-invert">${lang['Not Connected']}</b><b class="shinobi-detector" style="display:none">${lang['Connected']}</b></span></small></h4>`,
                "color": "orange",
                "isSection": true,
                "input-mapping":"detector",
                "id": "monSectionDetector",
                "selector": "h_det",
                "attribute": `triggerChange="#add_monitor [detail=detector_record_method]"`,
                "blockquote": `${lang.DetectorText}\n<p class="shinobi-detector-msg"></p>`,
                "info": [
                    {
                       "fieldType": "btn",
                       "class": `btn-primary open-region-editor`,
                       "btnContent": `<i class="fa fa-grav"></i> &nbsp; ${lang['Region Editor']}`,
                       "description": "",
                       "default": "",
                       "example": "",
                       "form-group-class-pre-pre-layer": "h_det_input h_det_1",
                       "form-group-class-pre-layer": "form-group",
                       "possible": ""
                    },
                   {
                      "name": "detail=detector",
                      "field": lang.Enabled,
                      "description": lang["fieldTextDetector"],
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "selector": "h_det",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                       hidden: true,
                      "name": "detail=detector_save",
                      "field": lang["Save Events"],
                      "description": lang["fieldTextDetectorSave"],
                      "default": "1",
                      "example": "",
                      "form-group-class": "h_det_input h_det_1",
                      "fieldType": "select",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                      "name": "detail=use_detector_filters",
                      "field": lang['Event Filters'],
                      "description": lang.fieldTextEventFilters,
                      "default": "0",
                      "example": "",
                      "selector": "h_det_fil",
                      "fieldType": "select",
                      "form-group-class-pre-layer": "h_det_input h_det_1",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                      "name": "detail=use_detector_filters_object",
                      "field": lang['Filter for Objects only'],
                      "description": "",
                      "default": "0",
                      "fieldType": "select",
                      "form-group-class": "h_det_fil_input h_det_fil_1",
                      "form-group-class-pre-layer": "h_det_input h_det_1",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                       isAdvanced: true,
                       hidden: true,
                      "name": "detail=detector_record_method",
                      "field": lang['How to Record'],
                      "description": lang["fieldTextDetectorRecordMethod"],
                      "selector": "h_rec_mtd",
                      "default": "sip",
                      "example": "",
                      "form-group-class": "h_det_input h_det_1",
                      "fieldType": "select",
                      "possible": [
                           {
                              "name": lang['Event-Based Recording (For Watch-Only Mode)'],
                              "value": "sip"
                           },
                           {
                              "name": lang['Delete Motionless Videos (For Record Mode)'],
                              "value": "del"
                           }
                        ]
                   },
                   {
                       hidden: true,
                      "name": "detail=detector_trigger",
                      "field": lang['Trigger Record'],
                      "description": "This will order the camera to record if it is set to \"Watch-Only\" when an Event is detected.",
                      "default": "0",
                      "example": "",
                      "form-group-class": "h_det_input h_det_1",
                      "form-group-class-pre-layer": "h_rec_mtd_input h_rec_mtd_hot h_rec_mtd_sip",
                      "fieldType": "select",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                      "name": "detail=detector_buffer_seconds_before",
                      "field": lang['Buffer Time from Event'],
                      "description": lang["fieldTextBufferTimeFromEvent"],
                      "default": "5",
                      "form-group-class": "h_det_input h_det_1",
                      "form-group-class-pre-layer": "h_rec_mtd_input h_rec_mtd_sip",
                   },
                   {
                       hidden: true,
                      "name": "detail=detector_timeout",
                      "field": lang["Recording Timeout"],
                      "description": "The length of time \"Trigger Record\" will run for. This is read in minutes.",
                      "default": "10",
                      "example": "",
                      "form-group-class": "h_det_input h_det_1",
                      "form-group-class-pre-layer": "h_rec_mtd_input h_rec_mtd_hot h_rec_mtd_sip",
                      "possible": ""
                   },
                   {
                       hidden: true,
                      "name": "detail=watchdog_reset",
                      "field": lang["Timeout Reset on Next Event"],
                      "description": lang["fieldTextWatchdogReset"],
                      "default": "1",
                      "fieldType": "select",
                      "form-group-class": "h_det_input h_det_1",
                      "form-group-class-pre-layer": "h_rec_mtd_input h_rec_mtd_hot h_rec_mtd_sip",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                       isAdvanced: true,
                       hidden: true,
                      "name": "detail=detector_delete_motionless_videos",
                      "field": lang['Delete Motionless Video'],
                      "default": "0",
                      "form-group-class": "h_det_input h_det_1",
                      "form-group-class-pre-layer": "h_rec_mtd_input h_rec_mtd_del",
                      "fieldType": "select",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                       hidden: true,
                      "name": "detail=det_trigger_tags",
                      "field": lang['Trigger Monitors with Tags'],
                      "form-group-class": "h_det_input h_det_1",
                   },
                   {
                       isAdvanced: true,
                      "name": "detail=detector_http_api",
                      "field": lang["Allow API Trigger"],
                      "description": lang["fieldTextDetectorHttpApi"],
                      "default": "1",
                      "example": "",
                      "fieldType": "select",
                      "possible": [
                         {
                            "name": `${lang.Always} (${lang.Default})`,
                            "value": "1"
                         },
                         {
                            "name": lang[`When Detector is On`],
                            "value": "2"
                         },
                         {
                            "name": lang[`When Detector is Off`],
                            "value": "3"
                         },
                         {
                            "name": lang.Never,
                            "value": "0"
                         }
                      ]
                   },
                   {
                       isAdvanced: true,
                       hidden: true,
                      "name": "detail=detector_send_frames",
                      "field": lang["Send Frames"],
                      "description": lang["fieldTextDetectorSendFrames"],
                      "default": "0",
                      "example": "",
                      "selector": "h_det_fra",
                      "form-group-class": "h_det_input h_det_1",
                      "fieldType": "select",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                       isAdvanced: true,
                       hidden: true,
                       "form-group-class": "h_det_input h_det_1",
                      "name": "detail=detector_fps",
                      "field": lang["Detector Rate"],
                      "description": lang["fieldTextDetectorFps"],
                      "default": "2",
                      "example": "",
                      "possible": ""
                   },
                   {
                       isAdvanced: true,
                       hidden: true,
                       "form-group-class": "h_det_input h_det_1",
                      "name": "detail=detector_scale_x",
                      "field": lang["Feed-in Image Width"],
                      "description": lang["fieldTextDetectorScaleX"],
                      "default": "",
                      "example": "640",
                      "possible": ""
                   },
                   {
                       isAdvanced: true,
                       hidden: true,
                       "form-group-class": "h_det_input h_det_1",
                      "name": "detail=detector_scale_y",
                      "field": lang["Feed-in Image Height"],
                      "description": lang["fieldTextDetectorScaleY"],
                      "default": "",
                      "example": "480",
                      "possible": ""
                   },
                   {
                       isAdvanced: true,
                       hidden: true,
                      "name": "detail=detector_lock_timeout",
                      "field": lang['Allow Next Trigger'],
                      "description": lang["fieldTextDetectorLockTimeout"],
                      "default": "2000",
                      "example": "",
                      "form-group-class": "h_det_input h_det_1",
                      "possible": ""
                   },
                   {
                       isAdvanced: true,
                      "name": "detail=detector_send_video_length",
                      "field": lang["Notification Video Length"],
                      "description": lang["fieldTextDetectorSendVideoLength"],
                      "default": "10"
                   },
                   {
                       isAdvanced: true,
                      "name": "detail=snap_seconds_inward",
                      "field": lang['Delay for Snapshot'],
                      "description": lang[lang["fieldTextSnapSecondsInward"]],
                      "default": "5"
                   },
                   {
                       hidden: true,
                      "name": "detail=cords",
                   },
                   {
                       hidden: true,
                      "name": "detail=detector_filters",
                   },
                   {
                       hidden: true,
                       "name": lang['Motion Detection'],
                       "headerTitle": `${lang['Motion Detection']} <small>${lang['Primary Engine']} : <b class="h_det_pam_input h_det_pam_1">Pixel Array</b><span class="h_det_pam_input h_det_pam_0"><b class="shinobi-detector_name"></b> <b class="shinobi-detector-invert">${lang['Not Connected']}</b><b class="shinobi-detector" style="display:none">${lang['Connected']}</b></span></small>`,
                       "color": "orange",
                       id: "monSectionDetectorMotion",
                       isSection: true,
                       isFormGroupGroup: true,
                       "section-class": "h_det_input h_det_1",
                       "info": [
                           {
                              "name": "detail=detector_pam",
                              "field": lang["Use Built-In"],
                              "description": lang["fieldTextDetectorPam"],
                              "selector": "h_det_pam",
                              "default": "0",
                              "example": "",
                              "fieldType": "select",
                              "possible": [
                                 {
                                    "name": lang.No,
                                    "value": "0"
                                 },
                                 {
                                    "name": lang.Yes,
                                    "value": "1"
                                 }
                              ]
                           },
                           {
                               isAdvanced: true,
                              "name": "detail=detector_motion_save_frame",
                              "field": lang["Save Frames"],
                              "description": lang["fieldTextSaveFrames"],
                              "default": "0",
                              "fieldType": "select",
                              "possible": [
                                 {
                                    "name": lang.No,
                                    "value": "0"
                                 },
                                 {
                                    "name": lang.Yes,
                                    "value": "1"
                                 }
                              ]
                           },
                           // {
                           //    "name": "detail=detector_show_matrix",
                           //    "field": lang["Show Matrices"],
                           //    "description": "Outline which pixels are detected as changed in one matrix.",
                           //    "default": "0",
                           //    "example": "",
                           //    "fieldType": "select",
                           //    "form-group-class": "h_det_pam_input h_det_pam_1",
                           //    "possible": [
                           //       {
                           //          "name": lang.No,
                           //          "value": "0"
                           //       },
                           //       {
                           //          "name": lang.Yes,
                           //          "value": "1"
                           //       }
                           //    ]
                           // },
                           {
                              "name": "detail=detector_sensitivity",
                              "field": lang['Minimum Change'],
                              "description": "The motion confidence rating must exceed this value to be seen as a trigger. This number correlates directly to the confidence rating returned by the motion detector. This option was previously named \"Indifference\".",
                              "default": "10",
                              "example": "10",
                              "possible": ""
                           },
                           {
                              "name": "detail=detector_max_sensitivity",
                              "field": lang["Maximum Change"],
                              "description": "The motion confidence rating must be lower than this value to be seen as a trigger. Leave blank for no maximum. This option was previously named \"Max Indifference\".",
                              "default": "",
                              "example": "75",
                              "possible": ""
                           },
                           {
                               isAdvanced: true,
                              "name": "detail=detector_threshold",
                              "field": lang["Trigger Threshold"],
                              "description": lang["fieldTextDetectorThreshold"],
                              "default": "1",
                              "example": "3",
                              "possible": "Any non-negative integer."
                           },
                           {
                               isAdvanced: true,
                              "name": "detail=detector_color_threshold",
                              "field": lang["Color Threshold"],
                              "description": lang["fieldTextDetectorColorThreshold"],
                              "default": "9",
                              "example": "9",
                              "possible": "Any non-negative integer."
                           },
                           {
                               isAdvanced: true,
                              "name": "detail=inverse_trigger",
                              "field": lang["Inverse Trigger"],
                              "description": lang["fieldTextInverseTrigger"],
                              "default": "0",
                              "example": "",
                              "fieldType": "select",
                              "possible": [
                                 {
                                    "name": lang.No,
                                    "value": "0"
                                 },
                                 {
                                    "name": lang.Yes,
                                    "value": "1"
                                 }
                              ]
                           },
                           {
                              "name": "detail=detector_frame",
                              "field": lang["Full Frame Detection"],
                              "description": lang["fieldTextDetectorFrame"],
                              "default": "1",
                              "example": "",
                              "fieldType": "select",
                              "possible": [
                                 {
                                    "name": lang.No,
                                    "value": "0"
                                 },
                                 {
                                    "name": lang.Yes,
                                    "value": "1"
                                 }
                              ]
                           },
                           {
                              "name": "detail=detector_motion_tile_mode",
                              "field": lang['Accuracy Mode'],
                              "selector": "h_det_tile_mode",
                              "default": "1",
                              "example": "",
                              "fieldType": "select",
                              "possible": [
                                 {
                                    "name": lang.No,
                                    "value": "0"
                                 },
                                 {
                                    "name": lang.Yes,
                                    "value": "1"
                                 }
                              ]
                           },
                           {
                               "form-group-class": "h_det_tile_mode_input h_det_tile_mode_1",
                              "name": "detail=detector_tile_size",
                              "field": lang["Tile Size"],
                              "description": lang.fieldTextTileSize,
                              "default": "20",
                           },
                           {
                               isAdvanced: true,
                              "name": "detail=detector_noise_filter",
                              "field": lang['Noise Filter'],
                              "description": lang["fieldTextDetectorNoiseFilter"],
                              "default": "1",
                              "example": "",
                              "fieldType": "select",
                              "possible": [
                                 {
                                    "name": lang.No,
                                    "value": "0"
                                 },
                                 {
                                    "name": lang.Yes,
                                    "value": "1"
                                 }
                              ]
                           },
                           {
                               isAdvanced: true,
                              "name": "detail=detector_noise_filter_range",
                              "field": lang["Noise Filter Range"],
                              "description": lang["fieldTextDetectorNoiseFilterRange"],
                              "default": "6",
                              "example": "9",
                              "possible": "Any non-negative integer."
                           },
                       ]
                   },
                   {
                      "name": lang['Object Detection'],
                      "color": "orange",
                      id: "monSectionDetectorObject",
                      headerTitle: `${lang['Object Detection']} <small><b class="shinobi-detector_name"></b> <b class="shinobi-detector-invert">${lang['Not Connected']}</b><b class="shinobi-detector" style="display:none">${lang['Connected']}</b></small>`,
                      isFormGroupGroup: true,
                      isSection: true,
                      "input-mapping": "detector_object",
                      "section-class": "h_det_input h_det_1",
                      "info": [
                          {
                             "name": "detail=detector_use_detect_object",
                             "field": lang.Enabled,
                             "description": lang["fieldTextDetectorUseDetectObject"],
                             "default": "0",
                             "example": "",
                             "selector": "h_casc",
                             "fieldType": "select",
                             "possible": [
                                {
                                   "name": lang.No,
                                   "value": "0"
                                },
                                {
                                   "name": lang.Yes,
                                   "value": "1"
                                }
                             ]
                         },
                         {
                             hidden: true,
                             "id": "detectorsSelected",
                            "name": "detail=detectors_selected",
                            "field": lang["Detectors Selected"],
                            "description": lang.fieldTextDetectorsSelected,
                            "default": "all",
                            "attribute": "multiple",
                            "fieldType": "select",
                            "form-group-class": "h_casc_input h_casc_1",
                            "possible": [
                               {
                                  "name": `${lang.All} (${lang.Default})`,
                                  "value": "all"
                               }
                            ]
                         },
                         {
                            "name": "detail=detector_object_ignore_not_move",
                            "field": lang["Ignore Non-Moving"],
                            "default": "0",
                            "fieldType": "select",
                            "selector": "h_obj_ignore_move",
                            "form-group-class": "h_casc_input h_casc_1",
                            "possible": [
                               {
                                  "name": lang.No,
                                  "value": "0"
                               },
                               {
                                  "name": lang.Yes,
                                  "value": "1"
                               }
                            ]
                         },
                         {
                             hidden: true,
                            "name": "detail=detector_object_move_percent",
                            "field": lang['Minimum Movement'],
                            "description": lang.inPercent,
                            "default": "5",
                            "form-group-class": "h_obj_ignore_move_input h_obj_ignore_move_1"
                         },
                         {
                             isAdvanced: true,
                            "name": "detail=detector_send_frames_object",
                            "field": lang["Send Frames"],
                            "description": lang["fieldTextDetectorSendFramesObject"],
                            "default": "1",
                            "fieldType": "select",
                            "form-group-class": "h_casc_input h_casc_1",
                            "possible": [
                               {
                                  "name": lang.No,
                                  "value": "0"
                               },
                               {
                                  "name": lang.Yes,
                                  "value": "1"
                               }
                            ]
                         },
                         {
                             isAdvanced: true,
                             hidden: true,
                            "name": "detail=detector_obj_count_in_region",
                            "field": lang["Count Objects only inside Regions"],
                            "description": lang["fieldTextDetectorObjCountInRegion"],
                            "default": "0",
                            "example": "",
                            "form-group-class": "h_det_count_input h_det_count_1",
                            "fieldType": "select",
                            "possible": [
                               {
                                  "name": lang.No,
                                  "value": "0"
                               },
                               {
                                  "name": lang.Yes,
                                  "value": "1"
                               }
                            ]
                         },
                         {
                            "name": "detail=detector_obj_region",
                            "field": lang['Require Object to be in Region'],
                            "description": "",
                            "default": "1",
                            "example": "",
                            "fieldType": "select",
                            "form-group-class": "h_casc_input h_casc_1",
                            "possible": [
                               {
                                  "name": lang.No,
                                  "value": "0"
                               },
                               {
                                  "name": lang.Yes,
                                  "value": "1"
                               }
                            ]
                         },
                         {
                             isAdvanced: true,
                            "name": "detail=detector_use_motion",
                            "field": lang['Check for Motion First'],
                            "description": "",
                            "default": "1",
                            "example": "",
                            "selector": "h_det_mot_fir",
                            "fieldType": "select",
                            "form-group-class": "h_casc_input h_casc_1",
                            "possible": [
                               {
                                  "name": lang.No,
                                  "value": "0"
                               },
                               {
                                  "name": lang.Yes,
                                  "value": "1"
                               }
                            ]
                        },
                        {
                            hidden: true,
                           "name": "detail=detector_fps_object",
                           "field": lang['Frame Rate'],
                           "description": "",
                           "default": "2",
                           "example": "",
                           "form-group-class": "h_casc_input h_casc_1",
                           "possible": ""
                        },
                        {
                            isAdvanced: true,
                            hidden: true,
                           "name": "detail=detector_scale_x_object",
                           "field": lang['Image Width'],
                           "description": "",
                           "default": "1280",
                           "form-group-class": "h_casc_input h_casc_1",
                           "fieldType": "number",
                           "numberMin": "1",
                           "possible": ""
                        },
                        {
                            isAdvanced: true,
                            hidden: true,
                           "name": "detail=detector_scale_y_object",
                           "field": lang['Image Height'],
                           "description": "",
                           "default": "720",
                           "form-group-class": "h_casc_input h_casc_1",
                           "fieldType": "number",
                           "numberMin": "1",
                           "possible": ""
                        },
                      ]
                  },
                   {
                       hidden: true,
                      "name": lang['Event-Based Recording'],
                      "input-mapping": "detector_sip_buffer",
                      "color": "orange",
                      id: "monSectionDetectorTraditionalRecording",
                      isSection: true,
                      isFormGroupGroup: true,
                      "section-class": "h_det_input h_det_1",
                      "info": [
                          {
                             "name": "detail=detector_buffer_vcodec",
                             "field": lang['HLS Video Encoder'],
                             "description": "",
                             "default": "0",
                             "example": "",
                             "selector": "h_buff",
                             "fieldType": "select",
                             "possible": [
                                 {
                                    "name": "Auto",
                                    "value": "auto"
                                 },
                                 {
                                    "name": "libx264",
                                    "value": "libx264"
                                 },
                                 {
                                    "name": "H.264 VA-API (Intel HW Accel)",
                                    "value": "h264_vaapi"
                                 },
                                 {
                                    "name": "H.265 VA-API (Intel HW Accel)",
                                    "value": "hevc_vaapi"
                                 },
                                 {
                                    "name": lang.copy,
                                    "value": "copy"
                                 }
                              ]
                          },
                          {
                             "name": "detail=detector_buffer_acodec",
                             "field": lang['HLS Audio Encoder'],
                             "description": "",
                             "default": "no",
                             "fieldType": "select",
                             "possible": [
                                 {
                                    "name": lang['No Audio'],
                                    "value": "no"
                                 },
                                 {
                                    "name": "Auto",
                                    "value": "auto"
                                 },
                                 {
                                    "name": "aac",
                                    "value": "aac"
                                 },
                                 {
                                    "name": "ac3",
                                    "value": "ac3"
                                 },
                                 {
                                    "name": "libmp3lame",
                                    "value": "libmp3lame"
                                 },
                                 {
                                    "name": lang.copy,
                                    "value": "copy"
                                 }
                              ]
                          },
                          {
                             "name": "detail=detector_buffer_fps",
                             "field": lang['Frame Rate'],
                             "description": "",
                             "default": "30",
                             "example": "",
                             "form-group-class": "h_buff_input h_buff_libx264 h_buff_h264_vaapi h_buff_hevc_vaapi",
                             "possible": ""
                          },
                          {
                             "name": "detail=event_record_scale_x",
                             "field": lang.Width,
                             "description": lang["fieldTextEventRecordScaleX"],
                             "default": "",
                             "fieldType": "number",
                             "numberMin": "1",
                             "example": "640",
                             "form-group-class": "h_buff_input h_buff_libx264 h_buff_h264_vaapi h_buff_hevc_vaapi",
                             "possible": ""
                          },
                          {
                             "name": "detail=event_record_scale_y",
                             "field": lang.Height,
                             "description": lang["fieldTextEventRecordScaleY"],
                             "default": "",
                             "fieldType": "number",
                             "numberMin": "1",
                             "example": "480",
                             "form-group-class": "h_buff_input h_buff_libx264 h_buff_h264_vaapi h_buff_hevc_vaapi",
                             "possible": ""
                          },
                          {
                              name: 'detail=event_record_aduration',
                              field: lang['Analyzation Duration'],
                              default: '1000',
                          },
                          {
                              name: 'detail=event_record_probesize',
                              field: lang['Probe Size'],
                              default: '32',
                          },
                          {
                             "name": "detail=detector_record_overlap",
                             "field": lang['Recording Overlap'],
                             "description": lang.fieldTextRecordingOverlap,
                             "default": "0",
                             "form-group-class-pre-layer": "h_rec_mtd_input h_rec_mtd_hot h_rec_mtd_sip",
                             "fieldType": "select",
                             "possible": [
                                {
                                   "name": lang.No,
                                   "value": "0"
                                },
                                {
                                   "name": lang.Yes,
                                   "value": "1"
                                }
                             ]
                          },
                          {
                             "fieldType": "div",
                             // style: `width:100%;background:#eceaea;border-radius:5px;color:#333;font-family:monospace`,
                             divContent: `<pre><code id="monEditBufferPreview"></code></pre>`
                          },
                      ]
                   },
                   {
                       hidden: true,
                      "name": lang['Audio Detector'],
                      "color": "orange",
                      id: "monSectionAudioDetector",
                      isSection: true,
                      isFormGroupGroup: true,
                      "section-class": "h_det_input h_det_1",
                      "info": [
                          {
                             "name": "detail=detector_audio",
                             "field": lang.Enabled,
                             "description": lang["fieldTextDetectorAudio"],
                             "default": "0",
                             "example": "",
                             "fieldType": "select",
                             "possible": [
                                {
                                   "name": lang.No,
                                   "value": "0"
                                },
                                {
                                   "name": lang.Yes,
                                   "value": "1"
                                }
                             ]
                         },
                         {
                             "name": "detail=detector_audio_min_db",
                             "field": lang['Minimum dB'],
                             "description": "",
                             "default": "5",
                             "example": "",
                             "possible": ""
                          },
                          {
                             "name": "detail=detector_audio_max_db",
                             "field": lang['Maximum dB'],
                             "description": "",
                             "default": "",
                             "example": "",
                             "possible": ""
                          }
                      ]
                  },
                   {
                       hidden: true,
                       "name": lang['Webhook'],
                       "color": "orange",
                       id: "monSectionDetectorWebhook",
                       isSection: true,
                       isAdvanced: true,
                       isFormGroupGroup: true,
                       "section-class": "h_det_input h_det_1",
                       "info": [
                           {
                              "name": "detail=detector_webhook",
                              "field": "Webhook",
                              "description": lang["fieldTextDetectorWebhook"],
                              "default": "0",
                              "example": "",
                              "selector": "h_det_web",
                              "fieldType": "select",
                              "form-group-class-pre-layer": "h_det_input h_det_1",
                              "possible": [
                                 {
                                    "name": lang.No,
                                    "value": "0"
                                 },
                                 {
                                    "name": lang.Yes,
                                    "value": "1"
                                 }
                              ]
                           },
                           {
                              "name": "detail=detector_webhook_timeout",
                              "field": lang['Allow Next Webhook'],
                              "description": lang["fieldTextDetectorWebhookTimeout"],
                              "default": "10",
                              "example": "",
                              "form-group-class": "h_det_web_input h_det_web_1",
                              "form-group-class-pre-layer": "h_det_input h_det_1",
                              "possible": ""
                           },
                           {
                               hidden: true,
                              "name": "detail=detector_webhook_url",
                              "field": lang['Webhook URL'],
                              "description": "",
                              "default": "",
                              "example": "http://111.111.111.111?mid={{MONITOR_ID}}&group={{GROUP_KEY}}&confidence={{CONFIDENCE}}",
                              "form-group-class": "h_det_web_input h_det_web_1",
                              "form-group-class-pre-layer": "h_det_input h_det_1",
                              "possible": ""
                           },
                           {
                              "name": "detail=detector_webhook_method",
                              "field": lang['Call Method'],
                              "description": "",
                              "default": "GET",
                              "example": "",
                              "form-group-class": "h_det_web_input h_det_web_1",
                              "form-group-class-pre-layer": "h_det_input h_det_1",
                              "fieldType": "select",
                              "possible": [
                                  {
                                     "name": `GET (${lang.Default})`,
                                     "value": "GET"
                                  },
                                  {
                                     "name": "PUT",
                                     "value": "PUT"
                                  },
                                  {
                                     "name": "POST",
                                     "value": "POST"
                                  }
                               ]
                           },
                       ]
                   },
                   {
                       hidden: true,
                       "name": lang['Command'],
                       "color": "orange",
                       id: "monSectionDetectorCommand",
                       isSection: true,
                       isAdvanced: true,
                       isFormGroupGroup: true,
                       "section-class": "h_det_input h_det_1",
                       "info": [
                           {
                              "name": "detail=detector_command_enable",
                              "field": lang['Command on Trigger'],
                              "description": "",
                              "default": "0",
                              "example": "",
                              "selector": "h_det_com",
                              "fieldType": "select",
                              "form-group-class-pre-layer": "h_det_input h_det_1",
                              "possible": [
                                 {
                                    "name": lang.No,
                                    "value": "0"
                                 },
                                 {
                                    "name": lang.Yes,
                                    "value": "1"
                                 }
                              ]
                           },
                           {
                              "name": "detail=detector_command",
                              "field": lang['Command'],
                              "description": lang["fieldTextDetectorCommand"],
                              "default": "",
                              "form-group-class": "h_det_com_input h_det_com_1",
                              "example": "/home/script.sh {{MONITOR_ID}} {{GROUP_KEY}} {{CONFIDENCE}}",
                              "form-group-class-pre-layer": "h_det_input h_det_1",
                              "possible": ""
                           },
                           {
                              "name": "detail=detector_command_timeout",
                              "field": lang['Allow Next Command'],
                              "description": lang["fieldTextDetectorCommandTimeout"],
                              "default": "10",
                              "example": "",
                              "form-group-class": "h_det_com_input h_det_com_1",
                              "form-group-class-pre-layer": "h_det_input h_det_1",
                              "possible": ""
                           },
                       ]
                   },
                   {
                       hidden: true,
                      "name": lang['\"No Motion"\ Detector'],
                      "color": "orange",
                      id: "monSectionNoMotionDetector",
                      isSection: true,
                      isAdvanced: true,
                      isFormGroupGroup: true,
                      "section-class": "h_det_input h_det_1",
                      "info": [
                          {
                             "name": "detail=detector_notrigger",
                             "field": lang.Enabled,
                             "description": lang["fieldTextDetectorNotrigger"],
                             "default": "0",
                             "example": "",
                             "fieldType": "select",
                             "possible": [
                                {
                                   "name": lang.No,
                                   "value": "0"
                                },
                                {
                                   "name": lang.Yes,
                                   "value": "1"
                                }
                             ]
                         },
                         {
                            "name": "detail=detector_notrigger_timeout",
                            "field": lang.Timeout,
                            "description": lang["fieldTextDetectorNotriggerTimeout"],
                            "default": "10",
                            "example": "",
                            "possible": ""
                         },
                         {
                            "name": "detail=detector_notrigger_discord",
                            "field": lang['No Trigger'],
                            "description": lang["fieldTextDetectorNotriggerDiscord"],
                            "default": "0",
                            "example": "",
                            "fieldType": "select",
                            "possible": [
                               {
                                  "name": lang.No,
                                  "value": "0"
                               },
                               {
                                  "name": lang.Yes,
                                  "value": "1"
                               }
                            ]
                         },
                        {
                           "name": "detail=detector_notrigger_webhook",
                           "field": "Webhook",
                           "description": lang["fieldTextDetectorNotriggerWebhook"],
                           "default": "0",
                           "example": "",
                           "selector": "h_det_web_notrig",
                           "fieldType": "select",
                           "possible": [
                              {
                                 "name": lang.No,
                                 "value": "0"
                              },
                              {
                                 "name": lang.Yes,
                                 "value": "1"
                              }
                           ]
                        },
                        {
                            hidden: true,
                           "name": "detail=detector_notrigger_webhook_url",
                           "field": lang['Webhook URL'],
                           "description": "",
                           "default": "",
                           "example": "http://111.111.111.111?mid={{MONITOR_ID}}&group={{GROUP_KEY}}&confidence={{CONFIDENCE}}",
                           "form-group-class": "h_det_web_notrig_input h_det_web_notrig_1",
                           "possible": ""
                        },
                        {
                           "name": "detail=detector_notrigger_webhook_method",
                           "field": lang['Call Method'],
                           "description": "",
                           "default": "GET",
                           "example": "",
                           "form-group-class": "h_det_web_notrig_input h_det_web_notrig_1",
                           "fieldType": "select",
                           "possible": [
                               {
                                  "name": `GET (${lang.Default})`,
                                  "value": "GET"
                               },
                               {
                                  "name": "PUT",
                                  "value": "PUT"
                               },
                               {
                                  "name": "POST",
                                  "value": "POST"
                               }
                            ]
                        },
                        {
                           "name": "detail=detector_notrigger_command_enable",
                           "field": lang['Command on Trigger'],
                           "description": "",
                           "default": "0",
                           "example": "",
                           "selector": "h_det_com_notrig",
                           "fieldType": "select",
                           "possible": [
                              {
                                 "name": lang.No,
                                 "value": "0"
                              },
                              {
                                 "name": lang.Yes,
                                 "value": "1"
                              }
                           ]
                        },
                        {
                           "name": "detail=detector_notrigger_command",
                           "field": lang['Command'],
                           "description": lang["fieldTextDetectorNotriggerCommand"],
                           "default": "",
                           "form-group-class": "h_det_com_notrig_input h_det_com_notrig_1",
                           "example": "/home/script.sh {{MONITOR_ID}} {{GROUP_KEY}} {{CONFIDENCE}}",
                           "possible": ""
                        },
                        {
                           "name": "detail=detector_notrigger_command_timeout",
                           "field": lang['Allow Next Command'],
                           "description": lang["fieldTextDetectorNotriggerCommandTimeout"],
                           "default": "10",
                           "example": "",
                           "form-group-class": "h_det_com_notrig_input h_det_com_notrig_1",
                           "possible": ""
                        },
                      ]
                   },
                ]
             },
             "Control": {
                "name": lang.Control,
                "color": "blue",
                id: "monSectionControl",
                isSection: true,
                "info": [
                    {
                       "name": "detail=control",
                       "field": lang.Controllable,
                       "description": "",
                       "default": "0",
                       "example": "",
                       "selector": "h_c",
                       "fieldType": "select",
                       "possible": [
                          {
                             "name": lang.No,
                             "value": "0"
                          },
                          {
                             "name": lang.Yes,
                             "value": "1"
                          }
                       ]
                    },
                    {
                        isAdvanced: true,
                       "name": "detail=control_base_url",
                       "field": lang['Custom Base URL'],
                       "description": "",
                       "default": "",
                       "example": "http://111.111.111.111:8080",
                       "form-group-class": "h_c_input h_c_1",
                       "possible": ""
                    },
                    {
                       "name": "detail=control_url_method",
                       "field": lang['Call Method'],
                       "description": "",
                       "default": "0",
                       "example": "",
                       "selector": "h_control_call",
                       "fieldType": "select",
                       "possible": [
                           {
                              "name": `GET (${lang.Default})`,
                              "value": "GET"
                           },
                           {
                              "name": "PUT",
                              "value": "PUT"
                           },
                           {
                              "name": "POST",
                              "value": "POST"
                           },
                           {
                              "name": "ONVIF",
                              "value": "ONVIF"
                           }
                        ]
                    },
                    {
                       "name": "detail=onvif_non_standard",
                       "field": lang['ONVIF Home Control'],
                       "description": lang.fieldTextOnvifHomeControl,
                       "default": "0",
                       "form-group-class": "h_control_call_input h_control_call_ONVIF",
                       "fieldType": "select",
                       "possible": [
                           {
                              "name": lang.usingPreset1,
                              "value": "0"
                           },
                           {
                              "name": lang.usingPreset1HikvisionClone,
                              "value": "1"
                           },
                           {
                              "name": lang.usingHomePreset,
                              "value": "2"
                           }
                       ]
                    },
                    {
                        isAdvanced: true,
                       "name": "detail=control_digest_auth",
                       "field": lang['Digest Authentication'],
                       "default": "0",
                       "fieldType": "select",
                       "form-group-class": "h_control_call_input h_control_call_GET h_control_call_PUT h_control_call_POST",
                       "possible": [
                          {
                             "name": lang.No,
                             "value": "0"
                          },
                          {
                             "name": lang.Yes,
                             "value": "1"
                          }
                       ]
                    },
                    {
                        isAdvanced: true,
                       "name": "detail=control_axis_lock",
                       "field": lang['Pan/Tilt Only'],
                       "default": "",
                       "fieldType": "select",
                       "possible": [
                          {
                             "name": lang['Pan and Tilt'],
                             "value": ""
                          },
                          {
                             "name": lang['Pan Only'],
                             "value": "1"
                          },
                          {
                             "name": lang['Tilt Only'],
                             "value": "2"
                          }
                       ]
                    },
                    {
                       "name": "detail=control_stop",
                       "field": lang['Stop Command'],
                       "description": "",
                       "default": "0",
                       "example": "",
                       "selector": "h_cs",
                       "fieldType": "select",
                       "form-group-class": "h_control_call_input h_control_call_GET h_control_call_ONVIF h_control_call_PUT h_control_call_POST",
                       "possible": [
                          {
                             "name": lang.No,
                             "value": "0"
                          },
                          {
                             "name": lang.Timed,
                             "value": "1"
                          },
                          {
                             "name": lang['On Release'],
                             "value": "2"
                          }
                       ]
                    },
                    {
                       "name": "detail=control_url_stop_timeout",
                       "field": lang['URL Stop Timeout'],
                       "description": "",
                       "default": "1000",
                       "example": "",
                       "form-group-class": "h_cs_input h_cs_1",
                       "possible": ""
                    },
                    {
                       "name": "detail=control_turn_speed",
                       "field": lang['Turn Speed'],
                       "description": "",
                       "default": "0.1",
                       "example": "",
                       "form-group-class": "h_control_call_input h_control_call_ONVIF",
                       "possible": ""
                    },
                    {
                       "name": "detail=detector_ptz_follow",
                       "field": lang['PTZ Tracking'],
                       "description": lang["fieldTextDetectorPtzFollow"],
                       "default": "0",
                       "example": "",
                       "selector": "h_det_tracking",
                       "fieldType": "select",
                       "possible": [
                           {
                              "name": lang.No,
                              "value": "0"
                           },
                           {
                              "name": lang.Yes,
                              "value": "1"
                           }
                       ]
                    },
                    {
                       "name": "detail=detector_ptz_follow_target",
                       "field": lang['PTZ Tracking Target'],
                       "description": "",
                       "default": "person",
                       "example": "",
                       "form-group-class": "h_det_tracking_input h_det_tracking_1",
                       "possible": ""
                    },
                    // {
                    //    "name": "detail=detector_obj_count",
                    //    "field": lang["Count Objects"],
                    //    "description": lang["fieldTextDetectorObjCount"],
                    //    "default": "0",
                    //    "example": "",
                    //    "selector": "h_det_count",
                    //    "fieldType": "select",
                    //    "possible": [
                    //       {
                    //          "name": lang.No,
                    //          "value": "0"
                    //       },
                    //       {
                    //          "name": lang.Yes,
                    //          "value": "1"
                    //       }
                    //    ]
                    // },
                    {
                       "name": "detail=control_url_center",
                       "field": lang['Center'],
                       "description": "",
                       "default": "/",
                       "example": "",
                       "form-group-class": "h_control_call_input h_control_call_GET h_control_call_PUT h_control_call_POST",
                       "possible": ""
                    },
                    {
                       "name": "detail=control_url_left",
                       "field": lang['Left'],
                       "description": "",
                       "default": "/",
                       "example": "",
                       "form-group-class": "h_control_call_input h_control_call_GET h_control_call_PUT h_control_call_POST",
                       "possible": ""
                    },
                    {
                       "name": "detail=control_url_left_stop",
                       "field": lang['Left Stop'],
                       "description": "",
                       "default": "/",
                       "example": "",
                       "form-group-class-pre-layer": "h_cs_input h_cs_1 h_cs_2",
                       "form-group-class": "h_control_call_input h_control_call_GET h_control_call_PUT h_control_call_POST",
                       "possible": ""
                    },
                    {
                       "name": "detail=control_url_right",
                       "field": lang['Right'],
                       "description": "",
                       "default": "/",
                       "example": "",
                       "form-group-class": "h_control_call_input h_control_call_GET h_control_call_PUT h_control_call_POST",
                       "possible": ""
                    },
                    {
                       "name": "detail=control_url_right_stop",
                       "field": lang['Right Stop'],
                       "description": "",
                       "default": "/",
                       "example": "",
                       "form-group-class-pre-layer": "h_cs_input h_cs_1 h_cs_2",
                       "form-group-class": "h_control_call_input h_control_call_GET h_control_call_PUT h_control_call_POST",
                       "possible": ""
                    },
                    {
                       "name": "detail=control_url_up",
                       "field": lang['Up'],
                       "description": "",
                       "default": "/",
                       "example": "",
                       "form-group-class": "h_control_call_input h_control_call_GET h_control_call_PUT h_control_call_POST",
                       "possible": ""
                    },
                    {
                       "name": "detail=control_url_up_stop",
                       "field": lang['Up Stop'],
                       "description": "",
                       "default": "/",
                       "example": "",
                       "form-group-class-pre-layer": "h_cs_input h_cs_1 h_cs_2",
                       "form-group-class": "h_control_call_input h_control_call_GET h_control_call_PUT h_control_call_POST",
                       "possible": ""
                    },
                    {
                       "name": "detail=control_url_down",
                       "field": lang['Down'],
                       "description": "",
                       "default": "/",
                       "example": "",
                       "form-group-class": "h_control_call_input h_control_call_GET h_control_call_PUT h_control_call_POST",
                       "possible": ""
                    },
                    {
                       "name": "detail=control_url_down_stop",
                       "field": lang['Down Stop'],
                       "description": "",
                       "default": "/",
                       "example": "",
                       "form-group-class-pre-layer": "h_cs_input h_cs_1 h_cs_2",
                       "form-group-class": "h_control_call_input h_control_call_GET h_control_call_PUT h_control_call_POST",
                       "possible": ""
                    },
                    {
                       "name": "detail=control_url_enable_nv",
                       "field": lang['Enable Night Vision'],
                       "description": "",
                       "default": "/",
                       "example": "",
                       "form-group-class": "h_control_call_input h_control_call_GET h_control_call_PUT h_control_call_POST",
                       "possible": ""
                    },
                    {
                       "name": "detail=control_url_disable_nv",
                       "field": lang['Disable Night Vision'],
                       "description": "",
                       "default": "/",
                       "example": "",
                       "form-group-class": "h_control_call_input h_control_call_GET h_control_call_PUT h_control_call_POST",
                       "possible": ""
                    },
                    {
                       "name": "detail=control_url_zoom_out",
                       "field": lang['Zoom Out'],
                       "description": "",
                       "default": "/",
                       "example": "",
                       "form-group-class": "h_control_call_input h_control_call_GET h_control_call_PUT h_control_call_POST",
                       "possible": ""
                    },
                    {
                       "name": "detail=control_url_zoom_out_stop",
                       "field": lang['Zoom Out Stop'],
                       "description": "",
                       "default": "/",
                       "example": "",
                       "form-group-class-pre-layer": "h_cs_input h_cs_1 h_cs_2",
                       "form-group-class": "h_control_call_input h_control_call_GET h_control_call_PUT h_control_call_POST",
                       "possible": ""
                    },
                    {
                       "name": "detail=control_url_zoom_in",
                       "field": lang['Zoom In'],
                       "description": "",
                       "default": "/",
                       "example": "",
                       "form-group-class": "h_control_call_input h_control_call_GET h_control_call_PUT h_control_call_POST",
                       "possible": ""
                    },
                    {
                       "name": "detail=control_url_zoom_in_stop",
                       "field": lang['Zoom In Stop'],
                       "description": "",
                       "default": "/",
                       "example": "",
                       "form-group-class-pre-layer": "h_cs_input h_cs_1 h_cs_2",
                       "form-group-class": "h_control_call_input h_control_call_GET h_control_call_PUT h_control_call_POST",
                       "possible": ""
                    },
                    {
                        isAdvanced: true,
                       "name": "detail=control_invert_y",
                       "field": lang["Invert Y-Axis"],
                       "description": lang["fieldTextControlInvertY"],
                       "default": "0",
                       "example": "",
                       "fieldType": "select",
                       "possible": [
                          {
                             "name": lang.No,
                             "value": "0"
                          },
                          {
                             "name": lang.Yes,
                             "value": "1"
                          }
                       ]
                    },
                ]
             },
             "Copy Settings": {
                id: "monSectionCopying",
               "name": lang['Copy Settings'],
               "color": "orange",
                isSection: true,
                "box-wrapper-class": "row",
               "info": [
                   {
                      "id": "copy_settings",
                      "field": lang['Copy to Selected Monitor(s)'],
                      "description": "",
                      "default": "0",
                      "example": "",
                      "selector": "h_copy_settings",
                      "fieldType": "select",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                      "field": lang['Copy Mode'],
                      "description": "",
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "attribute": `copy="field=mode"`,
                      "form-group-class": "h_copy_settings_input h_copy_settings_1",
                      "form-group-class-pre-layer": "col-md-6",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                      "field": lang['Compress Completed Videos'],
                      "default": "0",
                      "fieldType": "select",
                      "attribute": `copy="field=detail=auto_compress_videos"`,
                      "form-group-class": "h_copy_settings_input h_copy_settings_1",
                      "form-group-class-pre-layer": "col-md-6",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                      "field": lang['Stream Channels'],
                      "description": "",
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "attribute": `copy="field=detail=stream_channels"`,
                      "form-group-class": "h_copy_settings_input h_copy_settings_1",
                      "form-group-class-pre-layer": "col-md-6",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                      "field": lang['Connection'],
                      "description": "",
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "attribute": `copy="#monSectionConnection"`,
                      "form-group-class": "h_copy_settings_input h_copy_settings_1",
                      "form-group-class-pre-layer": "col-md-6",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                      "field": lang['Input'],
                      "description": "",
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "attribute": `copy="#monSectionInput"`,
                      "form-group-class": "h_copy_settings_input h_copy_settings_1",
                      "form-group-class-pre-layer": "col-md-6",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                      "field": lang['Timelapse'],
                      "description": "",
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "attribute": `copy="#monSectionTimelapse"`,
                      "form-group-class": "h_copy_settings_input h_copy_settings_1",
                      "form-group-class-pre-layer": "col-md-6",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                      "field": lang['Stream'],
                      "description": "",
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "attribute": `copy="#monSectionStream,#monSectionStreamTimestamp,#monSectionStreamWatermark"`,
                      "form-group-class": "h_copy_settings_input h_copy_settings_1",
                      "form-group-class-pre-layer": "col-md-6",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                      "field": lang['JPEG API'],
                      "description": "",
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "attribute": `copy="#monSectionJPEGAPI"`,
                      "form-group-class": "h_copy_settings_input h_copy_settings_1",
                      "form-group-class-pre-layer": "col-md-6",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                      "field": lang['Recording'],
                      "description": "",
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "attribute": `copy="#monSectionRecording,#monSectionRecordingTimestamp,#monSectionRecordingWatermark"`,
                      "form-group-class": "h_copy_settings_input h_copy_settings_1",
                      "form-group-class-pre-layer": "col-md-6",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                      "field": lang['Detector Settings'],
                      "description": "",
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "attribute": `copy="#monSectionDetector,#monSectionDetectorBuffer,#monSectionLisencePlateDetector,#monSectionNoMotionDetector"`,
                      "form-group-class": "h_copy_settings_input h_copy_settings_1",
                      "form-group-class-pre-layer": "col-md-6",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                      "field": lang['Regions'],
                      "fieldType": "select",
                      "attribute": `copy="field=detail=cords"`,
                      "form-group-class": "h_copy_settings_input h_copy_settings_1",
                      "form-group-class-pre-layer": "col-md-6",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                      "field": lang['Control'],
                      "description": "",
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "attribute": `copy="#monSectionControl"`,
                      "form-group-class": "h_copy_settings_input h_copy_settings_1",
                      "form-group-class-pre-layer": "col-md-6",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                      "field": lang['Custom'],
                      "description": "",
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "attribute": `copy="#monSectionCustom"`,
                      "form-group-class": "h_copy_settings_input h_copy_settings_1",
                      "form-group-class-pre-layer": "col-md-6",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                      "field": lang['Grouping'],
                      "description": "",
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "attribute": `copy="#monSectionGrouping"`,
                      "form-group-class": "h_copy_settings_input h_copy_settings_1",
                      "form-group-class-pre-layer": "col-md-6",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                      "field": lang['Logging'],
                      "description": "",
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "attribute": `copy="#monSectionLogging"`,
                      "form-group-class": "h_copy_settings_input h_copy_settings_1",
                      "form-group-class-pre-layer": "col-md-6",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                      "field": lang['Monitors to Copy to'],
                      "description": "",
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "attribute": "multiple",
                       id: 'copy_settings_monitors',
                      "form-group-class": "h_copy_settings_input h_copy_settings_1",
                      "possible": [
                         {
                            "name": lang['New Monitor'],
                            "value": "$New"
                         },
                         {
                            "name": lang['Monitors'],
                            "optgroup": []
                         }
                      ]
                   },
               ],
             },
             "Notifications": {
                "name": lang['Notifications'],
                "color": "blue",
                "isSection": true,
                "id": "monSectionNotifications",
                "info": [
                    {
                       "name": lang.Methods,
                       "color": "blue",
                        isFormGroupGroup: true,
                       "info": [

                       ],
                    },
                   {
                      "name": "detail=notify_onUnexpectedExit",
                      "field": lang['On Unexpected Exit'],
                      "default": "0",
                      "example": "1",
                      "fieldType": "select",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                      "name": "detail=notify_useRawSnapshot",
                      "field": lang['Use Raw Snapshot'],
                      "default": "0",
                      "example": "1",
                      "fieldType": "select",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   }
               ]
             },
             "Custom": {
                "name": lang.Custom,
                "color": "navy",
                "isSection": true,
                isAdvanced: true,
                "id": "monSectionCustom",
                "info": [
                   {
                      "name": "detail=cust_input",
                      "field": lang['Input Flags'],
                      "description": lang["fieldTextCustInput"],
                      "default": "",
                      "example": "",
                      "possible": ""
                   },
                   // {
                   //     hidden: true,
                   //    "name": "detail=cust_rtmp",
                   //    "field": lang['RTMP Stream Flags'],
                   //    "description": "Custom Flags that bind to the RTMP stream.",
                   //    "default": "",
                   //    "example": "",
                   //    "form-group-class": "h_rtmp_input h_rtmp_1",
                   //    "possible": ""
                   // },
                   {
                      "name": "detail=cust_stream",
                      "field": lang["Stream Flags"],
                      "description": lang["fieldTextCustStream"],
                      "default": "",
                      "example": "",
                      "form-group-class": "",
                      "possible": ""
                   },
                   {
                       hidden: true,
                      "name": "detail=cust_snap",
                      "field": lang["JPEG API Flags"],
                      "description": lang["fieldTextCustSnap"],
                      "form-group-class": "h_sn_input h_sn_1",
                   },
                   {
                       hidden: true,
                      "name": "detail=cust_snap_raw",
                      "field": lang["Snapshot Flags"],
                      "description": lang["fieldTextCustSnap"],
                   },
                   {
                       hidden: true,
                      "name": "detail=cust_record",
                      "field": lang["Recording Flags"],
                      "description": lang["fieldTextCustRecord"],
                      "form-group-class": "h_m_input h_m_record",
                   },
                   {
                       hidden: true,
                      "name": "detail=cust_detect",
                      "field": lang["Detector Flags"],
                      "description": lang["fieldTextCustDetect"],
                      "default": "",
                      "example": "",
                      "form-group-class": "shinobi-detector",
                      "possible": ""
                   },
                   {
                       hidden: true,
                      "name": "detail=cust_detect_object",
                      "field": lang["Object Detector Flags"],
                      "description": lang["fieldTextCustDetectObject"],
                      "form-group-class": "shinobi-detector",
                   },
                   {
                       hidden: true,
                      "name": "detail=cust_sip_record",
                      "field": lang['Event-Based Recording Flags'],
                      "description": lang["fieldTextCustSipRecord"],
                      "default": "",
                      "example": "",
                      "form-group-class": "h_rec_mtd_input h_rec_mtd_sip",
                      "possible": ""
                   },
                   {
                      "name": "detail=custom_output",
                      "field": "Output Method",
                      "description": lang["fieldTextCustomOutput"],
                      "default": "",
                      "example": "",
                      "form-group-class": "",
                      "possible": ""
                   }
                ]
             },
             "Logging": {
                "name": lang.Logging,
                "color": "green",
                id: "monSectionLogging",
                isSection: true,
                "info": [
                   {
                      "name": "detail=loglevel",
                      "field": lang['Log Level'],
                      "description": lang["fieldTextLoglevel"],
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "possible": [
                           {
                              "name": lang.Silent,
                              "value": "quiet",
                              "info": lang["fieldTextLoglevelSilent"]
                           },
                           {
                              "name": lang.Fatal,
                              "value": "fatal",
                              "info": lang["fieldTextLoglevelFatal"]
                           },
                           {
                              "name": lang['on Error'],
                              "value": "error",
                              "info": lang["fieldTextLoglevelOnError"]
                           },
                           {
                              "name": lang['All Warnings'],
                              "value": "warning",
                              "info": lang["fieldTextLoglevelAllWarnings"]
                           }
                        ]
                   },
                   {
                      "name": "detail=sqllog",
                      "field": lang["Save Log in SQL"],
                      "description": lang["fieldTextSqllog"],
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0",
                            "info": lang["fieldTextSqllogNo"]
                         },
                         {
                            "name": lang.Yes,
                            "value": "1",
                            "info": lang["fieldTextSqllogYes"]
                         }
                      ]
                  },
                  {
                     "name": "Log Stream",
                     "color": "green",
                      isFormGroupGroup: true,
                     "info": [
                         {
                             "fieldType": 'div',
                             "class": "data-menu logs"
                         },
                     ],
                  },
                ]
            },
             "Hidden": {
                 hidden: true,
                "name": "",
                "color": "",
                isSection: true,
                "info": [
                    {
                       "name": "detail=detector_cascades",
                    },
                    {
                       "name": "detail=stream_channels",
                    },
                    {
                       "name": "detail=input_maps",
                    },
                    {
                       "name": "detail=input_map_choices",
                       "preFill": "{}",
                    },
                    {
                       "name": "details",
                       "preFill": "{}",
                    }
                ]
             }
          }
       },
       "Account Settings": {
          "section": "Account Settings",
          "blocks": {
             "ShinobiHub": {
                 "evaluation": "!details.sub && details.use_shinobihub !== '0'",
                 "name": lang["ShinobiHub"],
                 "color": "purple",
                 "info": [
                     {
                        "name": "detail=shinobihub",
                        "selector":"autosave_shinobihub",
                        "field": lang.Autosave,
                        "description": "",
                        "default": "0",
                        "example": "",
                        "fieldType": "select",
                        "possible": [
                            {
                               "name": lang.No,
                               "value": "0"
                            },
                            {
                               "name": lang.Yes,
                               "value": "1"
                            }
                        ]
                     },
                     {
                        "hidden": true,
                        "field": lang['API Key'],
                        "name": "detail=shinobihub_key",
                        "placeholder": "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
                        "form-group-class": "autosave_shinobihub_input autosave_shinobihub_1",
                        "description": "",
                        "default": "",
                        "example": "",
                        "possible": ""
                     },
                 ]
             },
             "AlternateLogins": {
                 "name": lang["Alternate Logins"],
                 "color": "orange",
                 "info": [
                     {
                         "form-group-class-pre-layer": "form-group",
                         "fieldType": 'div',
                         "id": "alternate-logins"
                     },
                     {
                        "fieldType": "btn-group",
                        "forForm": true,
                        "btns": [],
                     },
                 ]
             },
             "2-Factor Authentication": {
                 "name": lang['2-Factor Authentication'],
                 "color": "grey",
                 "info": [
                    {
                       "name": "detail=factorAuth",
                       "field": lang.Enabled,
                       "description": lang["fieldTextFactorAuth"],
                       "default": "0",
                       "example": "",
                       "fieldType": "select",
                       "possible": [
                          {
                             "name": lang.No,
                             "value": "0"
                          },
                          {
                             "name": lang.Yes,
                             "value": "1"
                          }
                       ]
                   },
                ]
             },
             "Profile": {
                "name": lang.Profile,
                "color": "grey",
                "info": [
                   {
                      "name": "mail",
                      "field": lang.Email,
                      "description": lang["fieldTextMail"],
                      "default": "",
                      "example": "ccio@m03.ca",
                      "possible": ""
                   },
                   {
                      "name": "pass",
                      "field": lang.Password,
                      "fieldType": "password",
                      "description": lang["fieldTextPass"],
                      "fieldType": "password",
                      "default": "",
                      "example": "",
                      "possible": ""
                   },
                   {
                      "name": "password_again",
                      "field": lang["Password Again"],
                      "fieldType": "password",
                      "description": lang["fieldTextPasswordAgain"],
                      "default": "",
                      "example": "",
                      "possible": ""
                   },
                   {
                      "name": "detail=size",
                      "field": lang["Max Storage Amount"],
                      "description": lang["fieldTextSize"],
                      "default": "10000",
                      "example": "600000",
                      "possible": "Up to 95% of your maximum storage space if only one master account exists.",
                      "notForSubAccount": true,
                      "evaluation": "details.edit_size !== '0'"
                   },
                   {
                      "name": "detail=size_video_percent",
                      "field": lang["Video Share"],
                      "description": lang["fieldTextSizeVideoPercent"],
                      "default": "90",
                      "notForSubAccount": true,
                   },
                   {
                      "name": "detail=size_timelapse_percent",
                      "field": lang["Timelapse Frames Share"],
                      "description": lang["fieldTextSizeTimelapsePercent"],
                      "default": "5",
                      "notForSubAccount": true,
                   },
                   {
                      "name": "detail=size_filebin_percent",
                      "field": lang["FileBin Share"],
                      "description": lang["fieldTextSizeFilebinPercent"],
                      "default": "5",
                      "notForSubAccount": true,
                   },
                   {
                       hidden:true,
                      "name": "detail=addStorage",
                      "default": "{}",
                      "notForSubAccount": true,
                   },
                   {
                       "fieldType": 'div',
                       "id": "add_storage_max_amounts"
                   },
                   {
                      "name": "detail=days",
                      "field": lang["Number of Days to keep"] + ' ' + lang['Videos'],
                      "description": lang["fieldTextDays"],
                      "default": "5",
                      "example": "30",
                      "possible": "",
                      "notForSubAccount": true,
                      "evaluation": "details.edit_days !== '0'"
                   },
                   {
                      "name": "detail=event_days",
                      "field": lang["Number of Days to keep"] + ' ' + lang['Events'],
                      "description": lang["fieldTextEventDays"],
                      "default": "10",
                      "example": "30",
                      "possible": "",
                      "notForSubAccount": true,
                      "evaluation": "details.edit_event_days !== '0'"
                   },
                   {
                      "name": "detail=timelapseFrames_days",
                      "field": lang["Number of Days to keep"] + ' ' + lang['Timelapse'],
                      "description": lang["fieldTextEventDays"],
                      "default": "60",
                      "notForSubAccount": true,
                      "evaluation": "details.edit_timelapseFrames_days !== '0'"
                   },
                   {
                      "name": "detail=log_days",
                      "field": lang["Number of Days to keep"] + ' ' + lang['Logs'],
                      "description": lang["fieldTextLogDays"],
                      "default": "10",
                      "example": "30",
                      "possible": "",
                      "notForSubAccount": true,
                      "evaluation": "details.edit_log_days !== '0'"
                  },
                  {
                     "name": "detail=lang",
                     "field": lang["Dashboard Language"],
                     "description": lang["fieldTextLang"],
                     "default": "en_CA",
                     "example": "",
                     "fieldType": "select",
                     "possible": s.listOfPossibleLanguages
                 },
                 {
                     "name": "detail=audio_note",
                     "field": lang["Notification Sound"],
                     "description": lang["fieldTextAudioNote"],
                     "fieldType": "select",
                     "possible": s.listOfAudioFiles
                 },
                 {
                     "name": "detail=audio_alert",
                     "field": lang["Alert Sound"],
                     "description": lang["fieldTextAudioAlert"],
                     "fieldType": "select",
                     "possible": s.listOfAudioFiles
                 },
                 {
                     "name": "detail=audio_delay",
                     "field": lang["Alert Sound Delay"],
                     "description": lang["fieldTextAudioDelay"],
                     "default": "1",
                 },
                 {
                     "name": "detail=event_mon_pop",
                     "field": lang["Popout Monitor on Event"],
                     "description": lang["fieldTextEventMonPop"],
                     "default": "en_CA",
                     "fieldType": "select",
                     "possible": [
                        {
                           "name": lang.No,
                           "value": "0"
                        },
                        {
                           "name": lang.Yes,
                           "value": "1"
                        }
                     ]
                  }
                ]
             },
             "Uploaders": {
                "name": lang["Uploaders"],
                "color": "forestgreen",
                "info": []
             },
             "Live Grid": {
                "name": lang['Live Grid'],
                "color": "navy",
                "info": [
                    {
                        "field": lang['Force Monitors Per Row'],
                        attribute:'localStorage="montage_use"',
                        selector:'st_force_mon_rows',
                        "description": "",
                        "default": "0",
                        "example": "",
                        "fieldType": "select",
                        "possible": [
                            {
                               "name": lang.No,
                               "value": "0"
                            },
                            {
                               "name": lang.Yes,
                               "value": "1"
                            }
                        ]
                    },
                    {
                        "field": lang['Monitors per row'],
                        "form-group-class":"st_force_mon_rows_input st_force_mon_rows_1",
                        attribute:'localStorage="montage"',
                        "placeholder": "3",
                    },
                    {
                          "field": lang.hlsOptions,
                          "name": "localStorage=hlsOptions",
                          fieldType:"textarea",
                          "placeholder": "{}",
                    },
                ]
            },
             "Preferences": {
                "name": lang.Preferences,
                "color": "navy",
                "info": [
                   {
                        "field": lang['Clock Format'],
                        "name": "detail=clock_date_format",
                        "placeholder": "$DAYNAME $DAY $MONTHNAME $YEAR",
                   },
                   {
                        "field": lang.CSS,
                        "name": "detail=css",
                        fieldType:"textarea",
                        "placeholder": "#main_header{background:#b59f00}",
                        "description": "",
                        "default": "",
                        "example": "",
                        "possible": ""
                  },
                  {
                      "field": lang['Browser Console Log'],
                      attribute:'localStorage="browserLog"',
                      "description": "",
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "possible": [
                          {
                             "name": lang.No,
                             "value": "0"
                          },
                          {
                             "name": lang.Yes,
                             "value": "1"
                          }
                      ]
                  },
                  {
                      "field": lang['Get Logs to Client'],
                      attribute:'localStorage="get_server_log"',
                      "description": "",
                      "default": "1",
                      "example": "",
                      "fieldType": "select",
                      "possible": [
                          {
                             "name": lang.No,
                             "value": "0"
                          },
                          {
                             "name": lang.Yes,
                             "value": "1"
                          }
                      ]
                  },
                  {
                      "field": lang.Themes,
                      "name": "detail=theme",
                      "description": "",
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "possible": s.listOfThemes
                  },
                ]
            },
          }
      },
       "ONVIF Device Manager": {
          "section": "ONVIF Device Manager",
          "blocks": {
             "Notice": {
                 "id": "Notice",
                 "name": lang["Notice"],
                 "color": "warning",
                 "blockquoteClass": "global_tip",
                 "blockquote": lang.onvifdeviceManagerGlobalTip,
                 "info": [
                     {
                         "field": lang["Monitor"],
                         "fieldType": "select",
                         "class": "monitors_list",
                         "possible": []
                     },
                     {
                        "fieldType": "btn",
                        "class": `btn-warning onvif-device-reboot`,
                        "btnContent": `<i class="fa fa-refresh"></i> &nbsp; ${lang['Reboot Camera']}`,
                     },
                     {
                         "fieldType": "div",
                         "class": "p-2",
                         "divContent": `<pre class="bg-dark text-white" style="max-height: 400px;overflow: auto;" id="onvifDeviceManagerInfo"></pre>`,
                     }
                 ]
             },
             "Network": {
                 "id": "Network",
                 "name": lang["Network"],
                 "color": "purple",
                 "info": [
                     {
                        "name": "setNetworkInterface:DHCP",
                        "selector":"onvif_dhcp",
                        "field": lang.DHCP,
                        "description": "",
                        "default": "true",
                        "example": "",
                        "fieldType": "select",
                        "possible": [
                            {
                               "name": lang.Yes,
                               "value": "true"
                            },
                            {
                               "name": lang.No,
                               "value": "false"
                            }
                        ]
                     },
                     {
                        "field": lang['IP Address'],
                        "name": "setNetworkInterface:ipv4",
                        "placeholder": "xxx.xxx.xxx.xxx",
                        "form-group-class": "onvif_dhcp_input onvif_dhcp_1",
                        "description": "",
                        "default": "",
                        "example": "",
                        "possible": ""
                     },
                     {
                        "field": lang['Gateway'],
                        "name": "setGateway:ipv4",
                        "placeholder": "xxx.xxx.xxx.xxx",
                        "description": "",
                        "default": "",
                        "example": "",
                        "possible": ""
                     },
                     {
                        "field": lang['Hostname'],
                        "name": "setHostname:name",
                        "placeholder": "",
                        "description": "",
                        "default": "",
                        "example": "",
                        "possible": ""
                     },
                     {
                        "field": lang['DNS'],
                        "name": "setDNS:dns",
                        "placeholder": "1.1.1.1,8.8.8.8",
                        "description": "",
                        "default": "",
                        "example": "",
                        "possible": ""
                     },
                     {
                        "field": lang['HTTP'] + ' ' + lang['Port'],
                        "name": "setProtocols:HTTP",
                        "placeholder": "80",
                        "description": "",
                        "default": "",
                        "example": "",
                        "possible": ""
                     },
                     {
                        "field": lang['RTSP'] + ' ' + lang['Port'],
                        "name": "setProtocols:RTSP",
                        "placeholder": "554",
                        "description": "",
                        "default": "",
                        "example": "",
                        "possible": ""
                     },
                 ]
             },
             "Date and Time": {
                 "id": "DateandTime",
                 "name": lang["Date and Time"],
                 "color": "purple",
                 "info": [
                     {
                        "field": lang['UTCDateTime'],
                        "name": "utcDateTime",
                        "placeholder": "",
                        "description": "",
                        "default": "",
                        "example": "",
                        "possible": ""
                     },
                     {
                        "field": lang['NTP Servers'],
                        "name": "setNTP:ipv4",
                        "placeholder": "1.1.1.1,8.8.8.8",
                        "description": "",
                        "default": "",
                        "example": "",
                        "possible": ""
                     },
                     {
                        "field": lang['DateTimeType'],
                        "name": "dateTimeType",
                        "fieldType": "select",
                        "placeholder": "",
                        "description": "",
                        "default": "",
                        "example": "",
                        "possible": [
                            {
                               "name": lang.NTP,
                               "value": "NTP"
                            },
                            {
                               "name": lang.Manual,
                               "value": "Manual"
                            }
                        ]
                     },
                     {
                         "field": lang.DaylightSavings,
                        "name": "daylightSavings",
                        "selector":"onvif_dhcp",
                        "description": "",
                        "default": "true",
                        "example": "",
                        "fieldType": "select",
                        "possible": [
                            {
                               "name": lang.Yes,
                               "value": "true"
                            },
                            {
                               "name": lang.No,
                               "value": "false"
                            }
                        ]
                     },
                     {
                         hidden: true,
                         "field": lang.TimeZone,
                        "name": "timezone",
                        "description": "",
                        "default": "",
                        "example": "",
                        "possible": ""
                     },
                 ]
             },
             "Imaging": {
                 "id": "Imaging",
                 "name": lang["Imaging"],
                 "color": "purple",
                 "info": [
                     {
                        "field": lang['IrCutFilter'],
                        "name": "IrCutFilter",
                        "placeholder": "",
                        "description": "",
                        "default": "",
                        "example": "",
                        "form-group-class": "imaging-field",
                        "fieldType": "select",
                        "possible": [
                           {
                              "name": lang.On,
                              "value": "ON",
                              "info": lang["fieldTextIrCutFilterOn"]
                           },
                           {
                              "name": lang.Off,
                              "value": "OFF",
                              "info": lang["fieldTextIrCutFilterOff"]
                           },
                           {
                              "name": lang.Auto,
                              "value": "AUTO",
                              "info": lang["fieldTextIrCutFilterAuto"]
                           },
                       ]
                     },
                     {
                        "field": lang['Brightness'],
                        "name": "Brightness",
                        "placeholder": "",
                        "description": "",
                        "default": "",
                        "example": "",
                        "form-group-class": "imaging-field",
                        "possible": ""
                     },
                     {
                        "field": lang['ColorSaturation'],
                        "name": "ColorSaturation",
                        "placeholder": "",
                        "description": "",
                        "default": "",
                        "example": "",
                        "form-group-class": "imaging-field",
                        "possible": ""
                     },
                     {
                        "field": lang['Contrast'],
                        "name": "Contrast",
                        "placeholder": "",
                        "description": "",
                        "default": "",
                        "example": "",
                        "form-group-class": "imaging-field",
                        "possible": ""
                     },
                     {
                        "field": lang['BacklightCompensation'] + ' : ' + lang['Mode'],
                        "name": "BacklightCompensation:Mode",
                        "placeholder": "",
                        "description": "",
                        "default": "",
                        "example": "",
                        "form-group-class": "imaging-field",
                        "possible": ""
                     },
                     {
                        "field": lang['Exposure'] + ' : ' + lang['Mode'],
                        "name": "Exposure:Mode",
                        "placeholder": "",
                        "description": "",
                        "default": "",
                        "example": "",
                        "form-group-class": "imaging-field",
                        "possible": ""
                     },
                     {
                        "field": lang['Exposure'] + ' : ' + lang['MinExposureTime'],
                        "name": "Exposure:MinExposureTime",
                        "placeholder": "",
                        "description": "",
                        "default": "",
                        "example": "",
                        "form-group-class": "imaging-field",
                        "possible": ""
                     },
                     {
                        "field": lang['Exposure'] + ' : ' + lang['MaxExposureTime'],
                        "name": "Exposure:MaxExposureTime",
                        "placeholder": "",
                        "description": "",
                        "default": "",
                        "example": "",
                        "form-group-class": "imaging-field",
                        "possible": ""
                     },
                     {
                        "field": lang['Exposure'] + ' : ' + lang['MinGain'],
                        "name": "Exposure:MinGain",
                        "placeholder": "",
                        "description": "",
                        "default": "",
                        "example": "",
                        "form-group-class": "imaging-field",
                        "possible": ""
                     },
                     {
                        "field": lang['Exposure'] + ' : ' + lang['MaxGain'],
                        "name": "Exposure:MaxGain",
                        "placeholder": "",
                        "description": "",
                        "default": "",
                        "example": "",
                        "form-group-class": "imaging-field",
                        "possible": ""
                     },
                     {
                        "field": lang['Sharpness'],
                        "name": "Sharpness",
                        "placeholder": "",
                        "description": "",
                        "default": "",
                        "example": "",
                        "form-group-class": "imaging-field",
                        "possible": ""
                     },
                     {
                        "field": lang['WideDynamicRange'] + ' : ' + lang['Mode'],
                        "name": "WideDynamicRange:Mode",
                        "placeholder": "",
                        "description": "",
                        "default": "",
                        "example": "",
                        "form-group-class": "imaging-field",
                        "possible": ""
                     },
                     {
                        "field": lang['WhiteBalance'] + ' : ' + lang['Mode'],
                        "name": "WhiteBalance:Mode",
                        "placeholder": "",
                        "description": "",
                        "default": "",
                        "example": "",
                        "form-group-class": "imaging-field",
                        "possible": ""
                     },
                 ]
             },
             "Video Configuration": {
                 "id": "VideoConfiguration",
                 "name": lang["Video Configuration"],
                 "color": "purple",
                 "info": [
                     {
                         hidden: true,
                         "field": lang.Token,
                        "name": "videoToken",
                        "description": "",
                        "default": "",
                        "example": "",
                        "fieldType": "select",
                        "possible": [

                        ]
                     },
                     {
                        "field": lang['Name'],
                        "name": "Name",
                        "placeholder": "",
                        "description": "",
                        "default": "",
                        "example": "",
                        "possible": ""
                     },
                     {
                         "field": lang.Resolution,
                        "name": "detail=Resolution",
                        "description": "",
                        "default": "",
                        "example": "",
                        "fieldType": "select",
                        "possible": [

                        ]
                     },
                     {
                         hidden: true,
                        "field": lang['Width'],
                        "name": "Resolution:Width",
                        "placeholder": "",
                        "description": "",
                        "default": "",
                        "example": "",
                        "possible": ""
                     },
                     {
                         hidden: true,
                        "field": lang['Height'],
                        "name": "Resolution:Height",
                        "placeholder": "",
                        "description": "",
                        "default": "",
                        "example": "",
                        "possible": ""
                     },
                     {
                        "field": lang['Quality'],
                        "name": "Quality",
                        "fieldType": "number",
                        "placeholder": "",
                        "description": "",
                        "default": "",
                        "example": "",
                        "possible": ""
                     },
                     {
                        "field": lang['FrameRateLimit'],
                        "name": "RateControl:FrameRateLimit",
                        "fieldType": "number",
                        "placeholder": "",
                        "description": "",
                        "default": "",
                        "example": "",
                        "possible": ""
                     },
                     {
                        "field": lang['EncodingInterval'],
                        "name": "RateControl:EncodingInterval",
                        "fieldType": "number",
                        "placeholder": "",
                        "description": "",
                        "default": "",
                        "example": "",
                        "possible": ""
                     },
                     {
                        "field": lang['BitrateLimit'],
                        "name": "RateControl:BitrateLimit",
                        "fieldType": "number",
                        "placeholder": "",
                        "description": "",
                        "default": "",
                        "example": "",
                        "possible": ""
                     },
                     {
                        "field": lang['GovLength'],
                        "name": "H264:GovLength",
                        "fieldType": "number",
                        "placeholder": "",
                        "description": "",
                        "default": "",
                        "example": "",
                        "possible": ""
                     },
                     {
                        "field": lang['Encoding'],
                        "name": "Encoding",
                        "placeholder": "",
                        "description": "",
                        "default": "H264",
                        "example": "",
                        "fieldType": "select",
                        "possible": [

                        ]
                     },
                     {
                         "field": lang['H264Profile'],
                         "name": "H264:H264Profile",
                        "description": "",
                        "default": "",
                        "example": "",
                        "fieldType": "select",
                        "possible": [

                        ]
                     },
                     {
                         hidden: true,
                        "field": lang['UseCount'],
                        "name": "UseCount",
                        "placeholder": "",
                        "description": "",
                        "default": "",
                        "example": "",
                        "possible": ""
                     },
                 ]
             },
         }
       },
       "Sub-Account Manager": {
           "section": "Sub-Account Manager",
           "blocks": {
               "Sub-Accounts": {
                  "name": lang['Sub-Accounts'],
                  "section-pre-class": "col-md-6",
                  "color": "orange",
                  "isSection": true,
                  "id":"monSectionAccountList",
                  "info": [
                      {
                          "fieldType": "table",
                          id: "subAccountsList",
                      }
                  ]
               },
               "Currently Active": {
                  "name": lang['Currently Active'],
                  "section-pre-class": "col-md-6 search-parent",
                  "color": "green",
                  "isSection": true,
                  "info": [
                      {
                         "field": lang['Search'],
                         "class": 'search-controller',
                      },
                      {
                          "fieldType": "div",
                          "class": "search-body",
                          "id": "currently-active-users",
                          "attribute": `style="max-height: 400px;overflow: auto;"`,
                      }
                  ]
               },
               "Account Information": {
                  "name": lang['Account Information'],
                  "section-pre-class": "col-md-6",
                  "color": "blue",
                  "isSection": true,
                  "isForm": true,
                  "id":"monSectionAccountInformation",
                  "info": [
                      {
                          hidden: true,
                         "name": "uid",
                         "field": "UID",
                         "fieldType": "text"
                      },
                      {
                         "name": "mail",
                         "field": lang.Email,
                         "fieldType": "text",
                         "default": "",
                         "possible": ""
                      },
                      {
                         "name": "pass",
                         "field": lang.Password,
                         "fieldType": "password",
                         "default": "",
                         "possible": ""
                      },
                      {
                         "name": "password_again",
                         "field": lang['Password Again'],
                         "fieldType": "password",
                         "default": "",
                         "possible": ""
                      },
                      {
                          forForm: true,
                         "fieldType": "btn",
                         "attribute": `type="reset"`,
                         "class": `btn-default reset-form`,
                         "btnContent": `<i class="fa fa-undo"></i> &nbsp; ${lang['Clear']}`,
                      },
                      {
                         "fieldType": "btn",
                         "class": `btn-success submit-form`,
                         "btnContent": `<i class="fa fa-plus"></i> &nbsp; ${lang['Add New']}`,
                      },
                      {
                          hidden: true,
                         "name": "details",
                         "preFill": "{}",
                      },
                  ]
              },
              "Account Privileges": {
                 "name": lang['Account Privileges'],
                 "section-pre-class": "col-md-6",
                 "color": "red",
                 "isSection": true,
                 "id":"monSectionAccountPrivileges",
                 "info": [
                     {
                        "name": "detail=allmonitors",
                        "field": lang['All Monitors and Privileges'],
                        "default": "0",
                        "fieldType": "select",
                        "selector": "h_perm_allmonitors",
                        "possible": [
                            {
                               "name": lang.No,
                               "value": "0"
                            },
                            {
                               "name": lang.Yes,
                               "value": "1"
                            }
                        ]
                     },
                     {
                        "name": "detail=monitor_create",
                        "field": lang['Can Create and Delete Monitors'],
                        "default": "0",
                        "fieldType": "select",
                        "possible": [
                            {
                               "name": lang.No,
                               "value": "0"
                            },
                            {
                               "name": lang.Yes,
                               "value": "1"
                            }
                        ]
                     },
                     {
                        "name": "detail=user_change",
                        "field": lang['Can Change User Settings'],
                        "default": "0",
                        "fieldType": "select",
                        "possible": [
                            {
                               "name": lang.No,
                               "value": "0"
                            },
                            {
                               "name": lang.Yes,
                               "value": "1"
                            }
                        ]
                     },
                     {
                        "name": "detail=view_logs",
                        "field": lang['Can View Logs'],
                        "default": "0",
                        "fieldType": "select",
                        "possible": [
                            {
                               "name": lang.No,
                               "value": "0"
                            },
                            {
                               "name": lang.Yes,
                               "value": "1"
                            }
                        ]
                     },
                     {
                        "name": "detail=landing_page",
                        "field": lang['Landing Page'],
                        "default": "",
                        "fieldType": "select",
                        "possible": [
                            {
                               "name": lang.Default,
                               "value": ""
                            },
                            {
                               "name": lang.Timelapse,
                               "value": "timelapse"
                            }
                        ]
                     },
                     {
                         "fieldType": "div",
                         "class": "h_perm_allmonitors_input h_perm_allmonitors_1",
                         id: "sub_accounts_permissions",
                     },
                     {
                        "fieldType": "btn",
                        "class": `btn-success submit-form`,
                        "btnContent": `<i class="fa fa-plus"></i> &nbsp; ${lang['Add New']}`,
                     },
                 ]
              },
          }
      },
      "API Keys": {
          "section": "API Keys",
          "blocks": {
              "Add New": {
                 "name": lang['Add New'],
                 "section-pre-class": "col-md-6",
                 "color": "forestgreen",
                 "isSection": true,
                 "isForm": true,
                 "id":"apiKeySectionAddNew",
                 "info": [
                     {
                        "name": "ip",
                        "field": lang['Allowed IPs'],
                        "default": `0.0.0.0`,
                        "placeholder": `0.0.0.0 ${lang['for Global Access']}`,
                        "description": lang[lang["fieldTextIp"]],
                        "fieldType": "text"
                     },
                     {
                        "name": "detail=permissions",
                        "field": lang['Permissions'],
                        "default": "",
                        "fieldType": "select",
                        "attribute": `multiple style="height:150px;"`,
                        "possible": [
                            {
                                name: lang['Can Authenticate Websocket'],
                                value: 'auth_socket',
                            },
                            {
                                name: lang['Can Get Monitors'],
                                value: 'get_monitors',
                            },
                            {
                                name: lang['Can Edit Monitors'],
                                value: 'edit_monitors',
                            },
                            {
                                name: lang['Can Control Monitors'],
                                value: 'control_monitors',
                            },
                            {
                                name: lang['Can Get Logs'],
                                value: 'get_logs',
                            },
                            {
                                name: lang['Can View Streams'],
                                value: 'watch_stream',
                            },
                            {
                                name: lang['Can View Snapshots'],
                                value: 'watch_snapshot',
                            },
                            {
                                name: lang['Can View Videos'],
                                value: 'watch_videos',
                            },
                            {
                                name: lang['Can Delete Videos'],
                                value: 'delete_videos',
                            },
                        ]
                     },
                     {
                         hidden: true,
                        "name": "details",
                        "preFill": "{}",
                     },
                     {
                        "forForm": true,
                        "fieldType": "btn",
                        "class": `btn-success`,
                        "attribute": `type="submit"`,
                        "btnContent": `<i class="fa fa-plus"></i> &nbsp; ${lang['Add New']}`,
                     },
                 ]
             },
             "API Keys": {
                "name": lang['API Keys'],
                "section-pre-class": "col-md-6",
                "color": "blue",
                "isSection": true,
                "id":"apiKeySectionList",
                "info": [
                    {
                        "fieldType": "table",
                        "id": "api_list",
                    }
                ]
             },
         }
     },
     "LDAP": {
         "section": "LDAP",
         "blocks": {
             "LDAP": {
                "evaluation":"details.use_ldap!=='0'",
                "name": lang["LDAP"],
                "color": "forestgreen",
                "info": [
                    {
                       "name": "ldap_url",
                       "field": lang.URL,
                       "description": "",
                       "example": "ldap://127.0.0.1:389",
                       "possible": ""
                    },
                    {
                       "name": "username",
                       "field": lang.Username,
                       "description": "",
                       "example": "",
                       "possible": ""
                    },
                    {
                       "name": "password",
                       "field": lang.Password,
                       "description": "",
                       "example": "",
                       "possible": ""
                    },
                    {
                       "name": "ldap_bindDN",
                       "field": lang.bindDN,
                       "description": "",
                       "example": "cn=admin,dc=test,dc=com",
                       "possible": ""
                    },
                    {
                       "name": "ldap_searchBase",
                       "field": lang['Search Base'],
                       "description": "",
                       "example": "dc=test,dc=com",
                       "possible": ""
                    },
                    {
                       "name": "ldap_searchFilter",
                       "field": lang['Search Filter'],
                       "description": "",
                       "example": "uid={{username}}",
                       "possible": ""
                    },
                    {
                       "fieldType": "btn",
                       "forForm": true,
                       "attribute": `type="submit"`,
                       "class": `btn-success`,
                       "btnContent": `<i class="fa fa-check"></i> &nbsp; ${lang['Save']}`,
                    },
                ]
             }
         }
     },
     "Region Editor": {
         "section": "Region Editor",
         "blocks": {
             "Regions": {
                 "color": "green",
                 isFormGroupGroup: true,
                 "noHeader": true,
                 "section-class": "col-md-6",
                 "noDefaultSectionClasses": true,
                 "info": [
                     {
                        "name": lang["Regions"],
                        "headerTitle": `<span class="cord_name">&nbsp;</span>
                          <div class="pull-right">
                              <a href=# class="btn btn-success btn-sm add"><i class="fa fa-plus"></i></a>
                              <a href=# class="btn btn-danger btn-sm erase"><i class="fa fa-trash-o"></i></a>
                          </div>`,
                        "color": "orange",
                        "box-wrapper-class": "row",
                        isFormGroupGroup: true,
                        "info": [
                            {
                               "field": lang["Monitor"],
                               "id": "region_editor_monitors",
                               "fieldType": "select",
                               "form-group-class": "col-md-6",
                            },
                            {
                               "id": "regions_list",
                               "field": lang["Regions"],
                               "fieldType": "select",
                               "possible": [],
                               "form-group-class": "col-md-6",
                           },
                            {
                               "name": "name",
                               "field": lang['Region Name'],
                            },
                            {
                               "name": "sensitivity",
                               "field": lang['Minimum Change'],
                               "form-group-class": "col-md-6",
                            },
                            {
                               "name": "max_sensitivity",
                               "field": lang['Maximum Change'],
                               "form-group-class": "col-md-6",
                            },
                            {
                               "name": "threshold",
                               "field": lang['Trigger Threshold'],
                               "form-group-class": "col-md-6",
                            },
                            {
                               "name": "color_threshold",
                               "field": lang['Color Threshold'],
                               "form-group-class": "col-md-6",
                            },
                            {
                                hidden: true,
                                id: "regions_points",
                                "fieldType": "table",
                                "class": 'table table-striped',
                            },
                            {
                                "class": 'col-md-12',
                                "fieldType": 'div',
                                info: [
                                    {
                                       "fieldType": "btn",
                                       attribute: "href=#",
                                       "class": `btn-info toggle-region-still-image`,
                                       "btnContent": `<i class="fa fa-retweet"></i> &nbsp; ${lang['Live Stream Toggle']}`,
                                    },
                                    {
                                       "fieldType": "btn",
                                       forForm: true,
                                       attribute: "href=#",
                                       "class": `btn-success`,
                                       "btnContent": `<i class="fa fa-check"></i> &nbsp; ${lang['Save']}`,
                                    },
                                ]
                            },
                        ]
                    },
                    {
                       "name": lang["Primary"],
                       "color": "blue",
                       "section-class": "hide-box-wrapper",
                       "box-wrapper-class": "row",
                       isFormGroupGroup: true,
                       "info": [
                           {
                              "name": "detail=detector_sensitivity",
                              "field": lang['Minimum Change'],
                              "description": "The motion confidence rating must exceed this value to be seen as a trigger. This number correlates directly to the confidence rating returned by the motion detector. This option was previously named \"Indifference\".",
                              "default": "10",
                              "example": "10",
                           },
                           {
                              "name": "detail=detector_max_sensitivity",
                              "field": lang["Maximum Change"],
                              "description": "The motion confidence rating must be lower than this value to be seen as a trigger. Leave blank for no maximum. This option was previously named \"Max Indifference\".",
                              "default": "",
                              "example": "75",
                           },
                           {
                              "name": "detail=detector_threshold",
                              "field": lang["Trigger Threshold"],
                              "description": lang["fieldTextDetectorThreshold"],
                              "default": "1",
                              "example": "3",
                              "possible": "Any non-negative integer."
                           },
                           {
                              "name": "detail=detector_color_threshold",
                              "field": lang["Color Threshold"],
                              "description": lang["fieldTextDetectorColorThreshold"],
                              "default": "9",
                              "example": "9",
                              "possible": "Any non-negative integer."
                           },
                           {
                              "name": "detail=detector_frame",
                              "field": lang["Full Frame Detection"],
                              "description": lang["fieldTextDetectorFrame"],
                              "default": "1",
                              "fieldType": "select",
                              "possible": [
                                 {
                                    "name": lang.No,
                                    "value": "0"
                                 },
                                 {
                                    "name": lang.Yes,
                                    "value": "1"
                                 }
                              ]
                           },
                           {
                              "name": "detail=detector_motion_tile_mode",
                              "field": lang['Accuracy Mode'],
                              "default": "1",
                              "example": "",
                              "fieldType": "select",
                              "possible": [
                                 {
                                    "name": lang.No,
                                    "value": "0"
                                 },
                                 {
                                    "name": lang.Yes,
                                    "value": "1"
                                 }
                              ]
                           },
                           {
                              "name": "detail=detector_tile_size",
                              "field": lang["Tile Size"],
                              "description": lang.fieldTextTileSize,
                              "default": "20",
                           },
                           {
                              "name": "detail=use_detector_filters",
                              "field": lang['Event Filters'],
                              "description": lang.fieldTextEventFilters,
                              "default": "0",
                              "fieldType": "select",
                              "possible": [
                                 {
                                    "name": lang.No,
                                    "value": "0"
                                 },
                                 {
                                    "name": lang.Yes,
                                    "value": "1"
                                 }
                              ]
                           },
                           {
                              "name": "detail=use_detector_filters_object",
                              "field": lang['Filter for Objects only'],
                              "default": "0",
                              "fieldType": "select",
                              "possible": [
                                 {
                                    "name": lang.No,
                                    "value": "0"
                                 },
                                 {
                                    "name": lang.Yes,
                                    "value": "1"
                                 }
                              ]
                           },
                       ]
                   },
                ]
            },
            "Points": {
               "name": lang["Points"],
               "color": "orange",
               "section-pre-class": "col-md-6",
               "style": "overflow:auto",
               "blockquoteClass": "global_tip",
               "blockquote": lang.RegionNote,
               "info": [
                   {
                       "fieldType": "div",
                       class: "canvas_holder",
                       divContent: `<div id="region_editor_live"><iframe></iframe><img></div>
                       <div class="grid"></div><textarea id="regions_canvas" rows=3 class="hidden canvas-area input-xxlarge" disabled></textarea>`,
                   }
               ]
            }
         }
     },
     "Schedules": {
         "section": "Schedules",
         "blocks": {
             "Info": {
                 "name": lang["Monitor States and Schedules"],
                "color": "blue",
                "section-pre-class": "col-md-12",
                "blockquoteClass": "global_tip",
                "blockquote": lang.MonitorStatesText,
                "info": [
                    {
                       "fieldType": "btn",
                       "attribute": `page-open="monitorStates"`,
                       "class": `btn-primary`,
                       "btnContent": `<i class="fa fa-align-right"></i> &nbsp; ${lang["Monitor States"]}`,
                    },
                ]
             },
             "Schedules": {
                "name": lang["Schedules"],
                "color": "orange",
                "section-pre-class": "col-md-6",
                "info": [
                    {
                       "id": "schedulesSelector",
                       "field": lang["Schedules"],
                       "fieldType": "select",
                       "possible": [
                           {
                              "name": lang['Add New'],
                              "value": ""
                           },
                           {
                              "name": lang.Saved,
                              "optgroup": []
                           },
                       ]
                   },
                ]
            },
            "Schedule": {
               "name": lang["Schedule"],
               "headerTitle": `${lang['Schedule']}
                 <div class="pull-right">
                     <a class="btn btn-danger btn-xs delete" style="display:none">&nbsp;<i class="fa fa-trash-o"></i>&nbsp;</a>
                 </div>`,
               "color": "green",
               "section-pre-class": "col-md-6",
               "info": [
                   {
                      "name": "name",
                      "field": lang.Name,
                      "description": "",
                      "example": "Motion Off",
                      "possible": ""
                   },
                   {
                      "name": "enabled",
                      "field": lang.Enabled,
                      "default": "1",
                      "fieldType": "select",
                      "possible": [
                          {
                             "name": lang.No,
                             "value": "0"
                          },
                          {
                             "name": lang.Yes,
                             "value": "1"
                          }
                      ]
                   },
                   {
                      "name": "timezone",
                      "field": lang['Timezone Offset'],
                      "default": config.timeZones.find(tz => !!tz.selected).value,
                      "fieldType": "select",
                      "possible": config.timeZones.map((tz) => {
                          return {
                              "name": tz.text,
                              "value": tz.value
                          }
                      })
                   },
                   {
                      "name": "start",
                      "field": lang.Start,
                      "description": "",
                      "placeholder": "HH:mm",
                      "possible": "1:00"
                   },
                   {
                      "name": "end",
                      "field": lang.End,
                      "description": "",
                      "placeholder": "HH:mm",
                      "possible": "2:00"
                   },
                   {
                      "name": "days",
                      "field": lang.Days,
                      "default": "0",
                      "fieldType": "select",
                      "attribute": "multiple",
                      "possible": [
                          {
                             "name": lang.Sunday,
                             "value": "0"
                          },
                          {
                             "name": lang.Monday,
                             "value": "1"
                          },
                          {
                             "name": lang.Tuesday,
                             "value": "2"
                          },
                          {
                             "name": lang.Wednesday,
                             "value": "3"
                          },
                          {
                             "name": lang.Thursday,
                             "value": "4"
                          },
                          {
                             "name": lang.Friday,
                             "value": "5"
                          },
                          {
                             "name": lang.Saturday,
                             "value": "6"
                          },
                      ]
                   },
                   {
                      "name": "monitorStates",
                      "field": lang['Monitor States'],
                      "fieldType": "select",
                      "attribute": `multiple style="min-height:100px"`,
                      "possible": []
                   },
               ]
           },
         }
     },
     "Monitor States": {
         "section": "Monitor States",
         "blocks": {
             "Info": {
                 "name": lang["Monitor States and Schedules"],
                "color": "blue",
                "section-pre-class": "col-md-12",
                "blockquoteClass": "global_tip",
                "blockquote": lang.MonitorStatesText,
                "info": [
                    {
                       "fieldType": "btn",
                       "attribute": `page-open="schedules"`,
                       "class": `btn-primary`,
                       "btnContent": `<i class="fa fa-clock-o"></i> &nbsp; ${lang["Schedules"]}`,
                    },
                ]
             },
             "Monitor States": {
                 noHeader: true,
                "color": "green",
                "section-pre-class": "col-md-6",
                "info": [
                    {
                       "id": "monitorStatesSelector",
                       "field": lang["Monitor States"],
                       "fieldType": "select",
                       "possible": [
                           {
                              "name": lang['Add New'],
                              "value": ""
                           },
                           {
                              "name": lang['Saved Presets'],
                              "optgroup": []
                           },
                       ]
                   },
                ]
            },
            "Preset": {
               "name": lang["Preset"],
               "color": "green",
               "section-pre-class": "col-md-6",
               "info": [
                   {
                      "fieldType": "btn",
                      "attribute": `type="submit" style="display:none"`,
                      "class": `btn-danger delete`,
                      "btnContent": `<i class="fa fa-trash"></i> &nbsp; ${lang.Delete}`,
                   },
                   {
                      "name": "name",
                      "field": lang.Name,
                      "description": "",
                      "example": "Motion Off",
                      "possible": ""
                   }
               ]
           },
            "Monitors": {
               "name": lang["Monitors"],
               "color": "green",
               "section-pre-class": "col-md-12",
               "info": [
                   {
                      "fieldType": "btn",
                      "class": `btn-success add-monitor`,
                      "btnContent": `<i class="fa fa-plus"></i> &nbsp; ${lang['Add New']}`,
                   },
                  {
                      "fieldType": "div",
                      id: "monitorStatesMonitors",
                  }
               ]
           },
         }
     },
     "Timelapse": {
         "section": "Timelapse",
         "blocks": {
             "Search Settings": {
                "name": lang["Search Settings"],
                "color": "green",
                "section-pre-class": "col-md-4",
                isFormGroupGroup: true,
                "noHeader": true,
                "noDefaultSectionClasses": true,
                "info": [
                    {
                       isFormGroupGroup: true,
                       "noHeader": true,
                       "info": [
                           {
                               "field": lang["Monitor"],
                               "fieldType": "select",
                               "class": "monitors_list",
                               "possible": []
                           },
                           {
                               "id": "timelapsejpeg_date",
                               "field": lang.Date,
                           },
                           {
                               "id": "timelapseJpegFps",
                               "field": lang["Frame Rate"],
                               "fieldType": "range",
                               "min": "1",
                               "max": "30",
                           },
                           {
                              "fieldType": "btn-group",
                              "class": "mb-3",
                              "btns": [
                                  {
                                      "fieldType": "btn",
                                      "class": `btn-primary playPause playPauseText`,
                                      "btnContent": `<i class="fa fa-play"></i> ${lang['Play']}`,
                                  },
                                  {
                                      "fieldType": "btn",
                                      "class": `btn-secondary download_mp4`,
                                      "btnContent": `${lang['Download']}`,
                                  },
                              ],
                          },
                          {
                             "fieldType": "btn-group",
                             "btns": [
                                 {
                                     "fieldType": "btn",
                                     "class": `btn-success fill refresh-data mb-3`,
                                     "icon": `refresh`,
                                     "btnContent": `${lang['Refresh']}`,
                                 },
                             ],
                          },
                      ]
                    },
                    {
                       isFormGroupGroup: true,
                       "headerTitle": `
                         <a class="btn btn-danger btn-sm delete-selected-frames">${lang['Delete selected']}</a>
                         <a class="btn btn-primary btn-sm zip-selected-frames">${lang['Zip and Download']}</a>
                         <div class="pull-right">
                             <input type="checkbox" class="form-check-input select-all">
                         </div>`,
                       "info": [
                           {
                               "fieldType": "form",
                               "class": "frameIcons mt-3 mb-0 row scroll-style-6",
                           }
                      ]
                    }
               ]
           },
           "Watch": {
               noHeader: true,
              "color": "blue",
              style: 'padding:0!important',
              "section-pre-class": "col-md-8",
              "info": [
                  {
                      "fieldType": "div",
                      "class": "playBackView",
                      "divContent": "<img>"
                  }
              ]
          },
        }
      },
     "Event Filters": {
          "section": "Event Filters",
          "blocks": {
              "Saved Filters": {
                 "name": lang["Saved Filters"],
                 "color": "green",
                 "blockquote": lang.eventFilterEnableNoticeText,
                 "info": [
                     {
                        "field": lang["Monitor"],
                        "id": "event_filters_monitors",
                        "fieldType": "select",
                     },
                     {
                        "fieldType": "btn-group",
                        "class": "mb-3",
                        "btns": [
                            {
                                "fieldType": "btn",
                                "class": `btn-success add-filter`,
                                "btnContent": `${lang['Add New']}`,
                            },
                            {
                                "fieldType": "btn",
                                "class": `btn-danger delete-filter`,
                                "btnContent": `${lang['Delete']}`,
                            },
                        ],
                     },
                     {
                        "id": "detector_filters",
                        "field": lang["Filters"],
                        "fieldType": "select",
                     },
                     {
                         hidden:true,
                        "name": "id",
                     },
                     {
                       "name": "enabled",
                       "field": lang.Enabled,
                       "fieldType": "select",
                       "default": "1",
                       "possible": [
                          {
                             "name": "No",
                             "value": "0",
                          },
                          {
                             "name": lang.Yes,
                             "value": "1",
                             "selected": true
                          }
                       ]
                     },
                     {
                        "name": "filter_name",
                        "field": lang['Filter Name'],
                     },
                 ]
             },
             "Conditions": {
                "name": lang["Conditions"],
                "color": "blue",
                "section-class": "where",
                "info": [
                    {
                       "fieldType": "btn-group",
                       "class": "mb-3",
                       "btns": [
                           {
                               "fieldType": "btn",
                               "class": `btn-success add`,
                               "btnContent": `${lang['Add New']}`,
                           },
                       ],
                    },
                    {
                        "id": 'detector_filters_where',
                        "fieldType": 'div',
                    },
                ]
            },
             "Action for Selected": {
                "name": lang["Action for Selected"],
                "color": "red",
                "blockquote": lang.eventFilterActionText,
                "section-class": "actions",
                "info": [
                    {
                      "name": "actions=halt",
                      "field": lang["Drop Event"],
                      "fieldType": "select",
                      "form-group-class": "actions-row",
                      "description": lang["fieldTextActionsHalt"],
                      "default": "0",
                      "possible": [
                         {
                            "name": "No",
                            "value": "0",
                            "selected": true
                         },
                         {
                            "name": lang.Yes,
                            "value": "1",
                         }
                      ]
                    },
                    {
                      "name": "actions=save",
                      "field": lang['Save Events'],
                      "fieldType": "select",
                      "default": "Yes",
                      "form-group-class": "actions-row",
                      "possible": [
                         {
                            "name": lang['Original Choice'],
                            "value": "",
                            "selected": true
                         },
                         {
                            "name": lang.Yes,
                            "value": "1",
                         }
                      ]
                    },
                    {
                       "name": "actions=indifference",
                       "field": lang["Modify Indifference"],
                       "description": lang["fieldTextActionsIndifference"],
                       "form-group-class": "actions-row",
                    },
                    {
                      "name": "actions=webhook",
                      "field": lang['Legacy Webhook'],
                      "fieldType": "select",
                      "form-group-class": "actions-row",
                      "default": "",
                      "example": "1",
                      "possible": [
                         {
                            "name": lang['Original Choice'],
                            "value": "",
                            "selected": true
                         },
                         {
                            "name": lang.Yes,
                            "value": "1",
                         }
                      ]
                    },
                   {
                      "name": "actions=command",
                      "field": lang["Detector Command"],
                      "fieldType": "select",
                      "form-group-class": "actions-row",
                      "description": lang["fieldTextActionsCommand"],
                      "default": "No",
                      "form-group-class": "actions-row",
                      "possible": [
                         {
                            "name": lang['Original Choice'],
                            "value": "",
                            "selected": true
                         },
                         {
                            "name": lang.Yes,
                            "value": "1",
                         }
                      ]
                   },
                   {
                      "name": "actions=record",
                      "field": lang["Use Record Method"],
                      "fieldType": "select",
                      "description": lang["fieldTextActionsRecord"],
                      "default": "",
                      "form-group-class": "actions-row",
                      "possible": [
                         {
                            "name": lang['Original Choice'],
                            "value": "",
                            "selected": true
                         },
                         {
                            "name": lang.Yes,
                            "value": "1",
                         }
                      ]
                   },
                ]
            },
          }
      },
      "ONVIF Scanner": {
           "section": "ONVIF Scanner",
           "blocks": {
               "Search Settings": {
                  "name": lang["Scan Settings"],
                  "color": "navy",
                  "blockquote": lang.ONVIFnote,
                  "section-pre-class": "col-md-4",
                  "info": [
                      {
                         "name": "ip",
                         "field": lang['IP Address'],
                         "description": lang["fieldTextIp"],
                         "example": "10.1.100.1-10.1.100.254",
                      },
                      {
                         "name": "port",
                         "field": lang['Port'],
                         "description": lang.separateByCommasOrRange,
                         "example": "80,7575,8000,8080,8081",
                      },
                      {
                         "name": "user",
                         "field": lang['Camera Username'],
                         "placeholder": "Can be left blank.",
                      },
                      {
                         "name": "pass",
                         "field": lang['Camera Password'],
                         "fieldType": "password",
                      },
                      {
                         "fieldType": "btn-group",
                         "btns": [
                             {
                                 "fieldType": "btn",
                                 "forForm": true,
                                 "class": `btn-block btn-success`,
                                 "btnContent": `${lang['Search']}<span class="_loading" style="display:none"> &nbsp; <i class="fa fa-pulse fa-spinner"></i></span>`,
                             },
                             {
                                 "fieldType": "btn",
                                 "class": `btn-default add-all`,
                                 "btnContent": `${lang['Add All']}`,
                             },
                         ],
                      },
                 ]
             },
             "Found Devices": {
                "name": lang['Found Devices'],
                "color": "blue",
                "section-pre-class": "col-md-8",
                "info": [
                    {
                        "fieldType": "div",
                        "class": "onvif_result row",
                    }
                ]
            },
            "Other Devices": {
               "name": lang['Other Devices'],
               "color": "danger",
               "section-pre-class": "col-md-12",
               "info": [
                   {
                       "fieldType": "div",
                       "class": "onvif_result_error row",
                   }
               ]
           },
          }
        },
     "Camera Probe": {
          "section": "Camera Probe",
          "blocks": {
              "Search Settings": {
                 "name": lang["FFprobe"],
                 "color": "blue",
                 "blockquote": `<i>"${lang['FFmpegTip']}"</i> - FFmpegTips`,
                 "section-pre-class": "col-md-12",
                 "info": [
                     {
                        "name": "url",
                        "field": lang['Complete Stream URL'],
                        "example": "http://192.168.88.126/videostream.cgi or /dev/video0",
                     },
                     {
                        "fieldType": "btn-group",
                        "btns": [
                            {
                                "fieldType": "btn",
                                "forForm": true,
                                "class": `btn-block btn-success`,
                                "btnContent": `${lang['Check']}`,
                            },
                            {
                                "fieldType": "btn",
                                "class": `btn-default fill`,
                                "btnContent": `${lang['Save']}`,
                            },
                        ],
                     },
                     {
                         "fieldType": "div",
                         "class": "output_data",
                     }
                ]
            },
         }
       },
     "Montior Configuration Finder": {
            "section": "Montior Configuration Finder",
            "blocks": {
                "Search Settings": {
                   "name": lang["Search Settings"],
                   "color": "navy",
                   "blockquote": lang.monitorConfigFinderDescription,
                   "section-pre-class": "col-md-4",
                   "info": [
                       {
                          "id": "shinobihub-sort-by",
                          "field": lang["Sort By"],
                          "fieldType": "select",
                          "possible": [
                              {
                                 "name": lang['Date Updated'],
                                 "value": "dateUpdated"
                              },
                              {
                                 "name": lang['Date Added'],
                                 "value": "dateAdded"
                              },
                              {
                                 "name": lang['Title'],
                                 "value": "heading"
                              },
                              {
                                 "name": lang['Subtitle'],
                                 "value": "opening"
                              },
                          ]
                      },
                       {
                          "id": "shinobihub-sort-direction",
                          "field": lang["Sort By"],
                          "fieldType": "select",
                          "possible": [
                              {
                                 "name": lang['Newest'],
                                 "value": "DESC"
                              },
                              {
                                 "name": lang['Oldest'],
                                 "value": "ASC"
                              },
                          ]
                      },
                      {
                         "id": "shinobihub-search",
                         "field": lang['Search'],
                      },
                      {
                          "id": "shinobihub-pages",
                          "class": "btn-group",
                          "fieldType": "div",
                      }
                  ]
              },
              "Monitor Settings": {
                 "name": lang['Monitor Settings'],
                 "color": "blue",
                 "section-pre-class": "col-md-8",
                 "info": [
                     {
                         "id": "shinobihub-results",
                         "class": "text-center row",
                         "fieldType": "div",
                     }
                 ]
             },
         }
     },
     "Log Viewer": {
          "section": "Log Viewer",
          "blocks": {
              "Saved Logs": {
                 "name": lang["Saved Logs"],
                 "color": "blue",
                 "section-pre-class": "col-md-6 search-parent",
                 "info": [
                     {
                        "id": "log_monitors",
                        "field": lang["Type"],
                        "fieldType": "select",
                        "possible": [
                            {
                               "name": lang['All Logs'],
                               "value": "all"
                            },
                            {
                               "name": lang['For Group'],
                               "value": "$USER"
                            },
                            {
                               "name": lang.Monitors,
                               "optgroup": []
                           }
                        ]
                    },
                     {
                        "field": lang['Search'],
                        "class": 'search-controller',
                     },
                     {
                        "id": "logs_daterange",
                        "field": lang['Date Range'],
                     },
                     {
                        "fieldType": "btn-group",
                        "btns": [
                            {
                                "fieldType": "btn",
                                "class": "btn-default",
                                "forForm": true,
                                "attribute": `download type="button"`,
                                "btnContent": `${lang['Export']}`,
                            },
                            {
                                "fieldType": "btn",
                                "class": "btn-success",
                                "forForm": true,
                                "attribute": `type="submit"`,
                                "btnContent": `${lang['Check']}`,
                            },
                        ],
                     },
                     {
                         "id": "saved-logs-rows",
                         "fieldType": "div",
                         "attribute": `style="max-height: 600px;overflow: auto;"`,
                         "class": "search-body mt-3 px-3 row",
                     }
                ]
            },
            "Streamed Logs": {
               "name": lang['Streamed Logs'],
               "color": "green",
               "section-pre-class": "col-md-6 search-parent",
               "info": [
                   {
                      "field": lang['Search'],
                      "class": 'search-controller',
                   },
                   {
                       "fieldType": "div",
                       "id": "global-log-stream",
                       "attribute": `style="max-height: 600px;overflow: auto;"`,
                       "class": "search-body mt-3",
                   }
               ]
           },
         }
       },
     "Events": {
          "section": "Events",
          "blocks": {
              "Saved Logs": {
                 "name": lang["Search Settings"],
                 "color": "blue",
                 "section-pre-class": "col-md-4",
                 "info": [
                     {
                        "id": "eventListWithPics-monitors-list",
                        "field": lang["Type"],
                        "fieldType": "select",
                        "possible": [
                            {
                               "name": lang['All Monitors'],
                               "value": "all"
                            },
                            {
                               "name": lang.Monitors,
                               "optgroup": []
                           }
                        ]
                     },
                     {
                        "id": "eventListWithPics-daterange",
                        "field": lang['Date Range'],
                     },
                     {
                        "fieldType": "btn-group",
                        "btns": [
                            {
                                "fieldType": "btn",
                                "class": "btn-success",
                                "forForm": true,
                                "attribute": `type="submit"`,
                                "btnContent": `${lang['Check']}`,
                            },
                        ],
                     }
                ]
            },
            "Events Found": {
               "name": lang['Events Found'],
               "color": "green",
               "section-pre-class": "col-md-8 search-parent",
               "info": [
                   {
                      "field": lang['Search'],
                      "class": 'search-controller',
                   },
                   {
                       "fieldType": "div",
                       "id": "eventListWithPics-rows",
                       "class": "search-body mt-3 row",
                   }
               ]
           },
         }
       },
     "Monitor Settings Additional Input Map": {
           "section": "Monitor Settings Additional Input Map",
           "blocks": {
              "Connection" : {
                 "id": `monSectionMap$[TEMP_ID]`,
                 "name": `${lang['Input Map']} $[NUMBER]`,
                 "section-class": "input-map",
                 "color": "orange",
                 "isSection": true,
                 "info": [
                     {
                        "fieldType": "btn-group",
                        "btns": [
                            {
                                "fieldType": "btn",
                                "class": `btn-danger delete mb-2`,
                                "btnContent": `${lang['Delete']}`,
                            }
                        ],
                     },
                     {
                         name:'map-detail=type',
                         field:lang['Input Type'],
                         default:'h264',
                         attribute:'selector="h_i_$[TEMP_ID]"',
                         "fieldType": "select",
                         type:'selector',
                         possible:[
                           {
                              "name": "H.264 / H.265 / H.265+",
                              "value": "h264"
                           },
                           {
                              "name": "JPEG",
                              "value": "jpeg"
                           },
                           {
                              "name": "MJPEG",
                              "value": "mjpeg"
                           },
                           {
                              "name": "HLS (.m3u8)",
                              "value": "hls"
                           },
                           {
                              "name": "MPEG-4 (.mp4 / .ts)",
                              "value": "mp4"
                           },
                           {
                              "name": "Local",
                              "value": "local"
                           },
                           {
                              "name": "Raw",
                              "value": "raw"
                           }
                        ]
                     },
                     {
                         name:'map-detail=fulladdress',
                         field:lang['Full URL Path'],
                         placeholder:'Example : rtsp://admin:password@123.123.123.123/stream/1',
                         type:'text',
                     },
                     {
                         name:'map-detail=sfps',
                         field:lang['Monitor Capture Rate'],
                         placeholder:'',
                         type:'text',
                     },
                     {
                         name:'map-detail=aduration',
                         field:lang['Analyzation Duration'],
                         placeholder:'Example : 1000000',
                         type:'text',
                     },
                     {
                         name:'map-detail=probesize',
                         field:lang['Probe Size'],
                         placeholder:'Example : 1000000',
                         type:'text',
                     },
                     {
                         name:'map-detail=stream_loop',
                         field:lang['Loop Stream'],
                         "form-group-class":'h_i_$[TEMP_ID]_input h_i_$[TEMP_ID]_mp4 h_i_$[TEMP_ID]_raw',
                         hidden:true,
                         default:'0',
                         "fieldType": "select",
                         type:'selector',
                         possible:[
                             {
                                "name": lang.No,
                                "value": "0",
                             },
                             {
                                "name": lang.Yes,
                                "value": "1",
                             }
                         ]
                     },
                     {
                         name:'map-detail=rtsp_transport',
                         field:lang['RTSP Transport'],
                         "form-group-class":'h_i_$[TEMP_ID]_input h_i_$[TEMP_ID]_h264',
                         default:'',
                         "fieldType": "select",
                         type:'selector',
                         possible:[
                             {
                                "name": lang.Auto,
                                "value": "",
                                "info": lang["fieldTextMapRtspTransportAuto"]
                             },
                             {
                                "name": "TCP",
                                "value": "tcp",
                                "info": lang["fieldTextMapRtspTransportTCP"]
                             },
                             {
                                "name": "UDP",
                                "value": "udp",
                                "info": lang["fieldTextMapRtspTransportUDP"]
                             }
                         ]
                     },
                     {
                         name:'map-detail=accelerator',
                         field:lang['Accelerator'],
                         selector:'h_accel_$[TEMP_ID]',
                         default:'0',
                         "fieldType": "select",
                         type:'selector',
                         possible:[
                             {
                                "name": lang.No,
                                "value": "0",
                             },
                             {
                                "name": lang.Yes,
                                "value": "1",
                             }
                         ]
                     },
                     {
                         name:'map-detail=hwaccel',
                         field:lang['hwaccel'],
                         "form-group-class":'h_accel_$[TEMP_ID]_input h_accel_$[TEMP_ID]_1',
                         hidden:true,
                         default:'',
                         "fieldType": "select",
                         type:'selector',
                         possible: s.listOfHwAccels
                     },
                     {
                         name:'map-detail=hwaccel_vcodec',
                         field:lang['hwaccel_vcodec'],
                         "form-group-class":'h_accel_$[TEMP_ID]_input h_accel_$[TEMP_ID]_1',
                         hidden:true,
                         default:'auto',
                         "fieldType": "select",
                         type:'selector',
                         possible:[
                             {
                                "name": lang.Auto + '('+lang.Recommended+')',
                                "value": ""
                             },
                             {
                                "name": lang.NVIDIA,
                                "optgroup": [
                                    {
                                       "name": lang.h264_cuvid,
                                       "value": "h264_cuvid"
                                    },
                                    {
                                       "name": lang.hevc_cuvid,
                                       "value": "hevc_cuvid"
                                    },
                                    {
                                       "name": lang.mjpeg_cuvid,
                                       "value": "mjpeg_cuvid"
                                    },
                                    {
                                       "name": lang.mpeg4_cuvid,
                                       "value": "mpeg4_cuvid"
                                    },
                                ]
                             },
                             {
                                "name": lang["Quick Sync Video"],
                                "optgroup": [
                                    {
                                       "name": lang.h264_qsv,
                                       "value": "h264_qsv"
                                    },
                                    {
                                       "name": lang.hevc_qsv,
                                       "value": "hevc_qsv"
                                    },
                                    {
                                       "name": lang.mpeg2_qsv,
                                       "value": "mpeg2_qsv"
                                    },
                                ]
                             },
                             {
                                "name": lang['Raspberry Pi'],
                                "optgroup": [
                                    {
                                       "name": lang.h264_mmal,
                                       "value": "h264_mmal"
                                    },
                                    {
                                       "name": lang.mpeg2_mmal,
                                       "value": "mpeg2_mmal"
                                    },
                                    {
                                       "name": lang["MPEG-4 (Raspberry Pi)"],
                                       "value": "mpeg4_mmal"
                                    }
                                ]
                             },
                            ]
                     },
                     {
                         name:'map-detail=hwaccel_device',
                         field:lang['hwaccel_device'],
                         "form-group-class":'h_accel_$[TEMP_ID]_input h_accel_$[TEMP_ID]_1',
                         hidden:true,
                         placeholder:'Example : /dev/dri/video0',
                         type:'text',
                     },
                     {
                         name:'map-detail=cust_input',
                         field:lang['Input Flags'],
                         type:'text',
                     },
                 ]
             }
         }
     },
     "Monitor Settings Additional Stream Channel": {
           "section": "Monitor Settings Additional Stream Channel",
           "blocks": {
              "Stream" : {
                  "id": `monSectionChannel$[TEMP_ID]`,
                 "name": `${lang["Stream Channel"]} $[NUMBER]`,
                 "color": "blue",
                 "input-mapping": "stream_channel-$[NUMBER]",
                 "isSection": true,
                 "section-class": "stream-channel",
                 "info": [
                     {
                        "fieldType": "btn-group",
                        "btns": [
                            {
                                "fieldType": "btn",
                                "class": `btn-danger delete mb-2`,
                                "btnContent": `${lang['Delete']}`,
                            }
                        ],
                     },
                     {
                        "field": lang["Stream Type"],
                        "name": `channel-detail="stream_type"`,
                        "description": lang["fieldTextChannelStreamType"],
                        "default": "mp4",
                        "selector": "h_st_channel_$[TEMP_ID]",
                        "fieldType": "select",
                        "attribute": `triggerChange="#monSectionChannel$[TEMP_ID] [channel-detail=stream_vcodec]" triggerChangeIgnore="b64,mjpeg"`,
                        "possible": [
                             {
                                "name": lang.Poseidon,
                                "value": "mp4",
                                "info": lang["fieldTextChannelStreamTypePoseidon"]
                             },
                             {
                                "name": lang["RTMP Stream"],
                                "value": "rtmp",
                             },
                             {
                                "name": lang['MJPEG'],
                                "value": "mjpeg",
                                "info": lang["fieldTextChannelStreamTypeMJPEG"]
                             },
                             {
                                "name": lang['FLV'],
                                "value": "flv",
                                "info": lang["fieldTextChannelStreamTypeFLV"]
                             },
                             {
                                "name": lang['HLS (includes Audio)'],
                                "value": "hls",
                                "info": lang["fieldTextChannelStreamTypeHLS(includesAudio)"]
                             }
                          ]
                     },
                     {
                        "field": lang['Server URL'],
                        "name": `channel-detail="rtmp_server_url"`,
                        "form-group-class": "h_st_channel_$[TEMP_ID]_input h_st_channel_$[TEMP_ID]_rtmp",
                        "example": "rtmp://live-api.facebook.com:80/rtmp/",
                     },
                     {
                        "field": lang['Stream Key'],
                        "name": `channel-detail="rtmp_stream_key"`,
                        "form-group-class": "h_st_channel_$[TEMP_ID]_input h_st_channel_$[TEMP_ID]_rtmp",
                        "example": "1111111111?ds=1&a=xxxxxxxxxx",
                     },
                     {
                        "field": lang['# of Allow MJPEG Clients'],
                        "name": `channel-detail="stream_mjpeg_clients"`,
                        "form-group-class": "h_st_channel_$[TEMP_ID]_input h_st_channel_$[TEMP_ID]_mjpeg",
                        "placeholder": "20",
                     },
                     {
                        "field": lang['Video Codec'],
                        "name": `channel-detail="stream_vcodec"`,
                        "description": lang["fieldTextChannelStreamVcodec"],
                        "default": "no",
                        "form-group-class": "h_st_channel_$[TEMP_ID]_input h_st_channel_$[TEMP_ID]_hls h_st_channel_$[TEMP_ID]_rtmp h_st_channel_$[TEMP_ID]_flv h_st_channel_$[TEMP_ID]_mp4  h_st_channel_$[TEMP_ID]_h264",
                        "fieldType": "select",
                        "selector": "h_hls_v_channel_$[TEMP_ID]",
                        "possible": [
                           {
                              "name": lang.Auto,
                              "value": "no",
                              "info": lang["fieldTextChannelStreamVcodecAuto"]
                           },
                           {
                              "name": "libx264",
                              "value": "libx264",
                              "info": lang["fieldTextChannelStreamVcodecLibx264"]
                           },
                           {
                              "name": "libx265",
                              "value": "libx265",
                              "info": lang["fieldTextChannelStreamVcodecLibx265"]
                           },
                           {
                              "name": lang.copy,
                              "value": "copy",
                              "info": lang["fieldTextChannelStreamVcodecCopy"]
                           },
                           {
                               "name": lang['Hardware Accelerated'],
                               "optgroup": [
                                   {
                                      "name": "H.264 VA-API (Intel HW Accel)",
                                      "value": "h264_vaapi"
                                   },
                                   {
                                      "name": "H.265 VA-API (Intel HW Accel)",
                                      "value": "hevc_vaapi"
                                   },
                                   {
                                      "name": "H.264 NVENC (NVIDIA HW Accel)",
                                      "value": "h264_nvenc"
                                   },
                                   {
                                      "name": "H.264 NVENC Jetson (NVIDIA HW Accel NVMPI)",
                                      "value": "h264_nvmpi"
                                   },
                                   {
                                      "name": "H.265 NVENC (NVIDIA HW Accel)",
                                      "value": "hevc_nvenc"
                                   },
                                   {
                                      "name": "H.264 (Quick Sync Video)",
                                      "value": "h264_qsv"
                                   },
                                   {
                                      "name": "H.265 (Quick Sync Video)",
                                      "value": "hevc_qsv"
                                   },
                                   {
                                      "name": "MPEG2 (Quick Sync Video)",
                                      "value": "mpeg2_qsv"
                                   },
                                   {
                                      "name": "H.264 (Quick Sync Video)",
                                      "value": "h264_qsv"
                                   },
                                   {
                                      "name": "H.265 (Quick Sync Video)",
                                      "value": "hevc_qsv"
                                   },
                                   {
                                      "name": "MPEG2 (Quick Sync Video)",
                                      "value": "mpeg2_qsv"
                                   },
                                   {
                                      "name": "H.264 openMAX (Raspberry Pi)",
                                      "value": "h264_omx"
                                   }
                               ]
                           },
                        ]
                     },
                     {
                        "field": lang["Audio Codec"],
                        "name": `channel-detail="stream_acodec"`,
                        "description": lang["fieldTextChannelStreamAcodec"],
                        "default": "0",
                        "example": "",
                        "fieldType": "select",
                        "form-group-class": "h_st_channel_$[TEMP_ID]_input h_st_channel_$[TEMP_ID]_hls h_st_channel_$[TEMP_ID]_rtmp h_st_channel_$[TEMP_ID]_flv h_st_channel_$[TEMP_ID]_mp4  h_st_channel_$[TEMP_ID]_h264",
                        "possible": [
                           {
                              "name": lang.Auto,
                              "info": lang["fieldTextChannelStreamAcodecAuto"],
                              "value": ""
                           },
                           {
                              "name": lang["No Audio"],
                              "info": lang["fieldTextChannelStreamAcodecNoAudio"],
                              "value": "no"
                           },
                           {
                              "name": "libvorbis",
                              "info": lang["fieldTextChannelStreamAcodecLibvorbis"],
                              "value": "libvorbis"
                           },
                           {
                              "name": "libopus",
                              "info": lang["fieldTextChannelStreamAcodecLibopus"],
                              "value": "libopus"
                           },
                           {
                              "name": "libmp3lame",
                              "info": lang["fieldTextChannelStreamAcodecLibmp3lame"],
                              "value": "libmp3lame"
                           },
                           {
                              "name": "aac",
                              "info": lang["fieldTextChannelStreamAcodecAac"],
                              "value": "aac"
                           },
                           {
                              "name": "ac3",
                              "info": lang["fieldTextChannelStreamAcodecAc3"],
                              "value": "ac3"
                           },
                           {
                              "name": "copy",
                              "info": lang["fieldTextChannelStreamAcodecCopy"],
                              "value": "copy"
                           }
                        ]
                     },
                     {
                        "name": "channel-detail=hls_time",
                        "field": lang["HLS Segment Length"],
                        "description": lang["fieldTextChannelHlsTime"],
                        "default": "2",
                        "form-group-class": "h_st_channel_$[TEMP_ID]_input h_st_channel_$[TEMP_ID]_hls",
                     },
                     {
                        "name": "channel-detail=hls_list_size",
                        "field": lang["HLS List Size"],
                        "description": lang["fieldTextChannelHlsListSize"],
                        "default": "2",
                        "form-group-class": "h_st_channel_$[TEMP_ID]_input h_st_channel_$[TEMP_ID]_hls",
                     },
                     {
                        "name": "channel-detail=preset_stream",
                        "field": lang["HLS Preset"],
                        "description": lang["fieldTextChannelPresetStream"],
                        "example": "ultrafast",
                        "form-group-class": "h_st_channel_$[TEMP_ID]_input h_st_channel_$[TEMP_ID]_hls",
                     },
                     {
                        "name": "channel-detail=stream_quality",
                        "field": lang.Quality,
                        "description": lang["fieldTextChannelStreamQuality"],
                        "default": "15",
                        "example": "1",
                        "form-group-class-pre-layer": "h_hls_v_channel_$[TEMP_ID]_input h_hls_v_channel_$[TEMP_ID]_libx264 h_hls_v_channel_$[TEMP_ID]_libx265 h_hls_v_channel_$[TEMP_ID]_h264_nvenc h_hls_v_channel_$[TEMP_ID]_hevc_nvenc h_hls_v_channel_$[TEMP_ID]_no",
                        "form-group-class": "h_st_channel_$[TEMP_ID]_input h_st_channel_$[TEMP_ID]_mjpeg h_st_channel_$[TEMP_ID]_hls h_st_channel_$[TEMP_ID]_rtmp h_st_channel_$[TEMP_ID]_jsmpeg h_st_channel_$[TEMP_ID]_flv h_st_channel_$[TEMP_ID]_mp4 h_st_channel_$[TEMP_ID]_h264",
                        "possible": "1-23"
                     },
                     {
                        "name": "channel-detail=stream_v_br",
                        "field": lang["Video Bit Rate"],
                        "placeholder": "",
                        "form-group-class-pre-layer": "h_hls_v_channel_$[TEMP_ID]_input h_hls_v_channel_$[TEMP_ID]_libx264 h_hls_v_channel_$[TEMP_ID]_libx265 h_hls_v_channel_$[TEMP_ID]_h264_nvenc h_hls_v_channel_$[TEMP_ID]_hevc_nvenc h_hls_v_channel_$[TEMP_ID]_no",
                        "form-group-class": "h_st_channel_$[TEMP_ID]_input h_st_channel_$[TEMP_ID]_mjpeg h_st_channel_$[TEMP_ID]_hls h_st_channel_$[TEMP_ID]_rtmp h_st_channel_$[TEMP_ID]_jsmpeg h_st_channel_$[TEMP_ID]_flv h_st_channel_$[TEMP_ID]_mp4 h_st_channel_$[TEMP_ID]_h264",
                     },
                     {
                        "name": "channel-detail=stream_a_br",
                        "field": lang["Audio Bit Rate"],
                        "placeholder": "128k",
                        "form-group-class-pre-layer": "h_hls_v_channel_$[TEMP_ID]_input h_hls_v_channel_$[TEMP_ID]_libx264 h_hls_v_channel_$[TEMP_ID]_libx265 h_hls_v_channel_$[TEMP_ID]_h264_nvenc h_hls_v_channel_$[TEMP_ID]_hevc_nvenc h_hls_v_channel_$[TEMP_ID]_no",
                        "form-group-class": "h_st_channel_$[TEMP_ID]_input h_st_channel_$[TEMP_ID]_mjpeg h_st_channel_$[TEMP_ID]_hls h_st_channel_$[TEMP_ID]_rtmp h_st_channel_$[TEMP_ID]_jsmpeg h_st_channel_$[TEMP_ID]_flv h_st_channel_$[TEMP_ID]_mp4 h_st_channel_$[TEMP_ID]_h264",
                     },
                     {
                        "name": "channel-detail=stream_fps",
                        "field": lang['Frame Rate'],
                        "description": lang["fieldTextChannelStreamFps"],
                        "form-group-class-pre-layer": "h_hls_v_channel_$[TEMP_ID]_input h_hls_v_channel_$[TEMP_ID]_libx264 h_hls_v_channel_$[TEMP_ID]_libx265 h_hls_v_channel_$[TEMP_ID]_h264_nvenc h_hls_v_channel_$[TEMP_ID]_hevc_nvenc h_hls_v_channel_$[TEMP_ID]_no",
                        "form-group-class": "h_st_channel_$[TEMP_ID]_input h_st_channel_$[TEMP_ID]_mjpeg h_st_channel_$[TEMP_ID]_hls h_st_channel_$[TEMP_ID]_rtmp h_st_channel_$[TEMP_ID]_jsmpeg h_st_channel_$[TEMP_ID]_flv h_st_channel_$[TEMP_ID]_mp4 h_st_channel_$[TEMP_ID]_h264",
                     },
                     {
                        "name": "channel-detail=stream_scale_x",
                        "field": lang.Width,
                        "description": lang["fieldTextChannelStreamScaleX"],
                        "fieldType": "number",
                        "numberMin": "1",
                        "example": "640",
                        "form-group-class-pre-layer": "h_hls_v_channel_$[TEMP_ID]_input h_hls_v_channel_$[TEMP_ID]_libx264 h_hls_v_channel_$[TEMP_ID]_libx265 h_hls_v_channel_$[TEMP_ID]_h264_nvenc h_hls_v_channel_$[TEMP_ID]_hevc_nvenc h_hls_v_channel_$[TEMP_ID]_no",
                        "form-group-class": "h_st_channel_$[TEMP_ID]_input h_st_channel_$[TEMP_ID]_mjpeg h_st_channel_$[TEMP_ID]_hls h_st_channel_$[TEMP_ID]_rtmp h_st_channel_$[TEMP_ID]_jsmpeg h_st_channel_$[TEMP_ID]_flv h_st_channel_$[TEMP_ID]_mp4 h_st_channel_$[TEMP_ID]_h264",
                     },
                     {
                        "name": "channel-detail=stream_scale_y",
                        "field": lang.Height,
                        "description": lang["fieldTextChannelStreamScaleY"],
                        "fieldType": "number",
                        "numberMin": "1",
                        "example": "480",
                        "form-group-class-pre-layer": "h_hls_v_channel_$[TEMP_ID]_input h_hls_v_channel_$[TEMP_ID]_libx264 h_hls_v_channel_$[TEMP_ID]_libx265 h_hls_v_channel_$[TEMP_ID]_h264_nvenc h_hls_v_channel_$[TEMP_ID]_hevc_nvenc h_hls_v_channel_$[TEMP_ID]_no",
                        "form-group-class": "h_st_channel_$[TEMP_ID]_input h_st_channel_$[TEMP_ID]_mjpeg h_st_channel_$[TEMP_ID]_hls h_st_channel_$[TEMP_ID]_rtmp h_st_channel_$[TEMP_ID]_jsmpeg h_st_channel_$[TEMP_ID]_flv h_st_channel_$[TEMP_ID]_mp4 h_st_channel_$[TEMP_ID]_h264",
                     },
                     {
                        "name": "channel-detail=stream_rotate",
                        "field": lang["Rotate"],
                        "description": lang["fieldTextChannelStreamRotate"],
                        "fieldType": "select",
                        "form-group-class-pre-layer": "h_hls_v_channel_$[TEMP_ID]_input h_hls_v_channel_$[TEMP_ID]_libx264 h_hls_v_channel_$[TEMP_ID]_libx265 h_hls_v_channel_$[TEMP_ID]_h264_nvenc h_hls_v_channel_$[TEMP_ID]_hevc_nvenc h_hls_v_channel_$[TEMP_ID]_no",
                        "form-group-class": "h_st_channel_$[TEMP_ID]_input h_st_channel_$[TEMP_ID]_mjpeg h_st_channel_$[TEMP_ID]_hls h_st_channel_$[TEMP_ID]_rtmp h_st_channel_$[TEMP_ID]_jsmpeg h_st_channel_$[TEMP_ID]_flv h_st_channel_$[TEMP_ID]_mp4 h_st_channel_$[TEMP_ID]_h264",
                        "possible": [
                             {
                                "name": lang["No Rotation"],
                                "value": "no"
                             },
                             {
                                "name": lang["180 Degrees"],
                                "value": "2,transpose=2"
                             },
                             {
                                "name": lang["90 Counter Clockwise and Vertical Flip (default)"],
                                "value": "0"
                             },
                             {
                                "name": lang["90 Clockwise"],
                                "value": "1"
                             },
                             {
                                 "name": lang["90 Counter Clockwise"],
                                 "value": "2"
                             },
                             {
                                "name": lang["90 Clockwise and Vertical Flip"],
                                "value": "3"
                             }
                          ]
                     },
                     {
                         isAdvanced: true,
                        "name": "channel-detail=svf",
                        "field": lang["Video Filter"],
                        "description": lang["fieldTextChannelSvf"],
                        "form-group-class-pre-layer": "h_hls_v_channel_$[TEMP_ID]_input h_hls_v_channel_$[TEMP_ID]_libx264 h_hls_v_channel_$[TEMP_ID]_libx265 h_hls_v_channel_$[TEMP_ID]_h264_nvenc h_hls_v_channel_$[TEMP_ID]_hevc_nvenc h_hls_v_channel_$[TEMP_ID]_no",
                        "form-group-class": "h_st_channel_$[TEMP_ID]_input h_st_channel_$[TEMP_ID]_mjpeg h_st_channel_$[TEMP_ID]_hls h_st_channel_$[TEMP_ID]_rtmp h_st_channel_$[TEMP_ID]_jsmpeg h_st_channel_$[TEMP_ID]_flv h_st_channel_$[TEMP_ID]_mp4 h_st_channel_$[TEMP_ID]_h264",
                    },
                    {
                        "name": "channel-detail=cust_stream",
                        "field": lang["Stream Flags"],
                    },
                 ]
             }
          }
       },
       "Monitor Stream Window": {
           "section": "Monitor Stream Window",
           // gridBlockClass: "",
           // streamBlockPreHtml: `<div class="gps-map-info gps-map-details hidden">
           //     <div><i class="fa fa-compass fa-3x gps-info-bearing"></i></div>
           //     <div><i class="fa fa-compass fa-3x gps-info-speed"></i></div>
           //     <div></div>
           // </div>
           // <div class="gps-map gps-map-info hidden" id="gps-map-$MONITOR_ID"></div>`,
           streamBlockHudHtml: `<div class="camera_cpu_usage">
               <div class="progress">
                   <div class="progress-bar progress-bar-danger" role="progressbar" style="width: 0px;"><span></span></div>
               </div>
           </div>
           <div class="lamp" title="$MONITOR_MODE"><i class="fa fa-eercast"></i></div>`,
           streamBlockHudControlsHtml: `<span title="${lang['Currently viewing']}" class="label label-default">
                <span class="viewers"></span>
           </span>
           <span class="badge btn-success text-white substream-is-on" style="display:none">${lang['Substream']}</span>
           <a class="btn btn-sm badge btn-primary run-monitor-detection-trigger-marker">${lang['Add Marker']}</a>
           <a class="btn btn-sm badge btn-warning run-monitor-detection-trigger-test">${lang['Test Object Event']}</a>
           <a class="btn btn-sm badge btn-warning run-monitor-detection-trigger-test-motion">${lang['Test Motion Event']}</a>
           `,
           gridBlockAfterContentHtml: `<div class="mdl-card__supporting-text text-center">
               <div class="indifference detector-fade">
                   <div class="progress">
                       <div class="progress-bar progress-bar-danger" role="progressbar"><span></span></div>
                   </div>
               </div>
               <div class="monitor_details">
                   <div class="pull-left">
                        $QUICKLINKS
                  </div>
                   <div><span class="monitor_name">$MONITOR_NAME</span></div>
               </div>
           </div>`,
           quickLinks: {
               "Options": {
                  "label": lang['Options'],
                  "class": "default toggle-live-grid-monitor-menu",
                  "icon": "bars"
               },
               "Fullscreen": {
                  "label": lang['Fullscreen'],
                  "class": "default toggle-live-grid-monitor-fullscreen",
                  "icon": "arrows-alt"
               },
               "Monitor Settings": {
                  "label": lang['Monitor Settings'],
                  "class": "default open-monitor-settings",
                  "icon": "wrench",
                  eval: `!isSubAccount || isSubAccount && permissionCheck('monitor_edit',monitorId)`,
               },
               "Toggle Substream": {
                  "label": lang['Toggle Substream'],
                  "class": "warning toggle-monitor-substream",
                  "icon": "eye"
               },
               "Snapshot": {
                  "label": lang['Snapshot'],
                  "class": "primary snapshot-live-grid-monitor",
                  "icon": "camera"
               },
               "Videos List": {
                  "label": lang['Videos List'],
                  "class": "default open-videosTable",
                  "icon": "film",
                  eval: `!isSubAccount || isSubAccount && permissionCheck('video_view',monitorId)`,
               },
               "Reconnect Stream": {
                  "label": lang['Reconnect Stream'],
                  "class": "success signal reconnect-live-grid-monitor",
                  "icon": "plug"
               },
               "Control": {
                  "label": lang['Control'],
                  "class": "default toggle-live-grid-monitor-ptz-controls",
                  "icon": "arrows",
                  eval: `monitor.details.control === '1'`,
               },
               "Show Logs": {
                  "label": lang['Show Logs'],
                  "class": "warning toggle-live-grid-monitor-logs",
                  "icon": "exclamation-triangle"
               },
               "Close": {
                  "label": lang['Close'],
                  "class": "danger close-live-grid-monitor",
                  "icon": "times"
               }
           },
           links: {
              "Mute Audio": {
                  "label": lang['Mute Audio'],
                  "attr": `system="monitorMuteAudioSingle" mid="$MONITOR_ID"`,
                  "class": "primary",
                  "icon": '$MONITOR_MUTE_ICON'
              },
              "Snapshot": {
                 "label": lang['Snapshot'],
                 "class": "primary snapshot-live-grid-monitor",
                 "icon": "camera"
              },
              "Show Logs": {
                 "label": lang['Show Logs'],
                 "class": "warning toggle-live-grid-monitor-logs",
                 "icon": "exclamation-triangle"
              },
              "Toggle Substream": {
                 "label": lang['Toggle Substream'],
                 "class": "warning toggle-monitor-substream",
                 "icon": "eye"
              },
              "Control": {
                 "label": lang['Control'],
                 "class": "default toggle-live-grid-monitor-ptz-controls",
                 "icon": "arrows",
                 eval: `monitor.details.control === '1'`,
              },
              "Reconnect Stream": {
                 "label": lang['Reconnect Stream'],
                 "class": "success signal reconnect-live-grid-monitor",
                 "icon": "plug"
              },
              "Pop": {
                 "label": lang['Pop'],
                 "class": "default run-live-grid-monitor-pop",
                 "icon": "external-link"
              },
              "Zoom In": {
                 "label": lang['Zoom In'],
                 "class": "default magnify-glass-live-grid-stream",
                 "icon": "search-plus"
              },
              // "Calendar": {
              //    "label": lang['Calendar'],
              //    "attr": `monitor="calendar"`,
              //    "class": "default ",
              //    "icon": "calendar"
              // },
              // "Power Viewer": {
              //    "label": lang['Power Viewer'],
              //    "attr": `monitor="powerview"`,
              //    "class": "default",
              //    "icon": "map-marker"
              // },
              "Time-lapse": {
                 "label": lang['Time-lapse'],
                 "attr": `monitor="timelapseJpeg"`,
                 "class": "default",
                 "icon": "angle-double-right",
                 eval: `!isSubAccount || isSubAccount && permissionCheck('video_view',monitorId)`,
              },
              // "Video Grid": {
              //    "label": "Video Grid",
              //    "attr": `monitor="video_grid"`,
              //    "class": "default",
              //    "icon": "th"
              // },
              "Videos List": {
                 "label": lang['Videos List'],
                 "class": "default open-videosTable",
                 "icon": "film",
                 eval: `!isSubAccount || isSubAccount && permissionCheck('video_view',monitorId)`,
              },
              "Monitor Settings": {
                 "label": lang['Monitor Settings'],
                 "class": "default open-monitor-settings",
                 "icon": "wrench",
                 eval: `!isSubAccount || isSubAccount && permissionCheck('monitor_edit',monitorId)`,
              },
              "Fullscreen": {
                 "label": lang['Fullscreen'],
                 "class": "default toggle-live-grid-monitor-fullscreen",
                 "icon": "arrows-alt"
              },
              "Close": {
                 "label": lang['Close'],
                 "class": "danger close-live-grid-monitor",
                 "icon": "times"
              }
           }
       },
       "Monitor Options": {
           "section": "Monitor Options",
           "dropdownClass": `${Theme.isDark ? 'dropdown-menu-dark' : ''} ${mainBackgroundColor}`
       },
       "SideMenu": {
           "section": "SideMenu",
           showMonitors: true,
           "blocks": {
               "Container1": {
                  // "id": "sidebarMenu",
                  "class": `col-md-3 col-lg-2 d-md-block ${mainBackgroundColor} sidebar collapse`,
                  "links": [
                      {
                          icon: 'home',
                          label: lang.Home,
                          pageOpen: 'initial',
                      },
                      {
                          icon: 'th',
                          label: lang['Live Grid'] + ` &nbsp;
                          <span class="badge bg-light text-dark rounded-pill align-text-bottom liveGridOpenCount">0</span>`,
                          pageOpen: 'liveGrid',
                          addUl: true,
                          ulItems: [
                              {
                                  label: lang['Open Wall Display'],
                                  class: 'open-wallview cursor-pointer',
                                  color: 'blue',
                              },
                              {
                                  label: lang['Open All Monitors'],
                                  class: 'open-all-monitors cursor-pointer',
                                  color: 'orange',
                              },
                              {
                                  label: lang['Close All Monitors'],
                                  class: 'close-all-monitors cursor-pointer',
                                  color: 'red',
                              },
                              {
                                  label: lang['Remember Positions'],
                                  class: 'cursor-pointer',
                                  attributes: 'shinobi-switch="monitorOrder" ui-change-target=".dot" on-class="dot-green" off-class="dot-grey"',
                                  color: 'grey',
                              },
                              {
                                  label: lang['Mute Audio'],
                                  class: 'cursor-pointer',
                                  attributes: 'shinobi-switch="monitorMuteAudio" ui-change-target=".dot" on-class="dot-green" off-class="dot-grey"',
                                  color: 'grey',
                              },
                              // {
                              //     label: lang['JPEG Mode'],
                              //     class: 'cursor-pointer',
                              //     attributes: 'shinobi-switch="jpegMode" ui-change-target=".dot" on-class="dot-green" off-class="dot-grey"',
                              //     color: 'grey',
                              // },
                              {
                                  label: lang['Stream in Background'],
                                  class: 'cursor-pointer',
                                  attributes: 'shinobi-switch="backgroundStream" ui-change-target=".dot" on-class="dot-grey" off-class="dot-green"',
                                  color: 'grey',
                              },
                              {
                                  label: lang[`Original Aspect Ratio`],
                                  class: 'cursor-pointer',
                                  attributes: 'shinobi-switch="dontMonStretch" ui-change-target=".dot" on-class="dot-grey" off-class="dot-green"',
                                  color: 'grey',
                              },
                              {
                                  label: lang[`Hide Detection on Stream`],
                                  class: 'cursor-pointer',
                                  attributes: 'shinobi-switch="dontShowDetection" ui-change-target=".dot" on-class="dot-green" off-class="dot-grey"',
                                  color: 'grey',
                              },
                              {
                                  label: lang[`Alert on Event`],
                                  class: 'cursor-pointer',
                                  attributes: 'shinobi-switch="alertOnEvent" ui-change-target=".dot" on-class="dot-green" off-class="dot-grey"',
                                  color: 'grey',
                              },
                              {
                                  label: lang[`Popout on Event`],
                                  class: 'cursor-pointer',
                                  attributes: 'shinobi-switch="popOnEvent" ui-change-target=".dot" on-class="dot-green" off-class="dot-grey"',
                                  color: 'grey',
                              },
                          ]
                      },
                      {
                          icon: 'video-camera',
                          label: `${lang.Monitors} &nbsp;
                          <span class="badge bg-light text-dark rounded-pill align-text-bottom cameraCount"><i class="fa fa-spinner fa-pulse"></i></span>`,
                          pageOpen: 'monitorsList',
                      },
                      {
                          icon: 'barcode',
                          label: `${lang['Timeline']}`,
                          pageOpen: 'timeline',
                          addUl: true,
                          ulStyle: `max-height:250px;overflow:auto;`
                      },
                      {
                          icon: 'map-marker',
                          label: `${lang['Monitor Map']}`,
                          pageOpen: 'monitorMap',
                      },
                      {
                          icon: 'film',
                          label: `${lang['Videos']}`,
                          pageOpen: 'videosTableView',
                          addUl: true,
                          ulItems: [
                              {
                                  label: lang[`Save Compressed Video on Completion`],
                                  class: 'cursor-pointer',
                                  attributes: 'shinobi-switch="saveCompressedVideo" ui-change-target=".dot" on-class="dot-green" off-class="dot-grey"',
                                  color: 'grey',
                              },
                          ]
                      },
                      {
                          icon: 'calendar',
                          label: `${lang['Calendar']}`,
                          pageOpen: 'calendarView',
                      },
                      {
                          icon: 'fast-forward',
                          label: `${lang['Time-lapse']}`,
                          pageOpen: 'timelapseViewer',
                          addUl: true,
                          ulItems: [
                              {
                                  label: lang[`Save Built Video on Completion`],
                                  class: 'cursor-pointer',
                                  attributes: 'shinobi-switch="timelapseSaveBuiltVideo" ui-change-target=".dot" on-class="dot-green" off-class="dot-grey"',
                                  color: 'grey',
                              },
                          ]
                      },
                      {
                          icon: 'file-o',
                          label: `${lang['FileBin']}`,
                          pageOpen: 'fileBinView',
                      },
                      {
                          divider: true,
                      },
                      {
                          icon: 'wrench',
                          label: `${lang['Monitor Settings']}`,
                          pageOpen: 'monitorSettings',
                          addUl: true,
                          eval: `!$user.details.sub || $user.details.monitor_create !== 0`,
                      },
                      {
                          icon: 'grav',
                          label: `${lang['Region Editor']}`,
                          pageOpen: 'regionEditor',
                          eval: `!$user.details.sub`,
                      },
                      {
                          icon: 'filter',
                          label: `${lang['Event Filters']}`,
                          pageOpen: 'eventFilters',
                          eval: `!$user.details.sub`,
                      },
                      {
                          icon: 'align-right',
                          label: `${lang['Monitor States']}`,
                          pageOpen: 'monitorStates',
                          eval: `!$user.details.sub`,
                      },
                      {
                          icon: 'clock-o',
                          label: `${lang['Schedules']}`,
                          pageOpen: 'schedules',
                          eval: `!$user.details.sub`,
                      },
                      {
                          icon: 'exclamation-triangle',
                          label: `${lang['Logs']}`,
                          pageOpen: 'logViewer',
                          eval: `!$user.details.sub || $user.details.view_logs !== 0`,
                      },
                      {
                          divider: true,
                      },
                      {
                          icon: 'gears',
                          label: `${lang['Account Settings']}`,
                          pageOpen: 'accountSettings',
                          eval: `!$user.details.sub || $user.details.user_change !== 0`,
                          addUl: true,
                      },
                      {
                          icon: 'group',
                          label: `${lang.subAccountManager}`,
                          pageOpen: 'subAccountManager',
                          addUl: true,
                          eval: `!$user.details.sub`,
                      },
                      {
                          icon: 'key',
                          label: `${lang['API Keys']}`,
                          pageOpen: 'apiKeys',
                      },
                      {
                          divider: true,
                      },
                      {
                          icon: 'search',
                          label: `${lang['ONVIF Scanner']}`,
                          pageOpen: 'onvifScanner',
                          addUl:true,
                          eval: `!$user.details.sub || $user.details.monitor_create !== 0`,
                      },
                      {
                          icon: 'opera',
                          label: `${lang['ONVIF Device Manager']}`,
                          pageOpen: 'onvifDeviceManager',
                          eval: `!$user.details.sub || $user.details.monitor_create !== 0`,
                      },
                      {
                          icon: 'ravelry',
                          label: `${lang['Rally']}`,
                          pageOpen: 'rally',
                      },
                      {
                          icon: 'eyedropper',
                          label: `${lang['FFprobe']}`,
                          pageOpen: 'cameraProbe',
                      },
                      {
                          icon: 'compass',
                          label: `${lang['ShinobiHub']}`,
                          pageOpen: 'configFinder',
                          addUl: true,
                          eval: `!$user.details.sub || $user.details.monitor_create !== 0`,
                      },
                      {
                          divider: true,
                      },
                      {
                          icon: 'info-circle',
                          label: `${lang['Help']}`,
                          pageOpen: 'helpWindow',
                      },
                      // {
                      //     icon: 'exclamation-circle',
                      //     label: `${lang['Events']}`,
                      //     pageOpen: 'eventListWithPics',
                      // },
                      {
                          icon: 'sign-out',
                          label: `${lang['Logout']}`,
                          class: 'logout',
                      },
                  ]
              },
              "SideMenuBeforeList": {
                 "name": "SideMenuBeforeList",
                 "color": "grey",
                 "noHeader": true,
                 "noDefaultSectionClasses": true,
                 "section-class": "px-3",
                 "info": [
                     {
                         isFormGroupGroup: true,
                         "noHeader": true,
                         "noDefaultSectionClasses": true,
                         "section-class": "card btn-default text-white px-3 py-2 mb-3 border-0",
                         info: [
                             {
                                  "fieldType": "div",
                                  "id": `clock`,
                                  "style": `cursor:pointer`,
                                  "attribute": `data-target="#time-hours"`,
                                  "divContent": `<div id="time-date"></div>
                                                    <ul>
                                                        <li id="time-hours"></li>
                                                        <li class="point">:</li>
                                                        <li id="time-min"></li>
                                                        <li class="point">:</li>
                                                        <li id="time-sec"></li>
                                                    </ul>
                                                    `
                             },
                         ]
                     },
                     {
                         "id": "indicator-bars",
                         isFormGroupGroup: true,
                         "noHeader": true,
                         "noDefaultSectionClasses": true,
                         "section-class": "card text-white bg-gradient-blue px-3 py-2 mb-3 border-0",
                         info: [
                             {
                                 "fieldType": "indicatorBar",
                                 "icon": "square",
                                 "name": "cpu",
                                 "label": `<span class="os_cpuCount"><i class="fa fa-spinner fa-pulse"></i></span> ${lang.CPU}<span class="os_cpuCount_trailer"></span> : <span class="os_platform" style="text-transform:capitalize"><i class="fa fa-spinner fa-pulse"></i></span>`,
                             },
                             {
                                 "fieldType": "indicatorBar",
                                 "icon": "microchip",
                                 "name": "ram",
                                 "label": `<span class="os_totalmem used"><i class="fa fa-spinner fa-pulse"></i></span> ${lang.MB} ${lang.RAM}`,
                             },
                             {
                                 id: 'disk-indicator-bars',
                                 isFormGroupGroup: true,
                                 "noHeader": true,
                                 "noDefaultSectionClasses": true,
                                 "section-class": "disk-indicator-bars",
                                 info: [
                                     {
                                         "fieldType": "indicatorBar",
                                         "icon": "hdd-o",
                                         "name": "disk",
                                         "bars": 3,
                                         "color0": "info",
                                         "title0": lang["Video Share"],
                                         "color1": "danger",
                                         "title1": lang["Timelapse Frames Share"],
                                         "color2": "warning",
                                         "title2": lang["FileBin Share"],
                                         "label": `<span class="diskUsed" style="text-transform:capitalize">${lang.Primary}</span> : <span class="value"></span>`,
                                     },
                                 ]
                             },
                             {
                                 "fieldType": "indicatorBar",
                                 "percent": 0,
                                 "color": 'warning',
                                 "indicatorPercentClass": 'activeCameraCount',
                                 "icon": "video-camera",
                                 "name": "activeCameraCount",
                                 "label": lang['Active Monitors'],
                             },
                         ]
                     }
                 ]
              },
              "SideMenuAfterList": {
                 "name": "SideMenuAfterList",
                 "noHeader": true,
                 "noDefaultSectionClasses": true,
                 "info": []
              }
           }
       },
       "Home": {
           "section": "Home",
           "blocks": {
            //   "Container1": {
            //      "name": "Container1",
            //      "color": "grey",
            //      "noHeader": true,
            //      "noDefaultSectionClasses": true,
            //      "section-class": "col-md-3 pt-3",
            //      "info": [
            //          {
            //              "fieldType": "div",
            //              "class": `card ${mainBackgroundColor} mb-3`,
            //              "divContent": `<div class="card-body ${textWhiteOnBgDark}">
            //                  <h5 class="card-title"><i class="fa fa-th text-muted"></i> ${lang['Live Grid']}</h5>
            //                  <p class="card-text">${lang.liveGridDescription}</p>
            //                  <a page-open="liveGrid" class="btn btn-primary">${lang.Open}</a>
            //                </div>`
            //          },
            //          {
            //              "fieldType": "div",
            //              "class": `card ${mainBackgroundColor} mb-3`,
            //              "divContent": `<div class="card-body ${textWhiteOnBgDark}">
            //                  <h5 class="card-title"><i class="fa fa-gears text-muted"></i> ${lang['Account Settings']}</h5>
            //                  <p class="card-text">${lang.accountSettingsDescription}</p>
            //                  <a page-open="accountSettings" class="btn btn-primary">${lang.Open}</a>
            //                </div>`
            //          },
            //      ]
            // },
            "Container4": {
                "name": "Container4",
                "color": "grey",
                "noHeader": true,
                "noDefaultSectionClasses": true,
                "section-class": "col-lg-12",
                "info": [
                    {
                        ejs: 'web/pages/blocks/home/recentVideos',
                    },
                ]
            }
         }
      },
      "Power Viewer": {
           "section": lang["Power Viewer"],
           "blocks": {
            "Video Playback": {
                id: "powerVideoVideoPlayback",
                noHeader: true,
                noDefaultSectionClasses: true,
               "color": "green",
               "section-pre-class": "col-md-8 search-parent",
               "info": [
                   {
                      "id": "powerVideoMonitorViews",
                      "fieldType": "div",
                   },
                   {
                       "id": "powerVideoMonitorControls",
                       "color": "blue",
                       noHeader: true,
                       isSection: true,
                       isFormGroupGroup: true,
                       'section-class': 'text-center',
                       "info": [
                           {
                              "fieldType": "btn-group",
                              "normalWidth": true,
                              "btns": [
                                  {
                                      "fieldType": "btn",
                                      "class": `btn-success btn-sm`,
                                      "attribute": `powerVideo-control="downloadPlaying" title="${lang['Download']}"`,
                                      "btnContent": `<i class="fa fa-download"></i>`,
                                  }
                              ],
                           },
                           {
                              "fieldType": "btn-group",
                              "normalWidth": true,
                              "btns": [
                                  {
                                      "fieldType": "btn",
                                      "class": `btn-default btn-sm`,
                                      "attribute": `powerVideo-control="toggleZoom" title="${lang['Zoom In']}"`,
                                      "btnContent": `<i class="fa fa-search-plus"></i>`,
                                  },
                                  {
                                      "fieldType": "btn",
                                      "class": `btn-default btn-sm`,
                                      "attribute": `powerVideo-control="toggleMute" title="${lang['Zoom In']}"`,
                                      "btnContent": `<i class="fa fa-volume-off"></i>`,
                                  },
                              ],
                           },
                           {
                              "fieldType": "btn-group",
                              "normalWidth": true,
                              "btns": [
                                  {
                                      "fieldType": "btn",
                                      "class": `btn-default btn-sm`,
                                      "attribute": `powerVideo-control="previousVideoAll" title="${lang['Previous Video']}"`,
                                      "btnContent": `<i class="fa fa-arrow-circle-left"></i>`,
                                  },
                                  {
                                      "fieldType": "btn",
                                      "class": `btn-danger btn-sm`,
                                      "attribute": `powerVideo-control="playAll" title="${lang['Play']}"`,
                                      "btnContent": `<i class="fa fa-play"></i>`,
                                  },
                                  {
                                      "fieldType": "btn",
                                      "class": `btn-default btn-sm`,
                                      "attribute": `powerVideo-control="pauseAll" title="${lang['Pause']}"`,
                                      "btnContent": `<i class="fa fa-pause"></i>`,
                                  },
                                  {
                                      "fieldType": "btn",
                                      "class": `btn-default btn-sm`,
                                      "attribute": `powerVideo-control="nextVideoAll" title="${lang['Next Video']}"`,
                                      "btnContent": `<i class="fa fa-arrow-circle-right"></i>`,
                                  },
                              ],
                           },
                           {
                              "fieldType": "btn-group",
                              "style": "font-family: monospace;",
                              "normalWidth": true,
                              "btns": [
                                  {
                                      "fieldType": "btn",
                                      "class": `btn-default btn-sm`,
                                      "attribute": `powerVideo-control="playSpeedAll" data-speed="1"`,
                                      "btnContent": `1`,
                                  },
                                  {
                                      "fieldType": "btn",
                                      "class": `btn-default btn-sm`,
                                      "attribute": `powerVideo-control="playSpeedAll" data-speed="5"`,
                                      "btnContent": `5`,
                                  },
                                  {
                                      "fieldType": "btn",
                                      "class": `btn-default btn-sm`,
                                      "attribute": `powerVideo-control="playSpeedAll" data-speed="10"`,
                                      "btnContent": `10`,
                                  },
                                  {
                                      "fieldType": "btn",
                                      "class": `btn-default btn-sm`,
                                      "attribute": `powerVideo-control="playSpeedAll" data-speed="15"`,
                                      "btnContent": `15`,
                                  },
                              ],
                           },
                       ]
                   },
               ]
           },
           "Container2": {
               id: "powerVideoTabs",
               noHeader: true,
              "section-pre-class": "col-md-4",
              attribute: `tab-chooser-parent`,
              "info": [
                  {
                      "field": lang['Monitors'],
                      "id": "powerVideoMonitorsList",
                      "fieldType": "form",
                      "style": "overflow-y:auto;max-height:200px;",
                  },
                  {
                     "id": "powerVideo_tag_search",
                     "field": lang["Search Object Tags"],
                     "example": "person",
                  },
                  {
                     "id": "powerVideoDateRange",
                     "field": lang['Date Range'],
                  },
                  {
                     "id": "powerVideoVideoLimit",
                     "field": lang['Video Limit'] + ` (${lang['Per Monitor']})`,
                     "placeholder": "0",
                  },
                  {
                     "id": "powerVideoEventLimit",
                     "field": lang['Event Limit'] + ` (${lang['Per Monitor']})`,
                     "placeholder": "500",
                  },
                  {
                      id:'powerVideoSet',
                      field: lang['Video Set'],
                      default:'h264',
                      "fieldType": "select",
                      possible:[
                        {
                            "name": lang.Local,
                           "value": ""
                        },
                        {
                           "name": lang.Cloud,
                           "value": "cloud"
                        },
                        {
                            "name": lang.Archive,
                           "value": "archive"
                        },
                     ]
                  },
              ]
          },
           "Time Strip": {
               id: "powerVideoTimelineStripsContainer",
               noHeader: true,
              "color": "bg-gradient-blue text-white",
              "section-pre-class": "col-md-12",
              "info": [
                  {
                     "id": "powerVideoTimelineStrips",
                     "fieldType": "div",
                     "divContent": `<div class="loading"><i class="fa fa-hand-pointer-o"></i><div class="epic-text">${lang['Select a Monitor']}</div></div>`,
                  },
              ]
          },
         }
      },
      "Studio": {
           "section": lang["Studio"],
           "blocks": {
            "Video Playback": {
                id: "studioVideoPlayback",
                noHeader: true,
                noDefaultSectionClasses: true,
               "color": "green",
               "section-pre-class": "col-md-8 search-parent",
               "info": [
                   {
                      "id": "studioViewingCanvas",
                      "fieldType": "div",
                   },
                   {
                       "id": "studioMonitorControls",
                       "color": "blue",
                       noHeader: true,
                       isSection: true,
                       isFormGroupGroup: true,
                       'section-class': 'text-center',
                       "info": [
                           {
                              "fieldType": "btn-group",
                              "normalWidth": true,
                              "btns": [
                                  {
                                      "fieldType": "btn",
                                      "class": `btn-default btn-sm play-preview`,
                                      "attribute": `title="${lang['Play']}"`,
                                      "btnContent": `<i class="fa fa-play"></i>`,
                                  },
                                  {
                                      "fieldType": "btn",
                                      "class": `btn-default btn-sm slice-video`,
                                      "attribute": `title="${lang['Slice']}"`,
                                      "btnContent": `<i class="fa fa-scissors"></i>`,
                                  },
                              ],
                           },
                       ]
                   },
                   {
                       "color": "bg-gradient-blue text-white",
                       noHeader: true,
                       isSection: true,
                       isFormGroupGroup: true,
                       'section-class': 'text-center',
                       "info": [
                           {
                              "id": "studioTimelineStrip",
                              "fieldType": "div",
                              "divContent": `
                                  <div id="studio-time-ticks"></div>
                                  <div id="studio-seek-tick"></div>
                                  <div id="studio-slice-selection" style="width: 80%;left: 10%;"></div>
                              `,
                           },
                       ]
                   },
               ]
           },
           "Container2": {
               noHeader: true,
              "section-pre-class": "col-md-4",
              "noDefaultSectionClasses": true,
              "info": [
                  {
                     "id": "studio-completed-videos",
                     "fieldType": "div",
                  },
              ]
          }
         }
      },
      "Calendar": {
          "section": "Calendar",
          "blocks": {
              "Search Settings": {
                 "name": lang["Search Settings"],
                 "color": "green",
                 "section-pre-class": "col-md-4",
                 "info": [
                     {
                         "field": lang["Monitor"],
                         "fieldType": "select",
                         "class": "monitors_list",
                         "possible": []
                     },
                     {
                         "class": "date_selector",
                         "field": lang.Date,
                     },
                     {
                        "fieldType": "btn-group",
                        "btns": [
                            {
                                "fieldType": "btn",
                                "class": `btn-success fill refresh-data mb-3`,
                                "icon": `refresh`,
                                "btnContent": `${lang['Refresh']}`,
                            },
                        ],
                     }
                ]
            },
            "Calendar": {
                noHeader: true,
               "section-pre-class": "col-md-8",
               "info": [
                   {
                       "fieldType": "div",
                       "id": "calendar_draw_area",
                       "divContent": ""
                   }
               ]
           },
         }
      },
      "FileBin": {
          "section": "FileBin",
          "blocks": {
              "Search Settings": {
                 "name": lang["Search Settings"],
                 "color": "green",
                 "section-pre-class": "col-md-4",
                 "info": [
                     {
                         "field": lang["Monitor"],
                         "fieldType": "select",
                         "class": "monitors_list",
                         "possible": []
                     },
                     {
                         "class": "date_selector",
                         "field": lang.Date,
                     },
                     {
                        "fieldType": "btn-group",
                        "btns": [
                            {
                                "fieldType": "btn",
                                "class": `btn-success fill refresh-data mb-3`,
                                "icon": `refresh`,
                                "btnContent": `${lang['Refresh']}`,
                            }
                        ],
                     },
                     {
                         "fieldType": "div",
                         "id": "fileBin_preview_area",
                         "divContent": ""
                     }
                ]
            },
            "FileBin": {
                noHeader: true,
               "section-pre-class": "col-md-8",
               "info": [
                   {
                       "fieldType": "table",
                       "attribute": `data-classes="table table-striped"`,
                       "id": "fileBin_draw_area",
                       "divContent": ""
                   }
               ]
           },
         }
      },
      "Videos Table": {
          "section": "Videos Table",
          "blocks": {
              "Search Settings": {
                 "name": lang["Search Settings"],
                 "color": "green",
                 "section-pre-class": "col-md-4",
                 "info": [
                     {
                         "field": lang["Monitor"],
                         "fieldType": "select",
                         "class": "monitors_list",
                         "possible": []
                     },
                     {
                        "id": "videosTable_tag_search",
                        "field": lang["Search Object Tags"],
                        "example": "person",
                     },
                     {
                         id:'videosTable_tag_search_andonly',
                         field: lang['Search Type'],
                         default: '0',
                         "fieldType": "select",
                         possible:[
                             {
                                 "name": lang.OR,
                                 "value": "0",
                                 selected: true,
                             },
                             {
                                 "name": lang.AND,
                                 "value": "1"
                             },
                        ]
                     },
                     {
                         "class": "date_selector",
                         "field": lang.Date,
                     },
                     {
                         id:'videosTable_cloudVideos',
                         field: lang['Video Set'],
                         default: 'local',
                         "fieldType": "select",
                         possible:[
                           {
                               "name": lang.Local,
                              "value": "local"
                           },
                           {
                               "name": lang.Archive,
                              "value": "archive"
                           },
                           {
                              "name": lang.Cloud,
                              "value": "cloud"
                           },
                        ]
                     },
                     {
                        "fieldType": "btn-group",
                        "btns": [
                            {
                                "fieldType": "btn",
                                "class": `btn-success fill refresh-data mb-3`,
                                "icon": `refresh`,
                                "btnContent": `${lang['Refresh']}`,
                            },
                        ],
                     },
                     {
                         "fieldType": "div",
                         "id": "videosTable_preview_area",
                         "divContent": ""
                     },
                ]
            },
            "theTable": {
                noHeader: true,
               "section-pre-class": "col-md-8",
               "info": [
                   {
                       "fieldType": "table",
                       "attribute": `data-classes="table table-striped"`,
                       "id": "videosTable_draw_area",
                       "divContent": ""
                   }
               ]
           },
         }
      },
      "Admin Account Settings": {
           "section": "Admin Account Settings",
           "blocks": {
               "Editor": {
                  "name": lang["Admin Account Settings"],
                  "color": "blue",
                  "info": [
                      {
                         "name": "mail",
                         "field": lang.Email,
                      },
                      {
                         "name": "ke",
                         "field": lang['Group Key'],
                      },
                      {
                         "name": "pass",
                         "type": "password",
                         "field": lang['Password'],
                         "fieldType": "password",
                      },
                      {
                         "name": "password_again",
                         "type": "password",
                         "field": lang['Password Again'],
                         "fieldType": "password",
                      },
                      {
                          "field": lang['2-Factor Authentication'],
                          "name": "detail=factorAuth",
                          "default":'0',
                          "fieldType": "select",
                          possible: [
                            {
                                "name": lang.No,
                               "value": "0"
                            },
                            {
                               "name": lang.Yes,
                               "value": "1"
                            },
                         ]
                      },
                      {
                         "name": "detail=size",
                         "field": lang['Max Storage Amount'],
                         "default": '10000'
                      },
                      {
                         "name": "detail=days",
                         "field": `${lang['Number of Days to keep']} ${lang['Videos']}`,
                         "default": '5'
                      },
                      {
                         "name": "detail=event_days",
                         "field": `${lang['Number of Days to keep']} ${lang['Events']}`,
                         "default": '10'
                      },
                      {
                         "name": "detail=log_days",
                         "field": `${lang['Number of Days to keep']} ${lang['Logs']}`,
                         "default": '10'
                      },
                      // {
                      //    "name": "detail=log_timelapseFrames",
                      //    "field": `${lang['Number of Days to keep']} ${lang['Timelapse Frames']}`,
                      //    "default": '10'
                      // },
                      {
                         "name": "detail=max_camera",
                         "field": lang['Max Number of Cameras'],
                         "placeholder": lang['Leave blank for unlimited']
                      },
                      {
                          "field": lang.Permissions,
                          "name": "detail=permissions",
                          "default":'1',
                          "fieldType": "select",
                          selector:'more_perms',
                          possible: [
                            {
                                "name": lang['All Privileges'],
                               "value": "all"
                            },
                            {
                               "name": lang.Limited,
                               "value": "limited"
                            },
                         ]
                      },
                      {
                          "field": lang['Can edit Max Storage'],
                          "name": "detail=edit_size",
                          "default":'1',
                          "fieldType": "select",
                          "form-group-class":"more_perms_input more_perms_limited",
                          possible: [
                            {
                                "name": lang.No,
                               "value": "0"
                            },
                            {
                               "name": lang.Yes,
                               "value": "1"
                            },
                         ]
                      },
                      {
                          "field": lang['Can edit Max Days'],
                          "name": "detail=edit_days",
                          "default":'1',
                          "fieldType": "select",
                          "form-group-class":"more_perms_input more_perms_limited",
                          possible: [
                            {
                                "name": lang.No,
                               "value": "0"
                            },
                            {
                               "name": lang.Yes,
                               "value": "1"
                            },
                         ]
                      },
                      {
                          "field": lang['Can edit how long to keep Events'],
                          "name": "detail=edit_event_days",
                          "default":'1',
                          "fieldType": "select",
                          "form-group-class":"more_perms_input more_perms_limited",
                          possible: [
                            {
                                "name": lang.No,
                               "value": "0"
                            },
                            {
                               "name": lang.Yes,
                               "value": "1"
                            },
                         ]
                      },
                      {
                          "field": lang['Can edit how long to keep Logs'],
                          "name": "detail=edit_log_days",
                          "default":'1',
                          "fieldType": "select",
                          "form-group-class":"more_perms_input more_perms_limited",
                          possible: [
                            {
                                "name": lang.No,
                               "value": "0"
                            },
                            {
                               "name": lang.Yes,
                               "value": "1"
                            },
                         ]
                      },
                      // NEEDS TO MOVE DESIGNATED FILES AFTER TESTING >
                      {
                          "field": lang['Can use Amazon S3'],
                          "name": "detail=use_aws_s3",
                          "default":'1',
                          "fieldType": "select",
                          "form-group-class":"more_perms_input more_perms_limited",
                          possible: [
                            {
                                "name": lang.No,
                               "value": "0"
                            },
                            {
                               "name": lang.Yes,
                               "value": "1"
                            },
                         ]
                      },
                      {
                          "field": lang['Can use Wasabi Hot Cloud Storage'],
                          "name": "detail=use_whcs",
                          "default":'1',
                          "fieldType": "select",
                          "form-group-class":"more_perms_input more_perms_limited",
                          possible: [
                            {
                                "name": lang.No,
                               "value": "0"
                            },
                            {
                               "name": lang.Yes,
                               "value": "1"
                            },
                         ]
                      },
                      {
                          "field": lang['Can use SFTP'],
                          "name": "detail=use_sftp",
                          "default":'1',
                          "fieldType": "select",
                          "form-group-class":"more_perms_input more_perms_limited",
                          possible: [
                            {
                                "name": lang.No,
                               "value": "0"
                            },
                            {
                               "name": lang.Yes,
                               "value": "1"
                            },
                         ]
                      },
                      {
                          "field": lang['Can use WebDAV'],
                          "name": "detail=use_webdav",
                          "default":'1',
                          "fieldType": "select",
                          "form-group-class":"more_perms_input more_perms_limited",
                          possible: [
                            {
                                "name": lang.No,
                               "value": "0"
                            },
                            {
                               "name": lang.Yes,
                               "value": "1"
                            },
                         ]
                      },
                      {
                          "field": lang['Can use Discord Bot'],
                          "name": "detail=use_discordbot",
                          "default":'1',
                          "fieldType": "select",
                          "form-group-class":"more_perms_input more_perms_limited",
                          possible: [
                            {
                                "name": lang.No,
                               "value": "0"
                            },
                            {
                               "name": lang.Yes,
                               "value": "1"
                            },
                         ]
                      },
                      {
                          "field": lang['Can use LDAP'],
                          "name": "detail=use_ldap",
                          "default":'1',
                          "fieldType": "select",
                          "form-group-class":"more_perms_input more_perms_limited",
                          possible: [
                            {
                                "name": lang.No,
                               "value": "0"
                            },
                            {
                               "name": lang.Yes,
                               "value": "1"
                            },
                         ]
                      },
                      {
                          "field": lang['Use Global Amazon S3 Video Storage'],
                          "name": "detail=aws_use_global",
                          "default":'0',
                          "fieldType": "select",
                          "form-group-class":"more_perms_input more_perms_limited",
                          possible: [
                            {
                                "name": lang.No,
                               "value": "0"
                            },
                            {
                               "name": lang.Yes,
                               "value": "1"
                            },
                         ]
                      },
                      {
                          "field": lang['Use Global Wasabi Hot Cloud Storage Video Storage'],
                          "name": "detail=whcs_use_global",
                          "default":'0',
                          "fieldType": "select",
                          "form-group-class":"more_perms_input more_perms_limited",
                          possible: [
                            {
                                "name": lang.No,
                               "value": "0"
                            },
                            {
                               "name": lang.Yes,
                               "value": "1"
                            },
                         ]
                      },
                      {
                          "field": lang['Use Global Backblaze B2 Video Storage'],
                          "name": "detail=b2_use_global",
                          "default":'0',
                          "fieldType": "select",
                          "form-group-class":"more_perms_input more_perms_limited",
                          possible: [
                            {
                                "name": lang.No,
                               "value": "0"
                            },
                            {
                               "name": lang.Yes,
                               "value": "1"
                            },
                         ]
                      },
                      {
                          "field": lang['Use Global WebDAV Video Storage'],
                          "name": "detail=webdav_use_global",
                          "default":'0',
                          "fieldType": "select",
                          "form-group-class":"more_perms_input more_perms_limited",
                          possible: [
                            {
                                "name": lang.No,
                               "value": "0"
                            },
                            {
                               "name": lang.Yes,
                               "value": "1"
                            },
                         ]
                      },
                      // NEEDS TO MOVE DESIGNATED FILES AFTER TESTING />
                      {
                         "fieldType": "btn-group",
                         "btns": [
                             {
                                 "fieldType": "btn",
                                 "class": `submit btn-success fill`,
                                 "btnContent": `${lang['Save']}`,
                             },
                         ],
                      },
                 ]
             },
          }
        },
    "Super User Preferences": {
         "section": "Super User Preferences",
         "blocks": {
             "Editor": {
                noHeader: true,
                "color": "grey",
                "noDefaultSectionClasses": true,
                "box-wrapper-class": "row",
                "info": [
                    {
                        isFormGroupGroup: true,
                        "noHeader": true,
                        "section-pre-class": "col-md-6",
                        info: [
                            {
                               "name": "mail",
                               "field": lang.Email,
                            },
                            {
                               "name": "pass",
                               "type": "password",
                               "fieldType": "password",
                               "field": lang['Password'],
                            },
                            {
                               "name": "pass_again",
                               "type": "password",
                               "fieldType": "password",
                               "field": lang['Password Again'],
                            },
                            {
                               "fieldType": "btn-group",
                               "btns": [
                                   {
                                       "fieldType": "btn",
                                       "class": `submit btn-success`,
                                       "btnContent": `${lang['Save']}`,
                                   },
                               ],
                            },
                        ]
                    },
                    {
                        isFormGroupGroup: true,
                        "name": lang["API Keys"],
                        "section-pre-class": "col-md-6",
                        info: [
                            {
                               "fieldType": "btn-group",
                               "btns": [
                                   {
                                       "fieldType": "btn",
                                       "class": `new-token btn-success`,
                                       "btnContent": `${lang['Add']}`,
                                   },
                               ],
                            },
                            {
                               "id": "super-tokens",
                               "fieldType": "div",
                            },
                        ]
                    },
                ]
            }
        }
    },
    "Help Window": {
           "section": "Help Window",
           "blocks": {
               "Column1": {
                   "name": lang["Helping Hand"],
                  "color": "navy",
                  "blockquote": lang.helpFinderDescription,
                  "section-pre-class": "col-md-4",
                  "info": [
                       {
                         "id": "helpinghand-options",
                         "field": lang["Active Tutorial"],
                         "fieldType": "select",
                         "possible": [
                             // {
                             //    "name": lang['Date Updated'],
                             //    "value": "dateUpdated"
                             // },
                         ]
                      },
                      {
                          "field": lang["Monitor"],
                          "form-group-class": "helping-hand-target-monitor",
                          "fieldType": "select",
                          "class": "monitors_list",
                     },
                     {
                         "fieldType": "btn",
                         "class": `btn-primary fill watch-helping-hand mb-1`,
                         "btnContent": lang.Run,
                     },
                     {
                         "id": "helpinghand-results",
                         "fieldType": "div",
                     },
                 ]
             },
             "Column2": {
                noHeader: true,
                "color": "blue",
                "section-pre-class": "col-md-8",
                "noDefaultSectionClasses": true,
                "box-wrapper-class": "row",
                "info": [
                    {
                        title: lang["New to Shinobi?"],
                        info: `Try reading over some of these links to get yourself started.`,
                        buttons: [
                            {
                                icon: 'newspaper-o',
                                color: 'default',
                                text: lang.afterInstallationGuides,
                                href: 'https://shinobi.video/docs/configure'
                            },
                            {
                                icon: 'plus',
                                color: 'default',
                                text: lang.addingAnH264Camera,
                                href: 'https://shinobi.video/docs/configure#content-adding-an-h264h265-camera'
                            },
                            {
                                icon: 'plus',
                                color: 'default',
                                text: lang.addingAnMJPEGCamera,
                                href: 'https://shinobi.video/articles/2018-09-19-how-to-add-an-mjpeg-camera'
                            },
                            {
                                icon: 'gears',
                                color: 'default',
                                text: lang.rtspCameraOptimization,
                                href: 'https://shinobi.video/articles/2017-07-29-how-i-optimized-my-rtsp-camera'
                            },
                            {
                                icon: 'comments-o',
                                color: 'info',
                                text: lang.communityChat,
                                href: 'https://discord.gg/ehRd8Zz'
                            },
                            {
                                icon: 'reddit',
                                color: 'info',
                                text: lang.forumOnReddit,
                                href: 'https://www.reddit.com/r/ShinobiCCTV'
                            },
                            {
                                icon: 'file-o',
                                color: 'primary',
                                text: lang.Documentation,
                                href: 'http://shinobi.video/docs'
                            }
                        ]
                    },
                    {
                        bigIcon: "smile-o",
                        title: lang.itsAProvenFact,
                        info: lang.generosityHappierPerson,
                        buttons: [
                            {
                                icon: 'share-square-o',
                                color: 'default',
                                text: lang['ShinobiShop Subscriptions'],
                                href: 'https://licenses.shinobi.video/subscribe'
                            },
                            {
                                icon: 'paypal',
                                color: 'default',
                                text: lang['Donate by PayPal'],
                                href: 'https://www.paypal.me/ShinobiCCTV'
                            },
                            {
                                icon: 'bank',
                                color: 'default',
                                text: 'University of Zurich (UZH)',
                                href: 'https://www.zora.uzh.ch/id/eprint/139275/'
                            },
                        ]
                    },
                    {
                        title: lang["Shinobi Mobile"],
                        info: lang.yourSubscriptionText,
                        buttons: [
                            {
                                icon: 'star',
                                color: 'success',
                                text: lang['Get the Mobile App'],
                                href: 'https://shinobi.video/mobile'
                            },
                            {
                                icon: 'comments-o',
                                color: 'primary',
                                text: lang['#mobile-client Chat'],
                                href: 'https://discord.gg/ehRd8Zz'
                            },
                        ]
                    },
                    {
                        title: lang.activateShinobi,
                        info: lang.howToActivate,
                        buttons: [
                            {
                                icon: 'share-square-o',
                                color: 'default',
                                text: 'Shinobi Mobile License ($5/m)',
                                href: 'https://licenses.shinobi.video/subscribe?planSubscribe=plan_G31AZ9mknNCa6z',
                            },
                            {
                                icon: 'share-square-o',
                                color: 'default',
                                text: 'Tiny Support Subscription ($10/m)',
                                href: 'https://licenses.shinobi.video/subscribe?planSubscribe=plan_G42jNgIqXaWmIC',
                            },
                            {
                                icon: 'share-square-o',
                                color: 'default',
                                text: '100 Camera License ($75/m)',
                                href: 'https://licenses.shinobi.video/subscribe?planSubscribe=plan_G3LGdNwA8lSmQy',
                            },
                        ]
                    },
                    {
                        title: lang['Donations, One-Time Boost'],
                        info: lang.donationOneTimeText,
                        width: 12,
                        buttons: [
                            {
                                icon: 'paypal',
                                color: 'default',
                                text: lang['Donate by PayPal'],
                                href: 'https://www.paypal.me/ShinobiCCTV'
                            },
                        ]
                    },
                ].map((block) => {
                    var parsedButtons = block.buttons.map((btn) => {
                        return {
                            "fieldType": "btn",
                            "class": `btn-${btn.color} fill mb-1`,
                            "icon": btn.icon,
                            "attribute": `href="${btn.href}" target="_blank"`,
                            "btnContent": btn.text,
                        }
                    });
                    return {
                       noHeader: true,
                       isFormGroupGroup: true,
                       "section-pre-class": `col-md-${block.width || '6'} mb-3`,
                       "info": [
                           {
                               "fieldType": "div",
                               divContent: `<h3>${block.title}</h3>`
                           },
                           {
                               "fieldType": "div",
                               class: 'mb-3',
                               divContent: block.info
                           },
                           ...parsedButtons
                       ]
                    }
                })
            },
        }
    },
    "Monitor Map": {
         "section": "Monitor Map",
         "blocks": {
             "Search Settings": {
                "name": lang["Monitor Map"],
                "color": "blue",
                "noHeader": true,
                "noDefaultSectionClasses": true,
                "info": [
                    {
                        "fieldType": "div",
                        "id": "monitor-map-canvas",
                    }
               ]
           },
        }
      },
      "Timeline": {
           "section": "Timeline",
           "blocks": {
               "Search Settings": {
                  "name": lang["Timeline"],
                  "color": "blue",
                  "noHeader": true,
                  "noDefaultSectionClasses": true,
                  "box-wrapper-class": "flex-direction-column",
                  "info": [
                      {
                          "fieldType": "div",
                          "class": "row m-0",
                          "id": "timeline-video-canvas",
                      },
                      {
                          "fieldType": "div",
                          "class": "row p-1 m-0",
                          "id": "timeline-info",
                          "divContent": `
                          <div class="text-center">
                            <span class="current-time font-monospace ${textWhiteOnBgDark}"></span>
                          </div>`
                      },
                      {
                          "fieldType": "div",
                          "class": "p-2",
                          "id": "timeline-controls",
                          "divContent": `
                          <div class="text-center">
                              <div class="btn-group">
                                  <a class="btn btn-sm btn-default" timeline-action="jumpPrev" title="${lang.jumptoPreviousVideo}"><i class="fa fa-angle-double-left"></i></a>
                                  <a class="btn btn-sm btn-default" timeline-action="jumpLeft" title="${lang.jumpFiveSeconds}"><i class="fa fa-arrow-circle-left"></i></a>
                                  <a class="btn btn-sm btn-primary" timeline-action="playpause" title="${lang.Play}/${lang.Pause}"><i class="fa fa-play-circle-o"></i></a>
                                  <a class="btn btn-sm btn-default" timeline-action="jumpRight" title="${lang.jumpFiveSeconds}"><i class="fa fa-arrow-circle-right"></i></a>
                                  <a class="btn btn-sm btn-default" timeline-action="jumpNext" title="${lang.jumptoNextVideo}"><i class="fa fa-angle-double-right"></i></a>
                              </div>
                              <div class="btn-group">
                                  <a class="btn btn-sm btn-default btn-success" timeline-action="speed" speed="1" title="${lang.Speed} x1">x1</a>
                                  <a class="btn btn-sm btn-default" timeline-action="speed" speed="2" title="${lang.Speed} x2">x2</a>
                                  <a class="btn btn-sm btn-default" timeline-action="speed" speed="5" title="${lang.Speed} x5">x5</a>
                                  <a class="btn btn-sm btn-default" timeline-action="speed" speed="7" title="${lang.Speed} x7">x7</a>
                                  <a class="btn btn-sm btn-default" timeline-action="speed" speed="10" title="${lang.Speed} x10">x10</a>
                              </div>
                              <div class="btn-group">
                                  <a class="btn btn-sm btn-default" timeline-action="gridSize" size="md-12">1</a>
                                  <a class="btn btn-sm btn-default btn-success" timeline-action="gridSize" size="md-6">2</a>
                                  <a class="btn btn-sm btn-default" timeline-action="gridSize" size="md-4">3</a>
                              </div>
                              <div class="btn-group">
                                  <input class="form-control form-control-sm" id="timeline-video-object-search" placeholder="${lang['Search Object Tags']}">
                              </div>
                              <div class="btn-group">
                                  <select class="form-control form-control-sm" id="timeline-video-type">
                                    <option value="">${lang.Local}</option>
                                    <option value="cloud">${lang.Cloud}</option>
                                    <option value="archive">${lang.Archive}</option>
                                  </select>
                              </div>
                              <div class="btn-group">
                                  <a class="btn btn-sm btn-primary" timeline-action="autoGridSizer" title="${lang.autoResizeGrid}"><i class="fa fa-expand"></i></a>
                                  <a class="btn btn-sm btn-primary" timeline-action="playUntilVideoEnd" title="${lang.playUntilVideoEnd}"><i class="fa fa-step-forward"></i></a>
                                  <a class="btn btn-sm btn-primary btn-warning" timeline-action="dontShowDetection" title="${lang['Hide Detection on Stream']}"><i class="fa fa-grav"></i></a>
                              </div>
                              <div class="btn-group">
                                  <a class="btn btn-sm btn-success" timeline-action="downloadAll" title="${lang.Download}"><i class="fa fa-download"></i></a>
                              </div>
                              <div class="btn-group">
                                  <a class="btn btn-sm btn-default" class_toggle="show-non-playing" data-target="#timeline-video-canvas" icon-toggle="fa-eye fa-eye-slash" icon-child="i" title="${lang['Show Only Playing']}"><i class="fa fa-eye-slash"></i></a>
                                  <a class="btn btn-sm btn-default" timeline-action="refresh" title="${lang.Refresh}"><i class="fa fa-refresh"></i></a>
                              </div>
                              <div class="btn-group">
                                  <a class="btn btn-sm btn-primary" id="timeline-date-selector" title="${lang.Date}"><i class="fa fa-calendar"></i></a>
                              </div>
                              <div class="btn-group">
                                  <button type="button" class="btn btn-primary btn-sm dropdown-toggle dropdown-toggle-split" data-bs-toggle="dropdown" aria-expanded="false">
                                      <i class="fa fa-video-camera"></i>
                                  </button>
                                  <ul class="dropdown-menu px-3 bg-dark" id="timeline-monitor-list"></ul>
                              </div>
                          </div>
                          `,
                      },
                      {
                          "fieldType": "div",
                          "id": "timeline-bottom-strip",
                      },
                      {
                          "fieldType": "div",
                          "id": "timeline-pre-buffers",
                          "class": "hidden",
                      }
                 ]
             },
          }
      },
      "Rally": {
            "section": "Rally",
            "name": "Rally",
            "blocks": {
                "Search Settings": {
                   "id": "rallyConfigure",
                   "name": lang.Scan,
                   "blockquote": lang.RallyDescription,
                   "color": "green",
                   "section-pre-class": "col-md-4",
                   isFormGroupGroup: true,
                   "info": [
                       {
                           "name": "host",
                           "field": lang["Host"],
                           "placeholder": "http://shinobi_host:8080",
                       },
                       {
                           "name": "groupKey",
                           "field": lang["Group Key"],
                       },
                       {
                           "name": "apiKey",
                           "field": lang["API Key"],
                           "description": lang.rallyApiKeyFieldText,
                       },
                       {
                           "name": "channel",
                           "field": lang["Channel"],
                           "description": lang.rallyChannelDescription,
                       },
                       {
                         "fieldType": "btn-group",
                         "btns": [
                             {
                                 forForm: true,
                                 "fieldType": "btn",
                                 "class": `btn-success fill mb-3`,
                                 "icon": `search`,
                                 "attribute": `type="submit"`,
                                 "btnContent": `${lang['Scan']}`,
                             }
                          ]
                       }
                  ]
              },
              "Management": {
                 "id": "rallyManagement",
                 "noHeader": true,
                 "color": "blue",
                 "section-pre-class": "col-md-8",
                 "info": [
                     {
                         "id":"rallyServerInfo",
                         "fieldType": "div",
                         "class": "mb-3",
                     },
                     {
                        "fieldType": "btn-group",
                        "class": "mb-3",
                        "btns": [
                            {
                                "fieldType": "btn",
                                "class": `btn-success add-all`,
                                "btnContent": `<i class="fa fa-plus"></i> ${lang['Add All (Rallied)']}`,
                            },
                            // {
                            //     "fieldType": "btn",
                            //     "class": `btn-success add-all-direct`,
                            //     "btnContent": `<i class="fa fa-plus"></i> ${lang['Add All (Direct)']}`,
                            // },
                        ],
                     },
                     {
                         "id":"rallyCameras",
                         "fieldType": "table",
                         "attribute": `data-classes="table table-striped"`,
                         "divContent": ""
                     }
                 ]
             },
           }
       }
  })
}
