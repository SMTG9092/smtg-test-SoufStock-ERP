/**
 * ============================================================
 * SoufStock Enterprise ERP
 * assets/js/core/sidebar.js
 * ============================================================
 */

import * as Permissions from "./permissions.js";
import supabase from "./supabase.js";

class SidebarManager {

    constructor() {
        this.sidebar = null;
        this.toggle = null;
        this.links = [];
        this.storageKey = "soufstock_sidebar";
    }

    /* ============================================================
     * INIT
     * ============================================================ */

    async init() {
        this.sidebar = document.getElementById("sidebar");
        this.toggle = document.getElementById("sidebarToggle");

        // 1. Charger les pages mn Supabase w tqadhoum f la Sidebar otomatikan
        await this.loadPagesIntoSidebar();

        this.links = [
            ...document.querySelectorAll(".nav-item")
        ];

        this.restore();

        this.applyPermissions();

        this.bindToggle();

        this.bindLinks();
    }

    /* ============================================================
     * LOAD PAGES FROM SUPABASE
     * ============================================================ */

    async loadPagesIntoSidebar() {
        const navContainer = document.getElementById("sidebarNav") || this.sidebar?.querySelector("nav");
        if (!navContainer) return;

        try {
            const { data: pages, error } = await supabase
                .from('pages')
                .select('*')
                .eq('actif', true)
                .order('ordre_affichage', { ascending: true });

            if (error) {
                console.error("Erreur chargement pages sidebar:", error);
                return;
            }

            if (!pages || pages.length === 0) return;

            // Mapping dyal les icônes 3la hsab l'code dyal la page
            const iconsMap = {
                'dashboard': 'fa-chart-pie',
                'import_stock': 'fa-file-import',
                'import_commandes_kg': 'fa-file-excel',
                'import_commandes_pieces': 'fa-file-excel',
                'stock': 'fa-warehouse',
                'commandes': 'fa-file-invoice',
                'picking': 'fa-dolly',
                'ab10': 'fa-box-open',
                'expeditions': 'fa-truck',
                'utilisateurs': 'fa-users',
                'parametres': 'fa-cog',
                'roles': 'fa-user-shield',
                'permissions': 'fa-lock'
            };

            // Générer le HTML dyal les liens dynamiquement
            navContainer.innerHTML = pages.map(page => {
                const codeKey = (page.code || '').toLowerCase();
                const iconClass = iconsMap[codeKey] || 'fa-folder';
                let pageUrl = page.url || '#';
                
                return `
                    <a href="${pageUrl}" class="nav-item" data-page="${page.code}" data-permission="${page.code}">
                        <i class="fas ${iconClass}"></i>
                        <span>${page.nom}</span>
                    </a>
                `;
            }).join('');

        } catch (err) {
            console.error("Erreur technique lors du chargement de la sidebar:", err);
        }
    }

    /* ============================================================
     * PERMISSIONS
     * ============================================================ */

    applyPermissions() {

        this.links.forEach(link => {

            const permission =

                link.dataset.permission;

            if (!permission) return;

            if (Permissions.can(permission)) {

                link.hidden = false;

            }

            else {

                link.hidden = true;

            }

        });

    }

    /* ============================================================
     * EVENTS
     * ============================================================ */

    bindLinks() {

        this.links.forEach(link => {

            link.addEventListener("click", e => {

                e.preventDefault();

                const page =

                    link.dataset.page;

                if (!page) return;

                this.setActive(page);

                window.dispatchEvent(

                    new CustomEvent(

                        "navigate",

                        {

                            detail: {

                                page

                            }

                        }

                    )

                );

            });

        });

    }

    /* ============================================================
     * ACTIVE
     * ============================================================ */

    setActive(page) {

        this.links.forEach(link => {

            link.classList.remove("active");

            if (

                link.dataset.page === page

            ) {

                link.classList.add("active");

            }

        });

    }

    /* ============================================================
     * TOGGLE
     * ============================================================ */

    bindToggle() {

        if (

            !this.sidebar ||

            !this.toggle

        ) return;

        this.toggle.addEventListener(

            "click",

            () => this.toggleSidebar()

        );

    }

    toggleSidebar() {

        this.sidebar.classList.toggle(

            "collapsed"

        );

        this.save();

    }

    /* ============================================================
     * STORAGE
     * ============================================================ */

    save() {

        localStorage.setItem(

            this.storageKey,

            this.sidebar.classList.contains(

                "collapsed"

            )

        );

    }

    restore() {

        const value =

            localStorage.getItem(

                this.storageKey

            );

        if (

            value === "true"

        ) {

            this.sidebar?.classList.add(

                "collapsed"

            );

        }

    }

    /* ============================================================
     * HELPERS
     * ============================================================ */

    collapse() {

        this.sidebar?.classList.add(

            "collapsed"

        );

        this.save();

    }

    expand() {

        this.sidebar?.classList.remove(

            "collapsed"

        );

        this.save();

    }

    isCollapsed() {

        return this.sidebar?.classList.contains(

            "collapsed"

        );

    }

}

const Sidebar = new SidebarManager();

export default Sidebar;
