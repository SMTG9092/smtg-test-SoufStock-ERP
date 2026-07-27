/**
 * ============================================================
 * SoufStock Enterprise ERP
 * navigation.js (Fixed Imports)
 * ============================================================
 */

import { Loader, Toast } from "./utils.js";
import Sidebar from "./sidebar.js";
import { hasPermission } from "./core/auth-guard.js";
import { supabase } from "./supabase.js";

class NavigationManager {
    constructor() {
        this.currentPage = "";
        
        this.routes = {
            dashboard: "dashboard.html",
            stock: "stock.html",
            mouvements: "mouvements.html",
            commandes: "commandes.html",
            picking: "picking.html",
            reservations: "reservations.html",
            expeditions: "expeditions.html",
            utilisateurs: "users.html",
            roles: "roles.html",
            permissions: "permissions.html",
            parametres: "settings.html"
        };

        this.permissionsMap = {
            dashboard: "dashboard.view",
            stock: "stock.view",
            mouvements: "stock.view",
            commandes: "commandes.view",
            picking: "picking.view",
            reservations: "picking.view",
            expeditions: "expeditions.view",
            utilisateurs: "users.view",
            roles: "users.view",
            permissions: "users.view",
            parametres: "settings.view"
        };

        this.isLoaded = false;
    }

    async init() {
        this.detectCurrentPage();
        this.loadPagesFromDatabase();

        if (this.currentPage && this.routes[this.currentPage]) {
            const requiredPerm = this.permissionsMap[this.currentPage];
            if (requiredPerm) {
                const [resource, action] = requiredPerm.split('.');
                const allowed = await hasPermission(resource, action);
                if (!allowed) {
                    window.location.href = "444.html";
                    return;
                }
            }
        }

        this.bindEvents();
        Sidebar.setActive(this.currentPage);
        this.updateTitle();
        this.updateBreadcrumb();
    }

    async loadPagesFromDatabase() {
        try {
            const { data, error } = await supabase
                .from('pages')
                .select('code, url, module, actif')
                .eq('actif', true);

            if (!error && data) {
                data.forEach(page => {
                    const cleanFileName = page.url.replace('.html', '');
                    this.routes[cleanFileName] = page.url;
                    this.routes[page.code] = page.url;

                    const resource = page.module ? page.module.toLowerCase() : cleanFileName;
                    this.permissionsMap[cleanFileName] = `${resource}.view`;
                    this.permissionsMap[page.code] = `${resource}.view`;
                });
                this.isLoaded = true;
            }
        } catch (err) {
            console.warn("Utilisation des routes statiques par défaut.");
        }
    }

    bindEvents() {
        window.addEventListener("navigate", e => {
            if (e.detail && e.detail.page) {
                this.navigate(e.detail.page);
            }
        });

        document.addEventListener("click", async (e) => {
            const navItem = e.target.closest("[data-page]");
            if (navItem) {
                e.preventDefault();
                const page = navItem.getAttribute("data-page");
                if (page) {
                    await this.navigate(page);
                }
            }
        });
    }

    async navigate(page) {
        if (!page) return;
        if (page === this.currentPage) return;

        let route = this.routes[page];
        let requiredPerm = this.permissionsMap[page];

        if (!route) {
            await this.loadPagesFromDatabase();
            route = this.routes[page];
            requiredPerm = this.permissionsMap[page];
        }

        if (!route) {
            Toast.error("Navigation", "Page introuvable: " + page);
            return;
        }

        if (requiredPerm) {
            try {
                const [resource, action] = requiredPerm.split('.');
                const allowed = await hasPermission(resource, action);
                if (!allowed) {
                    window.location.href = "444.html";
                    return;
                }
            } catch (err) {
                window.location.href = "444.html";
                return;
            }
        }

        Loader.show("Chargement...", "Ouverture de " + page);
        
        let finalUrl = route;
        if (!finalUrl.endsWith('.html')) {
            finalUrl += '.html';
        }

        window.location.href = finalUrl;
    }

    detectCurrentPage() {
        const file = window.location.pathname
            .split("/")
            .pop()
            .replace(".html", "");
        this.currentPage = file || "dashboard";
    }

    updateTitle() {
        const title = document.getElementById("pageTitle");
        if (!title) return;
        title.textContent = this.format(this.currentPage);
    }

    updateBreadcrumb() {
        const breadcrumb = document.getElementById("breadcrumb");
        if (!breadcrumb) return;
        breadcrumb.innerHTML = `<span>Accueil</span><span> / </span><strong>${this.format(this.currentPage)}</strong>`;
    }

    format(text) {
        return text.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    }

    getCurrentPage() {
        return this.currentPage;
    }
}

const Navigation = new NavigationManager();

document.addEventListener("DOMContentLoaded", () => {
    Navigation.init();
});

export default Navigation;
