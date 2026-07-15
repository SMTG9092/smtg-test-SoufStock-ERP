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
     * Initialisation globale du Dashboard
     */
    async init() {
        try {
            Loader.show("Chargement...", "Initialisation système...");

            // 1. Initialisation Core (Thème, Langue, Session)
            ThemeManager.init();
            LanguageManager.init();
            SessionManager.init();

            // 2. Vérification Auth
            if (!SessionManager.isAuthenticated()) {
                window.location.href = APP_CONFIG.ROUTES.LOGIN;
                return;
            }

            // 3. Chargement parallèle pour optimiser la performance
            await Promise.all([
                Permissions.initPermissions(),
                Profile.loadProfile(),
                DashboardData.load()
            ]);

            // 4. Initialisation UI et Services
            this.setupUI();
            this.startClock();
            Realtime.init();
            this.startAutoRefresh();

            this.initialized = true;
            Loader.hide();
            console.log("[Dashboard] Système opérationnel.");
            
        } catch (error) {
            console.error("[Dashboard] Init Error:", error);
            Toast.error("Système", "Erreur lors du chargement du Dashboard.");
            Loader.hide();
        }
    }

    setupUI() {
        Sidebar.init();
        Navigation.init();
        Notifications.init();
        
        // Rendu initial des graphiques (charts.js)
        Charts.renderAll();

        // Raccourcis clavier : Ctrl+R pour rafraîchir
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'r') {
                e.preventDefault();
                this.refresh();
            }
        });
    }

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

    startAutoRefresh() {
        // Rafraîchissement automatique toutes les 60 secondes
        this.refreshInterval = setInterval(() => this.refresh(), 60000);
    }

    async refresh() {
        try {
            console.log("[Dashboard] Mise à jour des données...");
            await DashboardData.load();
            await Charts.renderAll();
            Toast.info("Mise à jour", "Données rafraîchies");
        } catch (err) {
            console.error("[Dashboard] Refresh Failed:", err);
        }
    }

    destroy() {
        clearInterval(this.refreshInterval);
        clearInterval(this.clockInterval);
        Realtime.destroy();
        Charts.destroyAll();
        Notifications.clear();
        console.log("[Dashboard] Ressources libérées.");
    }
}

// Singleton pour garantir une instance unique
const dashboard = new Dashboard();

// Point d'entrée sécurisé
document.addEventListener("DOMContentLoaded", () => dashboard.init());

// Nettoyage avant fermeture pour éviter les Memory Leaks
window.addEventListener("beforeunload", () => dashboard.destroy());

export default dashboard;
