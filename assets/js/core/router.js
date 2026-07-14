/**
 * ============================================================
 * SoufStock Enterprise ERP/WMS
 * File : assets/js/core/router.js
 * ============================================================
 */

"use strict";

import APP_CONFIG from "./config.js";
import { isAuthenticated } from "./auth.js";

/* ============================================================
   ROUTER
============================================================ */

class Router {

    /* ========================================================
       GO TO PAGE
    ======================================================== */

    static go(page) {

        window.location.href = page;

    }

    /* ========================================================
       REPLACE PAGE
    ======================================================== */

    static replace(page) {

        window.location.replace(page);

    }

    /* ========================================================
       LOGIN
    ======================================================== */

    static login() {

        this.replace(APP_CONFIG.ROUTES.LOGIN);

    }

    /* ========================================================
       DASHBOARD
    ======================================================== */

    static dashboard() {

        this.replace(APP_CONFIG.ROUTES.DASHBOARD);

    }

    /* ========================================================
       LOGOUT
    ======================================================== */

    static logout() {

        this.replace(APP_CONFIG.ROUTES.LOGOUT);

    }

    /* ========================================================
       CURRENT PAGE
    ======================================================== */

    static current() {

        const path = window.location.pathname;

        return path.substring(path.lastIndexOf("/") + 1);

    }

    /* ========================================================
       IS CURRENT PAGE
    ======================================================== */

    static is(page) {

        return this.current() === page;

    }

    /* ========================================================
       BACK
    ======================================================== */

    static back() {

        window.history.back();

    }

    /* ========================================================
       RELOAD
    ======================================================== */

    static reload() {

        window.location.reload();

    }

    /* ========================================================
       REQUIRE AUTH
    ======================================================== */

    static async protect() {

        const ok = await isAuthenticated();

        if (!ok) {

            this.login();

            return false;

        }

        return true;

    }

    /* ========================================================
       REQUIRE GUEST
    ======================================================== */

    static async guestOnly() {

        const ok = await isAuthenticated();

        if (ok) {

            this.dashboard();

            return false;

        }

        return true;

    }

    /* ========================================================
       OPEN PAGE
    ======================================================== */

    static async open(page, protectedPage = true) {

        if (protectedPage) {

            const ok = await this.protect();

            if (!ok) return;

        }

        this.go(page);

    }

}

/* ============================================================
   EXPORT
============================================================ */

export default Router;
