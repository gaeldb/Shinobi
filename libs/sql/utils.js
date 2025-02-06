var knex = require('knex');
module.exports = (s,config,databaseOptions) => {
    var databaseOptions = {
        client: config.databaseType,
        connection: config.db,
        pool: { min: 0, max: 10, propagateCreateError: true }
    }
    if(databaseOptions.client.indexOf('sqlite')>-1){
        databaseOptions.client = 'sqlite3';
        databaseOptions.useNullAsDefault = true;
    }
    if(databaseOptions.client === 'sqlite3' && databaseOptions.connection.filename === undefined){
        databaseOptions.connection.filename = __dirname+"/shinobi.sqlite"
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
    const stringToSqlTime = function(value){
        newValue = new Date(value.replace('T',' '))
        return newValue
    }
    const sqlQuery = function(query,values,onMoveOn){
        if(!values){values=[]}
        if(typeof values === 'function'){
            var onMoveOn = values;
            var values = [];
        }
        if(!onMoveOn){onMoveOn=function(){}}
        var mergedQuery = mergeQueryValues(query,values)
        s.debugLog('s.sqlQuery QUERY',mergedQuery)
        return s.databaseEngine
        .raw(query,values)
        .asCallback(function(err,r){
            if(err){
                console.log('s.sqlQuery QUERY ERRORED',query)
                console.log('s.sqlQuery ERROR',err)
            }
            if(onMoveOn && typeof onMoveOn === 'function'){
                switch(databaseOptions.client){
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
            s.debugLog('s.knexQuery QUERY',JSON.stringify(options,null,3))
            s.debugLog('STACK TRACE, NOT AN ',new Error())
        }
        console.error(err)
        console.error(dbQuery.toString())
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
            if(options.limit){
                if(`${options.limit}`.indexOf(',') === -1){
                    dbQuery.limit(options.limit)
                }else{
                    const limitParts = `${options.limit}`.split(',')
                    dbQuery.limit(limitParts[1]).offset(limitParts[0])
                }
            }
            if(config.debugLog === true){
                console.log(dbQuery.toString())
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
    const initiateDatabaseEngine = () => {
        s.databaseEngine = knex(databaseOptions)
        return s.databaseEngine
    }
    return {
        dateSubtract: dateSubtract,
        sqlDate: sqlDate,
        mergeQueryValues: mergeQueryValues,
        stringToSqlTime: stringToSqlTime,
        sqlQuery: sqlQuery,
        cleanSqlWhereObject: cleanSqlWhereObject,
        processSimpleWhereCondition: processSimpleWhereCondition,
        processWhereCondition: processWhereCondition,
        knexError: knexError,
        knexQuery: knexQuery,
        knexQueryPromise: knexQueryPromise,
        initiateDatabaseEngine: initiateDatabaseEngine
    }
}
