buildOptions = function(field,possiblities){
    if(!field)console.error('field',field)
    var fieldElement = ''
    possiblities.forEach(function(option){
        if(option.optgroup){
            fieldElement += '<optgroup label="' + option.name + '">'
            fieldElement += buildOptions(field,option.optgroup)
            fieldElement += '</optgroup>'
        }else{
            var selected = ''
            if(option.value === field.default){
              selected = 'selected'
            }
            fieldElement += '<option value="' + option.value + '" ' + selected + '>' + option.name + '</option>'
        }
    })
    return fieldElement
}
module.exports = {
    buildOptions: buildOptions
}