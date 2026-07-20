/**
 * ============================================================
 * SoufStock Enterprise ERP/WMS
 * File : js/picking.js
 * ============================================================
 */

"use strict";

import supabase, { getUser } from "./core/supabase.js";
import { Loader, Toast } from "./core/utils.js";

let currentUser = null;
let currentCommande = null;
let currentPicking = null;
let articles = [];
let activeLotInput = null;
let activeArticle = null;
let activeDropdown = null;
let activeIndex = -1;

const stockCache = new Map();

const els = {
    pickingId: document.getElementById("pickingId"),
    suiviId: document.getElementById("suiviId"),
    commandeInput: document.getElementById("commandeInput"),
    btnSearch: document.getElementById("btnSearch"),
    btnScanner: document.getElementById("btnScanner"),
    btnSave: document.getElementById("btnSave"),
    btnSaveFooter: document.getElementById("btnSaveFooter"),
    btnValidate: document.getElementById("btnValidate"),
    btnValidateFooter: document.getElementById("btnValidateFooter"),
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
    refreshValidationState();
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

    for (let index = 0; index < articles.length; index++) {
        const art = articles[index];
        const artDetails = existingDetails.filter(d => d.article === art.article);

        const firstLot = artDetails.length ? artDetails[0].lot : "";
        const firstQty = artDetails.length ? artDetails[0].quantite_preparee : "";

        const trMain = document.createElement("tr");
        trMain.className = "article-row";
        trMain.id = `group_${index}`;

        trMain.innerHTML = `
            <td class="col-article">
                <strong>${art.article}</strong><br>
                <small>${art.designation ?? ""}</small>
            </td>

            <td class="col-qte text-end">
                ${art.quantite.toFixed(3)}
            </td>

            <td class="col-prepare text-center">
                <span id="prepared_${index}">0.000</span>
            </td>

            <td class="col-piece text-center">
                ${art.pieces}
            </td>

            <td class="col-lot">
                <input
                    type="text"
                    class="lot-input form-control"
                    placeholder="Lot"
                    value="${firstLot}"
                    autocomplete="off">
            </td>

            <td class="col-qteprepare">
                <input
                    type="number"
                    class="qty-input form-control"
                    placeholder="Qté"
                    min="0"
                    step="0.001"
                    value="${firstQty}">
            </td>

            <td class="col-action text-center">
                <button type="button" class="btn-add-lot-icon">+</button>
            </td>
        `;

        els.pickingBody.appendChild(trMain);

        const lotInp = trMain.querySelector(".lot-input");

        if (firstLot) {
            const cacheKey = `${art.article}|${firstLot}`;
            if (stockCache.has(cacheKey)) {
                lotInp.dataset.stock = stockCache.get(cacheKey);
            } else {
                const { data: st } = await supabase.from("stock").select("stock_disponible").eq("article", art.article).eq("lot", firstLot);
                const stockVal = st ? st.reduce((sum, item) => sum + Number(item.stock_disponible || 0), 0) : 0;
                stockCache.set(cacheKey, stockVal);
                lotInp.dataset.stock = stockVal;
            }
        }

        bindLotAutocomplete(lotInp, art.article);
        setupRowValidationListeners(trMain, index);

        if (artDetails.length > 1) {
            let currentLastRow = trMain;
            for (let j = 1; j < artDetails.length; j++) {
                const subRow = createLotRow(index, artDetails[j].lot, artDetails[j].quantite_preparee);
                currentLastRow.insertAdjacentElement("afterend", subRow);
                currentLastRow = subRow;
                
                if (artDetails[j].lot) {
                    const cacheKey = `${art.article}|${artDetails[j].lot}`;
                    const subLotInp = subRow.querySelector(".lot-input");
                    if (stockCache.has(cacheKey)) {
                        subLotInp.dataset.stock = stockCache.get(cacheKey);
                    } else {
                        const { data: st } = await supabase.from("stock").select("stock_disponible").eq("article", art.article).eq("lot", artDetails[j].lot);
                        const stockVal = st ? st.reduce((sum, item) => sum + Number(item.stock_disponible || 0), 0) : 0;
                        stockCache.set(cacheKey, stockVal);
                        subLotInp.dataset.stock = stockVal;
                    }
                }
                checkRowStock(subRow, index);
            }
        }

        trMain.querySelector(".btn-add-lot-icon").addEventListener("click", (e) => {
            // 1. التحقق أولاً من عدم وجود أي خطأ مخزون بالمجموعة الحالية
            if (isGroupInvalid(index)) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            // 2. حساب إجمالي الكمية المحضرة حالياً في المجموعة لمنع الإضافة إذا استوفت أو تجاوزت المطلوب
            let totalPreparedNow = 0;
            let current = trMain;
            while (current) {
                const qInp = current.querySelector(".qty-input");
                if (qInp) totalPreparedNow += Number(qInp.value || 0);
                current = current.nextElementSibling;
                if (!current || !current.classList.contains("lot-item-row")) break;
            }

            const qtyCommande = Number(art.quantite || 0);
            const EPSILON = 0.001;

            if (totalPreparedNow >= (qtyCommande - EPSILON)) {
                e.preventDefault();
                e.stopPropagation();
                Toast.warning("La quantité demandée est déjà atteinte ou dépassée. Ajout de Lot bloqué.");
                return;
            }

            let lastRowOfGroup = trMain;
            while (lastRowOfGroup.nextElementSibling && lastRowOfGroup.nextElementSibling.classList.contains("lot-item-row")) {
                lastRowOfGroup = lastRowOfGroup.nextElementSibling;
            }
            const newRow = createLotRow(index);
            lastRowOfGroup.insertAdjacentElement("afterend", newRow);
            updateRowState(newRow, index);
            calculatePrepared(index);
            refreshValidationState();
        });

        checkRowStock(trMain, index);
        calculatePrepared(index);
    }

    calculateSummary();
    refreshValidationState();
}

function createLotRow(articleIndex, lotVal = "", qtyVal = "") {
    const trLot = document.createElement("tr");
    trLot.className = "lot-item-row";

    trLot.innerHTML = `
        <td class="col-article"></td>
        <td class="col-qte"></td>
        <td class="col-prepare"></td>
        <td class="col-piece"></td>
        <td class="col-lot">
            <input type="text" class="lot-input form-control" placeholder="Lot" value="${lotVal}" autocomplete="off">
        </td>
        <td class="col-qteprepare">
            <input type="number" class="qty-input form-control" placeholder="Qté" min="0" step="0.001" value="${qtyVal}">
        </td>
        <td class="col-action text-center">
            <button type="button" class="btn-remove">−</button>
        </td>
    `;

    trLot.querySelector(".btn-remove").addEventListener("click", () => {
        const nextRows = [];
        let sib = trLot.nextElementSibling;
        while (sib && sib.classList.contains("lot-item-row")) {
            nextRows.push(sib);
            sib = sib.nextElementSibling;
        }
        trLot.remove();
        calculatePrepared(articleIndex);
        calculateSummary();
        const mainRow = document.getElementById(`group_${articleIndex}`);
        if (mainRow) updateRowState(mainRow, articleIndex);
        nextRows.forEach(r => updateRowState(r, articleIndex));
        refreshValidationState();
    });

    bindLotAutocomplete(
        trLot.querySelector(".lot-input"),
        articles[articleIndex].article
    );

    setupRowValidationListeners(trLot, articleIndex);

    return trLot;
}

function setRowInvalid(row) {
    if (!row.classList.contains("row-invalid")) {
        row.classList.add("row-invalid");
        const qtyInput = row.querySelector(".qty-input");
        if (qtyInput) qtyInput.classList.add("is-invalid");
        Toast.error("Stock insuffisant.");
    }
}

function clearRowInvalid(row) {
    if (row.classList.contains("row-invalid")) {
        row.classList.remove("row-invalid");
        const qtyInput = row.querySelector(".qty-input");
        if (qtyInput) qtyInput.classList.remove("is-invalid");
    }
}

function updateRowState(row, articleIndex) {
    if (!row || articleIndex === undefined || !articles[articleIndex]) return;

    if (row.classList.contains("lot-item-row")) {
        row.classList.remove("row-success", "row-warning");
    }

    const mainRow = document.getElementById(`group_${articleIndex}`);
    if (!mainRow) return;

    let totalPrepared = 0;
    let groupHasError = false;
    let current = mainRow;

    while (current) {
        const q = current.querySelector(".qty-input");
        if (q) {
            totalPrepared += Number(q.value || 0);
        }
        if (current.classList.contains("row-invalid")) {
            groupHasError = true;
        }
        current = current.nextElementSibling;
        if (!current || !current.classList.contains("lot-item-row")) {
            break;
        }
    }

    const qtyCommande = Number(articles[articleIndex].quantite || 0);

    mainRow.classList.remove("row-success", "row-warning");

    if (groupHasError) {
        return;
    }

    const EPSILON = 0.001;

    if (Math.abs(totalPrepared - qtyCommande) <= EPSILON) {
        mainRow.classList.add("row-success");
    }
    else if (totalPrepared > qtyCommande + EPSILON) {
        mainRow.classList.add("row-warning");
    }
}

function setupRowValidationListeners(row, articleIndex) {
    const lotInput = row.querySelector(".lot-input");
    const qtyInput = row.querySelector(".qty-input");

    const blockKeys = (e) => {
        if (row.classList.contains("row-invalid")) {
            if (e.key === "Tab" || e.key === "Enter" || e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                Toast.warning("Veuillez corriger la quantité ou le Lot avant de changer de champ.");
            }
        }
    };

    lotInput.addEventListener("keydown", blockKeys);
    qtyInput.addEventListener("keydown", blockKeys);

    const enforceFocus = (e) => {
        if (row.classList.contains("row-invalid")) {
            e.preventDefault();
            setTimeout(() => {
                qtyInput.focus();
            }, 10);
        }
    };

    lotInput.addEventListener("blur", enforceFocus);
    qtyInput.addEventListener("blur", enforceFocus);

    const handleLotChange = async () => {
        const lotVal = lotInput.value.trim();
        const artVal = articles[articleIndex].article;
        if (lotVal) {
            const cacheKey = `${artVal}|${lotVal}`;
            if (stockCache.has(cacheKey)) {
                lotInput.dataset.stock = stockCache.get(cacheKey);
            } else {
                const { data: st } = await supabase.from("stock").select("stock_disponible").eq("article", artVal).eq("lot", lotVal);
                const stockVal = st ? st.reduce((sum, item) => sum + Number(item.stock_disponible || 0), 0) : 0;
                stockCache.set(cacheKey, stockVal);
                lotInput.dataset.stock = stockVal;
            }
        } else {
            lotInput.dataset.stock = 0;
        }
        checkRowStock(row, articleIndex);
    };

    lotInput.addEventListener("input", handleLotChange);
    lotInput.addEventListener("change", handleLotChange);

    qtyInput.addEventListener("input", () => {
        checkRowStock(row, articleIndex);
        calculatePrepared(articleIndex);
        calculateSummary();
    });
}

function checkRowStock(row, articleIndex) {
    const lotInput = row.querySelector(".lot-input");
    const qtyInput = row.querySelector(".qty-input");
    if (!lotInput || !qtyInput) return;

    const stockDisp = Number(lotInput.dataset.stock || 0);
    const qtyPrep = Number(qtyInput.value || 0);

    if (lotInput.value.trim() && qtyPrep > stockDisp) {
        setRowInvalid(row);
    } else {
        clearRowInvalid(row);
    }
    updateRowState(row, articleIndex);
    refreshValidationState();
}

function isGroupInvalid(articleIndex) {
    const mainRow = document.getElementById(`group_${articleIndex}`);
    if (!mainRow) return false;
    let row = mainRow;
    while (row) {
        if (row.classList.contains("row-invalid")) return true;
        row = row.nextElementSibling;
        if (!row || !row.classList.contains("lot-item-row")) break;
    }
    return false;
}

function refreshValidationState() {
    const invalidRows = els.pickingBody.querySelectorAll("tr.row-invalid, .qty-input.is-invalid");
    const hasInvalid = invalidRows.length > 0;

    if (els.btnSave) els.btnSave.disabled = hasInvalid;
    if (els.btnSaveFooter) els.btnSaveFooter.disabled = hasInvalid;
    if (els.btnValidate) els.btnValidate.disabled = hasInvalid;
    if (els.btnValidateFooter) els.btnValidateFooter.disabled = hasInvalid;
}

function runFullStockValidation() {
    let isValid = true;
    for (let i = 0; i < articles.length; i++) {
        const group = document.getElementById(`group_${i}`);
        if (!group) continue;
        let row = group;
        while (row) {
            const lotInput = row.querySelector(".lot-input");
            const qtyInput = row.querySelector(".qty-input");
            if (lotInput && qtyInput) {
                const stockDisp = Number(lotInput.dataset.stock || 0);
                const qtyPrep = Number(qtyInput.value || 0);
                if (lotInput.value.trim() && qtyPrep > stockDisp) {
                    setRowInvalid(row);
                    isValid = false;
                } else {
                    clearRowInvalid(row);
                }
                updateRowState(row, i);
            }
            row = row.nextElementSibling;
            if (!row || !row.classList.contains("lot-item-row")) break;
        }
    }
    refreshValidationState();
    return isValid;
}

function calculatePrepared(articleIndex) {
    const mainRow = document.getElementById(`group_${articleIndex}`);
    if (!mainRow) return;

    let total = 0;
    let row = mainRow;
    const groupRows = [];

    while (row) {
        groupRows.push(row);
        const qtyInput = row.querySelector(".qty-input");
        if (qtyInput) {
            total += Number(qtyInput.value || 0);
        }
        row = row.nextElementSibling;
        if (!row || !row.classList.contains("lot-item-row")) {
            break;
        }
    }

    const span = document.getElementById(`prepared_${articleIndex}`);
    if (span) {
        span.textContent = total.toFixed(3);
    }

    groupRows.forEach(r => updateRowState(r, articleIndex));
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
    if (!runFullStockValidation()) { Toast.error("Stock insuffisant."); return; }
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
            
            let row = group;
            while (row) {
                const lotInp = row.querySelector(".lot-input");
                const qtyInp = row.querySelector(".qty-input");
                
                if (lotInp && qtyInp) {
                    const lot = lotInp.value.trim();
                    const qty = Number(qtyInp.value || 0);
                    if (lot && qty > 0) {
                        totalPreparedForOrder += qty;
                        const { data: st } = await supabase.from("stock").select("id, emplacement").eq("article", art.article).eq("lot", lot).gt("stock_disponible", 0).maybeSingle();
                        details.push({
                            picking_id: currentPicking.id, article: art.article, designation_article: art.designation || "",
                            lot: lot, quantite_preparee: qty, quantite_commandee: art.quantite, magasin: "MAG_DEFAULT",
                            emplacement: st?.emplacement || "N/A", stock_id: st?.id || null
                        });
                    }
                }
                
                row = row.nextElementSibling;
                if (!row || !row.classList.contains("lot-item-row")) break;
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
    if (!runFullStockValidation()) { Toast.error("Stock insuffisant."); return; }
    let isOver = false;
    articles.forEach((art, idx) => { const span = document.getElementById(`prepared_${idx}`); if (span && Number(span.textContent || 0) > art.quantite) isOver = true; });
    if (isOver) { Toast.error("Quantité préparée supérieure à la commande."); return; }

    if (els.confirmModal && els.confirmMessage) {
        els.confirmMessage.textContent = "Voulez-vous valider définitivement ce picking ?";
        els.confirmModal.classList.add("show"); els.confirmModal.style.display = "flex";
        
        els.confirmYes.replaceWith(els.confirmYes.cloneNode(true));
        els.confirmYes = document.getElementById("confirmYes");
        
        els.confirmYes.addEventListener("click", async () => {
            if (els.confirmModal) { 
                els.confirmModal.classList.remove("show"); 
                els.confirmModal.style.display = "none"; 
            }
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

/* ============================================================
   LOT AUTOCOMPLETE
============================================================ */

function bindLotAutocomplete(input, article) {
    if (!input) return;

    input.addEventListener("input", async () => {
        const value = input.value.trim();
        if (value.length === 0) {
            hideLotDropdown();
            return;
        }
        activeLotInput = input;
        activeArticle = article;
        await searchLots(article, value);
    });

    input.addEventListener("focus", async () => {
        const value = input.value.trim();
        if (value.length === 0) return;
        activeLotInput = input;
        activeArticle = article;
        await searchLots(article, value);
    });

    input.addEventListener("blur", () => {
        setTimeout(() => {
            hideLotDropdown();
        }, 200);
    });
}

async function searchLots(article, text) {
    try {
        console.log("========== SEARCH LOT ==========");
        const response = await supabase
            .from("stock")
            .select("id, article, lot, stock_disponible")
            .eq("article", String(article))
            .gt("stock_disponible", 0)
            .ilike("lot", `%${text}%`)
            .order("lot")
            .limit(10);

        if (response.error) {
            console.error("Erreur Supabase :", response.error);
            hideLotDropdown();
            return;
        }

        const responseData = response.data || [];
        responseData.forEach(item => {
            stockCache.set(`${article}|${item.lot}`, item.stock_disponible);
        });

        showLotDropdown(responseData);
    } catch (err) {
        console.error("Exception :", err);
        hideLotDropdown();
    }
}

function showLotDropdown(lots) {
    hideLotDropdown();
    if (!activeLotInput) return;

    const wrapper = activeLotInput.parentElement;
    const dropdown = document.createElement("div");
    dropdown.className = "lot-dropdown show";

    if (!lots.length) {
        dropdown.innerHTML = `<div class="lot-empty">Aucun lot trouvé</div>`;
    } else {
        lots.forEach(item => {
            const div = document.createElement("div");
            div.className = "lot-item";
            div.textContent = item.lot;
            div.addEventListener("mousedown", () => {
                selectLot(item);
            });
            dropdown.appendChild(div);
        });
    }
    wrapper.appendChild(dropdown);
    activeDropdown = dropdown;
    activeIndex = -1;
}

function hideLotDropdown() {
    if (activeDropdown) {
        activeDropdown.remove();
        activeDropdown = null;
    }
    activeIndex = -1;
}

async function selectLot(item) {
    if (!activeLotInput) return;

    activeLotInput.value = item.lot;

    const { data: st } = await supabase.from("stock").select("stock_disponible").eq("article", item.article).eq("lot", item.lot);
    const totalStock = st ? st.reduce((sum, i) => sum + Number(i.stock_disponible || 0), 0) : 0;
    
    activeLotInput.dataset.stock = totalStock;
    stockCache.set(`${item.article}|${item.lot}`, totalStock);

    const tr = activeLotInput.closest("tr");
    if (tr) {
        let groupIdx = -1;
        if (tr.classList.contains("article-row")) {
            groupIdx = Number(tr.id.replace("group_", ""));
        } else {
            let prev = tr.previousElementSibling;
            while (prev) {
                if (prev.classList.contains("article-row")) {
                    groupIdx = Number(prev.id.replace("group_", ""));
                    break;
                }
                prev = prev.previousElementSibling;
            }
        }
        checkRowStock(tr, groupIdx);
    }

    hideLotDropdown();
    activeLotInput.focus();
}
