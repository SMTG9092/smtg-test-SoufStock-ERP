/**
 * ============================================================
 * SoufStock Enterprise ERP/WMS
 * File : assets/js/picking.js
 * ============================================================
 */

"use strict";

import supabase, { getUser } from "./core/supabase.js";
import { Loader, Toast } from "./core/utils.js";

let currentUser = null;
let currentCommande = null;
let currentPicking = null;
let articles = [];

const els = {
    pickingId: document.getElementById("pickingId"),
    suiviId: document.getElementById("suiviId"),
    commandeInput: document.getElementById("commandeInput"),
    btnSearch: document.getElementById("btnSearch"),
    btnScanner: document.getElementById("btnScanner"),
    btnSave: document.getElementById("btnSave"),
    btnValidate: document.getElementById("btnValidate"),
    clientName: document.getElementById("clientName"),
    dateCreation: document.getElementById("dateCreation"),
    dateLivraison: document.getElementById("dateLivraison"),
    tournee: document.getElementById("tournee"),
    chauffeur: document.getElementById("chauffeur"),
    statutCommande: document.getElementById("statutCommande"),
    pickingBody: document.getElementById("pickingBody"),
    pickingProgress: document.getElementById("pickingProgress"),
    progressText: document.getElementById("progressText"),
    totalArticles: document.getElementById("totalArticles"),
    totalQuantity: document.getElementById("totalQuantity"),
    preparedQuantity: document.getElementById("preparedQuantity"),
    btnRefresh: document.getElementById("btnRefresh"),
    btnSaveFooter: document.getElementById("btnSaveFooter"),
    btnValidateFooter: document.getElementById("btnValidateFooter"),
    confirmModal: document.getElementById("confirmModal"),
    confirmMessage: document.getElementById("confirmMessage"),
    confirmYes: document.getElementById("confirmYes"),
    confirmNo: document.getElementById("confirmNo"),
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
        bindEvents();
        resetPicking();
    } catch (error) {
        console.error("Init Picking :", error);
        Toast.error("Erreur lors de l'initialisation.");
    } finally {
        if (Loader && typeof Loader.hide === "function") Loader.hide();
    }
}

function bindEvents() {
    els.btnSearch?.addEventListener("click", searchCommande);
    els.commandeInput?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); searchCommande(); }
    });
    els.btnScanner?.addEventListener("click", () => Toast.info("Scanner bientôt disponible."));
    els.btnSave?.addEventListener("click", savePicking);
    els.btnSaveFooter?.addEventListener("click", savePicking);
    els.btnValidate?.addEventListener("click", validatePicking);
    els.btnValidateFooter?.addEventListener("click", validatePicking);
    els.btnRefresh?.addEventListener("click", refreshPicking);
    els.confirmNo?.addEventListener("click", () => {
        if (els.confirmModal) { els.confirmModal.classList.remove("show"); els.confirmModal.style.display = "none"; }
    });
}

function resetPicking() {
    currentCommande = null; currentPicking = null; articles = [];
    if (els.pickingId) els.pickingId.value = "";
    if (els.suiviId) els.suiviId.value = "";
    if (els.clientName) els.clientName.textContent = "-";
    if (els.dateCreation) els.dateCreation.textContent = "-";
    if (els.dateLivraison) els.dateLivraison.textContent = "-";
    if (els.tournee) els.tournee.textContent = "-";
    if (els.chauffeur) els.chauffeur.textContent = "-";
    if (els.statutCommande) { els.statutCommande.textContent = "En préparation"; els.statutCommande.className = "badge badge-warning"; }
    if (els.pickingBody) els.pickingBody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">Aucune commande chargée.</td></tr>`;
    calculateSummary();
}

function formatDate(v) {
    if (!v) return "-";
    const d = new Date(v);
    return isNaN(d) ? v : d.toLocaleDateString("fr-FR");
}

function refreshPicking() {
    if (!currentCommande) { resetPicking(); return; }
    searchCommande();
}

async function searchCommande() {
    const num = els.commandeInput.value.trim();
    if (!num) { Toast.warning("Veuillez saisir un numéro."); return; }
    try {
        if (Loader && typeof Loader.show === "function") Loader.show();
        resetPicking();
        currentCommande = await loadCommande(num);
        if (!currentCommande) { Toast.warning("Commande introuvable."); return; }

        const { data: pick } = await supabase.from("picking").select("*").eq("document_vente", num).maybeSingle();
        if (pick) {
            currentPicking = pick;
            if (els.pickingId) els.pickingId.value = pick.id;
            if (els.statutCommande) {
                els.statutCommande.textContent = pick.statut;
                els.statutCommande.className = pick.statut === "VALIDE" ? "badge badge-success" : "badge badge-warning";
            }
        }
        displayCommandeInfo(currentCommande);
        await buildPickingTable(currentCommande.lignes);
    } catch (err) {
        console.error(err); Toast.error("Erreur de chargement.");
    } finally {
        if (Loader && typeof Loader.hide === "function") Loader.hide();
    }
}

async function loadCommande(num) {
    const { data: kg, error: e1 } = await supabase.from("commandes_excel").select("*").eq("document_vente", num).order("article");
    if (e1) throw e1; if (!kg || kg.length === 0) return null;

    const { data: pc } = await supabase.from("commandes_clients_pieces").select("document_vente, article, nombre_pieces").eq("document_vente", num);
    const { data: sv } = await supabase.from("suivi_commandes_lancer").select("id, itineraire").eq("document_vente", num).maybeSingle();

    if (sv && els.suiviId) els.suiviId.value = sv.id;
    return {
        numero: num, client: kg[0].nom_receptionnaire, dateCreation: kg[0].date_creation,
        dateLivraison: kg[0].date_livraison, tournee: sv?.itineraire || kg[0].itineraire,
        chauffeur: "", statut: kg[0].statut, lignes: kg, pieces: pc || []
    };
}

function displayCommandeInfo(c) {
    if (els.clientName) els.clientName.textContent = c.client || "-";
    if (els.dateCreation) els.dateCreation.textContent = formatDate(c.dateCreation);
    if (els.dateLivraison) els.dateLivraison.textContent = formatDate(c.dateLivraison);
    if (els.tournee) els.tournee.textContent = c.tournee || "-";
    if (els.chauffeur) els.chauffeur.textContent = c.chauffeur || "-";
}

async function buildPickingTable(lignes) {
    els.pickingBody.innerHTML = ""; articles = [];
    const piecesMap = new Map();
    (currentCommande.pieces || []).forEach(p => piecesMap.set(`${p.document_vente}_${p.article}`, Number(p.nombre_pieces || 0)));

    const map = new Map();
    lignes.forEach(l => {
        const k = `${l.document_vente}_${l.article}`;
        if (!map.has(k)) {
            map.set(k, { article: l.article, designation: l.designation_article, quantite: Number(l.quantite_commandee || 0), pieces: piecesMap.get(k) || 0, lots: [] });
        } else {
            map.get(k).quantite += Number(l.quantite_commandee || 0);
        }
    });
    articles = [...map.values()];

    if (!articles.length) {
        els.pickingBody.innerHTML = `<tr><td colspan="7" class="text-center">Aucune ligne à préparer.</td></tr>`; return;
    }

    let existingDetails = [];
    if (currentPicking) {
        const { data } = await supabase.from("picking_details").select("*").eq("picking_id", currentPicking.id);
        existingDetails = data || [];
    }

    articles.forEach((art, index) => {
        const tbodyGroup = document.createElement("tbody");
        tbodyGroup.className = "article-group-body";
        tbodyGroup.setAttribute("id", `group_${index}`);

        const trMain = document.createElement("tr");
        trMain.className = "article-row";
        trMain.innerHTML = `
            <td><strong>${art.article}</strong><br><small>${art.designation ?? ""}</small></td>
            <td class="text-end">${art.quantite.toFixed(3)}</td>
            <td><span id="prepared_${index}">0.000</span></td>
            <td>${art.pieces}</td>
            <td colspan="3" class="bg-light-action" style="text-align: left; padding-left: 10px;">
                <button type="button" class="btn btn-success btn-add-lot" style="padding: 4px 10px; font-size: 13px;">
                    <i class="fas fa-plus"></i> Ajouter un Lot
                </button>
            </td>
        `;
        tbodyGroup.appendChild(trMain);

        const artDetails = existingDetails.filter(d => d.article === art.article);
        if (artDetails.length > 0) {
            artDetails.forEach(det => tbodyGroup.appendChild(createLotRow(index, det.lot, det.quantite_preparee)));
        } else {
            tbodyGroup.appendChild(createLotRow(index));
        }

        trMain.querySelector(".btn-add-lot").addEventListener("click", () => tbodyGroup.appendChild(createLotRow(index)));
        els.pickingBody.appendChild(tbodyGroup);
        calculatePrepared(index);
    });
    calculateSummary();
}

function createLotRow(articleIndex, lotVal = "", qtyVal = "") {
    const trLot = document.createElement("tr");
    trLot.className = "lot-item-row";
    trLot.innerHTML = `
        <td style="border: none; background: transparent;"></td>
        <td style="border: none; background: transparent;"></td>
        <td style="border: none; background: transparent;"></td>
        <td style="border: none; background: transparent;"></td>
        <td>
            <input type="text" class="lot-input form-control" style="width:100%; height:34px;" placeholder="Lot" value="${lotVal}" autocomplete="off">
        </td>
        <td>
            <input type="number" class="qty-input form-control" style="width:100%; height:34px;" placeholder="Qté" min="0" step="0.001" value="${qtyVal}">
        </td>
        <td class="text-center">
            <button type="button" class="btn-remove" style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:16px; padding-top:6px;">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    trLot.querySelector(".btn-remove").addEventListener("click", () => { trLot.remove(); calculatePrepared(articleIndex); calculateSummary(); });
    trLot.querySelector(".qty-input").addEventListener("input", () => { calculatePrepared(articleIndex); calculateSummary(); });
    return trLot;
}

function calculatePrepared(articleIndex) {
    const group = document.getElementById(`group_${articleIndex}`); if (!group) return;
    let tot = 0; group.querySelectorAll(".qty-input").forEach(i => tot += Number(i.value || 0));
    const span = document.getElementById(`prepared_${articleIndex}`); if (span) span.textContent = tot.toFixed(3);

    const mainRow = group.querySelector(".article-row");
    if (mainRow && articles[articleIndex]) {
        mainRow.style.backgroundColor = tot > articles[articleIndex].quantite ? "rgba(220, 53, 69, 0.08)" : "";
    }
}

function calculateSummary() {
    let totCmd = 0, totPrep = 0;
    articles.forEach((art, idx) => {
        totCmd += art.quantite;
        const span = document.getElementById(`prepared_${idx}`);
        if (span) totPrep += Number(span.textContent || 0);
    });
    if (els.totalArticles) els.totalArticles.textContent = articles.length;
    if (els.totalQuantity) els.totalQuantity.textContent = totCmd.toFixed(3);
    if (els.preparedQuantity) els.preparedQuantity.textContent = totPrep.toFixed(3);
    const pct = totCmd > 0 ? (totPrep / totCmd) * 100 : 0;
    if (els.pickingProgress) els.pickingProgress.style.width = `${pct}%`;
    if (els.progressText) els.progressText.textContent = `${Math.min(100, pct).toFixed(0)}%`;
}

async function savePicking() {
    if (!currentCommande) { Toast.warning("Aucune commande chargée."); return; }
    try {
        if (Loader && typeof Loader.show === "function") Loader.show();
        if (!currentPicking) {
            const { data, error } = await supabase.from("picking").insert({ document_vente: currentCommande.numero, utilisateur: currentUser.id, statut: "EN_COURS" }).select().single();
            if (error) throw error; currentPicking = data;
            if (els.pickingId) els.pickingId.value = data.id;
        }

        const details = []; let totalPreparedForOrder = 0;
        for (let i = 0; i < articles.length; i++) {
            const art = articles[i]; const group = document.getElementById(`group_${i}`); if (!group) continue;
            const rows = group.querySelectorAll(".lot-item-row");
            for (const r of rows) {
                const lot = r.querySelector(".lot-input").value.trim();
                const qty = Number(r.querySelector(".qty-input").value || 0);
                if (!lot || qty <= 0) continue;
                totalPreparedForOrder += qty;

                const { data: st } = await supabase.from("stock").select("id, emplacement").eq("article", art.article).eq("lot", lot).gt("quantite", 0).maybeSingle();
                details.push({
                    picking_id: currentPicking.id, article: art.article, designation_article: art.designation || "",
                    lot: lot, quantite_preparee: qty, quantite_commandee: art.quantite, magasin: "MAG_DEFAULT",
                    emplacement: st?.emplacement || "N/A", stock_id: st?.id || null
                });
            }
        }
        await supabase.from("picking_details").delete().eq("picking_id", currentPicking.id);
        if (details.length > 0) { const { error: insErr } = await supabase.from("picking_details").insert(details); if (insErr) throw insErr; }

        const totalQty = articles.reduce((acc, c) => acc + c.quantite, 0);
        const prog = totalQty > 0 ? (totalPreparedForOrder / totalQty) * 100 : 0;

        await supabase.from("picking").update({ total_articles: articles.length, total_prepare: totalPreparedForOrder, progression: Math.round(prog) }).eq("id", currentPicking.id);
        await supabase.from("suivi_commandes_lancer").update({ statut: "EN_PICKING", picking_par: currentUser.id }).eq("document_vente", currentCommande.numero);
        Toast.success("Picking sauvegardé.");
    } catch (err) { console.error(err); Toast.error("Erreur de sauvegarde."); }
    finally { if (Loader && typeof Loader.hide === "function") Loader.hide(); }
}

async function validatePicking() {
    if (!currentPicking) { Toast.warning("Veuillez enregistrer le picking avant de valider."); return; }
    let isOver = false;
    articles.forEach((art, idx) => { const span = document.getElementById(`prepared_${idx}`); if (span && Number(span.textContent || 0) > art.quantite) isOver = true; });
    if (isOver) { Toast.error("Quantité préparée supérieure à la commande."); return; }

    if (els.confirmModal && els.confirmMessage) {
        els.confirmMessage.textContent = "Voulez-vous valider définitivement ce picking ?";
        els.confirmModal.classList.add("show"); els.confirmModal.style.display = "flex";
        const newYes = els.confirmYes.cloneNode(true); els.confirmYes.parentNode.replaceChild(newYes, els.confirmYes); els.confirmYes = newYes;
        els.confirmYes.addEventListener("click", async () => {
            if (els.confirmModal) { els.confirmModal.classList.remove("show"); els.confirmModal.style.display = "none"; }
            await executeFinalValidation();
        });
    } else {
        if (confirm("Valider le picking ?")) await executeFinalValidation();
    }
}

async function executeFinalValidation() {
    try {
        if (Loader && typeof Loader.show === "function") Loader.show();
        await supabase.from("picking").update({ statut: "VALIDE", date_validation: new Date().toISOString() }).eq("id", currentPicking.id);
        await supabase.from("suivi_commandes_lancer").update({ statut: "PICKING_TERMINE", date_fin_picking: new Date().toISOString(), validation_par: currentUser.id, date_validation: new Date().toISOString() }).eq("document_vente", currentCommande.numero);
        Toast.success("Picking validé définitivement.");
        if (els.btnSave) els.btnSave.disabled = true;
        if (els.btnValidate) els.btnValidate.disabled = true;
        if (els.statutCommande) { els.statutCommande.textContent = "VALIDE"; els.statutCommande.className = "badge badge-success"; }
    } catch (err) { console.error(err); Toast.error("Erreur de validation."); }
    finally { if (Loader && typeof Loader.hide === "function") Loader.hide(); }
}
