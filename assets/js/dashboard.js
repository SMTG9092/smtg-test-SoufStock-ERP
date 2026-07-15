/**
 * ==========================================================================
 * SoufStock Enterprise ERP/WMS
 * File: assets/js/dashboard.js
 * Central Dashboard Controller
 * ==========================================================================
 */

import APP_CONFIG from "./core/config.js";
import SessionManager from "./core/session.js";
import ThemeManager from "./core/theme.js";
import LanguageManager from "./core/language.js";
import * as Permissions from "./core/permissions.js";
import { Loader, Toast } from "./core/utils.js";
import Profile from "./core/profile.js";
import Sidebar from "./core/sidebar.js";
import DashboardData from "./core/dashboard-data.js";
import Charts from "./core/charts.js";
import Notifications from "./core/notifications.js";
import Navigation from "./core/navigation.js";
import Realtime from "./core/realtime.js";

class Dashboard {

    constructor() {

        this.initialized = false;

        this.refreshInterval = null;

        this.clockInterval = null;

    }

    /**
     * ============================================================
     * INITIALISATION GLOBALE
     * ============================================================
     */

    async init() {

        try {

            Loader.show(

                "Chargement...",

                "Initialisation système..."

            );

            /* ======================================================
               CORE
            ====================================================== */

            ThemeManager.init();

            LanguageManager.init();

            await SessionManager.init();

            /* ======================================================
               AUTH
            ====================================================== */

            const authenticated = await SessionManager.isAuthenticated();

            if (!authenticated) {

                window.location.replace(

                    APP_CONFIG.ROUTES.LOGIN

                );

                return;

            }

            /* ======================================================
               LOAD
            ====================================================== */

            await Promise.all([

                Permissions.initPermissions(),

                Profile.load(),

                DashboardData.load()

            ]);

            /* ======================================================
               UI
            ====================================================== */

            this.setupUI();

            this.startClock();

            Realtime.init();

            this.startAutoRefresh();

            this.initialized = true;

            Loader.hide();

            console.log(

                "[Dashboard] Système opérationnel."

            );

        }

        catch (error) {

            console.error(

                "[Dashboard] Init Error:",

                error

            );

            Loader.hide();

            Toast.error(

                "Système",

                error.message ||

                "Erreur lors du chargement du Dashboard."

            );

        }

    }
    
    /**
     * ============================================================
     * SETUP UI
     * ============================================================
     */

    setupUI() {

        Sidebar.init();

        Navigation.init();

        Notifications.init();

        if (typeof Charts.renderAll === "function") {

            Charts.renderAll();

        }

        document.addEventListener("keydown", (e) => {

            if (e.ctrlKey && e.key.toLowerCase() === "r") {

                e.preventDefault();

                this.refresh();

            }

        });

    }

    /**
     * ============================================================
     * CLOCK
     * ============================================================
     */

    startClock() {

        const update = () => {

            const now = new Date();

            const timeEl = document.getElementById("live-time");

            const dateEl = document.getElementById("live-date");

            if (timeEl) {

                timeEl.textContent = now.toLocaleTimeString("fr-FR");

            }

            if (dateEl) {

                dateEl.textContent = now.toLocaleDateString("fr-FR");

            }

        };

        update();

        this.clockInterval = setInterval(update, 1000);

    }

    /**
     * ============================================================
     * AUTO REFRESH
     * ============================================================
     */

    startAutoRefresh() {

        this.refreshInterval = setInterval(

            () => this.refresh(),

            60000

        );

    }

    /**
     * ============================================================
     * REFRESH
     * ============================================================
     */

    async refresh() {

        try {

            console.log(

                "[Dashboard] Mise à jour..."

            );

            await DashboardData.load();

            if (typeof Charts.renderAll === "function") {

                await Charts.renderAll();

            }

            Toast.info(

                "Dashboard",

                "Données mises à jour."

            );

        }

        catch (error) {

            console.error(

                "[Dashboard Refresh]",

                error

            );

        }

    }

    /**
     * ============================================================
     * DESTROY
     * ============================================================
     */

    destroy() {

        clearInterval(this.refreshInterval);

        clearInterval(this.clockInterval);

        if (Realtime?.destroy) {

            Realtime.destroy();

        }

        if (Charts?.destroyAll) {

            Charts.destroyAll();

        }

        if (Notifications?.clear) {

            Notifications.clear();

        }

        console.log(

            "[Dashboard] Ressources libérées."

        );

    }

}

const dashboard = new Dashboard();

document.addEventListener(

    "DOMContentLoaded",

    () => dashboard.init()

);

window.addEventListener(

    "beforeunload",

    () => dashboard.destroy()

);

export default dashboard;
