import APP_CONFIG from "./config.js";
import { getSession, logout } from "./auth.js";

export async function requireAuth(){
  const session = await getSession();
  if(!session){
    window.location.replace(APP_CONFIG.ROUTES.LOGIN);
    return false;
  }
  return true;
}

export async function requireGuest(){
  const session = await getSession();
  if(session){
    window.location.replace(APP_CONFIG.ROUTES.DASHBOARD);
    return false;
  }
  return true;
}

export async function destroySession(){
  await logout();
  window.location.replace(APP_CONFIG.ROUTES.LOGOUT);
}
