/**
 * ============================================================
 * SoufStock Enterprise ERP
 * navigation.js (Dynamic from Database)
 * ============================================================
 */

import { Loader, Toast } from "./utils.js";
import Sidebar from "./sidebar.js";
import { hasPermission } from "./core/auth-guard.js";
import { supabase } from "./core/supabase.js"; // تأكد بلي chemin d supabase client mzyan

class NavigationManager {

    constructor() {
        this.currentPage = "";
        this.routes = {};          // Ghadi t-beɛmra men la base de données
        this.permissionsMap = {};  // Ghadi t-beɛmra men la base de données
        this.isLoaded = false;
    }

    /* ============================================================
     * INIT
     * ============================================================
     */

    async init() {
        this.detectCurrentPage();

        // 1. Chargement d les pages men la base de données qbl kolchi
        await this.loadPagesFromDatabase();

        // 2. T-checki s-salhiyyat dyal s-safha l-haliya
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

    /* ============================================================
     * LOAD PAGES FROM DATABASE
     * ============================================================
     */

    async loadPagesFromDatabase() {
        try {
            const { data, error } = await supabase
                .from('pages')
                .select('code, url, module, actif')
                .eq('actif', true);

            if (error) {
                console.error("Erreur chargement des pages:", error.message);
                return;
            }

            if (data) {
                data.forEach(page => {
                    // 7yd .html men l-url bach n-staɛmlo l-code awla l-file name k-key
                    const cleanFileName = page.url.replace('.html', '');
                    
                    // Kan-bniw routes dictionary dynamiquement (ex: dashboard: "dashboard.html")
                    this.routes[cleanFileName] = page.url;
                    this.routes[page.code] = page.url;

                    // Kan-bniw permissions map dynamiquement (ex: dashboard: "dashboard.view")
                    // Module kay-kon howa resource, w action kat-kon "view"
                    const resource = page.module ? page.module.toLowerCase() : cleanFileName;
                    this.permissionsMap[cleanFileName] = `${resource}.view`;
                    this.permissionsMap[page.code] = `${resource}.view`;
                });
                
                this.isLoaded = true;
            }
        } catch (err) {
            console.error("Erreur technique f loadPagesFromDatabase:", err);
        }
    }

    /* ============================================================
     * EVENTS
     * ============================================================
     */

    bindEvents() {
        window.addEventListener(
            "navigate",
            e => {
                this.navigate(
                    e.detail.page
                );
            }
        );
    }

    /* ============================================================
     * NAVIGATE
     * ============================================================
     */

    async navigate(page) {
        if (!page) return;
        if (page === this.currentPage) return;

        // Ila baqi mat-loadawch les pages, ntsnawhom b zerbe
        if (!this.isLoaded) {
            await this.loadPagesFromDatabase();
        }

        const route = this.routes[page];
        if (!route) {
            Toast.error(
                "Navigation",
                "Page introuvable."
            );
            return;
        }

        // T-checki s-salhiyyat qbl ma t-dir redirection
        const requiredPerm = this.permissionsMap[page];
        if (requiredPerm) {
            try {
                const [resource, action] = requiredPerm.split('.');
                const allowed = await hasPermission(resource, action);
                if (!allowed) {
                    window.location.href = "444.html";
                    return;
                }
            } catch (err) {
                console.error("Erreur permission check:", err);
                window.location.href = "444.html";
                return;
            }
        }

        Loader.show(
            "Chargement...",
            "Ouverture de " + page
        );

        window.location.href = route;
    }

    /* ============================================================
     * DETECT CURRENT PAGE
     * ============================================================
     */

    detectCurrentPage() {
        const file =
            window.location.pathname
                .split("/")
                .pop()
                .replace(".html", "");
        this.currentPage =
            file || "dashboard";
    }

    /* ============================================================
     * TITLE
     * ============================================================
     */

    updateTitle() {
        const title =
            document.getElementById(
                "pageTitle"
            );
        if (!title) return;

        title.textContent =
            this.format(
                this.currentPage
            );
    }

    /* ============================================================
     * BREADCRUMB
     * ============================================================
     */

    updateBreadcrumb() {
        const breadcrumb =
            document.getElementById(
                "breadcrumb"
            );
        if (!breadcrumb) return;

        breadcrumb.innerHTML = `
            <span>
                Accueil
            </span>
            <span>
                /
            </span>
            <strong>
                ${this.format(
                    this.currentPage
                )}
            </strong>
        `;
    }

    /* ============================================================
     * FORMAT
     * ============================================================
     */

    format(text) {
        return text
            .replace(/-/g, " ")
            .replace(
                /\b\w/g,
                c => c.toUpperCase()
            );
    }

    /* ============================================================
     * GET CURRENT PAGE
     * ============================================================
     */

    getCurrentPage() {
        return this.currentPage;
    }

}

const Navigation = new NavigationManager();

export default Navigation;
