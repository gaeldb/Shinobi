const async = require("async");
module.exports = function(s,config){
    const isMySQL = config.databaseType === 'mysql';
    const runQuery = async.queue(function(data, callback) {
        s.databaseEngine
        .raw(data.query,data.values)
        .asCallback(callback)
    }, 4);
    function stringToSqlTime(value){
        newValue = new Date(value.replace('T',' '))
        return newValue
    }
    const mergeQueryValues = function(query,values){
        if(!values){values=[]}
        var valuesNotFunction = true;
        if(typeof values === 'function'){
            var values = [];
            valuesNotFunction = false;
        }
        if(values&&valuesNotFunction){
            var splitQuery = query.split('?')
            var newQuery = ''
            splitQuery.forEach(function(v,n){
                newQuery += v
                var value = values[n]
                if(value){
                    if(isNaN(value) || value instanceof Date){
                        newQuery += "'"+value+"'"
                    }else{
                        newQuery += value
                    }
                }
            })
        }else{
            newQuery = query
        }
        return newQuery
    }
    const cleanSqlWhereObject = (where) => {
        const newWhere = {}
        Object.keys(where).forEach((key) => {
            if(key !== '__separator'){
                const value = where[key]
                newWhere[key] = value
            }
        })
        return newWhere
    }
    const processSimpleWhereCondition = (dbQuery,where,didOne) => {
        var whereIsArray = where instanceof Array;
        if(where[0] === 'or' || where.__separator === 'or'){
            if(whereIsArray){
                where.shift()
                dbQuery.orWhere(...where)
            }else{
                where = cleanSqlWhereObject(where)
                dbQuery.orWhere(where)
            }
        }else if(!didOne){
            didOne = true
            whereIsArray ? dbQuery.where(...where) : dbQuery.where(where)
        }else{
            whereIsArray ? dbQuery.andWhere(...where) : dbQuery.andWhere(where)
        }
    }
    const processWhereCondition = (dbQuery,where,didOne) => {
        var whereIsArray = where instanceof Array;
        if(!where[0])return;
        if(where[0] && where[0] instanceof Array){
            dbQuery.where(function() {
                var _this = this
                var didOneInsideGroup = false
                where.forEach((whereInsideGroup) => {
                    processWhereCondition(_this,whereInsideGroup,didOneInsideGroup)
                })
            })
        }else if(where[0] && where[0] instanceof Object){
            dbQuery.where(function() {
                var _this = this
                var didOneInsideGroup = false
                where.forEach((whereInsideGroup) => {
                    processSimpleWhereCondition(_this,whereInsideGroup,didOneInsideGroup)
                })
            })
        }else{
            processSimpleWhereCondition(dbQuery,where,didOne)
        }
    }
    const knexError = (dbQuery,options,err) => {
        console.error('knexError----------------------------------- START')
        if(config.debugLogVerbose && config.debugLog === true){
            s.debugLog('STACK TRACE, NOT AN ',new Error())
        }
        console.error(err)
        // CANNOT USE `dbQuery.toString()` because it breaks the query
        console.error(options)
        console.error('knexError----------------------------------- END')
    }
    const knexQuery = (options,callback) => {
        try{
            if(!s.databaseEngine)return// console.log('Database Not Set');
            // options = {
            //     action: "",
            //     columns: "",
            //     table: ""
            // }
            var dbQuery
            switch(options.action){
                case'select':
                    options.columns = options.columns.indexOf(',') === -1 ? [options.columns] : options.columns.split(',');
                    dbQuery = s.databaseEngine.select(...options.columns).from(options.table)
                break;
                case'count':
                    options.columns = options.columns.indexOf(',') === -1 ? [options.columns] : options.columns.split(',');
                    dbQuery = s.databaseEngine(options.table)
                    dbQuery.count(options.columns)
                break;
                case'update':
                    dbQuery = s.databaseEngine(options.table).update(options.update)
                break;
                case'delete':
                    dbQuery = s.databaseEngine(options.table)
                break;
                case'insert':
                    dbQuery = s.databaseEngine(options.table).insert(options.insert)
                break;
            }
            if(options.where instanceof Array){
                var didOne = false;
                options.where.forEach((where) => {
                    processWhereCondition(dbQuery,where,didOne)
                })
            }else if(options.where instanceof Object){
                dbQuery.where(options.where)
            }
            if(options.action === 'delete'){
                dbQuery.del()
            }
            if(options.orderBy){
                dbQuery.orderBy(...options.orderBy)
            }
            if(options.groupBy){
                dbQuery.groupBy(options.groupBy)
            }
            if(options.limit && options.limit !== '0'){
                if(`${options.limit}`.indexOf(',') === -1){
                    dbQuery.limit(options.limit)
                }else{
                    const limitParts = `${options.limit}`.split(',')
                    dbQuery.limit(limitParts[1]).offset(limitParts[0])
                }
            }
            if(config.debugLog === true){
                // CANNOT USE `dbQuery.toString()` because it breaks the query
                console.log(JSON.stringify(options,null,3))
            }
            if(callback || options.update || options.insert || options.action === 'delete'){
                dbQuery.asCallback(function(err,r) {
                    if(err){
                        knexError(dbQuery,options,err)
                    }
                    if(callback)callback(err,r)
                    if(config.debugLogVerbose && config.debugLog === true){
                        s.debugLog('s.knexQuery QUERY',JSON.stringify(options,null,3))
                        s.debugLog('s.knexQuery RESPONSE',JSON.stringify(r,null,3))
                        s.debugLog('STACK TRACE, NOT AN ',new Error())
                    }
                })
            }
            return dbQuery
        }catch(err){
            if(callback)callback(err,[])
            knexError(dbQuery,options,err)
        }
    }
    const getDatabaseRows = function(options,callback){
        //current cant handle `end` time
       var whereQuery = options.groupKey ? [
           ['ke','=',options.groupKey],
       ] : []
       const monitorRestrictions = options.monitorRestrictions
       var frameLimit = options.limit
       const noLimit = options.noLimit === '1'
       const endIsStartTo = options.endIsStartTo
       const chosenDate = options.date
       const startDate = options.startDate ? stringToSqlTime(options.startDate) : null
       const endDate = options.endDate ? stringToSqlTime(options.endDate) : null
       const startOperator = options.startOperator || '>='
       const endOperator = options.endOperator || '<='
       const rowType = options.rowType || 'rows'
       if(chosenDate){
           if(chosenDate.indexOf('-') === -1 && !isNaN(chosenDate)){
               chosenDate = parseInt(chosenDate)
           }
           var selectedDate = chosenDate
           if(typeof chosenDate === 'string' && chosenDate.indexOf('.') > -1){
               selectedDate = chosenDate.split('.')[0]
           }
           selectedDate = new Date(selectedDate)
           var utcSelectedDate = new Date(selectedDate.getTime() + selectedDate.getTimezoneOffset() * 60000)
           startDate = moment(utcSelectedDate).format('YYYY-MM-DD HH:mm:ss')
           var dayAfter = utcSelectedDate
           dayAfter.setDate(dayAfter.getDate() + 1)
           endDate = moment(dayAfter).format('YYYY-MM-DD HH:mm:ss')
       }
       if(startDate){
           if(endDate){
               whereQuery.push(['time',startOperator,startDate])
               whereQuery.push([endIsStartTo ? 'time' : 'end',endOperator,endDate])
           }else{
               whereQuery.push(['time',startOperator,startDate])
           }
       }
       if(monitorRestrictions && monitorRestrictions.length > 0){
           whereQuery.push(monitorRestrictions)
       }
       if(options.archived){
           whereQuery.push(['archive','=',`1`])
       }
       if(options.filename){
           whereQuery.push(['filename','=',options.filename])
           frameLimit = "1";
       }
       if(noLimit)frameLimit = '0';
       options.orderBy = options.orderBy ? options.orderBy : ['time','desc']
       if(options.count)options.groupBy = options.groupBy ? options.groupBy : options.orderBy[0]
       knexQuery({
           action: options.count ? "count" : "select",
           columns: options.columns || "*",
           table: options.table,
           where: whereQuery,
           orderBy: options.orderBy,
           groupBy: options.groupBy,
           limit: frameLimit || '500'
       },(err,r) => {
           if(err){
               callback({
                   ok: false,
                   total: 0,
                   limit: frameLimit,
                   [rowType]: []
               })
           }else{
               r.forEach(function(file){
                   file.details = s.parseJSON(file.details)
               })
               callback({
                   ok: true,
                   total: r.length,
                   limit: frameLimit,
                   [rowType]: r
               })
           }
       })
    }
    const sqlQuery = (query,values,onMoveOn,hideLog) => {
        if(!values){values=[]}
        if(typeof values === 'function'){
            var onMoveOn = values;
            var values = [];
        }
        if(!onMoveOn){onMoveOn=function(){}}
        // if(s.databaseOptions.client === 'pg'){
        //     query = query
        //         .replace(/ NOT LIKE /g," NOT ILIKE ")
        //         .replace(/ LIKE /g," ILIKE ")
        // }
        if(config.debugLog === true){
            var mergedQuery = mergeQueryValues(query,values)
            s.debugLog('s.sqlQuery QUERY',mergedQuery)
        }
        if(!s.databaseEngine || !s.databaseEngine.raw){
            s.connectDatabase()
        }
        return runQuery.push({
            query: query,
            values: values
        },function(err,r){
            if(err && !hideLog){
                console.log('s.sqlQuery QUERY ERRORED',query)
                console.log('s.sqlQuery ERROR',err)
            }
            if(onMoveOn && typeof onMoveOn === 'function'){
                switch(s.databaseOptions.client){
                    case'sqlite3':
                        if(!r)r=[]
                    break;
                    default:
                        if(r)r=r[0]
                    break;
                }
                onMoveOn(err,r)
            }
        })
    }
    const sqlQueryBetweenTimesWithPermissions = (options,callback) => {
        // options = {
        //     table: 'Events Counts',
        //     user: user,
        //     monitorId: req.params.id,
        //     startTime: req.query.start,
        //     endTime: req.query.end,
        //     startTimeOperator: req.query.startOperator,
        //     endTimeOperator: req.query.endOperator,
        //     limit: req.query.limit,
        //     archived: req.query.archived,
        //     endIsStartTo: !!req.query.endIsStartTo,
        //     parseRowDetails: true,
        //     rowName: 'counts'
        // }
        const rowName = options.rowName || 'rows'
        const preliminaryValidationFailed = options.preliminaryValidationFailed || false
        if(preliminaryValidationFailed){
            if(options.noFormat){
                callback([]);
            }else{
                callback({
                    ok: true,
                    [rowName]: [],
                })
            }
            return
        }
        const user = options.user
        const groupKey = options.groupKey
        const monitorId = options.monitorId
        const archived = options.archived
        const theTableSelected = options.table
        const endIsStartTo = options.endIsStartTo
        const userDetails = user.details
        var endTime = options.endTime
        var startTimeOperator = options.startTimeOperator
        var endTimeOperator = options.endTimeOperator
        var startTime = options.startTime
        var limitString = `${options.limit}`
        const  monitorRestrictions = options.monitorRestrictions || s.getMonitorsPermitted(user.details,monitorId).monitorRestrictions
        getDatabaseRows({
            monitorRestrictions: monitorRestrictions,
            table: theTableSelected,
            groupKey: groupKey,
            startDate: startTime,
            endDate: endTime,
            startOperator: startTimeOperator,
            endOperator: endTimeOperator,
            limit: options.noLimit === '1' ? '0' : options.limit,
            archived: archived,
            rowType: rowName,
            endIsStartTo: endIsStartTo
        },(response) => {
            const limit = response.limit
            const r = response[rowName];
            if(!r){
                callback({
                    total: 0,
                    limit: response.limit,
                    skip: 0,
                    [rowName]: []
                });
                return
            }
            if(options.parseRowDetails){
                r.forEach((row) => {
                    row.details = s.parseJSON(row.details,{})
                })
            }
            if(options.noCount){
                if(options.noFormat){
                    callback(r)
                }else{
                    callback({
                        ok: true,
                        limit: response.limit,
                        [rowName]: r,
                        endIsStartTo: endIsStartTo
                    })
                }
            }else{
                getDatabaseRows({
                    monitorRestrictions: monitorRestrictions,
                    columns: 'time',
                    count: true,
                    table: theTableSelected,
                    groupKey: groupKey,
                    startDate: startTime,
                    endDate: endTime,
                    startOperator: startTimeOperator,
                    endOperator: endTimeOperator,
                    archived: archived,
                    type: 'count',
                    endIsStartTo: endIsStartTo
                },(response) => {
                    const count = response.count
                    var skipOver = 0
                    if(limitString.indexOf(',') > -1){
                        skipOver = parseInt(limitString.split(',')[0])
                        limitString = parseInt(limitString.split(',')[1])
                    }else{
                        limitString = parseInt(limitString)
                    }
                    callback({
                        total: response['count(*)'],
                        limit: response.limit,
                        skip: skipOver,
                        [rowName]: r,
                        endIsStartTo: endIsStartTo
                    })
                })
            }
        })
    }
    const knexQueryPromise = (options) => {
        return new Promise((resolve,reject) => {
            knexQuery(options,(err,rows) => {
                resolve({
                    ok: !err,
                    err: err,
                    rows: rows,
                })
            })
        })
    }
    const connectDatabase = function(){
        s.databaseEngine = require('knex')(s.databaseOptions)
    }
    function currentTimestamp(){
        return s.databaseEngine.fn.now()
    }
    async function addColumn(tableName,columns){
        try{
            for (let i = 0; i < columns.length; i++) {
                const column = columns[i]
                if(!column)return;
                await s.databaseEngine.schema.table(tableName, table => {
                    const action = table[column.type](column.name,column.length)
                    if(column.defaultTo !== null && column.defaultTo !== undefined){
                        action.defaultTo(column.defaultTo)
                    }
                })
            }
        }catch(err){
            if(err && err.code !== 'ER_DUP_FIELDNAME'){
                s.debugLog(err)
            }
        }
    }
    async function alterColumn(tableName,columns){
        try{
            for (let i = 0; i < columns.length; i++) {
                const column = columns[i]
                if(!column)return;
                await s.databaseEngine.schema.alterTable(tableName, table => {
                    let action = table[column.type](column.name,column.length)
                    if(column.defaultTo !== null && column.defaultTo !== undefined){
                        action = action.defaultTo(column.defaultTo)
                    }
                    action.alter()
                })
            }
        }catch(err){
            s.debugLog(err)
        }
    }
    async function createTable(tableName,columns,onSuccess){
        try{
            const exists = await s.databaseEngine.schema.hasTable(tableName)
            if (!exists) {
                console.log(`Creating Table "${tableName}"`)
                await s.databaseEngine.schema.createTable(tableName, (table) => {
                    columns.forEach((column) => {
                        if(!column)return;
                        const action = table[column.type](column.name,column.length)
                        if(column.defaultTo !== null && column.defaultTo !== undefined){
                            action.defaultTo(column.defaultTo)
                        }
                    })
                })
                if(onSuccess)await onSuccess();
            }
        }catch(err){
            if(err && err.code !== 'ER_TABLE_EXISTS_ERROR'){
                s.debugLog(err)
            }
        }
    }
    const dateSubtract = function(date, interval, units){
      var ret = date
      var checkRollover = function() { if(ret.getDate() != date.getDate()) ret.setDate(0);};
      switch(interval.toLowerCase()) {
        case 'year'   :  ret.setFullYear(ret.getFullYear() - units); checkRollover();  break;
        case 'quarter':  ret.setMonth(ret.getMonth() - 3*units); checkRollover();  break;
        case 'month'  :  ret.setMonth(ret.getMonth() - units); checkRollover();  break;
        case 'week'   :  ret.setDate(ret.getDate() - 7*units);  break;
        case 'day'    :  ret.setDate(ret.getDate() - units);  break;
        case 'hour'   :  ret.setTime(ret.getTime() - units*3600000);  break;
        case 'minute' :  ret.setTime(ret.getTime() - units*60000);  break;
        case 'second' :default:  ret.setTime(ret.getTime() - units*1000);  break;
      }
      return (new Date(ret))
    }
    const sqlDate = function(value){
        var value = value.toLowerCase()
        var splitValue = value.split(' ')
        var amount = parseFloat(splitValue[0])
        var today = new Date()
        var query
        if(value.indexOf('min') > -1){
            query = dateSubtract(today,'minute',amount)
        }else if(value.indexOf('day') > -1){
            query = dateSubtract(today,'day',amount)
        }else if(value.indexOf('hour') > -1){
            query = dateSubtract(today,'hour',amount)
        }
        return query
    }
    return {
        knexQuery: knexQuery,
        knexQueryPromise: knexQueryPromise,
        knexError: knexError,
        cleanSqlWhereObject: cleanSqlWhereObject,
        processSimpleWhereCondition: processSimpleWhereCondition,
        processWhereCondition: processWhereCondition,
        mergeQueryValues: mergeQueryValues,
        getDatabaseRows: getDatabaseRows,
        sqlQuery: sqlQuery,
        connectDatabase: connectDatabase,
        sqlQueryBetweenTimesWithPermissions: sqlQueryBetweenTimesWithPermissions,
        currentTimestamp,
        createTable,
        alterColumn,
        addColumn,
        isMySQL,
        sqlDate,
        dateSubtract,
    }
}
