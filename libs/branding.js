module.exports = function(s,config,lang,app,io){
    const processCwd = process.cwd();
    const { setDefaultIfUndefined } = require('./basic/utils.js')(processCwd,config);
    setDefaultIfUndefined(config, 'showPoweredByShinobi', true);
    setDefaultIfUndefined(config, 'poweredByShinobi', 'Powered by Shinobi.Systems');
    setDefaultIfUndefined(config, 'showLoginCardHeader', true);
    setDefaultIfUndefined(config, 'webFavicon', 'libs/img/icon/favicon.ico');
    setDefaultIfUndefined(config, 'logoLocationAppleTouchIcon', 'libs/img/icon/apple-touch-icon.png');
    setDefaultIfUndefined(config, 'logoLocation57x57', 'libs/img/icon/apple-touch-icon-57x57.png');
    setDefaultIfUndefined(config, 'logoLocation72x72', 'libs/img/icon/apple-touch-icon-72x72.png');
    setDefaultIfUndefined(config, 'logoLocation76x76', 'libs/img/icon/apple-touch-icon-76x76.png');
    setDefaultIfUndefined(config, 'logoLocation114x114', 'libs/img/icon/apple-touch-icon-114x114.png');
    setDefaultIfUndefined(config, 'logoLocation120x120', 'libs/img/icon/apple-touch-icon-120x120.png');
    setDefaultIfUndefined(config, 'logoLocation144x144', 'libs/img/icon/apple-touch-icon-144x144.png');
    setDefaultIfUndefined(config, 'logoLocation152x152', 'libs/img/icon/apple-touch-icon-152x152.png');
    setDefaultIfUndefined(config, 'logoLocation196x196', 'libs/img/icon/favicon-196x196.png');
    setDefaultIfUndefined(config, 'logoLocation76x76Link', 'https://shinobi.video');
    setDefaultIfUndefined(config, 'logoLocation76x76Style', 'border-radius:50%');
    setDefaultIfUndefined(config, 'loginScreenBackground', 'assets/img/splash.avif');
    setDefaultIfUndefined(config, 'showLoginSelector', true);
    setDefaultIfUndefined(config, 'defaultTheme', 'Ice-v3');
    setDefaultIfUndefined(config, 'socialLinks', [
        { icon: 'home', href: 'https://shinobi.video', title: 'Homepage' },
        { icon: 'facebook', href: 'https://www.facebook.com/ShinobiCCTV', title: 'Facebook' },
        { icon: 'twitter', href: 'https://twitter.com/ShinobiCCTV', title: 'Twitter' },
        { icon: 'youtube', href: 'https://www.youtube.com/channel/UCbgbBLTK-koTyjOmOxA9msQ', title: 'YouTube' }
    ]);

    s.getConfigWithBranding = function(domain){
        var configCopy = Object.assign({},config)
        if(config.brandingConfig && config.brandingConfig[domain]){
            return Object.assign(configCopy,config.brandingConfig[domain])
        }
        return config
    }
}
