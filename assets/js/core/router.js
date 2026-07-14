import APP_CONFIG from './config.js';

export const Router={
 go(url){window.location.href=url;},
 login(){this.go(APP_CONFIG.ROUTES.LOGIN);},
 dashboard(){this.go(APP_CONFIG.ROUTES.DASHBOARD);},
 logout(){this.go(APP_CONFIG.ROUTES.LOGOUT);},
 current(){return location.pathname.split('/').pop();}
};
