import supabase from "./supabase.js";

const Navigation = {
    async init() {
        const navContainer = document.getElementById('sidebarNav');
        if (!navContainer) return;

        const { data: pages, error } = await supabase
            .from('pages')
            .select('*')
            .order('ordre_affichage', { ascending: true });

        if (error) {
            console.error("Erreur chargement navigation Supabase:", error);
            navContainer.innerHTML = `<div style="color: #ef4444; font-size: 11px; padding: 10px;">Erreur: ${error.message}</div>`;
            return;
        }

        if (!pages || pages.length === 0) {
            navContainer.innerHTML = `<div style="color: var(--text-muted); font-size: 11px; padding: 10px;">Aucune page trouvée</div>`;
            return;
        }

        const currentPath = window.location.pathname;

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
            'roles': 'fa-user-shield'
        };

        navContainer.innerHTML = pages.map(page => {
            if (page.actif === false) return '';

            const codeKey = (page.code || '').toLowerCase();
            const iconClass = iconsMap[codeKey] || 'fa-folder';
            
            // Traitement dyal l'URL bach ykoun flexible (m3a wla bla /pages/)
            let pageUrl = page.url || '#';
            if (!pageUrl.startsWith('http') && !pageUrl.startsWith('/')) {
                pageUrl = '/' + pageUrl;
            }

            // Vérification wach la page hiya li mftouha daba
            const isActive = currentPath.endsWith(page.url) || currentPath.includes(page.code);

            return `
                <a href="${pageUrl}" class="nav-item ${isActive ? 'active' : ''}">
                    <i class="fas ${iconClass}"></i>
                    <span>${page.nom}</span>
                </a>
            `;
        }).join('');
    }
};

export default Navigation;
