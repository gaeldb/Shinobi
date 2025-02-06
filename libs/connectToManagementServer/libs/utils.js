function prettyPrint(obj){
    return JSON.stringify(obj,null,3)
}
function generateId(x){
    if(!x){x=10};var t = "";var p = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for( var i=0; i < x; i++ )
        t += p.charAt(Math.floor(Math.random() * p.length));
    return t;
}
function parseJSON(string){
    var parsed
    try{
        parsed = JSON.parse(string)
    }catch(err){

    }
    if(!parsed)parsed = string
    return parsed
}
module.exports = {
    parseJSON,
    prettyPrint,
    generateId,
}
