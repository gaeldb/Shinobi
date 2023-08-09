module.exports = function(s,config){
    const {
        currentTimestamp,
        createTable,
        addColumn,
        isMySQL,
    } = require('./utils.js')(s,config)
    s.preQueries = async function(){
        await createTable('Logs',[
            isMySQL ? {name: 'utf8', type: 'charset'} : null,
            isMySQL ? {name: 'utf8_general_ci', type: 'collate'} : null,
            {name: 'ke', length: 50, type: 'string'},
            {name: 'mid', length: 100, type: 'string'},
            {name: 'info', type: 'text'},
            {name: 'time', type: 'timestamp', defaultTo: currentTimestamp()},
            // KEY `logs_index` (`ke`,`mid`,`time`)
            {name: ['ke', 'mid', 'time'], type: 'index', length: 'logs_index'},
        ]);
        await createTable('Users',[
            isMySQL ? {name: 'utf8', type: 'charset'} : null,
            isMySQL ? {name: 'utf8_general_ci', type: 'collate'} : null,
            {name: 'ke', length: 50, type: 'string'},
            {name: 'uid', length: 50, type: 'string'},
            {name: 'auth', length: 50, type: 'string'},
            {name: 'mail', length: 100, type: 'string'},
            {name: 'pass', length: 100, type: 'string'},
            {name: 'accountType', type: 'integer', length: 1, defaultTo: 0},
            {name: 'details', type: 'longtext'},
            // UNIQUE KEY `mail` (`mail`)
            {name: 'mail', type: 'unique'},
        ]);
        await createTable('API',[
            isMySQL ? {name: 'utf8', type: 'charset'} : null,
            isMySQL ? {name: 'utf8_general_ci', type: 'collate'} : null,
            {name: 'ke', length: 50, type: 'string'},
            {name: 'uid', length: 50, type: 'string'},
            {name: 'ip', type: 'string'},
            {name: 'code', length: 100, type: 'string'},
            {name: 'details', type: 'text'},
            {name: 'time', type: 'timestamp', defaultTo: currentTimestamp()},
        ]);
        await createTable('LoginTokens',[
            isMySQL ? {name: 'utf8', type: 'charset'} : null,
            isMySQL ? {name: 'utf8_general_ci', type: 'collate'} : null,
            {name: 'loginId', length: 255, type: 'string'},
            {name: 'type', length: 25, type: 'string'},
            {name: 'ke', length: 50, type: 'string'},
            {name: 'uid', length: 50, type: 'string'},
            {name: 'name', length: 50, type: 'string', defaultTo: 'Unknown'},
            // UNIQUE KEY `logintokens_loginid_unique` (`loginId`)
            {name: 'loginId', type: 'unique'},
        ]);
        await createTable('Files',[
            isMySQL ? {name: 'utf8', type: 'charset'} : null,
            isMySQL ? {name: 'utf8_general_ci', type: 'collate'} : null,
            {name: 'ke', length: 50, type: 'string'},
            {name: 'mid', length: 100, type: 'string'},
            {name: 'name', length: 100, type: 'string'},
            {name: 'size', type: 'bigint'},
            {name: 'details', type: 'text'},
            {name: 'status', type: 'integer', length: 1, defaultTo: 0},
            {name: 'archive', type: 'tinyint', length: 1, defaultTo: 0},
            {name: 'time', type: 'timestamp', defaultTo: currentTimestamp()},
        ]);
        await createTable('Videos',[
            isMySQL ? {name: 'utf8', type: 'charset'} : null,
            isMySQL ? {name: 'utf8_general_ci', type: 'collate'} : null,
            {name: 'ke', length: 50, type: 'string'},
            {name: 'mid', length: 100, type: 'string'},
            {name: 'ext', type: 'string', length: 10, defaultTo: 'mp4'},
            {name: 'size', type: 'bigint'},
            {name: 'status', type: 'tinyint', length: 1, defaultTo: 0},
            {name: 'archive', type: 'tinyint', length: 1, defaultTo: 0},
            {name: 'objects', length: 510, type: 'string'},
            {name: 'saveDir', length: 255, type: 'string'},
            {name: 'time', type: 'timestamp', defaultTo: currentTimestamp()},
            {name: 'end', type: 'timestamp', defaultTo: currentTimestamp()},
            {name: 'details', type: 'text'},
            // KEY `videos_index` (`time`)
            {name: ['time'], type: 'index', length: 'videos_index'},
        ]);
        await createTable('Cloud Videos',[
            isMySQL ? {name: 'utf8', type: 'charset'} : null,
            isMySQL ? {name: 'utf8_general_ci', type: 'collate'} : null,
            {name: 'ke', length: 50, type: 'string'},
            {name: 'mid', length: 100, type: 'string'},
            {name: 'href', length: 50, type: 'text'},
            {name: 'size', type: 'bigint'},
            {name: 'details', type: 'text'},
            {name: 'status', type: 'integer', length: 1, defaultTo: 0},
            {name: 'archive', type: 'tinyint', length: 1, defaultTo: 0},
            {name: 'objects', length: 510, type: 'string'},
            {name: 'time', type: 'timestamp', defaultTo: currentTimestamp()},
            {name: 'end', type: 'timestamp', defaultTo: currentTimestamp()},
        ]);
        await createTable('Events',[
            isMySQL ? {name: 'utf8', type: 'charset'} : null,
            isMySQL ? {name: 'utf8_general_ci', type: 'collate'} : null,
            {name: 'ke', length: 50, type: 'string'},
            {name: 'mid', length: 100, type: 'string'},
            {name: 'details', type: 'text'},
            {name: 'archive', type: 'tinyint', length: 1, defaultTo: 0},
            {name: 'time', type: 'timestamp', defaultTo: currentTimestamp()},
            // KEY `events_index` (`ke`,`mid`,`time`)
            {name: ['ke', 'mid', 'time'], type: 'index', length: 'events_index'},
        ]);
        await createTable('Events Counts',[
            isMySQL ? {name: 'utf8', type: 'charset'} : null,
            isMySQL ? {name: 'utf8_general_ci', type: 'collate'} : null,
            {name: 'ke', length: 50, type: 'string'},
            {name: 'mid', length: 100, type: 'string'},
            {name: 'tag', length: 30, type: 'string'},
            {name: 'details', type: 'text'},
            {name: 'count', type: 'integer', length: 10, defaultTo: 1},
            {name: 'time', type: 'timestamp', defaultTo: currentTimestamp()},
            {name: 'end', type: 'timestamp', defaultTo: currentTimestamp()},
        ]);
        await createTable('Timelapse Frames',[
            isMySQL ? {name: 'utf8', type: 'charset'} : null,
            isMySQL ? {name: 'utf8_general_ci', type: 'collate'} : null,
            {name: 'ke', length: 50, type: 'string'},
            {name: 'mid', length: 100, type: 'string'},
            {name: 'filename', length: 50, type: 'string'},
            {name: 'time', type: 'timestamp', defaultTo: currentTimestamp()},
            {name: 'size', type: 'bigint'},
            {name: 'archive', length: 1, type: 'tinyint', defaultTo: 0},
            {name: 'saveDir', length: 255, type: 'string'},
            {name: 'details', type: 'text'},
            // KEY `timelapseframes_index` (`ke`,`mid`,`filename`)
            {name: ['ke', 'mid', 'filename'], type: 'index', length: 'timelapseframes_index'},
        ]);
        await createTable('Cloud Timelapse Frames',[
            isMySQL ? {name: 'utf8', type: 'charset'} : null,
            isMySQL ? {name: 'utf8_general_ci', type: 'collate'} : null,
            {name: 'ke', length: 50, type: 'string'},
            {name: 'mid', length: 100, type: 'string'},
            {name: 'href', type: 'text'},
            {name: 'filename', length: 50, type: 'string'},
            {name: 'time', type: 'timestamp', defaultTo: currentTimestamp()},
            {name: 'size', type: 'bigint'},
            {name: 'details', type: 'text'},
        ]);
        await createTable('Monitors',[
            isMySQL ? {name: 'utf8', type: 'charset'} : null,
            isMySQL ? {name: 'utf8_general_ci', type: 'collate'} : null,
            {name: 'ke', length: 50, type: 'string'},
            {name: 'mid', length: 100, type: 'string'},
            {name: 'name', length: 100, type: 'string'},
            {name: 'details', type: 'longtext'},
            {name: 'type', type: 'string', length: 25, defaultTo: 'h264'},
            {name: 'ext', type: 'string', length: 10, defaultTo: 'mp4'},
            {name: 'protocol', type: 'string', length: 10, defaultTo: 'rtsp'},
            {name: 'host', type: 'string', length: 255, defaultTo: '0.0.0.0'},
            {name: 'path', type: 'string', length: 255, defaultTo: '/'},
            {name: 'port', type: 'integer', length: 8, defaultTo: 554},
            {name: 'fps', type: 'integer', length: 8},
            {name: 'mode', type: 'string', length: 15},
            {name: 'width', type: 'integer', length: 11},
            {name: 'height', type: 'integer', length: 11},
            // KEY `monitors_index` (`ke`,`mode`,`type`,`ext`)
            {name: ['ke', 'mid'], type: 'index', length: 'monitors_index'},
        ]);
        await createTable('Presets',[
            isMySQL ? {name: 'utf8', type: 'charset'} : null,
            isMySQL ? {name: 'utf8_general_ci', type: 'collate'} : null,
            {name: 'ke', length: 50, type: 'string'},
            {name: 'name', length: 100, type: 'string'},
            {name: 'type', length: 50, type: 'string'},
            {name: 'details', type: 'text'},
        ]);
        await createTable('Schedules',[
            isMySQL ? {name: 'utf8', type: 'charset'} : null,
            isMySQL ? {name: 'utf8_general_ci', type: 'collate'} : null,
            {name: 'ke', length: 50, type: 'string'},
            {name: 'name', length: 100, type: 'string'},
            {name: 'details', type: 'text'},
            {name: 'start', length: 10, type: 'string'},
            {name: 'end', length: 10, type: 'string'},
            {name: 'enabled', type: 'integer', length: 1, defaultTo: 1},
        ]);
        // additional requirements for older installs
        await require('./migrate/2022-08-22.js')(s,config)
        await require('./migrate/2022-12-18.js')(s,config)
        await require('./migrate/2023-03-11.js')(s,config)
        delete(s.preQueries)
    }
}
