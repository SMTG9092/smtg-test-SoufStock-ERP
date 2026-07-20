/**
 * ============================================================
 * SoufStock Enterprise ERP/WMS
 * File : js/lancer.js
 * ============================================================
 */

"use strict";

import supabase, { getUser } from "./core/supabase.js";
import { Loader, Toast } from "./core/utils.js";

let currentUser = null;
let commandesEnAttente = [];

const els = {
    userInfo: document.getElementById("user-info"),
    btnRefresh: document.getElementById("btn-refresh"),
    tableBody: document.getElementById("commandes-table-body"),
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
    try {
        if (Loader && typeof Loader.show === "function") Loader.show();
        
        currentUser = await getUser();
        if (!currentUser) {
            Toast.error("Utilisateur non connecté.");
            return;
        }
        
        if (els.userInfo) {
            els.userInfo.textContent = `Session: ${currentUser.nom || 'Logistique'}`;
        }

        bindEvents();
        await fetchCommandesEnAttente();
    } catch (error) {
        console.error("Init Lancement :", error);
        Toast.error("Erreur d'initialisation.");
    } finally {
        if (Loader && typeof Loader.hide === "function") Loader.hide();
    }
}

function bindEvents() {
    els.btnRefresh?.addEventListener("click", fetchCommandesEnAttente);
}

async function fetchCommandesEnAttente() {
    try {
        els.tableBody.innerHTML = `<tr><td colspan="6" class="py-8 text-center">Chargement...</td></tr>`;
        
        // جلب البيانات مع الـ id و historique_import_id الضروريين للربط
        const { data: commandes, error: errCmd } = await supabase
            .from("commandes_excel")
            .select("id, document_vente, nom_receptionnaire, date_creation, date_livraison, itineraire, historique_import_id")
            .eq("statut", "IMPORTEE")
            .order("date_creation", { ascending: false });

        if (errCmd) throw errCmd;

        if (!commandes || commandes.length === 0) {
            els.tableBody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-gray-500">Aucune commande en attente.</td></tr>`;
            return;
        }

        // تصفية الأسطر الفريدة
        const uniqueMap = new Map();
        commandesEnAttente = [];
        for (const item of commandes) {
            if (!uniqueMap.has(item.document_vente)) {
                uniqueMap.set(item.document_vente, true);
                commandesEnAttente.push(item);
            }
        }

        renderTable(commandesEnAttente);
    } catch (error) {
        console.error("fetchCommandesEnAttente :", error);
        Toast.error("Erreur de chargement.");
    }
}

function renderTable(commandes) {
    els.tableBody.innerHTML = "";
    commandes.forEach((cmd, index) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="py-3 px-4 font-semibold text-blue-600">${cmd.document_vente}</td>
            <td class="py-3 px-4">${cmd.nom_receptionnaire || '-'}</td>
            <td class="py-3 px-4">${formatDate(cmd.date_creation)}</td>
            <td class="py-3 px-4">${formatDate(cmd.date_livraison)}</td>
            <td class="py-3 px-4">
                <input type="text" id="route-${cmd.document_vente}" value="${cmd.itineraire || ''}" 
                    class="w-full border rounded px-2 py-1 text-sm">
            </td>
            <td class="py-3 px-4 text-center">
                <button data-index="${index}" class="btn-lancer bg-green-600 text-white py-1 px-3 rounded text-xs">
                    Lancer
                </button>
            </td>
        `;
        els.tableBody.appendChild(tr);
    });

    els.tableBody.querySelectorAll(".btn-lancer").forEach(btn => {
        btn.addEventListener("click", handleLancement);
    });
}

async function handleLancement(e) {
    const cmd = commandesEnAttente[e.target.dataset.index];
    const routeInput = document.getElementById(`route-${cmd.document_vente}`);
    
    if (!routeInput.value.trim()) {
        Toast.warning("Veuillez saisir un itinéraire.");
        return;
    }

    try {
        if (Loader) Loader.show();

        // إدراج البيانات مع الحقول المطلوبة (commande_id و historique_import_id)
        const { error: insErr } = await supabase
            .from("suivi_commandes_lancer")
            .insert({
                commande_id: cmd.id,
                historique_import_id: cmd.historique_import_id,
                document_vente: cmd.document_vente,
                client: cmd.nom_receptionnaire,
                itineraire: routeInput.value.trim(),
                statut: "EN_PICKING",
                date_lancement: new Date().toISOString()
            });

        if (insErr) throw insErr;

        // تحديث حالة الطلب الأصلي
        await supabase.from("commandes_excel")
            .update({ statut: "LANCEE" })
            .eq("document_vente", cmd.document_vente);

        Toast.success(`Commande ${cmd.document_vente} lancée !`);
        fetchCommandesEnAttente();

    } catch (error) {
        console.error(error);
        Toast.error("Erreur lors du lancement.");
    } finally {
        if (Loader) Loader.hide();
    }
}

function formatDate(d) { return d ? new Date(d).toLocaleDateString('fr-FR') : "-"; }
