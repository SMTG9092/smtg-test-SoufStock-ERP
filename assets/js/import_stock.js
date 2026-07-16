/**
 * ==========================================================================
 * SoufStock Enterprise ERP/WMS
 * File : assets/js/import_stock.js
 * ==========================================================================
 */

import APP_CONFIG from "./core/config.js";
import Api from "./core/api.js";
import SessionManager from "./core/session.js";
import ThemeManager from "./core/theme.js";
import LanguageManager from "./core/language.js";
import * as Permissions from "./core/permissions.js";
import { Loader, Toast } from "./core/utils.js";
import Sidebar from "./core/sidebar.js";
import Navigation from "./core/navigation.js";

console.log("========== API ==========");
console.log(Api);
console.log("Keys:", Object.keys(Api));
console.log("importStock:", Api.importStock);
console.log("getImportHistory:", Api.getImportHistory);
console.log("=========================");

class ImportStock {

    constructor() {

        this.file = null;

        this.workbook = null;

        this.sheet = null;

        this.rows = [];

        this.importMode = "MISE_A_JOUR";

        this.initialized = false;

    }

    /* ==========================================================
       INIT
    ========================================================== */

    async init() {

        try {

            Loader.show(
                "Chargement...",
                "Initialisation..."
            );

            ThemeManager.init();

            LanguageManager.init();

            await SessionManager.init();

            const authenticated =
                await SessionManager.isAuthenticated();

            if (!authenticated) {

                window.location.replace(
                    APP_CONFIG.ROUTES.LOGIN
                );

                return;

            }

            await Permissions.initPermissions();

            this.setupUI();

            this.initialized = true;

            Loader.hide();

            console.log(
                "[Import Stock] Ready."
            );

        }

        catch (error) {

            console.error(error);

            Loader.hide();

            Toast.error(
                "Import Stock",
                error.message
            );

        }

    }

/* ==========================================================
   SETUP UI
========================================================== */

setupUI() {

    if (this.uiInitialized) return;

    this.uiInitialized = true;

    Sidebar.init();

    Navigation.init();

    this.bindFileEvents();

    this.bindImportButton();

    this.bindImportMode();

    this.bindButtons();

    this.bindModals();

}

/* ==========================================================
   FILE EVENTS
========================================================== */

bindFileEvents() {

    const input = document.getElementById("excelFile");

    const dropZone = document.getElementById("dropZone");

    if (input) {

        input.addEventListener("change", (event) => {

            const file = event.target.files[0];

            if (!file) return;

            this.validateAndLoad(file);

        });

    }

    if (dropZone) {

        dropZone.addEventListener("dragover", (event) => {

            event.preventDefault();

            dropZone.classList.add("dragover");

        });

        dropZone.addEventListener("dragleave", () => {

            dropZone.classList.remove("dragover");

        });

        dropZone.addEventListener("drop", (event) => {

            event.preventDefault();

            dropZone.classList.remove("dragover");

            const file = event.dataTransfer.files[0];

            if (!file) return;

            this.validateAndLoad(file);

        });

    }

}

/* ==========================================================
   VALIDATE FILE
========================================================== */

validateAndLoad(file) {

    const extension =

        file.name

        .split(".")

        .pop()

        .toLowerCase();

    if (

        extension !== "xlsx" &&

        extension !== "xls"

    ) {

        Toast.error(

            "Import Stock",

            "Veuillez sélectionner un fichier Excel."

        );

        return;

    }

    this.loadExcel(file);

}

/* ==========================================================
   LOAD EXCEL
========================================================== */

loadExcel(file) {

    this.file = file;

    this.updateFileInfo();

    Loader.show(

        "Excel",

        "Lecture du fichier..."

    );

    const reader = new FileReader();

    reader.onload = (event) => {

        try {

            const data = new Uint8Array(

                event.target.result

            );

            this.workbook = XLSX.read(

                data,

                {

                    type: "array"

                }

            );

            if (

                !this.workbook ||

                this.workbook.SheetNames.length === 0

            ) {

                throw new Error(

                    "Aucune feuille trouvée."

                );

            }

            const firstSheet =

                this.workbook.SheetNames[0];

            this.sheet =

                this.workbook.Sheets[firstSheet];

            this.rows =

                XLSX.utils.sheet_to_json(

                    this.sheet,

                    {

                        defval: ""

                    }

                );

            if (

                this.rows.length === 0

            ) {

                throw new Error(

                    "Le fichier Excel est vide."

                );

            }

            console.table(

                this.rows.slice(0, 5)

            );

            console.log(

                Object.keys(

                    this.rows[0]

                )

            );

            this.updateExcelInfo(

                firstSheet

            );

            this.renderPreview();

            this.updateSummary();

            Toast.success(

                "Import Stock",

                `${this.rows.length} lignes chargées.`

            );

        }

        catch (error) {

            console.error(error);

            Toast.error(

                "Excel",

                error.message

            );

        }

        finally {

            Loader.hide();

        }

    };

    reader.onerror = () => {

        Loader.hide();

        Toast.error(

            "Excel",

            "Impossible de lire le fichier."

        );

    };

    reader.readAsArrayBuffer(file);

}
    
/* ==========================================================
   FILE INFORMATION
========================================================== */

updateFileInfo() {

    if (!this.file) return;

    const fileName = document.getElementById("fileName");
    const fileSize = document.getElementById("fileSize");

    if (fileName) {

        fileName.textContent = this.file.name;

    }

    if (fileSize) {

        const size =

            this.file.size / 1024;

        fileSize.textContent =

            `${size.toFixed(2)} KB`;

    }

}

updateExcelInfo(sheetName) {

    const sheet = document.getElementById("sheetName");
    const rows = document.getElementById("rowCount");

    if (sheet) {

        sheet.textContent = sheetName;

    }

    if (rows) {

        rows.textContent =

            this.rows.length.toLocaleString("fr-FR");

    }

}

/* ==========================================================
   PREVIEW
========================================================== */

renderPreview() {

    const tbody = document.getElementById("previewTableBody");

    if (!tbody) return;

    tbody.innerHTML = "";

    if (this.rows.length === 0) {

        tbody.innerHTML = `
            <tr>
                <td colspan="11" class="empty-table">
                    Aucun fichier sélectionné.
                </td>
            </tr>
        `;

        return;

    }

    const preview = this.rows.slice(0, 20);

    preview.forEach((row, index) => {

        const data = this.mapRow(row);

        tbody.insertAdjacentHTML(
            "beforeend",
            `
            <tr>
                <td>${index + 1}</td>
                <td>${data.division}</td>
                <td>${data.magasin}</td>
                <td>${data.article}</td>
                <td>${data.designation_article}</td>
                <td>${data.lot}</td>
                <td>${data.quantite.toLocaleString("fr-FR")}</td>
                <td>${data.unite}</td>
                <td>${data.type_article}</td>
                <td>${data.groupe_article}</td>
                <td>${data.controle_qualite.toLocaleString("fr-FR")}</td>
            </tr>
            `
        );

    });

}
/* ==========================================================
   SUMMARY
========================================================== */

updateSummary() {

    const articles = new Set();

    const lots = new Set();

    const magasins = new Set();

    let total = 0;

    this.rows.forEach((row) => {

        const data = this.mapRow(row);

        if (data.article) {

            articles.add(data.article);

        }

        if (data.lot) {

            lots.add(data.lot);

        }

        if (data.magasin) {

            magasins.add(data.magasin);

        }

        total += data.quantite;

    });

    this.setValue(

        "summaryArticles",

        articles.size.toLocaleString("fr-FR")

    );

    this.setValue(

        "summaryLots",

        lots.size.toLocaleString("fr-FR")

    );

    this.setValue(

        "summaryMagasins",

        magasins.size.toLocaleString("fr-FR")

    );

    this.setValue(

        "summaryQuantity",

        total.toLocaleString(

            "fr-FR",

            {

                minimumFractionDigits: 3,

                maximumFractionDigits: 3

            }

        )

    );

}

/* ==========================================================
   HELPERS
========================================================== */

setValue(id, value) {

    const element = document.getElementById(id);

    if (!element) return;

    element.textContent = value;

}

/* ==========================================================
   COLUMN MAPPING
========================================================== */

mapRow(row) {

    return {

        division: String(
            row["Division"] ?? ""
        ).trim(),

        magasin: String(
            row["Magasin"] ?? ""
        ).trim(),

        emplacement: null,

        article: String(
            row["Article"] ?? ""
        ).trim(),

        designation_article: String(
            row["Désignation article"] ??
            row["Designation article"] ??
            ""
        ).trim(),

        lot: String(
            row["Lot"] ?? ""
        ).trim(),

        quantite: this.parseNumber(
            row["À utilisation libre"]
        ),

        unite: String(
            row["Unité quantité base"] ??
            row["Unite quantité base"] ??
            "KG"
        ).trim(),

        type_article: String(
            row["Type d'article"] ??
            row["Type article"] ??
            ""
        ).trim(),

        groupe_article: String(
            row["Groupe d'articles"] ??
            row["Groupe articles"] ??
            ""
        ).trim(),

        famille_article: null,

        controle_qualite: this.parseNumber(
            row["Contrôle qualité"]
        )

    };

}

/* ==========================================================
   PARSE NUMBER
========================================================== */

parseNumber(value) {

    if (

        value === null ||

        value === undefined ||

        value === ""

    ) {

        return 0;

    }

    return parseFloat(

        String(value)

            .trim()

            .replace(/\s/g, "")

            .replace(",", ".")

    ) || 0;

}
/* ==========================================================
   PARSE NUMBER
========================================================== */

parseNumber(value) {

    if (

        value === null ||

        value === undefined ||

        value === ""

    ) {

        return 0;

    }

    return parseFloat(

        String(value)

            .trim()

            .replace(/\s/g, "")

            .replace(",", ".")

    ) || 0;

}

/* ==========================================================
   VALIDATION
========================================================== */

validateRows() {

    const errors = [];

    this.rows.forEach((row, index) => {

        const data = this.mapRow(row);

        if (!data.article) {

            errors.push(
                `Ligne ${index + 2} : Article manquant.`
            );

        }

        if (!data.magasin) {

            errors.push(
                `Ligne ${index + 2} : Magasin manquant.`
            );

        }

        if (!data.designation_article) {

            errors.push(
                `Ligne ${index + 2} : Désignation manquante.`
            );

        }

        if (!data.lot) {

            errors.push(
                `Ligne ${index + 2} : Lot manquant.`
            );

        }

        if (data.quantite < 0) {

            errors.push(
                `Ligne ${index + 2} : Quantité négative.`
            );

        }

    });

    return errors;

}
/* ==========================================================
   GET MAPPED ROWS
========================================================== */

getMappedRows() {

    return this.rows.map(

        row => this.mapRow(row)

    );

}

/* ==========================================================
   GET MAPPED ROWS
========================================================== */

getMappedRows() {

    return this.rows.map(

        row => this.mapRow(row)

    );

}

/* ==========================================================
   IMPORT BUTTON
========================================================== */

bindImportButton() {

    const button = document.getElementById(

        "startImportBtn"

    );

    if (!button) return;

    button.addEventListener(

        "click",

        () => this.startImport()

    );

}

/* ==========================================================
   START IMPORT
========================================================== */

async startImport() {

    try {

        if (this.rows.length === 0) {

            Toast.warning(

                "Import Stock",

                "Veuillez sélectionner un fichier Excel."

            );

            return;

        }

        const errors = this.validateRows();

        if (errors.length > 0) {

            console.error(errors);

            Toast.error(

                "Validation",

                `${errors.length} erreur(s) détectée(s).\n${errors[0]}`

            );

            return;

        }

        const data = this.getMappedRows();

        Loader.show(

            "Importation...",

            `Traitement de ${data.length} ligne(s)...`

        );

        this.updateProgress(

            0,

            data.length

        );

        const result = await this.importData(

            data

        );

        this.updateReport(

            result

        );

        this.updateProgress(

            data.length,

            data.length

        );

        Toast.success(

            "Import Stock",

            `Import terminé (${data.length} ligne(s)).`

        );

    }

    catch (error) {

        console.error(error);

        Toast.error(

            "Import Stock",

            error.message ||

            "Erreur pendant l'import."

        );

    }

    finally {

        Loader.hide();

    }

}
    
/* ==========================================================
   IMPORT DATA
========================================================== */

async importData(data) {

    if (typeof Api.importStock !== "function") {

        throw new Error(
            "Api.importStock() est introuvable."
        );

    }

    console.log("========== DATA SENT TO API ==========");
    console.log(data[0]);
    console.table(data.slice(0, 5));
    console.log("======================================");

    return await Api.importStock({

        mode: this.importMode,

        rows: data

    });

}
    /* ==========================================================
       REPORT
    ========================================================== */

    updateReport(result = {}) {

        this.setValue(

            "addedCount",

            result.added ?? 0

        );

        this.setValue(

            "updatedCount",

            result.updated ?? 0

        );

        this.setValue(

            "deletedCount",

            result.deleted ?? 0

        );

        this.setValue(

            "errorCount",

            result.errors ?? 0

        );

    }

/* ==========================================================
   PROGRESS
========================================================== */

updateProgress(current, total) {

    const percent =

        total > 0

            ? Math.round(

                (current * 100) / total

            )

            : 0;

    const bar =

        document.getElementById(

            "progressBar"

        );

    if (bar) {

        bar.style.width =

            percent + "%";

    }

    this.setValue(

        "progressPercent",

        percent + "%"

    );

    this.setValue(

        "processedRows",

        current.toLocaleString("fr-FR")

    );

    this.setValue(

        "totalRowsImport",

        total.toLocaleString("fr-FR")

    );

}
    
        /* ==========================================================
       IMPORT MODE
    ========================================================== */

    bindImportMode() {

        const radios = document.querySelectorAll(

            "input[name='importMode']"

        );

        radios.forEach((radio) => {

            radio.addEventListener("change", () => {

                this.importMode = radio.value;

                this.updateSelectedMode();

            });

        });

    }

    updateSelectedMode() {

        const element = document.getElementById(

            "selectedMode"

        );

        if (!element) return;

        switch (this.importMode) {

            case "REMPLACER":

                element.textContent = "Remplacer";

                break;

            case "SYNCHRONISATION":

                element.textContent = "Synchronisation";

                break;

            default:

                element.textContent = "Mise à jour";

        }

    }

    /* ==========================================================
       HISTORY
    ========================================================== */

    async loadHistory() {

        try {

            if (typeof Api.getImportHistory !== "function") {

                return;

            }

            const history =

                await Api.getImportHistory();

            this.renderHistory(history);

        }

        catch (error) {

            console.error(error);

        }

    }

    renderHistory(history = []) {

        const tbody = document.getElementById(

            "historyTableBody"

        );

        if (!tbody) return;

        tbody.innerHTML = "";

        if (history.length === 0) {

            tbody.innerHTML = `

                <tr>

                    <td colspan="10" class="empty-table">

                        Aucun historique disponible.

                    </td>

                </tr>

            `;

            return;

        }

        history.forEach(item => {

            tbody.insertAdjacentHTML(

                "beforeend",

                `

                <tr>

                    <td>${item.date ?? "-"}</td>

                    <td>${item.user ?? "-"}</td>

                    <td>${item.file ?? "-"}</td>

                    <td>${item.mode ?? "-"}</td>

                    <td>${item.rows ?? 0}</td>

                    <td>${item.added ?? 0}</td>

                    <td>${item.updated ?? 0}</td>

                    <td>${item.deleted ?? 0}</td>

                    <td>

                        <span class="history-badge success">

                            ${item.status ?? "-"}

                        </span>

                    </td>

                    <td>

                        <button

                            class="btn-view"

                            data-id="${item.id}">

                            <i class="fas fa-eye"></i>

                        </button>

                    </td>

                </tr>

                `

            );

        });

    }

    /* ==========================================================
       REFRESH
    ========================================================== */

    async refresh() {

        await this.loadHistory();

    }
        /* ==========================================================
       BUTTONS
    ========================================================== */

    bindButtons() {

        document.getElementById("cancelImportBtn")
            ?.addEventListener(
                "click",
                () => this.cancelImport()
            );

        document.getElementById("downloadReportBtn")
            ?.addEventListener(
                "click",
                () => this.downloadReport()
            );

        document.getElementById("finishImportBtn")
            ?.addEventListener(
                "click",
                () => this.finish()
            );

        document.getElementById("refreshHistoryBtn")
            ?.addEventListener(
                "click",
                () => this.refresh()
            );

    }

/* ==========================================================
   CANCEL IMPORT
========================================================== */

cancelImport() {

    this.file = null;

    this.workbook = null;

    this.sheet = null;

    this.rows = [];

    const input =

        document.getElementById(

            "excelFile"

        );

    if (input) {

        input.value = "";

    }

    this.updateFileInfo();

    this.updateExcelInfo("-");

    this.renderPreview();

    this.updateSummary();

    this.updateProgress(0, 0);

    Toast.info(

        "Import Stock",

        "Import annulé."

    );

}

    /* ==========================================================
       DOWNLOAD REPORT
    ========================================================== */

    downloadReport() {

        Toast.info(

            "Rapport",

            "Téléchargement bientôt disponible."

        );

    }

    /* ==========================================================
       FINISH
    ========================================================== */

finish() {

    window.location.assign("/stock.html");

}

    /* ==========================================================
       MODALS
    ========================================================== */

    bindModals() {

        document

            .querySelectorAll(".modal-close")

            .forEach(button => {

                button.addEventListener(

                    "click",

                    () => {

                        button

                            .closest(".modal")

                            ?.classList.remove("show");

                    }

                );

            });

    }

    /* ==========================================================
       DESTROY
    ========================================================== */

    destroy() {

        this.file = null;

        this.workbook = null;

        this.sheet = null;

        this.rows = [];

        console.log(

            "[Import Stock] Destroy."

        );

    }

}

/* ==========================================================
   INSTANCE
========================================================== */

const importStock = new ImportStock();

/* ==========================================================
   START
========================================================== */

document.addEventListener(

    "DOMContentLoaded",

    () => importStock.init()

);

/* ==========================================================
   DESTROY
========================================================== */

window.addEventListener(

    "beforeunload",

    () => importStock.destroy()

);

/* ==========================================================
   EXPORT
========================================================== */

export default importStock;
