$(document).ready(function(){
    var monitorStatesLoaded = {}
    var monitorStatesPage = $('#tab-monitorStates')
    var monitorStatesSelector = $('#monitorStatesSelector')
    var monitorStatesMonitors = $('#monitorStatesMonitors')
    var theForm = monitorStatesPage.find('form')
    function loadMonitorStatesPresets(callback){
        $.getJSON(getApiPrefix(`monitorStates`),function(d){
            var html = ''
            $.each(d.presets,function(n,v){
                monitorStatesLoaded[v.name] = v
                html += '<option value="' + v.name + '">' + v.name + '</option>'
            })
            monitorStatesSelector.find('optgroup').html(html)
            if(callback)callback()
        })
    }
    addOnTabOpen('monitorStates', function () {
        loadMonitorStatesPresets()
    })
    addOnTabReopen('monitorStates', function () {
        if(monitorStatesSelector.val() === '')loadMonitorStatesPresets()
    })
    var buildOptions = function(field,possiblities,fieldData){
        if(!field)console.error('field',field)
        var fieldElement = ''
        possiblities.forEach(function(option){
            if(option.optgroup){
                fieldElement += '<optgroup label="' + option.name + '">'
                fieldElement += buildOptions(field,option.optgroup,fieldData)
                fieldElement += '</optgroup>'
            }else{
                var selected = ''
                if(option.value === fieldData || option.value === field.default){
                    selected = 'selected'
                }
                fieldElement += '<option value="' + option.value + '" ' + selected + '>' + option.name + '</option>'
            }
        })
        return fieldElement
    }
    var drawBlock = function(monitorSettings,preloadedData){
        var html = ''
        var headerTitle = lang[monitorSettings.name]
        // if(monitorSettings.evaluation && !eval(monitorSettings.evaluation)){
        //   return
        // }
        if(monitorSettings.blocks){
          monitorSettings.blocks.forEach(function(settingsBlock){
              html += drawBlock(settingsBlock)
          })
        }
        if(monitorSettings.info){
         monitorSettings.info.forEach(function(field){
             if(field.isFormGroupGroup === true){
                 html += drawBlock(field)
             }else{
                 if(field.notForSubAccount === true){
                      var notForSubAccount = '!details.sub'
                      if(!field.evaluation){
                          field.evaluation = notForSubAccount
                      }else{
                          field.evaluation += ' && ' + notForSubAccount
                      }
                  }
                  if(!field.name || field.evaluation && !eval(field.evaluation)){
                      return
                  }
                  var attributes = []
                  var listGroupClass = []
                  var monitorRowFieldClass = []
                  if(preloadedData){
                      var isDetail = false
                      var name = field.name
                      var fieldData
                      if(name.indexOf('detail=') > -1){
                          isDetail = true
                          name = name.replace('detail=','')
                          if(preloadedData.details)fieldData = preloadedData.details[name]
                      }else{
                          fieldData = preloadedData[name]
                      }
                      if(fieldData){
                          listGroupClass.push('active')
                          if(fieldType !== 'select'){
                              attributes.push(`value="${fieldData}"`)
                          }
                      }else{
                          monitorRowFieldClass.push('display:none')
                      }
                  }else{
                      monitorRowFieldClass.push('display:none')
                  }
                  if(field.placeholder || field.default){
                      attributes.push(`placeholder="${field.placeholder || field.default}"`)
                  }else if(field.example){
                      attributes.push(`placeholder="Example : ${field.example}"`)
                  }
                  var possiblities = field.possible || []
                  var fieldType = field.fieldType || 'text'
                  var fieldElement = ''
                  switch(fieldType){
                      case'number':
                            if(field.numberMin){
                                attributes.push(`min="${field.numberMin}"`)
                            }
                            if(field.numberMax){
                                attributes.push(`max="${field.numberMax}"`)
                            }
                            fieldElement = '<div><input type="number" class="form-control" ' + attributes.join(' ') + '></div>'
                      break;
                      case'password':
                            fieldElement = '<div><input type="password" class="form-control" ' + attributes.join(' ') + '></div>'
                      break;
                      case'text':
                            fieldElement = `<div><input class="form-control" ${attributes.join(' ')}></div>`
                      break;
                      case'textarea':
                            fieldElement = '<div><textarea class="form-control" ' + attributes.join(' ') + '></textarea></div>'
                      break;
                      case'select':
                            fieldElement = '<div><select class="form-control" ' + attributes.join(' ') + '>'
                            fieldElement += buildOptions(field,possiblities,fieldData)
                            fieldElement += '</select></div>'
                      break;
                  }
                  if(fieldType === 'ul' || fieldType ===  'div' || fieldType ===  'btn' || field.name === 'mid'){

                  }else{
                      if(headerTitle){
                          html += `<div class="list-group-item ${listGroupClass.join(' ')}" data-name="${field.name}" data-value="${field.value || ""}">
                              <h4>${headerTitle} : ${field.field}</h4>
                              <div><small>${field.description}</small></div>
                              <div class="state-monitor-row-fields-field mt-4" style="${monitorRowFieldClass.join(' ')}">${fieldElement}</div>
                          </div>`
                      }
                  }
              }
          })
        }
        return html
    }
    var drawMonitor = function(preloadedData){
        var MonitorSettings = definitions['Monitor Settings']
        var html = ''
        var monitorId = preloadedData ? preloadedData.mid : ''
        Object.keys(MonitorSettings.blocks).forEach(function(blockKey){
            var block = MonitorSettings.blocks[blockKey]
            html += drawBlock(block,preloadedData)
        })
        var monitorSelect = `<select class="form-select state-monitor-row-select mb-2">`
        $.each(loadedMonitors,function(n,monitor){
            monitorSelect += `<option ${monitorId === monitor.mid ? 'selected' : ''} value="${monitor.mid}">${monitor.name} (${monitor.mid})</option>`
        })
        monitorSelect += `</select>`
        var fullHtml = `<div class="form-group state-monitor-row">
            <div class="input-group state-monitor-row-select-container mt-3">
                ${monitorSelect}
                <div>
                    <button class="btn btn-outline-danger delete-monitor" type="button">${lang.Delete}</button>
                </div>
            </div>
            <div class="list-group state-monitor-row-fields-container" style="height:300px;overflow: auto">
                ${html}
            </div>
        </div>`
        return fullHtml
    }
    monitorStatesPage.on('click','.add-monitor',function(e){
        e.stopPropagation()
        var el = $(this)
        var html = drawMonitor()
        monitorStatesMonitors.append(html)
        return false;
    })
    monitorStatesPage.on('click','.state-monitor-row-fields-container .list-group-item',function(e){
        var el = $(this)
        var listGroupParent = el.parents('.list-group')
        var fieldContainer = el.find('.state-monitor-row-fields-field')
        var name = el.attr('data-name')
        var value = el.attr('data-value')
        if(el.hasClass('active')){
            el.removeClass('active')
            fieldContainer.hide()
        }else{
            el.addClass('active')
            fieldContainer.show()
        }
    })
    monitorStatesPage.on('click','.state-monitor-row-fields-container .form-control',function(e){
        e.preventDefault()
        return false
    })
    monitorStatesPage.on('change','.json',function(e){
        var el = $(this)
        var val = el.val()
        try{
            el.css('border-color','green')
            var parsed = JSON.parse(val)
            el.val(JSON.stringify(parsed,null,3))
        }catch(err){
            el.css('border-color','red')
            return new PNotify({title:lang['Invalid JSON'],text:lang.InvalidJSONText,type:'error'})
        }
    })
    monitorStatesPage.on('click','.delete',function(e){
        $.confirm.e.modal('show');
        $.confirm.title.text(lang['Delete Monitor States Preset']);
        $.confirm.body.html(lang.deleteMonitorStateText1);
        $.confirm.click({title:'Delete',class:'btn-danger'},function(){
            var form = theForm.serializeObject()
            $.post(getApiPrefix(`monitorStates`) + '/' + form.name + '/delete',function(d){
                debugLog(d)
                if(d.ok === true){
                    loadMonitorStatesPresets()
                    new PNotify({title:lang.Success,text:d.msg,type:'success'})
                }
            })
        })
    })
    monitorStatesPage.on('click','.delete-monitor',function(e){
        var el = $(this).parents('.state-monitor-row')
        $.confirm.e.modal('show');
        $.confirm.title.text(lang['Delete Monitor State']);
        $.confirm.body.html(lang.deleteMonitorStateText2)
        $.confirm.click({title:'Delete',class:'btn-danger'},function(){
            el.remove()
        })
    })
    monitorStatesSelector.change(function(e){
        var selected = $(this).val()
        var loaded = monitorStatesLoaded[selected]
        var namespace = monitorStatesPage.find('[name="name"]')
        var deleteButton = monitorStatesPage.find('.delete')
        if(loaded){
            namespace.val(loaded.name)
            var html = ''
            $.each(loaded.details.monitors,function(n,v){
                html += drawMonitor(v)
            })
            monitorStatesMonitors.html(html)
            deleteButton.show()
        }else{
            namespace.val('')
            monitorStatesMonitors.empty()
            deleteButton.hide()
        }
    })
    function getFormValues(){
        var rows = monitorStatesMonitors.find('.state-monitor-row')
        var monitors = []
        rows.each(function(n,v){
            var monitorJson = {
                details: {}
            }
            var el = $(v)
            var fieldsSelcted = el.find('.list-group-item.active')
            monitorJson.mid = el.find('.state-monitor-row-select').val()
            fieldsSelcted.each(function(nn,element){
                var field = $(element)
                var name = field.attr('data-name')
                var value = field.find('.form-control').val()
                var isDetail = false
                if(name.indexOf('detail=') > -1){
                    isDetail = true
                    name = name.replace('detail=','')
                    monitorJson.details[name] = value
                }else{
                    monitorJson[name] = value
                }
            })
            if(Object.keys(monitorJson).length > 1 || Object.keys(monitorJson.details).length > 0){
                monitors.push(monitorJson)
            }
        })
        return monitors
    }
    theForm.submit(function(e){
        e.preventDefault()
        var el = $(this)
        var form = el.serializeObject()
        var monitors = getFormValues()
        if(form.name === ''){
            return new PNotify({title:lang['Invalid Data'],text:lang['Name cannot be empty.'],type:'error'})
        }
        if(monitors.length === 0){
            return new PNotify({title:lang['Invalid Data'],text:lang['Must be atleast one row'],type:'error'})
        }
        var data = {
            monitors: monitors
        }
        $.post(getApiPrefix(`monitorStates`) + '/' + form.name + '/insert',{data:data},function(d){
            debugLog(d)
            if(d.ok === true){
                loadMonitorStatesPresets(function(){
                    monitorStatesSelector.val(form.name)
                })
                new PNotify({title:lang.Success,text:d.msg,type:'success'})
            }
        })
        return false;
    })
})
