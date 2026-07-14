
/**
 * ============================================================
 * SoufStock Enterprise ERP
 * dashboard.js
 * ============================================================
 */

import APP_CONFIG from "./core/config.js";

import AuthManager from "./core/auth.js";
import SessionManager from "./core/session.js";

import ThemeManager from "./core/theme.js";
import LanguageManager from "./core/language.js";

import {

    Loader,
    Toast

} from "./core/utils.js";

import Profile from "./core/profile.js";
import Permissions from "./core/permissions.js";
import Sidebar from "./core/sidebar.js";
import DashboardData from "./core/dashboard-data.js";
import Charts from "./core/charts.js";
import Notifications from "./core/notifications.js";
import Navigation from "./core/navigation.js";
import Realtime from "./core/realtime.js";

class Dashboard {

    constructor() {

        this.initialized = false;

        this.profile = null;

    }

    /* ============================================================
     * INIT
     * ============================================================ */

    async init() {

        try {

            Loader.show(

                "Chargement...",

                "Initialisation du Dashboard"

            );

            ThemeManager.init();

            LanguageManager.init();

            SessionManager.init();

            if (

                !SessionManager.isAuthenticated()

            ) {

                window.location.href =

                    APP_CONFIG.ROUTES.LOGIN;

                return;

            }

            this.profile =

                await Profile.load();

            if (!this.profile) {

                throw new Error(

                    "Impossible de charger le profil."

                );

            }

            await Permissions.load();

            Permissions.apply();

            Sidebar.init();

            Navigation.init();

            Notifications.init();

            Notifications.loadDefaults();

            await DashboardData.load();

            await Charts.init();

            Realtime.init();

            this.bindEvents();

            this.startClock();

            this.initialized = true;

            Toast.success(

                "Bienvenue",

                Profile.getName()

            );

        }

        catch (error) {

            console.error(error);

            Toast.error(

                "Dashboard",

                error.message

            );

        }

        finally {

            Loader.hide();

        }

    }

    /* ============================================================
     * EVENTS
     * ============================================================ */

    bindEvents() {

        document

            .getElementById("logoutBtn")

            ?.addEventListener(

                "click",

                () => this.logout()

            );

        document

            .getElementById("themeToggle")

            ?.addEventListener(

                "click",

                () => ThemeManager.toggle()

            );

        document

            .getElementById("languageToggle")

            ?.addEventListener(

                "click",

                () => LanguageManager.toggle()

            );

        document

            .getElementById("fullscreenBtn")

            ?.addEventListener(

                "click",

                () => this.fullscreen()

            );

    }

    /* ============================================================
     * CLOCK
     * ============================================================ */

    startClock() {

        const update = () => {

            const now = new Date();

            const date =

                document.getElementById(

                    "currentDate"

                );

            const time =

                document.getElementById(

                    "currentTime"

                );

            if (date) {

                date.textContent =

                    now.toLocaleDateString(

                        "fr-FR"

                    );

            }

            if (time) {

                time.textContent =

                    now.toLocaleTimeString(

                        "fr-FR"

                    );

            }

        };

        update();

        this.clock =

            setInterval(

                update,

                1000

            );

    }

    /* ============================================================
     * FULLSCREEN
     * ============================================================ */

    fullscreen() {

        if (

            !document.fullscreenElement

        ) {

            document.documentElement

                .requestFullscreen();

        }

        else {

            document.exitFullscreen();

        }

    }
        /* ============================================================
     * LOGOUT
     * ============================================================
     */

    async logout() {

        const confirmLogout = confirm(

            "Voulez-vous vous déconnecter ?"

        );

        if (!confirmLogout) return;

        try {

            Loader.show(

                "Déconnexion...",

                "Veuillez patienter"

            );

            Realtime.destroy();

            await AuthManager.logout();

            SessionManager.logout();

        }

        catch (error) {

            console.error(error);

            Toast.error(

                "Déconnexion",

                error.message

            );

        }

        finally {

            Loader.hide();

        }

    }

    /* ============================================================
     * DESTROY
     * ============================================================
     */

    destroy() {

        try {

            if (this.clock) {

                clearInterval(this.clock);

            }

            Realtime.destroy();

            Notifications.clear();

        }

        catch (error) {

            console.error(error);

        }

    }

}

/* ============================================================
 * INSTANCE
 * ============================================================
 */

const dashboard = new Dashboard();

/* ============================================================
 * START
 * ============================================================
 */

document.addEventListener(

    "DOMContentLoaded",

    () => dashboard.init()

);

/* ============================================================
 * EXPORT
 * ============================================================
 */

export default dashboard;
