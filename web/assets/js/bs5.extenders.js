const on = {};
const dashboardExtensions = {};
async function addExtender(extenderContainer){
    dashboardExtensions[extenderContainer] = [];
    on[extenderContainer] = function(...extender){
        dashboardExtensions[extenderContainer].push(...extender)
    };
}
async function addActionToExtender(extenderContainer, action){
    return on[extenderContainer](action)
}
async function executeExtender(extenderContainer, args = []){
    for(extender of dashboardExtensions[extenderContainer]){
        await extender(...args)
    }
}

var accountSettings = {
    onLoadFieldsExtensions: [],
    onLoadFields: function(...extender){
        accountSettings.onLoadFieldsExtensions.push(...extender)
    },
    onSaveFieldsExtensions: [],
    onSaveFields: function(...extender){
        accountSettings.onSaveFieldsExtensions.push(...extender)
    },
}
var onToggleSideBarMenuHideExtensions = [];
function onToggleSideBarMenuHide(...extender){
    onToggleSideBarMenuHideExtensions.push(...extender)
}
