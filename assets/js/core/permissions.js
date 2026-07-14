import APP_CONFIG from './config.js';
import {Storage} from './storage.js';

export function getProfile(){
 return Storage.get(APP_CONFIG.AUTH.PROFILE_KEY);
}

export function hasRole(roleCode){
 const p=getProfile();
 return p?.roles?.code===roleCode;
}

export function can(permission){
 const p=getProfile();
 if(!p||!p.permissions) return false;
 return p.permissions.includes(permission);
}
