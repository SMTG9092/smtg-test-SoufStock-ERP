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
            els.userInfo.textContent = `Session: ${currentUser.nom || currentUser.email || 'Logistique'}`;
        }

        bindEvents();
        await fetchCommandesEnAttente();
    } catch (error) {
        console.error("Init Lancement :", error);
        Toast.error("Erreur lors de l'initialisation de la page.");
    } finally {
        if (Loader && typeof Loader.hide === "function") Loader.hide();
    }
}

function bindEvents() {
    els.btnRefresh?.addEventListener("click", fetchCommandesEnAttente);
}

function showLoading() {
    if (els.tableBody) {
        els.tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="py-8 text-center text-gray-400">
                    <i class="fa-solid fa-spinner fa-spin text-2xl mb-2"></i>
                    <p>Mise à jour de la liste...</p>
                </td>
            </tr>`;
    }
}

async function fetchCommandesEnAttente() {
    try {
        showLoading();
        
        // 1. جلب الأسطر الفريدة بحالة IMPORTEE
        const { data: commandes, error: errCmd } = await supabase
            .from("commandes_excel")
            .select("document_vente, nom_receptionnaire, date_creation, date_livraison, itineraire, statut")
            .eq("statut", "IMPORTEE")
            .order("date_creation", { ascending: false });

        if (errCmd) throw errCmd;

        if (!commandes || commandes.length === 0) {
            commandesEnAttente = [];
            renderEmptyTable();
            return;
        }

        // 2. تصفية التكرار بناءً على رقم الوثيقة الفريد document_vente
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
        Toast.error("Erreur lors du chargement des commandes en attente.");
    }
}

function renderEmptyTable() {
    if (els.tableBody) {
        els.tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="py-8 text-center text-gray-500">
                    <i class="fa-solid fa-circle-check text-green-500 text-3xl mb-2"></i>
                    <p class="font-medium">Aucune commande en attente de lancement.</p>
                </td>
            </tr>`;
    }
}

function renderTable(commandes) {
    if (!els.tableBody) return;
    els.tableBody.innerHTML = "";
    
    commandes.forEach((cmd, index) => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-gray-50 transition border-b border-gray-100";
        tr.innerHTML = `
            <td class="py-3 px-4 font-semibold text-blue-600">${cmd.document_vente}</td>
            <td class="py-3 px-4 font-medium">${cmd.nom_receptionnaire || '-'}</td>
            <td class="py-3 px-4 text-gray-500">${formatDate(cmd.date_creation)}</td>
            <td class="py-3 px-4 text-gray-500">${formatDate(cmd.date_livraison)}</td>
            <td class="py-3 px-4">
                <input type="text" id="route-${cmd.document_vente}" value="${cmd.itineraire || ''}" 
                    class="w-full bg-gray-50 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500 font-mono" placeholder="Ex: Tournée Nord">
            </td>
            <td class="py-3 px-4 text-center">
                <button data-id="${cmd.document_vente}" data-index="${index}"
                    class="btn-lancer bg-green-600 hover:bg-green-700 text-white font-medium py-1.5 px-3 rounded text-xs flex items-center mx-auto transition shadow-sm">
                    <i class="fa-solid fa-paper-plane mr-1.5"></i> Lancer
                </button>
            </td>
        `;
        els.tableBody.appendChild(tr);
    });

    // ربط مستمعي الأحداث للأزرار الديناميكية
    els.tableBody.querySelectorAll(".btn-lancer").forEach(btn => {
        btn.addEventListener("click", handleLancement);
    });
}

async function handleLancement(e) {
    const btn = e.currentTarget;
    const docVente = btn.dataset.id;
    const index = Number(btn.dataset.index);
    const cmd = commandesEnAttente[index];

    if (!cmd) return;

    const routeInput = document.getElementById(`route-${docVente}`);
    const itineraireSelectionne = routeInput ? routeInput.value.trim() : "";

    if (!itineraireSelectionne) {
        Toast.warning("Veuillez spécifier un itinéraire avant le lancement.");
        if (routeInput) routeInput.focus();
        return;
    }

    try {
        if (Loader && typeof Loader.show === "function") Loader.show();

        // 1. فتح سطر المتابعة المعتمد بربط علاقات الـ Foreign Key بشكل سليم
        const { error: insErr } = await supabase
            .from("suivi_commandes_lancer")
            .insert({
                document_vente: docVente,
                nom_receptionnaire: cmd.nom_receptionnaire,
                itineraire: itineraireSelectionne,
                statut: "EN_PICKING",
                date_lancement: new Date().toISOString()
            });

        if (insErr) throw insErr;

        // 2. تحديث حالة كافة أسطر الأرتيكل الخاصة بالطلبية لتتحول من IMPORTEE إلى LANCEE
        const { error: updErr } = await supabase
            .from("commandes_excel")
            .update({ statut: "LANCEE" })
            .eq("document_vente", docVente);

        if (updErr) throw updErr;

        Toast.success(`Commande ${docVente} lancée avec succès pour le picking.`);
        
        // إعادة تحميل الجدول لمزامنة الواجهة
        await fetchCommandesEnAttente();

    } catch (error) {
        console.error("Erreur lors du lancement de la commande :", error);
        Toast.error("Échec du lancement de la commande.");
    } finally {
        if (Loader && typeof Loader.hide === "function") Loader.hide();
    }
}

function formatDate(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return isNaN(d) ? dateStr : d.toLocaleDateString('fr-FR');
}
