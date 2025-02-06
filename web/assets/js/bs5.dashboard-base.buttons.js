$(document).ready(function(){
    onInitWebsocket(function(){
        loadMonitorsIntoMemory(function(data){
            setInterfaceCounts(data)
            onDashboardReadyExecute()
        })
    });
    $('body')
    // .on('tab-away',function(){
    //
    // })
    // .on('tab-close',function(){
    //
    // })
    .on('click','.toggle-accordion-list',function(e){
        e.preventDefault();
        var el = $(this)
        var iconEl = el.find('i')
        var targetEl = el.parent().find('.accordion-list').first()
        targetEl.toggle()
        el.toggleClass('btn-primary btn-success')
        iconEl.toggleClass('fa-plus fa-minus')
        return false;
    })
    .on('click','.toggle-display-of-el',function(e){
        e.preventDefault();
        var el = $(this)
        var target = el.attr('data-target')
        var targetFirstOnly = el.attr('data-get') === 'first'
        var startIsParent = el.attr('data-start') === 'parent'
        var targetEl = startIsParent ? el.parent().find(target) : $(target)
        if(targetFirstOnly){
            targetEl = targetEl.first()
        }
        targetEl.toggle()
        return false;
    })
    .on('click','.pop-image',function(){
        var imageSrc = $(this).attr('src')
        if(!imageSrc){
            new PNotify({
                title: lang['Action Failed'],
                text: lang['No Image'],
                type: 'warning'
            })
            return;
        };
        popImage(imageSrc)
    })
    .on('click','.popped-image',function(){
        $(this).remove()
    })
    .on('click','.popped-image img',function(e){
        e.stopPropagation()
        return false;
    })
    .on('click','.go-home',goBackHome)
    .on('click','.go-back',goBackOneTab)
    .on('click','.delete-tab',function(e){
        e.preventDefault()
        e.stopPropagation()
        var tabName = $(this).parents(`[page-open]`).attr(`page-open`)
        if(activeTabName === tabName){
            goBackOneTab()
        }
        deleteTab(tabName)
        return false;
    })
    .on('click','.delete-tab-dynamic',function(e){
        e.preventDefault()
        e.stopPropagation()
        var tabName = $(this).parents('.page-tab').attr('id').replace('tab-','')
        goBackOneTab()
        deleteTab(tabName)
        return false;
    })
    .on('click','[page-open]',function(){
        var el = $(this)
        var pageChoice = el.attr('page-open')
        var pageOptions = JSON.parse(el.attr('page-options') || '{}')
        if(tabTree.name === pageChoice)return;
        openTab(pageChoice,pageOptions)
    })
    .on('click','[class_toggle]',function(){
        var el = $(this)
        var targetElement = el.attr('data-target')
        var classToToggle = el.attr('class_toggle')
        var iconClassesToToggle = el.attr('icon-toggle')
        var togglPosition = $(targetElement).hasClass(classToToggle) ? 0 : 1
        var classToggles = dashboardOptions().class_toggle || {}
        classToggles[targetElement] = [classToToggle,togglPosition,iconClassesToToggle,iconTarget];
        dashboardOptions('class_toggle',classToggles)
        $(targetElement).toggleClass(classToToggle)
        if(iconClassesToToggle){
            iconClassesToToggle = iconClassesToToggle.split(' ')
            var iconTarget = el.attr('icon-child')
            var iconTargetElement = el.find(el.attr('icon-child'))
            iconTargetElement
                .removeClass(iconClassesToToggle[togglPosition === 1 ? 0 : 1])
                .addClass(iconClassesToToggle[togglPosition])
        }
    })
    .on('keyup','.search-parent .search-controller',function(){
        var _this = this;
        var parent = $(this).parents('.search-parent')
        $.each(parent.find(".search-body .search-row"), function() {
            if($(this).text().toLowerCase().indexOf($(_this).val().toLowerCase()) === -1)
               $(this).hide();
            else
               $(this).show();
        });
    })
    .on('click','[tab-chooser]',function(){
        var el = $(this)
        var parent = el.parents('[tab-chooser-parent]')
        var tabName = el.attr('tab-chooser')
        var allTabChoosersInParent = parent.find('[tab-chooser]')
        var allTabsInParent = parent.find('[tab-section]')
        allTabsInParent.hide()
        allTabChoosersInParent.removeClass('active')
        el.addClass('active')
        parent.find(`[tab-section="${tabName}"]`).show()
    });
    if(!isMobile){
        $('body').on('mousedown',"select[multiple]",function(e){
            e.preventDefault();
            var select = this;
            var scroll = select .scrollTop;
            e.target.selected = !e.target.selected;
            setTimeout(function(){select.scrollTop = scroll;}, 0);
            $(select).focus().change();
        }).on('mousemove',"select[multiple]",function(e){
            e.preventDefault()
        });
    }
    $('.logout').click(function(e){
        $.get(getApiPrefix() + '/logout/' + $user.ke + '/' + $user.uid,function(data){
            localStorage.removeItem('ShinobiLogin_'+location.host);
            location.href = location.href.split('#')[0];
        })
    })
    // only binded on load
    $('.form-section-header:not(.no-toggle-header)').click(function(e){
        var parent = $(this).parent('.form-group-group')
        var boxWrapper = parent.attr('id')
        parent.toggleClass('hide-box-wrapper')
        var hideBoxWrapper = parent.hasClass('hide-box-wrapper')
        boxWrappersHidden[boxWrapper] = hideBoxWrapper
        dashboardOptions('boxWrappersHidden',boxWrappersHidden)
    })
    $('[data-bs-target="#sidebarMenu"]').click(function(e){
        resizeMonitorIcons()
    })
    if(!isMobile){
        var clicked = false, clickX, oldClickX;
        var htmlBody = $('html')
        pageTabLinks.on({
            'mousemove': function(e) {
                clicked && updateScrollPos(e);
            },
            'mousedown': function(e) {
                e.preventDefault();
                clicked = true;
                oldClickX = clickX + 0;
                clickX = e.pageX;
            },
            'mouseup': function(e) {
                if(oldClickX !== clickX){
                    e.preventDefault()
                }
                clicked = false;
                htmlBody.css('cursor', 'auto');
            }
        });

        var updateScrollPos = function(e) {
            htmlBody.css('cursor', 'grabbing');
            pageTabLinks.scrollLeft(pageTabLinks.scrollLeft() + (clickX - e.pageX));
        }
    }

})
