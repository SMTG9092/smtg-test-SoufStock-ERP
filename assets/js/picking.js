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

    // Hidden
    pickingId: document.getElementById("pickingId"),
    suiviId: document.getElementById("suiviId"),

    // Recherche
    commandeInput: document.getElementById("commandeInput"),
    btnSearch: document.getElementById("btnSearch"),
    btnScanner: document.getElementById("btnScanner"),

    // Header
    btnSave: document.getElementById("btnSave"),
    btnValidate: document.getElementById("btnValidate"),

    // Informations
    clientName: document.getElementById("clientName"),
    dateCreation: document.getElementById("dateCreation"),
    dateLivraison: document.getElementById("dateLivraison"),
    tournee: document.getElementById("tournee"),
    chauffeur: document.getElementById("chauffeur"),
    statutCommande: document.getElementById("statutCommande"),

    // Tableau
    pickingBody: document.getElementById("pickingBody"),

    // Progress
    pickingProgress: document.getElementById("pickingProgress"),
    progressText: document.getElementById("progressText"),

    // Résumé
    totalArticles: document.getElementById("totalArticles"),
    totalQuantity: document.getElementById("totalQuantity"),
    preparedQuantity: document.getElementById("preparedQuantity"),

    // Footer
    btnRefresh: document.getElementById("btnRefresh"),
    btnSaveFooter: document.getElementById("btnSaveFooter"),
    btnValidateFooter: document.getElementById("btnValidateFooter"),

    // Popup
    lotPopup: document.getElementById("lotPopup"),

    // Modal
    confirmModal: document.getElementById("confirmModal"),
    confirmMessage: document.getElementById("confirmMessage"),
    confirmYes: document.getElementById("confirmYes"),
    confirmNo: document.getElementById("confirmNo"),

    // Loader
    pickingLoader: document.getElementById("pickingLoader"),

    // Toast
    toastContainer: document.getElementById("toastContainer"),

    // Print
    printArea: document.getElementById("printArea")

};
/* ============================================================
 * INITIALISATION
 * ============================================================
 */

document.addEventListener("DOMContentLoaded", init);

async function init() {

    try {

        Loader.show?.();

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

        Loader.hide?.();

    }

}

/* ============================================================
 * EVENT LISTENERS
 * ============================================================
 */

function bindEvents() {

    // Recherche

    els.btnSearch?.addEventListener("click", searchCommande);

    els.commandeInput?.addEventListener("keydown", (event) => {

        if (event.key === "Enter") {

            event.preventDefault();

            searchCommande();

        }

    });

    els.btnScanner?.addEventListener("click", openScanner);

    // Sauvegarde

    els.btnSave?.addEventListener("click", savePicking);

    els.btnSaveFooter?.addEventListener("click", savePicking);

    // Validation

    els.btnValidate?.addEventListener("click", validatePicking);

    els.btnValidateFooter?.addEventListener("click", validatePicking);

    // Refresh

    els.btnRefresh?.addEventListener("click", refreshPicking);

    // Modal

    els.confirmNo?.addEventListener("click", closeConfirmModal);

}
/* ============================================================
 * RESET PICKING
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
    if (els.statutCommande) els.statutCommande.textContent = "En préparation";

    if (els.pickingBody) {
        els.pickingBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted py-4">
                    Aucune commande chargée.
                </td>
            </tr>
        `;
    }

    if (els.totalArticles) els.totalArticles.textContent = "0";
    if (els.totalQuantity) els.totalQuantity.textContent = "0.000";
    if (els.preparedQuantity) els.preparedQuantity.textContent = "0.000";

    if (els.pickingProgress)
        els.pickingProgress.style.width = "0%";

    if (els.progressText)
        els.progressText.textContent = "0%";

}

/* ============================================================
 * FORMAT DATE
 * ============================================================
 */

function formatDate(value) {

    if (!value) return "-";

    const date = new Date(value);

    if (isNaN(date)) return value;

    return date.toLocaleDateString("fr-FR");

}

/* ============================================================
 * REFRESH
 * ============================================================
 */

function refreshPicking() {

    if (!currentCommande) {

        resetPicking();

        return;

    }

    searchCommande();

}

/* ============================================================
 * SCANNER
 * ============================================================
 */

function openScanner() {

    Toast.info("Scanner bientôt disponible.");

}

/* ============================================================
 * MODAL
 * ============================================================
 */

function closeConfirmModal() {

    if (!els.confirmModal) return;

    els.confirmModal.classList.remove("show");

    els.confirmModal.style.display = "none";

}

/* ============================================================
 * CHARGER COMMANDE
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

        Loader.show();

        resetPicking();

        currentCommande = await loadCommande(numeroCommande);

        if (!currentCommande) {

            Toast.warning("Commande introuvable.");

            return;

        }

        displayCommandeInfo(currentCommande);

        buildPickingTable(currentCommande.lignes);

        calculateSummary();

    } catch (error) {

        console.error(error);

        Toast.error("Erreur lors du chargement de la commande.");

    } finally {

        Loader.hide();

    }

}

/* ============================================================
 * LIRE SUPABASE
 * ============================================================
 */

async function loadCommande(numeroCommande) {

    // ===========================
    // Commandes KG
    // ===========================

    const { data: kgData, error: kgError } = await supabase
        .from("commandes_excel")
        .select("*")
        .eq("document_vente", numeroCommande)
        .order("article");

    if (kgError) throw kgError;

    if (!kgData || kgData.length === 0) {
        return null;
    }

    // ===========================
    // Commandes Pièces
    // ===========================

    const { data: piecesData, error: piecesError } = await supabase
        .from("commandes_clients_pieces")
        .select("document_vente, article, nombre_pieces")
        .eq("document_vente", numeroCommande);

    if (piecesError) throw piecesError;

    return {

        numero: numeroCommande,

        client: kgData[0].nom_receptionnaire,

        dateCreation: kgData[0].date_creation,

        dateLivraison: kgData[0].date_livraison,

        tournee: kgData[0].itineraire,

        chauffeur: "",

        statut: kgData[0].statut,

        lignes: kgData,

        pieces: piecesData || []

    };

}
/* ============================================================
 * INFORMATIONS COMMANDE
 * ============================================================
 */

function displayCommandeInfo(cmd) {

    els.clientName.textContent =
        cmd.client || "-";

    els.dateCreation.textContent =
        formatDate(cmd.dateCreation);

    els.dateLivraison.textContent =
        formatDate(cmd.dateLivraison);

    els.tournee.textContent =
        cmd.tournee || "-";

    els.chauffeur.textContent =
        cmd.chauffeur || "-";

    els.statutCommande.textContent =
        cmd.statut || "En préparation";

}
/* ============================================================
 * CONSTRUIRE TABLEAU
 * ============================================================
 */

function buildPickingTable(lignes) {

    els.pickingBody.innerHTML = "";

    articles = [];

    const map = new Map();

    lignes.forEach((ligne) => {

        const key = `${ligne.document_vente}_${ligne.article}`;

        if (!map.has(key)) {

            map.set(key, {

                article: ligne.article,
                designation: ligne.designation_article,
                quantite: Number(ligne.quantite || 0),
                pieces: Number(ligne.nb_pieces || 0),
                lots: []

            });

        } else {

            const article = map.get(key);

            article.quantite += Number(ligne.quantite || 0);

            article.pieces += Number(ligne.nb_pieces || 0);

        }

    });

    articles = [...map.values()];

    if (!articles.length) {

        els.pickingBody.innerHTML = `
            <tr class="empty-row">
                <td colspan="7">
                    Aucune ligne à préparer.
                </td>
            </tr>
        `;

        return;

    }

    articles.forEach((article, index) => {

        els.pickingBody.appendChild(

            createArticleRow(article, index)

        );

    });

}

/* ============================================================
 * ARTICLE ROW
 * ============================================================
 */

function createArticleRow(article, index) {

    const tr = document.createElement("tr");

    tr.className = "article-row";

    tr.dataset.index = index;

    tr.innerHTML = `

        <td>

            <strong>${article.article}</strong>

            <br>

            <small>${article.designation ?? ""}</small>

        </td>

        <td class="text-end">

            ${article.quantite.toFixed(3)}

        </td>

        <td>

            <span
                id="prepared_${index}">

                0.000

            </span>

        </td>

        <td>

            ${article.pieces}

        </td>

        <td colspan="3">

            <div
                id="lots_${index}"
                class="lots-container">

            </div>

            <button
                type="button"
                class="btn btn-success btn-add-lot"
                data-index="${index}">

                <i class="fas fa-plus"></i>

                Ajouter un Lot

            </button>

        </td>

    `;

    const container = tr.querySelector(".lots-container");

    container.appendChild(

        createLotRow(index)

    );

    tr.querySelector(".btn-add-lot")
        .addEventListener("click", () => {

            container.appendChild(

                createLotRow(index)

            );

        });

    return tr;

}

/* ============================================================
 * LOT ROW
 * ============================================================
 */

function createLotRow(articleIndex) {

    const row = document.createElement("div");

    row.className = "lot-row";

    row.innerHTML = `

        <div class="lot-grid">

            <input
                type="text"
                class="lot-input"
                placeholder="Lot">

            <input
                type="number"
                class="qty-input"
                placeholder="Qté"
                min="0"
                step="0.001">

            <button
                type="button"
                class="btn-remove">

                <i class="fas fa-trash"></i>

            </button>

        </div>

    `;

    row.querySelector(".btn-remove")
        .addEventListener("click", () => {

            row.remove();

            calculatePrepared(articleIndex);

            calculateSummary();

        });

    row.querySelector(".qty-input")
        .addEventListener("input", () => {

            calculatePrepared(articleIndex);

            calculateSummary();

        });

    return row;

}
/* ============================================================
 * SMART LOT SELECTION
 * ============================================================
 */

const PRIORITY_LOCATIONS = [
    "A407",
    "A408",
    "A409",
    "A411"
];

async function searchLotStock(article, lot) {

    const { data, error } = await supabase
        .from("stock")
        .select(`
            id,
            article,
            lot,
            emplacement,
            quantite
        `)
        .eq("article", article)
        .eq("lot", lot)
        .gt("quantite", 0);

    if (error) throw error;

    if (!data) return [];

    return sortStockPriority(data);

}

/* ============================================================
 * PRIORITÉ DES MAGASINS
 * ============================================================
 */

function sortStockPriority(stock) {

    return stock.sort((a, b) => {

        const pa = PRIORITY_LOCATIONS.indexOf(a.emplacement);
        const pb = PRIORITY_LOCATIONS.indexOf(b.emplacement);

        if (pa === -1 && pb === -1) {
            return a.emplacement.localeCompare(b.emplacement);
        }

        if (pa === -1) return 1;
        if (pb === -1) return -1;

        return pa - pb;

    });

}

/* ============================================================
 * RÉCUPÉRER LE STOCK DISPONIBLE
 * ============================================================
 */

async function getAvailableStock(article, lot, quantityNeeded) {

    const stock = await searchLotStock(article, lot);

    let remaining = quantityNeeded;

    const result = [];

    for (const item of stock) {

        if (remaining <= 0) break;

        const qty = Math.min(item.quantite, remaining);

        result.push({

            stock_id: item.id,
            emplacement: item.emplacement,
            lot: item.lot,
            disponible: item.quantite,
            preleve: qty

        });

        remaining -= qty;

    }

    return {

        lignes: result,
        restant: remaining

    };

}
/* ============================================================
 * SAUVEGARDE PICKING
 * ============================================================
 */

async function savePicking() {

    if (!currentCommande) {
        Toast.warning("Aucune commande chargée.");
        return;
    }

    try {

        Loader.show();

        // Création Header si inexistant
        if (!currentPicking) {

            const { data, error } = await supabase
                .from("picking")
                .insert({
                    document_vente: currentCommande.numero,
                    utilisateur: currentUser.id,
                    statut: "EN_COURS"
                })
                .select()
                .single();

            if (error) throw error;

            currentPicking = data;

        }

        // Suppression des anciennes lignes
        await supabase
            .from("picking_details")
            .delete()
            .eq("picking_id", currentPicking.id);

        const details = [];

        articles.forEach((article, articleIndex) => {

            const container = document.getElementById(`lots_${articleIndex}`);

            if (!container) return;

            container.querySelectorAll(".lot-row").forEach((row) => {

                const lot = row.querySelector(".lot-input").value.trim();
                const qty = Number(row.querySelector(".qty-input").value || 0);

                if (!lot || qty <= 0) return;

                details.push({
                    picking_id: currentPicking.id,
                    article: article.article,
                    lot: lot,
                    quantite: qty
                });

            });

        });

        if (details.length > 0) {

            const { error } = await supabase
                .from("picking_details")
                .insert(details);

            if (error) throw error;

        }

        Toast.success("Picking sauvegardé.");

    } catch (error) {

        console.error(error);

        Toast.error("Erreur lors de la sauvegarde.");

    } finally {

        Loader.hide();

    }

}

/* ============================================================
 * VALIDATION
 * ============================================================
 */

async function validatePicking() {

    if (!currentPicking) {

        Toast.warning("Sauvegardez le picking avant validation.");

        return;

    }

    try {

        Loader.show();

        const { error } = await supabase
            .from("picking")
            .update({
                statut: "VALIDE",
                date_validation: new Date().toISOString()
            })
            .eq("id", currentPicking.id);

        if (error) throw error;

        Toast.success("Picking validé.");

    } catch (error) {

        console.error(error);

        Toast.error("Erreur lors de la validation.");

    } finally {

        Loader.hide();

    }

}
