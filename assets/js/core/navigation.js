/**
 * ============================================================
 * SoufStock Enterprise ERP
 * navigation.js
 * ============================================================
 */

import { Loader, Toast } from "./utils.js";
import Sidebar from "./sidebar.js";

class NavigationManager {

    constructor() {

        this.currentPage = "";

        this.routes = {

            dashboard: "dashboard.html",

            import stock: "import_stock.html",

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

    }

    /* ============================================================
     * INIT
     * ============================================================
     */

    init() {

        this.detectCurrentPage();

        this.bindEvents();

        Sidebar.setActive(this.currentPage);

        this.updateTitle();

        this.updateBreadcrumb();

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

export default Navigation;
