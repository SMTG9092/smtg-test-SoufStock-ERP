import supabase, { getUser } from "./core/supabase.js";

const els = {
    userName: document.getElementById("user-name"),
    dateDisplay: document.getElementById("date-display"),
    statAttente: document.getElementById("stat-attente"),
    statLancee: document.getElementById("stat-lancee"),
    statPicking: document.getElementById("stat-picking"),
    radioModes: document.getElementsByName("mode"),
    tbody: document.getElementById("commandes-table-body"),
    thead: document.getElementById("table-head"),
    btnLancerTout: document.getElementById("btn-lancer-tout")
};

document.addEventListener("DOMContentLoaded", async () => {
    const user = await getUser();
    els.userName.textContent = user?.email || "Administrateur";
    
    // إعداد التواريخ المستهدفة
    const dates = getTargetDates();
    els.dateDisplay.value = dates.join(' | ');

    // ربط الأحداث (التغيير بين الأوضاع وزر الإطلاق)
    els.radioModes.forEach(radio => radio.addEventListener("change", loadDashboard));
    if (els.btnLancerTout) {
        els.btnLancerTout.addEventListener("click", lancerTout);
    }
    
    loadDashboard();
});

async function loadDashboard() {
    const dates = getTargetDates();
    const mode = document.querySelector('input[name="mode"]:checked').value;

    // جلب البيانات من جدول commandes_excel
    const { data, error } = await supabase.from("commandes_excel")
        .select("*")
        .in("date_livraison", dates);

    if (error) {
        console.error("Erreur chargement:", error);
        return;
    }

    const commandes = data || [];

    // حساب وتحديث الإحصائيات (Cards)
    els.statAttente.textContent = commandes.filter(c => c.statut === 'IMPORTEE' || !c.statut).length;
    els.statLancee.textContent = commandes.filter(c => c.statut === 'LANCEE').length;
    els.statPicking.textContent = commandes.filter(c => c.statut === 'EN_PICKING').length;

    renderTable(commandes, mode);
}

function renderTable(commandes, mode) {
    if (mode === 'tournee') {
        // رأس الجدول الخاص بـ Tournée
        els.thead.innerHTML = `
            <tr>
                <th class="p-3">Tournée</th>
                <th class="p-3">Nombre Commandes</th>
                <th class="p-3">Poids Total (KG)</th>
                <th class="p-3">Action</th>
            </tr>
        `;

تجميع حسب التورني (Tournée)
        const tourneeMap = {};
        commandes.forEach(c => {
            const t = c.tournee || c.code_tournee || "Standard";
            if (!tourneeMap[t]) tourneeMap[t] = { count: 0, weight: 0 };
            tourneeMap[t].count += 1;
            tourneeMap[t].weight += Number(c.quantite_commandee || c.poids || 0);
        });

        const entries = Object.entries(tourneeMap);
        els.tbody.innerHTML = entries.length ? entries.map(([tournee, info]) => `
            <tr class="border-b border-gray-700 hover:bg-gray-750">
                <td class="p-3 font-semibold text-gray-200">${tournee}</td>
                <td class="p-3 text-indigo-300">${info.count}</td>
                <td class="p-3 text-green-400 font-bold">${info.weight.toFixed(2)} KG</td>
                <td class="p-3">
                    <button onclick="lancerTournee('${tournee}')" class="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-xs font-bold transition">
                        Lancer
                    </button>
                </td>
            </tr>
        `).join('') : `<tr><td colspan="4" class="p-6 text-center text-gray-500">Aucune tournée trouvée</td></tr>`;

    } else {
        // رأس الجدول الخاص بـ Commande
        els.thead.innerHTML = `
            <tr>
                <th class="p-3">Doc Vente</th>
                <th class="p-3">Client</th>
                <th class="p-3">Date Livraison</th>
                <th class="p-3">Statut</th>
                <th class="p-3">Action</th>
            </tr>
        `;

        els.tbody.innerHTML = commandes.length ? commandes.map(c => `
            <tr class="border-b border-gray-700 hover:bg-gray-750">
                <td class="p-3 font-semibold text-indigo-300">${c.document_vente || '-'}</td>
                <td class="p-3 text-gray-200">${c.nom_receptionnaire || c.client || '-'}</td>
                <td class="p-3 text-gray-400">${c.date_livraison || '-'}</td>
                <td class="p-3">
                    <span class="px-2 py-1 rounded text-xs font-bold ${c.statut === 'LANCEE' ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'}">
                        ${c.statut || 'IMPORTEE'}
                    </span>
                </td>
                <td class="p-3">
                    <button onclick="lancerCommande('${c.document_vente}')" class="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-xs font-bold transition">
                        Lancer
                    </button>
                </td>
            </tr>
        `).join('') : `<tr><td colspan="5" class="p-6 text-center text-gray-500">Aucune commande trouvée</td></tr>`;
    }
}

async function lancerTout() {
    if (!confirm("Êtes-vous sûr de vouloir lancer tout le contenu affiché ?")) return;
    
    // منطق تحديث الحالة في Supabase إلى LANCEE لكل الطلبيات المعروضة
    const dates = getTargetDates();
    const { error } = await supabase.from("commandes_excel")
        .update({ statut: 'LANCEE' })
        .in("date_livraison", dates);

    if (error) {
        alert("Erreur lors du lancement global.");
        console.error(error);
    } else {
        alert("Opération 'Lancer tout' terminée avec succès !");
        loadDashboard();
    }
}

function getTargetDates() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    let dates = [];
    const limit = (dayOfWeek === 6) ? 2 : 1;
    for(let i=0; i<=limit; i++) {
        let d = new Date(); 
        d.setDate(today.getDate() + i);
        dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
}
