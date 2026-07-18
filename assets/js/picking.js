/**
 * ============================================================
 * SoufStock Enterprise ERP/WMS
 * File : assets/js/picking.js
 * ============================================================
 */

"use strict";

/* ============================================================
 * IMPORTS
 * ============================================================
 */
import supabase, { getUser } from "./core/supabase.js";
import { Loader, Toast } from "./core/utils.js";

/* ============================================================
 * GLOBAL VARIABLES
 * ============================================================
 */
let currentUser = null;
let currentCommande = null;
let currentPicking = null;
let articles = [];

/* ============================================================
 * DOM ELEMENTS
 * ============================================================
 */
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

/* ============================================================
 * INITIALISATION
 * ============================================================
 */
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

/* ============================================================
 * EVENT LISTENERS
 * ============================================================
 */
function bindEvents() {
    els.btnSearch?.addEventListener("click", searchCommande);
    els.commandeInput?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            searchCommande();
        }
    });

    els.btnScanner?.addEventListener("click", openScanner);
    els.btnSave?.addEventListener("click", savePicking);
    els.btnSaveFooter?.addEventListener("click", savePicking);
    els.btnValidate?.addEventListener("click", validatePicking);
    els.btnValidateFooter?.addEventListener("click", validatePicking);
    els.btnRefresh?.addEventListener("click", refreshPicking);
    els.confirmNo?.addEventListener("click", closeConfirmModal);
}

/* ============================================================
 * RESET & UTILS
 * ============================================================
 */
function resetPicking() {
    currentCommande = null;
    currentPicking = null;
    articles = [];

    if (els.pickingId) els.pickingId.value = "";
    if (els.suiviId) els.suiviId.value = "";
    if (els.clientName) els.clientName.textContent = "-";
    if (els.dateCreation) els.dateCreation.textContent = "-";
    if (els.dateLivraison) els.dateLivraison.textContent = "-";
    if (els.tournee) els.tournee.textContent = "-";
    if (els.chauffeur) els.chauffeur.textContent = "-";
    
    if (els.statutCommande) {
        els.statutCommande.textContent = "En préparation";
        els.statutCommande.className = "badge badge-warning";
    }

    if (els.pickingBody) {
        els.pickingBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted py-4">
                    Aucune commande chargée.
                </td>
            </tr>
        `;
    }

    calculateSummary();
}

function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (isNaN(date)) return value;
    return date.toLocaleDateString("fr-FR");
}

function refreshPicking() {
    if (!currentCommande) {
        resetPicking();
        return;
    }
    searchCommande();
}

function openScanner() {
    Toast.info("Scanner bientôt disponible.");
}

function closeConfirmModal() {
    if (!els.confirmModal) return;
    els.confirmModal.classList.remove("show");
    els.confirmModal.style.display = "none";
}

/* ============================================================
 * RECHERCHE & CHARGEMENT SUPABASE
 * ============================================================
 */
async function searchCommande() {
    const numeroCommande = els.commandeInput.value.trim();
    if (!numeroCommande) {
        Toast.warning("Veuillez saisir un numéro de commande.");
        els.commandeInput.focus();
        return;
    }

    try {
        if (Loader && typeof Loader.show === "function") Loader.show();
        resetPicking();

        // 1. Nzlo l-ma3loumat dyal l-commande mn l-back-end
        currentCommande = await loadCommande(numeroCommande);
        if (!currentCommande) {
            Toast.warning("Commande introuvable.");
            return;
        }

        // 2. Nchofo wch picking déjà khedam ola la
        const { data: pickingData } = await supabase
            .from("picking")
            .select("*")
            .eq("document_vente", numeroCommande)
            .maybeSingle();

        if (pickingData) {
            currentPicking = pickingData;
            if (els.pickingId) els.pickingId.value = pickingData.id;
            if (els.statutCommande) {
                els.statutCommande.textContent = pickingData.statut;
                els.statutCommande.className = pickingData.statut === "VALIDE" ? "badge badge-success" : "badge badge-warning";
            }
        }

        displayCommandeInfo(currentCommande);
        await buildPickingTable(currentCommande.lignes);

    } catch (error) {
        console.error(error);
        Toast.error("Erreur lors du chargement.");
    } finally {
        if (Loader && typeof Loader.hide === "function") Loader.hide();
    }
}

async function loadCommande(numeroCommande) {
    const { data: kgData, error: kgError } = await supabase
        .from("commandes_excel")
        .select("*")
        .eq("document_vente", numeroCommande)
        .order("article");

    if (kgError) throw kgError;
    if (!kgData || kgData.length === 0) return null;

    const { data: piecesData, error: piecesError } = await supabase
        .from("commandes_clients_pieces")
        .select("document_vente, article, nombre_pieces")
        .eq("document_vente", numeroCommande);

    if (piecesError) throw piecesError;

    const { data: suiviData } = await supabase
        .from("suivi_commandes_lancer")
        .select("id, itineraire")
        .eq("document_vente", numeroCommande)
        .maybeSingle();

    if (suiviData && els.suiviId) els.suiviId.value = suiviData.id;

    return {
        numero: numeroCommande,
        client: kgData[0].nom_receptionnaire,
        dateCreation: kgData[0].date_creation,
        dateLivraison: kgData[0].date_livraison,
        tournee: suiviData?.itineraire || kgData[0].itineraire,
        chauffeur: "",
        statut: kgData[0].statut,
        lignes: kgData,
        pieces: piecesData || []
    };
}

function displayCommandeInfo(cmd) {
    if (els.clientName) els.clientName.textContent = cmd.client || "-";
    if (els.dateCreation) els.dateCreation.textContent = formatDate(cmd.dateCreation);
    if (els.dateLivraison) els.dateLivraison.textContent = formatDate(cmd.dateLivraison);
    if (els.tournee) els.tournee.textContent = cmd.tournee || "-";
    if (els.chauffeur) els.chauffeur.textContent = cmd.chauffeur || "-";
}

/* ============================================================
 * CONSTRUIRE TABLEAU DYNAMIQUE
 * ============================================================
 */
async function buildPickingTable(lignes) {
    els.pickingBody.innerHTML = "";
    articles = [];

    const piecesMap = new Map();
    (currentCommande.pieces || []).forEach(item => {
        piecesMap.set(`${item.document_vente}_${item.article}`, Number(item.nombre_pieces || 0));
    });

    const map = new Map();
    lignes.forEach((ligne) => {
        const key = `${ligne.document_vente}_${ligne.article}`;
        if (!map.has(key)) {
            map.set(key, {
                article: ligne.article,
                designation: ligne.designation_article,
                quantite: Number(ligne.quantite_commandee || 0),
                pieces: piecesMap.get(key) || 0,
                lots: []
            });
        } else {
            const article = map.get(key);
            article.quantite += Number(ligne.quantite_commandee || 0);
        }
    });

    articles = [...map.values()];

    if (!articles.length) {
        els.pickingBody.innerHTML = `<tr><td colspan="7" class="text-center">Aucune ligne à préparer.</td></tr>`;
        return;
    }

    // Nchoufo wch kaynin details dyal picking khdam sba9 lina hfethnahom
    let existingDetails = [];
    if (currentPicking) {
        const { data } = await supabase
            .from("picking_details")
            .select("*")
            .eq("picking_id", currentPicking.id);
        existingDetails = data || [];
    }

    articles.forEach((article, index) => {
        const tr = document.createElement("tr");
        tr.className = "article-row";
        tr.dataset.index = index;
        tr.innerHTML = `
            <td><strong>${article.article}</strong><br><small>${article.designation ?? ""}</small></td>
            <td class="text-end">${article.quantite.toFixed(3)}</td>
            <td><span id="prepared_${index}">0.000</span></td>
            <td>${article.pieces}</td>
            <td colspan="3">
                <div id="lots_${index}" class="lots-container"></div>
                <button type="button" class="btn btn-success btn-add-lot" style="padding: 5px 10px; margin-top:5px;">
                    <i class="fas fa-plus"></i> Ajouter un Lot
                </button>
            </td>
        `;

        const container = tr.querySelector(".lots-container");
        const articleDetails = existingDetails.filter(d => d.article === article.article);

        if (articleDetails.length > 0) {
            articleDetails.forEach(det => {
                container.appendChild(createLotRow(index, det.lot, det.quantite_preparee));
            });
        } else {
            container.appendChild(createLotRow(index));
        }

        tr.querySelector(".btn-add-lot").addEventListener("click", () => {
            container.appendChild(createLotRow(index));
        });

        els.pickingBody.appendChild(tr);
        calculatePrepared(index);
    });

    calculateSummary();
}

function createLotRow(articleIndex, lotVal = "", qtyVal = "") {
    const row = document.createElement("div");
    row.className = "lot-row";
    row.style.marginBottom = "5px";

    row.innerHTML = `
        <div class="lot-grid" style="display:flex; gap:8px; align-items:center;">
            <input type="text" class="lot-input form-control" style="width:140px; height:34px;" placeholder="Lot" value="${lotVal}" autocomplete="off">
            <input type="number" class="qty-input form-control" style="width:100px; height:34px;" placeholder="Qté" min="0" step="0.001" value="${qtyVal}">
            <button type="button" class="btn-remove" style="background:none; border:none; color:var(--danger); cursor:pointer;">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;

    row.querySelector(".btn-remove").addEventListener("click", () => {
        row.remove();
        calculatePrepared(articleIndex);
        calculateSummary();
    });

    row.querySelector(".qty-input").addEventListener("input", () => {
        calculatePrepared(articleIndex);
        calculateSummary();
    });

    return row;
}

function calculatePrepared(articleIndex) {
    const container = document.getElementById(`lots_${articleIndex}`);
    if (!container) return;

    let total = 0;
    container.querySelectorAll(".qty-input").forEach(input => {
        total += Number(input.value || 0);
    });

    const span = document.getElementById(`prepared_${articleIndex}`);
    if (span) span.textContent = total.toFixed(3);

    const articleRow = container.closest(".article-row");
    if (articleRow && articles[articleIndex]) {
        if (total > articles[articleIndex].quantite) {
            articleRow.style.backgroundColor = "rgba(220, 53, 69, 0.08)";
        } else {
            articleRow.style.backgroundColor = "";
        }
    }
}

function calculateSummary() {
    let totalArticlesCount = articles.length;
    let totalCommande = 0;
    let totalPrepare = 0;

    articles.forEach((article, index) => {
        totalCommande += article.quantite;
        const span = document.getElementById(`prepared_${index}`);
        if (span) totalPrepare += Number(span.textContent || 0);
    });

    if (els.totalArticles) els.totalArticles.textContent = totalArticlesCount;
    if (els.totalQuantity) els.totalQuantity.textContent = totalCommande.toFixed(3);
    if (els.preparedQuantity) els.preparedQuantity.textContent = totalPrepare.toFixed(3);

    const percent = totalCommande > 0 ? (totalPrepare / totalCommande) * 100 : 0;
    if (els.pickingProgress) els.pickingProgress.style.width = `${percent}%`;
    if (els.progressText) els.progressText.textContent = `${Math.min(100, percent).toFixed(0)}%`;
}

/* ============================================================
 * STRATÉGIE EMPLACEMENTS (ABATTOIR)
 * ============================================================
 */
const PRIORITY_LOCATIONS = ["A407", "A408", "A409", "A411"];

async function searchLotStock(article, lot) {
    const { data, error } = await supabase
        .from("stock")
        .select("id, article, lot, emplacement, quantite")
        .eq("article", article)
        .eq("lot", lot)
        .gt("quantite", 0);

    if (error) throw error;
    if (!data) return [];

    return data.sort((a, b) => {
        const pa = PRIORITY_LOCATIONS.indexOf(a.emplacement);
        const pb = PRIORITY_LOCATIONS.indexOf(b.emplacement);
        if (pa === -1 && pb === -1) return a.emplacement.localeCompare(b.emplacement);
        if (pa === -1) return 1;
        if (pb === -1) return -1;
        return pa - pb;
    });
}

/* ============================================================
 * SAUVEGARDE & PERSISTANCE WORKFLOW
 * ============================================================
 */
async function savePicking() {
    if (!currentCommande) {
        Toast.warning("Aucune commande chargée.");
        return;
    }

    try {
        if (Loader && typeof Loader.show === "function") Loader.show();

        if (!currentPicking) {
            const { data, error } = await supabase
                .from("picking")
                .insert({
                    document_vente: currentCommande.numero,
                    utilisateur: currentUser.id,
                    statut: "EN_COURS"
                })
                .select().single();

            if (error) throw error;
            currentPicking = data;
            if (els.pickingId) els.pickingId.value = data.id;
        }

        const details = [];
        let totalPreparedForOrder = 0;

        for (let i = 0; i < articles.length; i++) {
            const article = articles[i];
            const container = document.getElementById(`lots_${i}`);
            if (!container) continue;

            const rows = container.querySelectorAll(".lot-row");
            for (const row of rows) {
                const lot = row.querySelector(".lot-input").value.trim();
                const qty = Number(row.querySelector(".qty-input").value || 0);

                if (!lot || qty <= 0) continue;
                totalPreparedForOrder += qty;

                const stockResolution = await searchLotStock(article.article, lot);
                const primaryStock = stockResolution[0] || {};

                details.push({
                    picking_id: currentPicking.id,
                    article: article.article,
                    designation_article: article.designation || "",
                    lot: lot,
                    quantite_preparee: qty,
                    quantite_commandee: article.quantite,
                    magasin: "MAG_DEFAULT",
                    emplacement: primaryStock.emplacement || "N/A",
                    stock_id: primaryStock.id || null
                });
            }
        }

        await supabase.from("picking_details").delete().eq("picking_id", currentPicking.id);

        if (details.length > 0) {
            const { error: insErr } = await supabase.from("picking_details").insert(details);
            if (insErr) throw insErr;
        }

        const totalQty = articles.reduce((acc, c) => acc + c.quantite, 0);
        const prog = totalQty > 0 ? (totalPreparedForOrder / totalQty) * 100 : 0;

        await supabase.from("picking").update({
            total_articles: articles.length,
            total_prepare: totalPreparedForOrder,
            progression: Math.round(prog)
        }).eq("id", currentPicking.id);

        await supabase.from("suivi_commandes_lancer").update({
            statut: "EN_PICKING",
            picking_par: currentUser.id
        }).eq("document_vente", currentCommande.numero);

        Toast.success("Picking sauvegardé.");

    } catch (error) {
        console.error(error);
        Toast.error("Erreur lors de la sauvegarde.");
    } finally {
        if (Loader && typeof Loader.hide === "function") Loader.hide();
    }
}

/* ============================================================
 * VALIDATION DEFINITIVE
 * ============================================================
 */
async function validatePicking() {
    if (!currentPicking) {
        Toast.warning("Veuillez enregistrer le picking avant de valider.");
        return;
    }

    let isOver = false;
    articles.forEach((art, idx) => {
        const span = document.getElementById(`prepared_${idx}`);
        if (span && Number(span.textContent || 0) > art.quantite) isOver = true;
    });

    if (isOver) {
        Toast.error("Quantité préparée supérieure à la commande.");
        return;
    }

    if (els.confirmModal && els.confirmMessage) {
        els.confirmMessage.textContent = "Voulez-vous valider définitivement ce picking ?";
        els.confirmModal.classList.add("show");
        els.confirmModal.style.display = "flex";

        const newYes = els.confirmYes.cloneNode(true);
        els.confirmYes.parentNode.replaceChild(newYes, els.confirmYes);
        els.confirmYes = newYes;

        els.confirmYes.addEventListener("click", async () => {
            closeConfirmModal();
            await executeFinalValidation();
        });
    } else {
        if (confirm("Valider le picking ?")) await executeFinalValidation();
    }
}

async function executeFinalValidation() {
    try {
        if (Loader && typeof Loader.show === "function") Loader.show();

        await supabase.from("picking").update({
            statut: "VALIDE",
            date_validation: new Date().toISOString()
        }).eq("id", currentPicking.id);

        await supabase.from("suivi_commandes_lancer").update({
            statut: "PICKING_TERMINE",
            date_fin_picking: new Date().toISOString(),
            validation_par: currentUser.id,
            date_validation: new Date().toISOString()
        }).eq("document_vente", currentCommande.numero);

        Toast.success("Picking validé définitivement.");

        if (els.btnSave) els.btnSave.disabled = true;
        if (els.btnValidate) els.btnValidate.disabled = true;
        if (els.statutCommande) {
            els.statutCommande.textContent = "VALIDE";
            els.statutCommande.className = "badge badge-success";
        }

    } catch (error) {
        console.error(error);
        Toast.error("Erreur de validation.");
    } finally {
        if (Loader && typeof Loader.hide === "function") Loader.hide();
    }
}
