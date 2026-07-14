/**
 * ==========================================================================
 * SoufStock Enterprise ERP/WMS
 * File: assets/js/dashboard.js
 * Central Dashboard Controller
 * ==========================================================================
 */

import APP_CONFIG from "./core/config.js";
import AuthManager from "./core/auth.js";
import SessionManager from "./core/session.js";
import ThemeManager from "./core/theme.js";
import LanguageManager from "./core/language.js";
import Permissions from "./core/permissions.js";
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
     * Initialisation globale du Dashboard
     */
    async init() {
        try {
            Loader.show("Chargement...", "Initialisation système...");

            // 1. Initialisation Core
            ThemeManager.init();
            LanguageManager.init();
            SessionManager.init();

            // 2. Vérification Auth
            if (!SessionManager.isAuthenticated()) {
                window.location.href = APP_CONFIG.ROUTES.LOGIN;
                return;
            }

            // 3. Parallélisation du chargement des modules critiques
            await Promise.all([
                Permissions.initPermissions(),
                Profile.loadProfile(),
                DashboardData.load()
            ]);

            // 4. Setup UI et services
            this.setupUI();
            this.startClock();
            Realtime.init();
            this.startAutoRefresh();

            this.initialized = true;
            Loader.hide();
        } catch (error) {
            console.error("[Dashboard Controller] Init Error:", error);
            Toast.error("Système", "Erreur lors du chargement du Dashboard.");
            Loader.hide();
        }
    }

    /**
     * Configuration des composants UI et écouteurs d'événements
     */
    setupUI() {
        Sidebar.init();
        Navigation.init();
        Notifications.init();
        Charts.renderAll();

        // Raccourcis clavier (Ctrl+R)
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'r') {
                e.preventDefault();
                this.refresh();
            }
        });
    }

    /**
     * Horloge temps réel
     */
    startClock() {
        const update = () => {
            const timeEl = document.getElementById('live-time');
            const dateEl = document.getElementById('live-date');
            if (timeEl) timeEl.textContent = new Date().toLocaleTimeString();
            if (dateEl) dateEl.textContent = new Date().toLocaleDateString();
        };
        update();
        this.clockInterval = setInterval(update, 1000);
    }

    /**
     * Rafraîchissement périodique (60s)
     */
    startAutoRefresh() {
        this.refreshInterval = setInterval(() => this.refresh(), 60000);
    }

    async refresh() {
        try {
            await DashboardData.load();
            Charts.renderAll();
        } catch (err) {
            console.error("[Dashboard] Refresh Failed:", err);
        }
    }

    /**
     * Libération des ressources (Prevent Memory Leaks)
     */
    destroy() {
        clearInterval(this.refreshInterval);
        clearInterval(this.clockInterval);
        Realtime.destroy();
        Charts.destroyAll();
        Notifications.clear();
    }
}

const dashboard = new Dashboard();

document.addEventListener("DOMContentLoaded", () => dashboard.init());
window.addEventListener("beforeunload", () => dashboard.destroy());

export default dashboard;
