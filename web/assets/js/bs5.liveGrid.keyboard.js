// function keyShortcutsForLiveGridUtils(enable) {
//     function cleanup(){
//         document.removeEventListener('keydown', keyShortcuts['liveGridUtils'].keydown);
//         document.removeEventListener('keyup', keyShortcuts['liveGridUtils'].keyup);
//         delete(keyShortcuts['liveGridUtils'])
//     }
//     if(enable){
//         let isKeyPressed = false;
//         function handleKeyboard(event){
//             if (isKeyPressed) {
//                 return;
//             }
//             event.preventDefault();
//             switch(event.code){
//                 case 'Enter':
//                     addMarkAsEventToAllOpenMonitors()
//                 break;
//             }
//         }
//         function handleKeyup(event) {
//             isKeyPressed = false;
//         }
//         keyShortcuts['liveGridUtils'] = {
//             keydown: handleKeyboard,
//             keyup: handleKeyup,
//         }
//         document.addEventListener('keydown', keyShortcuts['liveGridUtils'].keydown);
//         document.addEventListener('keyup', keyShortcuts['liveGridUtils'].keyup);
//     }else{
//         cleanup()
//     }
// }
// addOnTabOpen('liveGrid', function () {
//     keyShortcutsForLiveGridUtils(true)
// })
// addOnTabReopen('liveGrid', function () {
//     keyShortcutsForLiveGridUtils(true)
// })
// addOnTabAway('liveGrid', function () {
//     keyShortcutsForLiveGridUtils(false)
// })
