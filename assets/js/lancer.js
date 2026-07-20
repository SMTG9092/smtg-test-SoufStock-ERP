import supabase, { getUser } from "./core/supabase.js";
import { Loader, Toast } from "./core/utils.js";

const els = {
    mode: document.getElementById("mode-selector"),
    tbody: document.getElementById("commandes-table-body"),
    head: document.getElementById("table-head"),
    btnValider: document.getElementById("btn-valider-tout"),
    btnRefresh: document.getElementById("btn-refresh")
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
    bindEvents();
    loadDashboard();
}

function bindEvents() {
    els.btnRefresh.addEventListener("click", loadDashboard);
    els.mode.addEventListener("change", loadDashboard);
    els.btnValider.addEventListener("click", validerTout);
}

async function loadDashboard() {
    Loader.show();
    const mode = els.mode.value;
    
    if (mode === 'tournee') {
        els.head.innerHTML = `<th>Tournée</th><th>Nb Commandes</th><th>Total KG</th><th>Statut</th><th>Action</th>`;
    } else {
        els.head.innerHTML = `<th>Doc Vente</th><th>Client</th><th>Date Livraison</th><th>Tournée</th><th>Statut</th><th>Action</th>`;
    }

    const { data, error } = await supabase.from("commandes_excel").select("*").eq("statut", "IMPORTEE");
    
    if (error) { Toast.error("Erreur chargement"); } 
    else { renderTable(data, mode); }
    
    Loader.hide();
}

function renderTable(data, mode) {
    els.tbody.innerHTML = data.map(cmd => `
        <tr class="commande-row" data-id="${cmd.document_vente}">
            ${mode === 'commande' ? `
                <td class="font-bold text-blue-600">${cmd.document_vente}</td>
                <td>${cmd.nom_receptionnaire || '-'}</td>
                <td>${cmd.date_livraison}</td>
                <td>${cmd.itineraire || '-'}</td>
                <td><span class="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">En attente</span></td>
                <td><button onclick="lancerUnitaire('${cmd.document_vente}')" class="bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold">Lancer</button></td>
            ` : `<td>${cmd.itineraire}</td><td colspan="4">...Vue Tournée...</td>`}
        </tr>
    `).join('');
}

async function validerTout() {
    if (!confirm("Valider tout le contenu affiché ?")) return;
    
    const rows = document.querySelectorAll('.commande-row');
    for (let row of rows) {
        const id = row.dataset.id;
        await lancerCommande(id);
    }
    Toast.success("Opération terminée");
    loadDashboard();
}

window.lancerUnitaire = async (id) => {
    await lancerCommande(id);
    loadDashboard();
};

async function lancerCommande(id) {
    await supabase.from("suivi_commandes_lancer").insert([{
        document_vente: id,
        date_lancement: new Date().toISOString(),
        statut: "LANCEE"
    }]);
    await supabase.from("commandes_excel").update({ statut: "LANCEE" }).eq("document_vente", id);
}
