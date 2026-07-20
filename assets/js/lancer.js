import supabase, { getUser } from "./core/supabase.js";
import { Loader, Toast } from "./core/utils.js";

const els = {
    mode: document.getElementById("mode-selector"),
    tbody: document.getElementById("commandes-table-body"),
    head: document.getElementById("table-head"),
    btnValider: document.getElementById("btn-valider-tout"),
    dateInput: document.getElementById("date-filter")
};

let currentUser = null;

document.addEventListener("DOMContentLoaded", async () => {
    currentUser = await getUser();
    bindEvents();
    loadDashboard();
});

function bindEvents() {
    document.getElementById("btn-refresh").addEventListener("click", loadDashboard);
    els.mode.addEventListener("change", loadDashboard);
    els.btnValider.addEventListener("click", validerTout);
}

// دالة تحديد التواريخ الذكية
function getTargetDates() {
    const today = new Date(); 
    const dayOfWeek = today.getDay(); // 0 = Dimanche, 6 = Samedi
    let dates = [];
    
    // إذا كان سبت (6) نأخذ [السبت، الأحد، الاثنين]
    if (dayOfWeek === 6) {
        for(let i=0; i<=2; i++) {
            let d = new Date(); d.setDate(today.getDate() + i);
            dates.push(d.toISOString().split('T')[0]);
        }
    } else {
        // الأيام العادية: [اليوم، غدا]
        for(let i=0; i<=1; i++) {
            let d = new Date(); d.setDate(today.getDate() + i);
            dates.push(d.toISOString().split('T')[0]);
        }
    }
    return dates;
}

async function loadDashboard() {
    Loader.show();
    const dates = getTargetDates();
    els.dateInput.value = `Ciblage: ${dates.join(' | ')}`;

    const { data, error } = await supabase
        .from("commandes_excel")
        .select("*")
        .eq("statut", "IMPORTEE")
        .in("date_livraison", dates)
        .order("date_livraison", { ascending: true });

    if (error) { Toast.error("Erreur chargement"); } 
    else { renderTable(data, els.mode.value); }
    
    Loader.hide();
}

function renderTable(data, mode) {
    if (mode === 'tournee') {
        els.head.innerHTML = `<tr><th>TOURNEE</th><th>NB COMMANDES</th><th>TOTAL KG</th><th>ACTION</th></tr>`;
        const grouped = data.reduce((acc, cmd) => {
            const key = cmd.itineraire || 'Non défini';
            if (!acc[key]) acc[key] = { nb: 0, kg: 0, items: [] };
            acc[key].nb += 1;
            acc[key].kg += (cmd.quantite_commandee || 0);
            acc[key].items.push(cmd);
            return acc;
        }, {});

        els.tbody.innerHTML = Object.entries(grouped).map(([name, info]) => `
            <tr class="tournee-row" data-id="${name}">
                <td class="font-bold">${name}</td>
                <td>${info.nb}</td>
                <td>${info.kg.toFixed(2)} KG</td>
                <td><button onclick="lancerTournee('${name}')" class="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold">Lancer</button></td>
            </tr>
        `).join('');
    } else {
        els.head.innerHTML = `<tr><th>DOC VENTE</th><th>CLIENT</th><th>DATE LIVRAISON</th><th>TOURNEE</th><th>ACTION</th></tr>`;
        els.tbody.innerHTML = data.map(cmd => `
            <tr class="commande-row" data-id="${cmd.document_vente}">
                <td class="font-bold text-blue-600">${cmd.document_vente}</td>
                <td>${cmd.nom_receptionnaire || '-'}</td>
                <td>${cmd.date_livraison}</td>
                <td>${cmd.itineraire || '-'}</td>
                <td><button onclick="lancerCommande('${cmd.document_vente}')" class="bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold">Lancer</button></td>
            </tr>
        `).join('');
    }
}

window.lancerCommande = async (docVente) => {
    // جلب بيانات الطلبية من Supabase قبل الإدراج
    const { data: cmd } = await supabase.from("commandes_excel").select("*").eq("document_vente", docVente).single();
    
    const numLancement = `LNC-${new Date().getFullYear()}-${Math.floor(Math.random()*1000)}`;

    await supabase.from("suivi_commandes_lancer").insert([{
        commande_id: cmd.id,
        historique_import_id: cmd.historique_import_id,
        document_vente: docVente,
        client: cmd.nom_receptionnaire,
        itineraire: cmd.itineraire,
        statut: "LANCEE",
        lance_par: currentUser.id,
        date_lancement: new Date().toISOString(),
        num_lancement: numLancement
    }]);

    await supabase.from("commandes_excel").update({ statut: "LANCEE" }).eq("document_vente", docVente);
    Toast.success("Lancée !");
    loadDashboard();
};

window.lancerTournee = async (itineraire) => {
    const { data } = await supabase.from("commandes_excel").select("document_vente").eq("itineraire", itineraire).eq("statut", "IMPORTEE");
    for (let cmd of data) { await lancerCommande(cmd.document_vente); }
};

async function validerTout() {
    if (!confirm("Valider tout ?")) return;
    const items = document.querySelectorAll('.commande-row, .tournee-row');
    for (let item of items) {
        if (item.classList.contains('tournee-row')) await lancerTournee(item.dataset.id);
        else await lancerCommande(item.dataset.id);
    }
}
