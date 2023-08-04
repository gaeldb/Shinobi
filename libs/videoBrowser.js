const knex = require('knex');
const moment = require('moment');

const ENDPOINT_SECTION = "videoBrowser";

module.exports = (s, shinobiConfig, lang, app, io) => {
    const instance = {
        db: null,
        timeZoneOffest: 0
    };

    const setOkResponse = (response, data, message) => {
        console.debug(message);

        response.send({
            ok: true,
            data: data
        }); 
    };

    const setErrorResponse = (response, error, flowName) => {
        console.error(`Failed to ${flowName}, Error: ${error}`);

        response.status(500).send();
    };

    const getISODateTime = (date) => {
        const dateTime = moment(date).add(instance.timeZoneOffest, "minutes");
        const dateTimeISO = dateTime.toISOString();
        const dateTimeISOParts = dateTimeISO.split(".");
        const result = dateTimeISOParts[0];

        return result;
    };

    const getISODate = (dateStr) => {
        const dateTimeISO = getISODateTime(dateStr);
        const dateTimeISOParts = dateTimeISO.split("T");
        const dateISO = dateTimeISOParts[0];

        return dateISO;
    };

    const fixItemsDate = (dataItems) => {
        dataItems.forEach(i => {
            i.date = getISODate(i.date);
        });
    };

    const getMonitorsList = (requestParams, response) => {
        const groupKey = requestParams.ke;

        instance.db
            .select('ke', 'mid')
            .from('Videos')
            .where('ke', '=', groupKey)
            .groupBy('ke')
            .groupBy('mid')
            .then(data => {
                setOkResponse(
                    response, 
                    data, 
                    `Reterived ${data.length} monitors with videos, Group ID: ${groupKey}`
                );

            })
            .catch(error => {
                setErrorResponse(
                    response, 
                    error, 
                    `reterive monitors list, Group ID: ${groupKey}`
                );
            });
    };

    const setResponseForMonitorDatesList = (response, videoItems, imageItems) => {
        const firstVideoItem = videoItems[0];
        const groupKey = firstVideoItem.ke;
        const monitorId = firstVideoItem.mid;

        fixItemsDate(imageItems);

        videoItems.forEach(v => {
            const imagesOfVideo = imageItems.filter(i => i.date === v.date);

            if (imagesOfVideo.length > 0) {
                const chosenImage = imagesOfVideo[0];

                v.filename = chosenImage.filename;
            }
        }); 

        setOkResponse(
            response, 
            videoItems, 
            `Reterived ${videoItems.length} videos and ${imageItems.length} images, Group ID: ${groupKey}, Monitor ID: ${monitorId}`
        );
    };

    const loadImagesForMonitorDatesList = (response, videoItems) => {
        const firstVideoItem = videoItems[0];
        const groupKey = firstVideoItem.ke;
        const monitorId = firstVideoItem.mid;

        fixItemsDate(videoItems);

        instance.db
            .select('ke', 'mid', 'filename', instance.db.raw("CAST(time AS DATE) as date"))
            .from('Timelapse Frames')
            .where('ke', '=', groupKey)
            .andWhere('mid', '=', monitorId)
            .groupBy('ke')
            .groupBy('mid')
            .groupByRaw('CAST(time AS DATE)')
            .orderBy("time", "desc")
            .then(imageItems => {
                setResponseForMonitorDatesList(response, videoItems, imageItems);
            })
            .catch(error => {
                setErrorResponse(
                    response, 
                    error, 
                    `reterive monitor dates list, Group ID: ${groupKey}, Monitor ID: ${monitorId}`
                );
            });
    };

    const getMonitorDatesList = (requestParams, response) => {
        const groupKey = requestParams.ke;
        const monitorId = requestParams.id;

        instance.db
            .select('ke', 'mid', instance.db.raw("CAST(time AS DATE) as date"))
            .from('Videos')
            .where('ke', '=', groupKey)
            .andWhere('mid', '=', monitorId)
            .groupBy('ke')
            .groupBy('mid')
            .groupByRaw('CAST(time AS DATE)')
            .orderBy("time", "desc")
            .then(videoItems => {
                loadImagesForMonitorDatesList(response, videoItems);
            })
            .catch(error => {
                setErrorResponse(
                    response, 
                    error, 
                    `reterive monitor dates list, Group ID: ${groupKey}, Monitor ID: ${monitorId}`
                );
            });
    };

    const setResponseForMonitorVideosList = (response, videoItems, imageItems) => {
        const firstVideoItem = videoItems[0];
        const monitorId = firstVideoItem.mid;
        const videoDate = getISODate(firstVideoItem.date);

        videoItems.forEach(v => {
            const imagesOfVideo = imageItems.filter(i => i.time >= v.time && i.time <= v.end);

            v.time = getISODateTime(v.time);
            v.end = getISODateTime(v.end);

            if (imagesOfVideo.length > 0) {
                v.filename = imagesOfVideo[0].filename;
            }
        }); 

        setOkResponse(
            response, 
            videoItems, 
            `Reterived ${videoItems.length} videos and ${imageItems.length} images, Monitor ID: ${monitorId}, Date: ${videoDate}`
        );
    };

    const loadImagesForMonitorVideosList = (requestParams, response, videoItems) => {
        const groupKey = requestParams.ke;
        const monitorId = requestParams.id;
        const videoDate = requestParams.date;

        instance.db
            .select('ke', 'mid', 'time', 'filename')
            .from('Timelapse Frames')
            .where('ke', '=', groupKey)
            .andWhere('mid', '=', monitorId)
            .andWhere('time', '>=', `${videoDate} 00:00:00.000`)
            .andWhere('time', '<=', `${videoDate} 23:59:59.999`)
            .orderBy("time", "desc")
            .then(imageItems => {
                setResponseForMonitorVideosList(response, videoItems, imageItems);
            })
            .catch(error => {
                setErrorResponse(
                    response, 
                    error, 
                    `reterive monitor videos list, Group ID: ${groupKey}, Monitor ID: ${monitorId}, Date: ${videoDate}`
                );
            });
    };

    const getMonitorVideosList = (requestParams, response) => {        
        const groupKey = requestParams.ke;
        const monitorId = requestParams.id;
        const videoDate = requestParams.date;

        instance.db
            .select('ke', 'mid', 'time', 'end', 'ext')
            .from('Videos')
            .where('ke', '=', groupKey)
            .andWhere('mid', '=', monitorId)
            .andWhere('time', '>=', `${videoDate} 00:00:00.000`)
            .andWhere('time', '<=', `${videoDate} 23:59:59.999`)
            .orderBy("time", "desc")
            .then(videoItems => {
                loadImagesForMonitorVideosList(requestParams, response, videoItems);
            })
            .catch(error => {
                setErrorResponse(
                    response, 
                    error, 
                    `reterive monitor videos list, Group ID: ${groupKey}, Monitor ID: ${monitorId}, Date: ${videoDate}`
                );
            });
    };

    const initialize = () => {
        const apiPrefix = `${shinobiConfig.webPaths.apiPrefix}:auth/${ENDPOINT_SECTION}`;

        const apiSettings = [
            {
                suffix: `/:ke`,
                callback: getMonitorsList
            },
            {
                suffix: `/:ke/:id`,
                callback: getMonitorDatesList
            },
            {
                suffix:`/:ke/:id/:date`,
                callback: getMonitorVideosList
            }
        ];

        apiSettings.forEach(endpointSettings => {
            const endpointSuffix = endpointSettings.suffix;
            const endpointCallback = endpointSettings.callback;
            
            const endpointRoute = `${apiPrefix}${endpointSuffix}`

            app.get(endpointRoute, (req, res) => {
                s.auth(req.params, user => {
                    endpointCallback(req.params, res);
                }, res, req);
            });
        });
    
        const dbConfig = {
            client: shinobiConfig.databaseType,
            connection: shinobiConfig.db
        };

        if(dbConfig.client.indexOf('sqlite')>-1){
            dbConfig.client = 'sqlite3';
            dbConfig.useNullAsDefault = true;
        }
    
        if(dbConfig.client === 'sqlite3' && dbConfig.connection.filename === undefined){
            dbConfig.connection.filename = `${__dirname}/shinobi.sqlite`;
        }
    
        instance.db = knex(dbConfig);
        instance.timeZoneOffest = new Date().getTimezoneOffset() * -1;
    };

    initialize();
};
