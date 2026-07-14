/**
 * ============================================================
 * SoufStock Enterprise ERP/WMS
 * File : assets/js/core/session.js
 * ============================================================
 */

"use strict";

import APP_CONFIG from "./config.js";

import {

    currentSession,

    logout,

    refreshProfile,

    isAuthenticated

} from "./auth.js";

/* ============================================================
   REQUIRE AUTH
============================================================ */

export async function requireAuth() {

    try {

        const session = await currentSession();

        if (!session) {

            redirectLogin();

            return false;

        }

        await refreshProfile();

        return true;

    }

    catch (error) {

        console.error(error);

        redirectLogin();

        return false;

    }

}

/* ============================================================
   REQUIRE GUEST
============================================================ */

export async function requireGuest() {

    const session = await currentSession();

    if (session) {

        window.location.replace(

            APP_CONFIG.ROUTES.DASHBOARD

        );

        return false;

    }

    return true;

}

/* ============================================================
   REDIRECT LOGIN
============================================================ */

export function redirectLogin() {

    window.location.replace(

        APP_CONFIG.ROUTES.LOGIN

    );

}

/* ============================================================
   REDIRECT DASHBOARD
============================================================ */

export function redirectDashboard() {

    window.location.replace(

        APP_CONFIG.ROUTES.DASHBOARD

    );

}

/* ============================================================
   CHECK SESSION
============================================================ */

export async function checkSession() {

    const authenticated = await isAuthenticated();

    if (!authenticated) {

        redirectLogin();

        return false;

    }

    return true;

}

/* ============================================================
   AUTO REFRESH PROFILE
============================================================ */

export async function refreshSession() {

    try {

        await refreshProfile();

    }

    catch (error) {

        console.error(error);

    }

}

/* ============================================================
   AUTO CHECK
============================================================ */

let sessionInterval = null;

export function startSessionWatcher() {

    if (sessionInterval) {

        clearInterval(sessionInterval);

    }

    sessionInterval = setInterval(async () => {

        const ok = await checkSession();

        if (!ok) {

            clearInterval(sessionInterval);

        }

    }, 60000); // كل دقيقة

}

/* ============================================================
   STOP WATCHER
============================================================ */

export function stopSessionWatcher() {

    if (sessionInterval) {

        clearInterval(sessionInterval);

        sessionInterval = null;

    }

}

/* ============================================================
   LOGOUT
============================================================ */

export async function destroySession() {

    stopSessionWatcher();

    await logout();

    redirectLogin();

}

/* ============================================================
   SESSION INFOS
============================================================ */

export async function getSessionInfo() {

    const session = await currentSession();

    if (!session) {

        return null;

    }

    return {

        userId: session.user.id,

        email: session.user.email,

        expiresAt: session.expires_at,

        accessToken: session.access_token

    };

}

/* ============================================================
   INIT SESSION
============================================================ */

export async function initSession() {

    const ok = await requireAuth();

    if (!ok) return;

    startSessionWatcher();

}
