/**
 * =====================================================
 * * SoufStock Enterprise ERP
 * * navigation.js (Dynamic Supabase Integration)
 * =====================================================
 */

import { Loader, Toast } from "./utils.js";
import Sidebar from "./sidebar.js";
import { hasPermission } from "./auth-guard.js";
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
            reservations: "reservations.view",
            expeditions: "expeditions.view",
            utilisateurs: "users.view",
            roles: "roles.view",
            permissions: "permissions.view",
            parametres: "settings.view"
        };
    }

    async loadSidebarDynamic() {
        const sidebarNav = document.getElementById('sidebarNav');
        if (!sidebarNav) return;

        const iconMapping = {
            'dashboard': 'fa-chart-line',
            'stock': 'fa-boxes',
            'mouvements': 'fa-exchange-alt',
            'commandes': 'fa-file-invoice',
            'chambres': 'fa-warehouse',
            'picking': 'fa-dolly',
            'expeditions': 'fa-truck',
            'reservations': 'fa-bookmark',
            'alertes': 'fa-exclamation-triangle',
            'produits': 'fa-tags',
            'rapports': 'fa-chart-bar',
            'utilisateurs': 'fa-users',
            'roles': 'fa-user-shield',
            'permissions': 'fa-lock',
            'parametres': 'fa-cogs'
        };

        try {
            const { data: pages, error } = await supabase
                .from('pages')
                .select('code, nom, url, module, ordre_affichage')
                .eq('actif', true)
                .order('ordre_affichage', { ascending: true });

            if (error) {
                console.error("Erreur chargement pages Supabase:", error);
                return;
            }

            sidebarNav.innerHTML = '';

            pages.forEach(page => {
                const icon = iconMapping[page.code] || 'fa-folder';
                const isActive = window.location.pathname.includes(page.url) ? 'active' : '';

                const link = document.createElement('a');
                link.href = page.url;
                link.className = `nav-item ${isActive}`;
                link.setAttribute('data-page', page.code);
                link.innerHTML = `<i class="fas ${icon}"></i><span>${page.nom}</span>`;

                sidebarNav.appendChild(link);
            });

        } catch (err) {
            console.error("Erreur critique NavigationManager:", err);
        }
    }
}

export const navigationManager = new NavigationManager();
