import supabase from "./core/supabase.js";
import { Loader, Toast } from "./core/utils.js";

const els = {
    mode: document.getElementById("mode-selector"),
    tbody: document.getElementById("commandes-table-body"),
    head: document.getElementById("table-head"),
    btnValider: document.getElementById("btn-valider-tout"),
    btnRefresh: document.getElementById("btn-refresh"),
    dateFilter: document.getElementById("date-filter")
};

document.addEventListener("DOMContentLoaded", async () => {
    els.dateFilter.value = new Date().toISOString().split('T')[0];
    bindEvents();
    loadDashboard();
});

function bindEvents() {
    els.btnRefresh.addEventListener("click", loadDashboard);
    els.mode.addEventListener("change", loadDashboard);
    els.btnValider.addEventListener("click", validerTout);
}

async function loadDashboard() {
    Loader.show();
    const mode = els.mode.value;
    
    // تعريف عناوين الجدول
    els.head.innerHTML = mode === 'tournee' 
        ? `<tr><th>TOURNEE</th><th>NB COMMANDES</th><th>TOTAL KG</th><th>STATUT</th><th>ACTION</th></tr>`
        : `<tr><th>DOC VENTE</th><th>CLIENT</th><th>DATE LIVRAISON</th><th>TOURNEE</th><th>STATUT</th><th>ACTION</th></tr>`;

    const { data, error } = await supabase.from("commandes_excel").select("*").eq("statut", "IMPORTEE");
    
    if (error) { Toast.error("Erreur chargement"); } 
    else { renderTable(data, mode); }
    
    Loader.hide();
}

function renderTable(data, mode) {
    if (mode === 'tournee') {
        const grouped = data.reduce((acc, cmd) => {
            const key = cmd.itineraire || 'Non défini';
            if (!acc[key]) acc[key] = { nb: 0, kg: 0 };
            acc[key].nb += 1;
            acc[key].kg += (cmd.quantite_commandee || 0);
            return acc;
        }, {});

        els.tbody.innerHTML = Object.entries(grouped).map(([name, info]) => `
            <tr class="tournee-row" data-id="${name}">
                <td class="font-bold text-gray-800">${name}</td>
                <td>${info.nb}</td>
                <td>${info.kg.toFixed(2)} KG</td>
                <td><span class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">A lancer</span></td>
                <td><button onclick="lancerTournee('${name}')" class="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold">Lancer</button></td>
            </tr>
        `).join('');
    } else {
        els.tbody.innerHTML = data.map(cmd => `
            <tr class="commande-row" data-id="${cmd.document_vente}">
                <td class="font-bold text-blue-600">${cmd.document_vente}</td>
                <td>${cmd.nom_receptionnaire || '-'}</td>
                <td>${cmd.date_livraison}</td>
                <td>${cmd.itineraire || '-'}</td>
                <td><span class="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">En attente</span></td>
                <td><button onclick="lancerCommande('${cmd.document_vente}')" class="bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold">Lancer</button></td>
            </tr>
        `).join('');
    }
}

window.lancerCommande = async (id) => {
    await supabase.from("suivi_commandes_lancer").insert([{ document_vente: id, statut: "LANCEE", date_lancement: new Date().toISOString() }]);
    await supabase.from("commandes_excel").update({ statut: "LANCEE" }).eq("document_vente", id);
    Toast.success("Commande lancée");
    loadDashboard();
};

window.lancerTournee = async (itineraire) => {
    const { data } = await supabase.from("commandes_excel").select("document_vente").eq("itineraire", itineraire).eq("statut", "IMPORTEE");
    for (let cmd of data) { await lancerCommande(cmd.document_vente); }
    loadDashboard();
};

async function validerTout() {
    if (!confirm("Valider tout le contenu affiché ?")) return;
    const items = document.querySelectorAll('.commande-row, .tournee-row');
    for (let item of items) {
        if (item.classList.contains('tournee-row')) await lancerTournee(item.dataset.id);
        else await lancerCommande(item.dataset.id);
    }
    loadDashboard();
}
