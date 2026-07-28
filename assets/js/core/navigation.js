import supabase from "./supabase.js";

const Navigation = {
    async init() {
        const navContainer = document.getElementById('sidebarNav');
        if (!navContainer) return;

        // Jib les pages actifs mn la table public.pages
        const { data: pages, error } = await supabase
            .from('pages')
            .select('code, nom, url, ordre_affichage')
            .eq('actif', true)
            .order('ordre_affichage', { ascending: true });

        if (error) {
            console.error("Erreur chargement navigation:", error);
            navContainer.innerHTML = `<div style="color: #ef4444; font-size: 11px; padding: 10px;">Erreur de chargement du menu</div>`;
            return;
        }

        if (!pages || pages.length === 0) {
            navContainer.innerHTML = `<div style="color: var(--text-muted); font-size: 11px; padding: 10px;">Aucune page configurée</div>`;
            return;
        }

        // 3raf l'URL dyal la page li nta fiha daba bash t-ban "active"
        const currentPath = window.location.pathname;

        // Mapping dyal les icônes 3la hsab l'code wla l'nom dyal la page
        const iconsMap = {
            'dashboard': 'fa-chart-pie',
            'mouvements': 'fa-exchange-alt',
            'articles': 'fa-boxes',
            'stocks': 'fa-warehouse',
            'commandes': 'fa-file-invoice',
            'picking': 'fa-dolly',
            'expeditions': 'fa-truck',
            'utilisateurs': 'fa-users',
            'pages': 'fa-sitemap',
            'parametres': 'fa-cog'
        };

        // Génération dynamique dyal HTML dyal la navigation
        navContainer.innerHTML = pages.map(page => {
            // Khod l'icône wla ddiro default (fa-circle)
            const iconClass = iconsMap[page.code.toLowerCase()] || 'fa-folder';
            
            // Wesh had la page hiya lli mftouha daba?
            const isActive = currentPath.includes(page.url) ? 'active' : '';

            return `
                <a href="${page.url}" class="nav-item ${isActive}">
                    <i class="fas ${iconClass}"></i>
                    <span>${page.nom}</span>
                </a>
            `;
        }).join('');
    }
};

export default Navigation;
