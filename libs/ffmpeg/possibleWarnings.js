module.exports = (monitor,probeResult,config,lang) => {
    const primaryVideoStream = probeResult.video[0]
    const noPortOr554 = !monitor.port || monitor.port === 554
    return [
        {
            isTrue: monitor.details.stream_vcodec === 'copy' && primaryVideoStream.codec === 'hevc',
            title: lang['Codec Mismatch'],
            text: lang.codecMismatchText1,
            level: 5,
        },
        {
            isTrue: (
                (
                    monitor.details.stream_type === 'mp4' ||
                    monitor.details.stream_type === 'flv' ||
                    monitor.details.stream_type === 'hls'
                ) &&
                monitor.details.stream_vcodec === 'copy' &&
                primaryVideoStream.codec === 'mjpeg'
            ),
            title: lang['Automatic Codec Repair'],
            text: lang.codecMismatchText2,
            level: 10,
            automaticChange: {
                details: {
                    stream_type: 'mjpeg'
                }
            }
        },
        {
            isTrue: (
                (
                    monitor.details.stream_type === 'mjpeg' ||
                    monitor.details.stream_vcodec === 'libx264'
                ) &&
                primaryVideoStream.codec === 'h264'
            ),
            title: lang['Performance Optimization Possible'],
            text: lang.performanceOptimizeText1,
            level: 1,
        },
        {
            isTrue: (
                monitor.details.vcodec === 'copy' &&
                primaryVideoStream.codec === 'mjpeg'
            ),
            title: lang['Codec Mismatch'],
            text: lang.codecMismatchText3,
            level: 10,
            automaticChange: {
                fps: probeResult.fps,
                details: {
                    vcodec: 'libx264',
                }
            }
        },
        {
            isTrue: (
                !monitor.details.sfps &&
                primaryVideoStream.codec === 'mjpeg'
            ),
            title: lang['Field Missing Value'],
            text: lang.fieldMissingValueText1,
            level: 10,
            automaticChange: {
                details: {
                    sfps: probeResult.fps,
                }
            }
        },
        {
            isTrue: (
                !monitor.details.sfps &&
                primaryVideoStream.codec === 'mjpeg'
            ),
            title: lang['Field Missing Value'],
            text: lang.fieldMissingValueText1,
            level: 10,
            automaticChange: {
                details: {
                    sfps: probeResult.fps,
                }
            }
        },
        {
            isTrue: (
                noPortOr554 &&
                monitor.protocol === 'rtmp'
            ),
            title: lang['Automatic Field Fill'],
            text: lang.Port + ' : 1935',
            level: 10,
            automaticChange: {
                port: '1935'
            }
        },
        {
            isTrue: (
                noPortOr554 &&
                monitor.protocol === 'http'
            ),
            title: lang['Automatic Field Fill'],
            text: lang.Port + ' : 80',
            level: 10,
            automaticChange: {
                port: '80'
            }
        },
        {
            isTrue: (
                noPortOr554 &&
                (monitor.protocol === 'rtmps' ||
                monitor.protocol === 'https')
            ),
            title: lang['Automatic Field Fill'],
            text: lang.Port + ' : 443',
            level: 10,
            automaticChange: {
                port: '443'
            }
        },
        {
            isTrue: (
                !monitor.port &&
                monitor.protocol === 'rtsp'
            ),
            title: lang['Automatic Field Fill'],
            text: lang.Port + ' : 554',
            level: 10,
            automaticChange: {
                port: '554'
            }
        },
        // {
        //     isTrue: (
        //         !monitor.details.cutoff
        //     ),
        //     title: lang['Automatic Field Fill'],
        //     text: lang.Protocol + ' : 554',
        //     level: 10,
        //     automaticChange: {
        //         port: '554'
        //     }
        // },
    ];
}
