/* ==========================================================
   SoufStock Enterprise ERP
   commandes-import.js
   Cleaned & Stabilized
========================================================== */

'use strict';

/* ==========================================================
   Imports
========================================================== */

import Auth from "./core/auth.js";
import Session from "./core/session.js";
import * as Utils from "./core/utils.js";
import APP_CONFIG from "./core/config.js";
import supabase from "./core/supabase.js";

/* ==========================================================
   Globals
========================================================== */

/* ===========================
   Current User
=========================== */

let currentUser = null;

/* ===========================
   Data Sources
=========================== */

// Commandes KG
let kgData = [];

// Commandes Pièces
let piecesData = [];

/* ===========================
   Analyse KG
=========================== */

let analyseKG = {

    total: 0,

    inserted: 0,

    updated: 0,

    deleted: 0,

    same: 0,

    errors: 0

};

/* ===========================
   Analyse Pièces
=========================== */

let analysePieces = {

    total: 0,

    inserted: 0,

    updated: 0,

    deleted: 0,

    same: 0,

    errors: 0

};

/* ===========================
   Import Status
=========================== */

let kgImported = false;

let piecesImported = false;

let kgAnalysed = false;

let piecesAnalysed = false;
/* ==========================================================
   Toast API
========================================================== */

const Toast = {

    success(message) {

        this.show(
            "success",
            "Succès",
            message
        );

    },

    warning(message) {

        this.show(
            "warning",
            "Attention",
            message
        );

    },

    error(message) {

        this.show(
            "error",
            "Erreur",
            message
        );

    },

    info(message) {

        this.show(
            "info",
            "Information",
            message
        );

    },

    show(type, title, message) {

        const container = document.getElementById("toastContainer");

        if (!container) return;

        const toast = document.createElement("div");

        toast.className = `toast toast-${type}`;

        toast.innerHTML = `
            <div class="toast-icon">
                <i class="${getToastIcon(type)}"></i>
            </div>

            <div class="toast-content">
                <div class="toast-title">
                    ${title}
                </div>

                <div class="toast-message">
                    ${message}
                </div>
            </div>

            <button
                class="toast-close"
                type="button"
                aria-label="Fermer"
            >
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(toast);

        const removeToast = () => {

            if (toast.parentNode) {

                toast.remove();

            }

        };

        toast
            .querySelector(".toast-close")
            .addEventListener("click", removeToast);

        setTimeout(removeToast, 5000);

    }

};

/* ==========================================================
   Toast Icon Helper
========================================================== */

function getToastIcon(type) {

    switch (type) {

        case "success":
            return "fas fa-circle-check";

        case "warning":
            return "fas fa-triangle-exclamation";

        case "error":
            return "fas fa-circle-xmark";

        case "info":
        default:
            return "fas fa-circle-info";

    }

}

/* ==========================================================
   Loader API
========================================================== */

const Loader = {

    show(message = "Chargement...") {

        const overlay = document.getElementById("loaderOverlay");

        if (!overlay) return;

        overlay.classList.remove("hidden");

        const messageElement = document.getElementById("loaderMessage");

        if (messageElement) {

            messageElement.textContent = message;

        }

        this.progress(0);

    },

    hide() {

        const overlay = document.getElementById("loaderOverlay");

        if (!overlay) return;

        overlay.classList.add("hidden");

    },

    progress(percent = 0) {

        percent = Math.max(0, Math.min(100, Number(percent) || 0));

        const bar = document.getElementById("loaderBar");

        const label = document.getElementById("loaderPercent");

        if (bar) {

            bar.style.width = `${percent}%`;

        }

        if (label) {

            label.textContent = `${percent}%`;

        }

    },

    message(text) {

        const messageElement = document.getElementById("loaderMessage");

        if (messageElement) {

            messageElement.textContent = text;

        }

    }

};

/* ==========================================================
   DOM
========================================================== */

const UI = {};

/* ==========================================================
   Cache DOM
========================================================== */

function cacheDOM() {

    /* ===========================
       Fichiers
    =========================== */

    UI.fileExcel = document.getElementById("fileExcel");
    UI.filePieces = document.getElementById("filePieces");

    /* ===========================
       Boutons Sélection
    =========================== */

    UI.btnSelectExcel = document.getElementById("btnSelectExcel");
    UI.btnSelectPieces = document.getElementById("btnSelectPieces");

    /* ===========================
       Boutons Import Local
    =========================== */

    UI.btnImportExcel = document.getElementById("btnImportExcel");
    UI.btnImportPieces = document.getElementById("btnImportPieces");

    /* ===========================
       Boutons Analyse / Import
    =========================== */

    UI.btnAnalyse = document.getElementById("btnAnalyse");
    UI.btnStartImport = document.getElementById("btnStartImport");
    UI.btnResetImport = document.getElementById("btnResetImport");

    /* ===========================
       Boutons Maintenance
    =========================== */

    UI.btnRestoreDeleted = document.getElementById("btnRestoreDeleted");
    UI.btnConfirmDelete = document.getElementById("btnConfirmDelete");

    /* ===========================
       Informations fichiers
    =========================== */

    UI.excelFileName = document.getElementById("excelFileName");
    UI.piecesFileName = document.getElementById("piecesFileName");

    /* ===========================
       Progression générale
    =========================== */

    UI.progressBar = document.getElementById("progressBar");
    UI.progressPercent = document.getElementById("progressPercent");
    UI.progressStatus = document.getElementById("currentStatus");

    /* ===========================
       Journal d'import
    =========================== */

    UI.importLog = document.getElementById("importLog");

    /* ===========================
       Vérification minimale
    =========================== */

    if (!UI.fileExcel || !UI.filePieces) {

        console.warn("⚠️ Fichiers input introuvables.");

    }

}

/* ==========================================================
   Init
========================================================== */

document.addEventListener("DOMContentLoaded", async () => {

    await initPage();

});

/* ==========================================================
   Main Init
========================================================== */

async function initPage() {

    try {

        /* ===========================
           Session
        =========================== */

        await Session.init();

        /* ===========================
           Cache DOM
        =========================== */

        cacheDOM();

        /* ===========================
           Utilisateur
        =========================== */

        await loadCurrentUser();

        /* ===========================
           Events
        =========================== */

        bindEvents();

        setupAuthListener();

        setupWindowEvents();

        /* ===========================
           Chargement
        =========================== */

        await loadPage();

        /* ===========================
           Auto Refresh
        =========================== */

        startAutoRefresh();

        /* ===========================
           Initialisation état
        =========================== */

        kgImported = false;
        piecesImported = false;

        kgAnalysed = false;
        piecesAnalysed = false;

        Toast.success("Import Commandes prêt.");

        console.log("✅ Import Commandes initialized.");

    }

    catch (error) {

        console.error("Erreur initPage :", error);

        Toast.error(
            error?.message || "Erreur lors du démarrage."
        );

    }

}

/* ==========================================================
   Current User
========================================================== */

async function loadCurrentUser() {

    const {
        data: { session }
    } = await supabase.auth.getSession();

    if (!session) {

        window.location.href = "../login.html";
        return;

    }

    const {
        data: { user }
    } = await supabase.auth.getUser();

    currentUser = user;

}

/* ==========================================================
   Events
========================================================== */

function bindEvents() {

    console.log("Button:", UI.btnSelectExcel);
    console.log("Input :", UI.fileExcel);

    /* ===========================
       Choisir fichier KG
    =========================== */

    UI.btnSelectExcel?.addEventListener("click", (e) => {

        e.preventDefault();

        UI.fileExcel.click();

    });

    UI.fileExcel?.addEventListener("change", (e) => {

        const file = e.target.files[0];

        if (!file) return;

        UI.excelFileName.textContent = file.name;

        UI.btnImportExcel.disabled = false;

        UI.btnAnalyse.disabled = true;
        UI.btnStartImport.disabled = true;

        kgImported = false;
        kgAnalysed = false;

    });

    /* ===========================
       Choisir fichier Pièces
    =========================== */

    UI.btnSelectPieces?.addEventListener("click", (e) => {

        e.preventDefault();

        UI.filePieces.click();

    });

    UI.filePieces?.addEventListener("change", (e) => {

        const file = e.target.files[0];

        if (!file) return;

        UI.piecesFileName.textContent = file.name;

        UI.btnImportPieces.disabled = false;

        UI.btnAnalyse.disabled = true;
        UI.btnStartImport.disabled = true;

        piecesImported = false;
        piecesAnalysed = false;

    });

    /* ===========================
       Import Excel KG
    =========================== */

    UI.btnImportExcel?.addEventListener("click", async () => {

        await importExcelKG();

        UI.btnAnalyse.disabled = false;

    });

    /* ===========================
       Import Pièces
    =========================== */

    UI.btnImportPieces?.addEventListener("click", async () => {

        await importPieces();

        UI.btnAnalyse.disabled = false;

    });

    /* ===========================
       Analyse
    =========================== */

    UI.btnAnalyse?.addEventListener("click", async () => {

        await analyseCommandes();

    });

    /* ===========================
       Import vers la base
    =========================== */

    UI.btnStartImport?.addEventListener("click", async () => {

        await startImport();

    });

    /* ===========================
       Reset
    =========================== */

    UI.btnResetImport?.addEventListener("click", () => {

        resetImport();

    });

    /* ===========================
       Restaurer
    =========================== */

    UI.btnRestoreDeleted?.addEventListener("click", async () => {

        await restoreDeletedCommande();

    });

    /* ===========================
       Confirmer suppression
    =========================== */

    UI.btnConfirmDelete?.addEventListener("click", async () => {

        await confirmDeletedCommande();

    });

    /* ===========================
       Sélectionner tout
    =========================== */

    document
        .getElementById("checkAllDeleted")
        ?.addEventListener("change", function () {

            document
                .querySelectorAll(".deletedCommande")
                .forEach(item => {

                    item.checked = this.checked;

                });

        });

    /* ===========================
       Import vers la base
    =========================== */

    UI.btnStartImport?.addEventListener("click", async () => {

        if (!kgImported && !piecesImported) {

            Toast.warning(
                "Veuillez importer au moins un fichier."
            );

            return;

        }

        await startImport();

    });

    /* ===========================
       Reset
    =========================== */

    UI.btnResetImport?.addEventListener("click", () => {

        resetImport();

    });

    /* ===========================
       Restaurer
    =========================== */

    UI.btnRestoreDeleted?.addEventListener("click", async () => {

        await restoreDeletedCommande();

    });

    /* ===========================
       Confirmer suppression
    =========================== */

    UI.btnConfirmDelete?.addEventListener("click", async () => {

        await confirmDeletedCommande();

    });

    /* ===========================
       Sélectionner tout
    =========================== */

    document
        .getElementById("checkAllDeleted")
        ?.addEventListener("change", function () {

            document
                .querySelectorAll(".deletedCommande")
                .forEach(item => {

                    item.checked = this.checked;

                });

        });

}

/* ==========================================================
   Import Excel KG
========================================================== */

async function importExcelKG() {

    const file = UI.fileExcel.files[0];

    if (!file) {

        Toast.warning(
            "Veuillez sélectionner un fichier Excel."
        );

        return;

    }

    try {

        Loader.show("Lecture du fichier Excel...");

        const raw = await readExcel(file);

        /* ==========================================
           Calcul nombre de lignes par document
        ========================================== */

        const totalParDocument = {};

        raw.forEach(row => {

            const documentVente = String(
                row["Document de vente"] || ""
            ).trim();

            totalParDocument[documentVente] =
                (totalParDocument[documentVente] || 0) + 1;

        });

        /* ==========================================
           Génération des commandes KG
        ========================================== */

        const compteur = {};

        kgData = raw.map(row => {

            const documentVente = String(
                row["Document de vente"] || ""
            ).trim();

            compteur[documentVente] =
                (compteur[documentVente] || 0) + 1;

            const ligneCommande = compteur[documentVente];

            const totalLignes =
                totalParDocument[documentVente];

            return {

                document_vente: documentVente,

                ligne_commande: ligneCommande,

                reference_commande:
                    `${documentVente}-${totalLignes}/${ligneCommande}`,

                client: String(
                    row["Client"] ||
                    row["Nom Réceptionnaire"] ||
                    ""
                ).trim(),

                nom_receptionnaire: String(
                    row["Nom Réceptionnaire"] || ""
                ).trim(),

                article: String(
                    row["Article"] || ""
                ).trim(),

                designation_article: String(
                    row["Description d'article"] || ""
                ).trim(),

                quantite_commandee: Number(
                    row["Quantité commandée (poste)"] || 0
                ),

                quantite_preparee: 0,

                quantite_expediee: 0,

                unite: "KG",

                itineraire: String(
                    row["Description Itinéraire"] || ""
                ).trim(),

                magasin_source: "",

                date_creation: formatExcelDate(
                    row["Date de création"]
                ),

                date_livraison: formatExcelDate(
                    row["Date de livraison"]
                ),

                heure_livraison: formatExcelTime(
                    row["Heure"]
                ),

                priorite: "NORMALE",

                statut: "IMPORTEE",

                version: 1,

                commentaire: "",

                nombre_caisses: 0,

                poids_total: 0,

                est_modifie: false

            };

        });

        /* ==========================================
           État Import KG
        ========================================== */

        kgImported = true;
        kgAnalysed = false;

        console.table(kgData);

        Loader.hide();

        Toast.success(
            `${kgData.length} lignes KG chargées.`
        );
       
/* ==========================================================
   Import Pièces
========================================================== */

async function importPieces() {

    const file = UI.filePieces.files[0];

    if (!file) {

        Toast.warning(
            "Veuillez sélectionner un fichier Pièces."
        );

        return;

    }

    try {

        Loader.show("Lecture des pièces...");

        const raw = await readExcel(file);

        /* ==========================================
           Calcul nombre de lignes par document
        ========================================== */

        const totalParDocument = {};

        raw.forEach(row => {

            const documentVente = String(
                row["NUCOMD"] || ""
            ).trim();

            totalParDocument[documentVente] =
                (totalParDocument[documentVente] || 0) + 1;

        });

        /* ==========================================
           Génération des commandes Pièces
        ========================================== */

        const compteur = {};

        piecesData = raw.map(row => {

            const documentVente = String(
                row["NUCOMD"] || ""
            ).trim();

            compteur[documentVente] =
                (compteur[documentVente] || 0) + 1;

            const ligneCommande =
                compteur[documentVente];

            const totalLignes =
                totalParDocument[documentVente];

            return {

                document_vente: documentVente,

                ligne_commande: ligneCommande,

                reference_commande:
                    `${documentVente}-${totalLignes}/${ligneCommande}`,

                client: "",

                nom_receptionnaire: String(
                    row["RECEPTIONNAIRE"] || ""
                ).trim(),

                article: String(
                    row["ARTICLE"] || ""
                ).trim(),

                designation_article: String(
                    row["DESIGNATION"] || ""
                ).trim(),

                quantite_commandee: Number(
                    row["QT COMD"] || 0
                ),

                quantite_preparee: 0,

                quantite_expediee: 0,

                unite: "PCS",

                itineraire: String(
                    row["ZONE DISTRIBUTION"] || ""
                ).trim(),

                magasin_source: "",

                date_creation: null,

                date_livraison: null,

                heure_livraison: null,

                priorite: "NORMALE",

                statut: "IMPORTEE",

                version: 1,

                commentaire: "",

                nombre_pieces: Number(
                    row["NB PIECES"] || 0
                ),

                est_modifie: false

            };

        });

        /* ==========================================
           État Import Pièces
        ========================================== */

        piecesImported = true;
        piecesAnalysed = false;

        console.table(piecesData);

        Loader.hide();

        Toast.success(
            `${piecesData.length} lignes Pièces chargées.`
        );

    }

    catch (error) {

        Loader.hide();

        console.error(error);

        Toast.error(error.message);

    }

}
       
/* ==========================================================
   Read Excel
========================================================== */

function readExcel(file) {

    return new Promise((resolve, reject) => {

        const reader = new FileReader();

        reader.onload = (event) => {

            try {

                const data = new Uint8Array(event.target.result);

                const workbook = XLSX.read(data, {

                    type: "array"

                });

                const sheetName = workbook.SheetNames[0];

                const sheet = workbook.Sheets[sheetName];

                const json = XLSX.utils.sheet_to_json(

                    sheet,

                    {

                        defval: ""

                    }

                );

                resolve(json);

            }

            catch (error) {

                reject(error);

            }

        };

        reader.onerror = reject;

        reader.readAsArrayBuffer(file);

    });

}

/* ==========================================================
   Format Excel Date
========================================================== */

function formatExcelDate(value) {

    if (value === null || value === undefined || value === "") {

        return null;

    }

    // Valeur Excel (numérique)
    if (!isNaN(value)) {

        const serial = Number(value);

        const date = new Date(

            (serial - 25569) * 86400 * 1000

        );

        return date.toISOString().split("T")[0];

    }

    // Valeur texte
    const date = new Date(value);

    if (isNaN(date)) {

        return null;

    }

    return date.toISOString().split("T")[0];

}

/* ==========================================================
   Reset Analyse
========================================================== */

function resetAnalyse() {

    /* ===========================
       Analyse KG
    =========================== */

    analyseKG = {

        total: 0,

        inserted: 0,

        updated: 0,

        deleted: 0,

        same: 0,

        errors: 0

    };

    /* ===========================
       Analyse Pièces
    =========================== */

    analysePieces = {

        total: 0,

        inserted: 0,

        updated: 0,

        deleted: 0,

        same: 0,

        errors: 0

    };

    /* ===========================
       États
    =========================== */

    kgAnalysed = false;

    piecesAnalysed = false;

    /* ===========================
       Rafraîchir les cartes
    =========================== */

    updateAnalyseCards();

    /* ===========================
       Réinitialiser la progression
    =========================== */

    if (UI.progressBar) {

        UI.progressBar.style.width = "0%";

    }

    if (UI.progressPercent) {

        UI.progressPercent.textContent = "0%";

    }

    if (UI.progressStatus) {

        UI.progressStatus.textContent = "Prêt pour l'analyse.";

    }

}
/* ==========================================================
   Analyse des Commandes
========================================================== */

async function analyseCommandes() {

    try {

        Loader.show("Analyse des commandes...");

        resetAnalyse();

        /* ==========================================
           Analyse Commandes KG
        ========================================== */

        if (kgData.length) {

            const { data, error } = await supabase

                .from("commandes_excel")

                .select("*");

            if (error) {

                throw error;

            }

            compareCommandes(
                kgData,
                data,
                analyseKG
            );

            kgAnalysed = true;

        }

        /* ==========================================
           Analyse Commandes Pièces
        ========================================== */

        if (piecesData.length) {

            const { data, error } = await supabase

                .from("commandes_clients_pieces")

                .select("*");

            if (error) {

                throw error;

            }

            compareCommandes(
                piecesData,
                data,
                analysePieces
            );

            piecesAnalysed = true;

        }

        /* ==========================================
           Aucun fichier importé
        ========================================== */

        if (!kgData.length && !piecesData.length) {

            Loader.hide();

            Toast.warning(
                "Aucune donnée à analyser."
            );

            return;

        }

        /* ==========================================
           Mise à jour des statistiques
        ========================================== */

        updateAnalyseCards();

        /* ==========================================
           Activer Import
        ========================================== */

        if (UI.btnStartImport) {

            UI.btnStartImport.disabled = false;

        }

        Loader.hide();

        Toast.success(
            "Analyse terminée."
        );

    }

    catch (error) {

        Loader.hide();

        console.error(error);

        Toast.error(error.message);

    }

}

/* ==========================================================
   Format Excel Time
========================================================== */

function formatExcelTime(value) {

    if (value === null || value === undefined || value === "") {

        return null;

    }

    if (!isNaN(value)) {

        const totalSeconds = Math.round(

            Number(value) * 86400

        );

        const hours = String(

            Math.floor(totalSeconds / 3600)

        ).padStart(2, "0");

        const minutes = String(

            Math.floor((totalSeconds % 3600) / 60)

        ).padStart(2, "0");

        const seconds = String(

            totalSeconds % 60

        ).padStart(2, "0");

        return `${hours}:${minutes}:${seconds}`;

    }

    return value;

}

/* ==========================================================
   Comparaison
========================================================== */

function compareCommandes(

    excel,

    database,

    analyse

) {

    const dbMap = new Map();

    database.forEach(row => {

        dbMap.set(

            row.reference_commande,

            row

        );

    });

    /* ==========================================
       Vérification Insert / Update / Same
    ========================================== */

    excel.forEach(row => {

        analyse.total++;

        const dbRow = dbMap.get(

            row.reference_commande

        );

        if (!dbRow) {

            analyse.inserted++;

            return;

        }

        if (

            isDifferent(

                row,

                dbRow

            )

        ) {

            analyse.updated++;

        }

        else {

            analyse.same++;

        }

    });

    /* ==========================================
       Vérification Suppression
    ========================================== */

    database.forEach(row => {

        const found = excel.find(

            item =>

                item.reference_commande ===

                row.reference_commande

        );

        if (!found) {

            analyse.deleted++;

        }

    });

}
/* ==========================================================
   Compare Object
========================================================== */

function isDifferent(

    excel,

    db

) {

    return (

        Number(excel.quantite_commandee) !== Number(db.quantite_commandee) ||

        excel.article !== db.article ||

        excel.client !== db.client ||

        excel.designation_article !== db.designation_article ||

        excel.date_livraison !== db.date_livraison ||

        excel.itineraire !== db.itineraire

    );

}

/* ==========================================================
   Update Cards
========================================================== */

function updateAnalyseCards() {

    const result = {

        total:

            analyseKG.total +

            analysePieces.total,

        inserted:

            analyseKG.inserted +

            analysePieces.inserted,

        updated:

            analyseKG.updated +

            analysePieces.updated,

        deleted:

            analyseKG.deleted +

            analysePieces.deleted,

        same:

            analyseKG.same +

            analysePieces.same,

        errors:

            analyseKG.errors +

            analysePieces.errors

    };

    document.getElementById(

        "analyseNew"

    ).textContent =

        result.inserted;

    document.getElementById(

        "analyseUpdated"

    ).textContent =

        result.updated;

    document.getElementById(

        "analyseDeleted"

    ).textContent =

        result.deleted;

    document.getElementById(

        "analyseSame"

    ).textContent =

        result.same;

    document.getElementById(

        "analyseStatus"

    ).textContent =

        "Analyse terminée.";

}

/* ==========================================================
   Reset Import
========================================================== */

function resetImport() {

    /* ===========================
       Données
    =========================== */

    kgData = [];

    piecesData = [];

    /* ===========================
       États
    =========================== */

    kgImported = false;

    piecesImported = false;

    kgAnalysed = false;

    piecesAnalysed = false;

    /* ===========================
       Analyse
    =========================== */

    resetAnalyse();

    /* ===========================
       Inputs
    =========================== */

    if (UI.fileExcel) {

        UI.fileExcel.value = "";

    }

    if (UI.filePieces) {

        UI.filePieces.value = "";

    }

    /* ===========================
       Noms fichiers
    =========================== */

    if (UI.excelFileName) {

        UI.excelFileName.textContent =

            "Aucun fichier sélectionné";

    }

    if (UI.piecesFileName) {

        UI.piecesFileName.textContent =

            "Aucun fichier sélectionné";

    }

    /* ===========================
       Boutons
    =========================== */

    if (UI.btnImportExcel) {

        UI.btnImportExcel.disabled = true;

    }

    if (UI.btnImportPieces) {

        UI.btnImportPieces.disabled = true;

    }

    if (UI.btnAnalyse) {

        UI.btnAnalyse.disabled = true;

    }

    if (UI.btnStartImport) {

        UI.btnStartImport.disabled = true;

    }

    /* ===========================
       Progression
    =========================== */

    if (UI.progressBar) {

        UI.progressBar.style.width = "0%";

    }

    if (UI.progressPercent) {

        UI.progressPercent.textContent = "0%";

    }

    if (UI.progressStatus) {

        UI.progressStatus.textContent = "";

    }

    /* ===========================
       Rafraîchir
    =========================== */

    updateAnalyseCards();

    clearLog();

    addLog(

        "Import réinitialisé.",

        "info"

    );

    Toast.success(

        "Import réinitialisé."

    );

}
       
/* ==========================================================
   Start Import
========================================================== */

async function startImport() {

    try {

        Loader.show("Importation...");

        /* ==========================================
           Déterminer la source
        ========================================== */

        const isKG = kgData.length > 0;

        const rows = isKG
            ? kgData
            : piecesData;

        if (!rows.length) {

            Loader.hide();

            Toast.warning(
                "Aucune donnée à importer."
            );

            return;

        }

        const table = isKG
            ? "commandes_excel"
            : "commandes_clients_pieces";

        const file = isKG
            ? UI.fileExcel.files[0]
            : UI.filePieces.files[0];

        /* ==========================================
           Historique Import
        ========================================== */

        const {

            data: historique,

            error: historiqueError

        } = await supabase

            .from("historique_imports")

            .insert({

                type_import: isKG
                    ? "COMMANDES_KG"
                    : "COMMANDES_PIECES",

                mode_import: "REMPLACER",

                nom_fichier: file?.name || "",

                utilisateur: currentUser.id,

                total_lignes: rows.length,

                statut: "SUCCESS"

            })

            .select("id")

            .single();

        if (historiqueError) {

            throw historiqueError;

        }

        const historiqueImportId = historique.id;

        /* ==========================================
           Import
        ========================================== */

        let processed = 0;

        for (const row of rows) {

            row.historique_import_id =
                historiqueImportId;

            await saveCommande(

                table,

                row

            );

            processed++;

            updateProgress(

                processed,

                rows.length

            );

        }

        /* ==========================================
           Commandes supprimées
        ========================================== */

        await processDeletedCommandes();

        /* ==========================================
           Dashboard
        ========================================== */

        await refreshDashboard();

        Loader.hide();

        Toast.success(

            `${processed} commande(s) importée(s).`

        );

    }

    catch (error) {

        Loader.hide();

        console.error(error);

        Toast.error(

            error.message

        );

    }

}
       
/* ==========================================================
   Save Commande
========================================================== */

async function saveCommande(

    table,

    row

) {

    const {

        data: existing,

        error

    } = await supabase

        .from(table)

        .select("*")

        .eq(

            "reference_commande",

            row.reference_commande

        )

        .maybeSingle();

    if (error) {

        throw error;

    }

    /* ==========================================
       Nouvelle commande
    ========================================== */

    if (!existing) {

        await insertCommande(

            table,

            row

        );

        return;

    }

    /* ==========================================
       Commande modifiée
    ========================================== */

    if (

        isDifferent(

            row,

            existing

        )

    ) {

        await saveModification(

            row,

            existing

        );

        await updateCommande(

            table,

            row

        );

    }

}

/* ==========================================================
   Insert
========================================================== */

async function insertCommande(

    table,

    row

) {

    const data = {

        historique_import_id: row.historique_import_id,

        document_vente: row.document_vente,

        ligne_commande: row.ligne_commande,

        reference_commande: row.reference_commande,

        client: row.client,

        nom_receptionnaire: row.nom_receptionnaire,

        article: row.article,

        designation_article: row.designation_article,

        quantite_commandee: row.quantite_commandee,

        quantite_preparee: row.quantite_preparee,

        quantite_expediee: row.quantite_expediee,

        unite: row.unite,

        itineraire: row.itineraire,

        magasin_source: row.magasin_source,

        date_creation: row.date_creation,

        date_livraison: row.date_livraison,

        heure_livraison: row.heure_livraison,

        priorite: row.priorite,

        statut: row.statut,

        version: row.version,

        commentaire: row.commentaire,

        est_modifie: row.est_modifie

    };

    /* ==========================================
       Champs spécifiques
    ========================================== */

    if (table === "commandes_excel") {

        data.nombre_caisses = row.nombre_caisses ?? 0;

        data.poids_total = row.poids_total ?? 0;

    }
    else {

        data.nombre_pieces = row.nombre_pieces ?? 0;

    }

    const {

        error

    } = await supabase

        .from(table)

        .upsert(

            data,

            {

                onConflict:

                    "document_vente,ligne_commande"

            }

        );

    if (error) {

        console.error(

            "Insert Error:",

            error

        );

        console.log(

            "Table :",

            table

        );

        console.log(

            "Data :",

            data

        );

        throw error;

    }

}
/* ==========================================================
   Update
========================================================== */

async function updateCommande(

    table,

    row

) {

    const data = {

        client: row.client,

        nom_receptionnaire: row.nom_receptionnaire,

        article: row.article,

        designation_article: row.designation_article,

        quantite_commandee: row.quantite_commandee,

        quantite_preparee: row.quantite_preparee,

        quantite_expediee: row.quantite_expediee,

        unite: row.unite,

        itineraire: row.itineraire,

        magasin_source: row.magasin_source,

        date_creation: row.date_creation,

        date_livraison: row.date_livraison,

        heure_livraison: row.heure_livraison,

        priorite: row.priorite,

        statut: row.statut,

        version: row.version,

        commentaire: row.commentaire,

        est_modifie: true,

        derniere_modification: new Date().toISOString()

    };

    /* ==========================================
       Champs spécifiques
    ========================================== */

    if (table === "commandes_excel") {

        data.nombre_caisses = row.nombre_caisses ?? 0;

        data.poids_total = row.poids_total ?? 0;

    }

    else {

        data.nombre_pieces = row.nombre_pieces ?? 0;

    }

    const {

        error

    } = await supabase

        .from(table)

        .update(data)

        .eq(

            "reference_commande",

            row.reference_commande

        );

    if (error) {

        console.error(

            "Update Error:",

            error

        );

        console.log(

            "Table :",

            table

        );

        console.log(

            "Data :",

            data

        );

        throw error;

    }

}

/* ==========================================================
   Save Modification
========================================================== */

async function saveModification(

    excel,

    db

) {

    const {

        error

    } = await supabase

        .from(

            "modifications_commandes"

        )

        .insert({

            historique_import_id:

                excel.historique_import_id,

            document_vente:

                excel.document_vente,

            ligne_commande:

                excel.ligne_commande,

            article:

                excel.article,

            designation_article:

                excel.designation_article,

            type_action:

                "MODIFICATION_QUANTITE",

            champ_modifie:

                "quantite_commandee",

            ancienne_valeur:

                String(db.quantite_commandee),

            nouvelle_valeur:

                String(excel.quantite_commandee),

            ancienne_ligne:

                db,

            nouvelle_ligne:

                excel,

            utilisateur:

                currentUser.id,

            version_commande:

                excel.version,

            statut_avant:

                db.statut,

            statut_apres:

                excel.statut,

            commentaire:

                "Modification automatique lors de l'import"

        });

    if (error) {

        console.error(

            "Save Modification Error:",

            error

        );

        console.log(

            "Commande :",

            excel.reference_commande

        );

        throw error;

    }

}

/* ==========================================================
   Progress
========================================================== */

function updateProgress(

    current,

    total

) {

    const percent = total > 0

        ? Math.round((current * 100) / total)

        : 0;

    if (UI.progressBar) {

        UI.progressBar.style.width = `${percent}%`;

    }

    if (UI.progressPercent) {

        UI.progressPercent.textContent = `${percent}%`;

    }

    if (UI.progressStatus) {

        UI.progressStatus.textContent =

            `${current} / ${total}`;

    }

}

/* ==========================================================
   Delete Missing Commandes
========================================================== */

async function processDeletedCommandes() {

    const isKG = kgData.length > 0;

    const rows = isKG

        ? kgData

        : piecesData;

    const table = isKG

        ? "commandes_excel"

        : "commandes_clients_pieces";

    const {

        data,

        error

    } = await supabase

        .from(table)

        .select("*");

    if (error) {

        throw error;

    }

    for (const dbRow of data) {

        const exists = rows.find(

            row =>

                row.reference_commande ===

                dbRow.reference_commande

        );

        if (exists) {

            continue;

        }

        /* ==========================================
           Vérifier archivage
        ========================================== */

        const {

            data: archived,

            error: archiveError

        } = await supabase

            .from("commandes_supprimees")

            .select("id")

            .eq(

                "document_vente",

                dbRow.document_vente

            )

            .eq(

                "ligne_commande",

                dbRow.ligne_commande

            )

            .maybeSingle();

        if (archiveError) {

            throw archiveError;

        }

        if (archived) {

            continue;

        }

        /* ==========================================
           Archivage
        ========================================== */

        await archiveDeletedCommande(

            dbRow

        );

    }

}
       
/* ==========================================================
   Archive
========================================================== */

async function archiveDeletedCommande(row) {

    console.log("Archive START :", row);

    const {

        data,

        error

    } = await supabase

        .from("commandes_supprimees")

        .insert({

            historique_import_id: row.historique_import_id,

            document_vente: row.document_vente,

            ligne_commande: row.ligne_commande,

            client: row.client,

            nom_receptionnaire: row.nom_receptionnaire,

            article: row.article,

            designation_article: row.designation_article,

            quantite: row.quantite_commandee,

            unite: row.unite,

            itineraire: row.itineraire,

            magasin_source: row.magasin_source,

            date_creation: row.date_creation,

            date_livraison: row.date_livraison,

            heure_livraison: row.heure_livraison,

            statut_avant: row.statut,

            motif_suppression: "SUPPRIMEE_DEPUIS_SAP",

            origine_suppression: "SAP",

            utilisateur: currentUser.id,

            ancienne_ligne: row,

            commentaire:

                "Commande supprimée lors de la synchronisation SAP",

            deleted_at: new Date().toISOString(),

            deleted_by: currentUser.email

        })

        .select()

        .single();

    console.log("Archive DATA :", data);

    console.log("Archive ERROR :", error);

    if (error) {

        throw error;

    }

}

/* ==========================================================
   Delete
========================================================== */

async function deleteCommande(

    table,

    reference_commande

) {

    const {

        error

    } = await supabase

        .from(table)

        .delete()

        .eq(

            "reference_commande",

            reference_commande

        );

    if (error) {

        throw error;

    }

}

/* ==========================================================
   Load Deleted Table
========================================================== */

async function loadDeletedCommandes() {

    const {

        data,

        error

    } = await supabase

        .from(

            "commandes_supprimees"

        )

        .select("*")

        .eq(

            "statut",

            "EN_ATTENTE"

        )

        .order(

            "deleted_at",

            {

                ascending: false

            }

        );

    if (error) {

        throw error;

    }

    renderDeletedTable(

        data || []

    );

}

/* ==========================================================
   Render Deleted
========================================================== */

function renderDeletedTable(rows) {

    const tbody = document.getElementById(

        "deletedTable"

    );

    if (!tbody) {

        return;

    }

    tbody.innerHTML = "";

    if (!rows.length) {

        tbody.innerHTML = `

        <tr>

            <td colspan="9" class="empty-table">

                Aucune commande supprimée.

            </td>

        </tr>

        `;

        const total = document.getElementById(

            "deletedTotal"

        );

        if (total) {

            total.textContent = "0";

        }

        return;

    }

    rows.forEach(row => {

        const selector =

            row.statut === "EN_ATTENTE"

                ? `

                    <input

                        type="checkbox"

                        class="deletedCommande"

                        value="${row.id}"

                    >

                `

                : `

                    <i

                        class="fas fa-lock text-muted"

                        title="${row.statut}"

                    ></i>

                `;

        tbody.innerHTML += `

        <tr>

            <td>

                ${selector}

            </td>

            <td>${row.document_vente ?? ""}</td>

            <td>${row.client ?? ""}</td>

            <td>${row.article ?? ""}</td>

            <td>${formatNumber(row.quantite)}</td>

            <td>${row.date_livraison ?? ""}</td>

            <td>${formatDate(row.deleted_at)}</td>

            <td>${row.deleted_by ?? ""}</td>

            <td>

                <span class="deleted-status">

                    ${row.statut}

                </span>

            </td>

        </tr>

        `;

    });

    const total = document.getElementById(

        "deletedTotal"

    );

    if (total) {

        total.textContent = rows.length;

    }

}
   
/* ==========================================================
   Refresh Dashboard
========================================================== */

async function refreshDashboard() {

    try {

        updateKPIs();

        await loadModifications();

        await loadDeletedCommandes();

        updateImportSummary();

    }

    catch (error) {

        console.error(error);

    }

}

/* ==========================================================
   KPIs
========================================================== */

function updateKPIs() {

    const result = {

        total:

            analyseKG.total +

            analysePieces.total,

        inserted:

            analyseKG.inserted +

            analysePieces.inserted,

        updated:

            analyseKG.updated +

            analysePieces.updated,

        deleted:

            analyseKG.deleted +

            analysePieces.deleted,

        same:

            analyseKG.same +

            analysePieces.same,

        errors:

            analyseKG.errors +

            analysePieces.errors

    };

    setValue(

        "kpiTotal",

        result.total

    );

    setValue(

        "kpiInserted",

        result.inserted

    );

    setValue(

        "kpiUpdated",

        result.updated

    );

    setValue(

        "kpiDeleted",

        result.deleted

    );

    setValue(

        "kpiSame",

        result.same

    );

    setValue(

        "kpiErrors",

        result.errors

    );

}

/* ==========================================================
   Import Summary
========================================================== */

function updateImportSummary() {

    const now = new Date().toLocaleString("fr-FR");

    setValue(

        "lastAnalyseDate",

        now

    );

    setValue(

        "lastImportDate",

        now

    );

    setValue(

        "importUser",

        currentUser?.email ?? "-"

    );

    const state =

        document.getElementById(

            "importState"

        );

    if (state) {

        state.textContent =

            "Terminé";

        state.className =

            "badge badge-success";

    }

}

/* ==========================================================
   Load Modifications
========================================================== */

async function loadModifications() {

    const {

        data,

        error

    } = await supabase

        .from(

            "modifications_commandes"

        )

        .select("*")

        .order(

            "date_action",

            {

                ascending: false

            }

        );

    if (error) {

        throw error;

    }

    renderModifications(

        data || []

    );

}
       
/* ==========================================================
   Render Modifications
========================================================== */

function renderModifications(rows) {

    const tbody =

        document.getElementById(

            "modificationsTable"

        );

    if (!tbody) {

        return;

    }

    tbody.innerHTML = "";

    if (!rows.length) {

        tbody.innerHTML = `

        <tr>

            <td colspan="9"

                class="empty-table">

                Aucune modification.

            </td>

        </tr>

        `;

        setValue(

            "modificationCount",

            0

        );

        setValue(

            "totalModifications",

            0

        );

        return;

    }

    rows.forEach(row => {

        tbody.innerHTML += `

        <tr>

            <td>${row.document_vente ?? ""}</td>

            <td>${row.article ?? ""}</td>

            <td>${row.type_action ?? ""}</td>

            <td>${row.champ_modifie ?? ""}</td>

            <td>${row.ancienne_valeur ?? ""}</td>

            <td>${row.nouvelle_valeur ?? ""}</td>

            <td>${row.utilisateur ?? ""}</td>

            <td>${formatDate(row.date_action)}</td>

            <td>

                <span class="status-badge status-update">

                    Modifiée

                </span>

            </td>

        </tr>

        `;

    });

    setValue(

        "modificationCount",

        rows.length

    );

    setValue(

        "totalModifications",

        rows.length

    );

}
       
/* ==========================================================
   Helpers
========================================================== */

function setValue(

    id,

    value

) {

    const element =

        document.getElementById(id);

    if (element) {

        element.textContent = value;

    }

}

/* ==========================================================
   Load Page
========================================================== */

async function loadPage() {

    try {

        await refreshDashboard();

        addLog(

            "Page chargée.",

            "success"

        );

    }

    catch (error) {

        console.error(error);

    }

}

/* ==========================================================
   Auto Refresh Dashboard
========================================================== */

let dashboardRefreshInterval = null;

function startAutoRefresh() {

    if (dashboardRefreshInterval) {

        clearInterval(

            dashboardRefreshInterval

        );

    }

    dashboardRefreshInterval = setInterval(

        async () => {

            try {

                await refreshDashboard();

            }

            catch (error) {

                console.error(error);

            }

        },

        60000

    );

}

/* ==========================================================
   Auth Listener
========================================================== */

function setupAuthListener() {

    if (!supabase?.auth) {

        return;

    }

    supabase.auth.onAuthStateChange(

        async (

            event,

            session

        ) => {

            if (!session) {

                window.location.href =

                    "../login.html";

                return;

            }

            addLog(

                "Session actualisée.",

                "info"

            );

        }

    );

}

/* ==========================================================
   Window Events
========================================================== */

function setupWindowEvents() {

    window.addEventListener(

        "online",

        () => {

            Toast.success(

                "Connexion rétablie."

            );

            addLog(

                "Connexion Internet.",

                "success"

            );

        }

    );

    window.addEventListener(

        "offline",

        () => {

            Toast.warning(

                "Mode hors ligne."

            );

            addLog(

                "Connexion perdue.",

                "warning"

            );

        }

    );

    window.addEventListener(

        "beforeunload",

        () => {

            clearLog();

        }

    );

}
       

/* ==========================================================
   Confirmation Modal
========================================================== */

function confirmAction(

    message

) {

    return new Promise(

        resolve => {

            const modal =

                document.getElementById(

                    "confirmModal"

                );

            const messageElement =

                document.getElementById(

                    "confirmMessage"

                );

            const btnConfirm =

                document.getElementById(

                    "btnConfirmModal"

                );

            const btnCancel =

                document.getElementById(

                    "btnCancelModal"

                );

            if (

                !modal ||

                !messageElement ||

                !btnConfirm ||

                !btnCancel

            ) {

                resolve(false);

                return;

            }

            messageElement.textContent =

                message;

            modal.classList.remove(

                "hidden"

            );

            btnConfirm.onclick = () => {

                modal.classList.add(

                    "hidden"

                );

                resolve(true);

            };

            btnCancel.onclick = () => {

                modal.classList.add(

                    "hidden"

                );

                resolve(false);

            };

        }

    );

}

/* ==========================================================
   Success Modal
========================================================== */

function showSuccess(

    message

) {

    const modal =

        document.getElementById(

            "successModal"

        );

    const text =

        document.getElementById(

            "successMessage"

        );

    if (!modal || !text) {

        return;

    }

    text.textContent = message;

    modal.classList.remove(

        "hidden"

    );

}

/* ==========================================================
   Error Modal
========================================================== */

function showError(

    message

) {

    const modal =

        document.getElementById(

            "errorModal"

        );

    const text =

        document.getElementById(

            "errorMessage"

        );

    if (!modal || !text) {

        return;

    }

    text.textContent = message;

    modal.classList.remove(

        "hidden"

    );

}

/* ==========================================================
   Format Date
========================================================== */

function formatDate(value) {

    if (!value) {

        return "";

    }

    const date = new Date(value);

    if (isNaN(date.getTime())) {

        return "";

    }

    return date.toLocaleDateString(

        "fr-FR",

        {

            year: "numeric",

            month: "2-digit",

            day: "2-digit",

            hour: "2-digit",

            minute: "2-digit"

        }

    );

}

/* ==========================================================
   Format Number
========================================================== */

function formatNumber(value) {

    return Number(value ?? 0)

        .toLocaleString(

            "fr-FR"

        );

}

/* ==========================================================
   Safe Value
========================================================== */

function safe(value) {

    if (

        value === null ||

        value === undefined

    ) {

        return "";

    }

    return String(value).trim();

}

/* ==========================================================
   Excel Date
========================================================== */

function excelDate(value) {

    if (!value) {

        return null;

    }

    if (typeof value === "number") {

        return new Date(

            (value - 25569)

            * 86400

            * 1000

        );

    }

    const date = new Date(value);

    return isNaN(date.getTime())

        ? null

        : date;

}

/* ==========================================================
   Log
========================================================== */

function addLog(

    message,

    type = "info"

) {

    if (!UI.importLog) {

        return;

    }

    const line =

        document.createElement("div");

    line.className =

        `log-line ${type}`;

    line.innerHTML = `

        <strong>

            ${new Date()

                .toLocaleTimeString("fr-FR")}

        </strong>

        -

        ${message}

    `;

    UI.importLog.prepend(

        line

    );

}

/* ==========================================================
   Clear Log
========================================================== */

function clearLog() {

    if (UI.importLog) {

        UI.importLog.innerHTML = "";

    }

}

/* ==========================================================
   Download JSON
========================================================== */

function downloadJSON(

    data,

    filename

) {

    const blob =

        new Blob(

            [

                JSON.stringify(

                    data,

                    null,

                    2

                )

            ],

            {

                type: "application/json"

            }

        );

    const url =

        URL.createObjectURL(blob);

    const a =

        document.createElement("a");

    a.href = url;

    a.download = filename;

    a.click();

    URL.revokeObjectURL(url);

}

/* ==========================================================
   Export Excel
========================================================== */

function exportExcel(

    rows,

    filename

) {

    if (!rows.length) {

        Toast.warning(

            "Aucune donnée."

        );

        return;

    }

    const workbook =

        XLSX.utils.book_new();

    const sheet =

        XLSX.utils.json_to_sheet(

            rows

        );

    XLSX.utils.book_append_sheet(

        workbook,

        sheet,

        "Commandes"

    );

    XLSX.writeFile(

        workbook,

        filename

    );

}

/* ==========================================================
   Copy
========================================================== */

async function copyText(text) {

    try {

        await navigator.clipboard

            .writeText(text);

        Toast.success(

            "Copié."

        );

    }

    catch {

        Toast.error(

            "Impossible de copier."

        );

    }

}

/* ==========================================================
   Sleep
========================================================== */

function sleep(ms) {

    return new Promise(

        resolve =>

            setTimeout(

                resolve,

                ms

            )

    );

}

       
/* ==========================================================
   Random ID
========================================================== */

function randomId() {

    return crypto.randomUUID();

}

/* ==========================================================
   Export
========================================================== */

window.ImportCommandes = {

    analyse: analyseCommandes,

    importer: startImport,

    refresh: refreshDashboard,

    reset: resetImport,

    exportExcel,

    exportJSON: downloadJSON,

    clearLog,

    addLog

};

/* ==========================================================
   End File
========================================================== */

console.log(

    "%cSoufStock Enterprise ERP",

    "color:#16a34a;font-size:18px;font-weight:bold;"

);

console.log(

    "Import Commandes loaded successfully."

);
