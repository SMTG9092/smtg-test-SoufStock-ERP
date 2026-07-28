/**
 * ============================================================
 * SoufStock Enterprise ERP
 * assets/js/core/navigation.js
 * ============================================================
 */

import { Loader, Toast } from "./utils.js";
import Sidebar from "./sidebar.js";
import supabase from "./supabase.js";

class NavigationManager {

    constructor() {
        this.currentPage = "";
        this.routes = {}; // Ghadi t-3mmar otomatikan mn Supabase
        this.initialized = false;
    }

    /* ============================================================
     * INIT
     * ============================================================
     */
    async init() {
        this.detectCurrentPage();
        
        // Jib les routes mn la base de données awalan
        await this.loadRoutesFromDatabase();

        this.bindEvents();

        Sidebar.setActive(this.currentPage);

        this.updateTitle();

        this.updateBreadcrumb();

        this.initialized = true;
    }

    /* ============================================================
     * LOAD ROUTES FROM SUPABASE
     * ============================================================
     */
    async loadRoutesFromDatabase() {
        try {
            const { data: pages, error } = await supabase
                .from('pages')
                .select('code, url')
                .eq('actif', true);

            if (error) {
                console.error("Erreur chargement routes Supabase:", error);
                return;
            }

            if (pages) {
                this.routes = {};
                pages.forEach(page => {
                    // Kay-dir mapping mabin code w url (mithal: dashboard: "dashboard.html")
                    if (page.code && page.url) {
                        // Nettoyer l'url ila kan fih slash l-qdam
                        let cleanUrl = page.url;
                        if (cleanUrl.startsWith('/')) {
                            cleanUrl = cleanUrl.substring(1);
                        }
                        this.routes[page.code] = cleanUrl;
                    }
                });
            }
        } catch (err) {
            console.error("Erreur de connexion base de données pour les routes:", err);
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

        if (page === this.currentPage)

            return;

        // Ila baqi ma t-chargawch les routes, n-tsnawhoum
        if (Object.keys(this.routes).length === 0) {
            await this.loadRoutesFromDatabase();
        }

        const route = this.routes[page];

        if (!route) {

            Toast.error(

                "Navigation",

                "Page introuvable."

            );

            return;

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

        breadcrumb.innerHTML =

        `

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

// Export par défaut + Named exports pour éviter les erreurs d'import
export { NavigationManager, Navigation as navigationManager };
export default Navigation;
