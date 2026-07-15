/**
 * ==========================================================================
 * SoufStock Enterprise ERP/WMS
 * File: assets/js/import_stock.js
 * ==========================================================================
 */

import APP_CONFIG from "./core/config.js";
import SessionManager from "./core/session.js";
import ThemeManager from "./core/theme.js";
import LanguageManager from "./core/language.js";
import * as Permissions from "./core/permissions.js";
import { Loader, Toast } from "./core/utils.js";
import Navigation from "./core/navigation.js";
import Sidebar from "./core/sidebar.js";

class ImportStock {

    constructor() {

        this.file = null;

        this.workbook = null;

        this.sheet = null;

        this.rows = [];

        this.importMode = "MISE_A_JOUR";

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

            Loader.hide();

        }

        catch(error){

            console.error(error);

            Loader.hide();

            Toast.error(
                "Import Stock",
                error.message
            );

        }

    }

    /* ==========================================================
       UI
    ========================================================== */

    setupUI(){

        Sidebar.init();

        Navigation.init();

    }

}

const importStock = new ImportStock();

document.addEventListener(

    "DOMContentLoaded",

    () => importStock.init()

);

export default importStock;
/* ==========================================================
   FILE EVENTS
========================================================== */

setupUI(){

    Sidebar.init();

    Navigation.init();

    this.bindFileEvents();

}

/* ==========================================================
   FILE
========================================================== */

bindFileEvents(){

    const input =
        document.getElementById("excelFile");

    const zone =
        document.getElementById("dropZone");

    if(input){

        input.addEventListener(

            "change",

            (e)=>{

                const file = e.target.files[0];

                if(file){

                    this.loadExcel(file);

                }

            }

        );

    }

    if(zone){

        zone.addEventListener(

            "dragover",

            (e)=>{

                e.preventDefault();

                zone.classList.add("dragover");

            }

        );

        zone.addEventListener(

            "dragleave",

            ()=>{

                zone.classList.remove("dragover");

            }

        );

        zone.addEventListener(

            "drop",

            (e)=>{

                e.preventDefault();

                zone.classList.remove("dragover");

                const file =
                    e.dataTransfer.files[0];

                if(file){

                    this.loadExcel(file);

                }

            }

        );

    }

}

/* ==========================================================
   LOAD EXCEL
========================================================== */

loadExcel(file){

    this.file = file;

    this.updateFileInfo(file);

    const reader = new FileReader();

    reader.onload = (event)=>{

        const data = new Uint8Array(

            event.target.result

        );

        this.workbook = XLSX.read(

            data,

            {

                type:"array"

            }

        );

        const firstSheet =

            this.workbook.SheetNames[0];

        this.sheet =

            this.workbook.Sheets[firstSheet];

        this.rows =

            XLSX.utils.sheet_to_json(

                this.sheet,

                {

                    defval:""

                }

            );

        this.updateExcelInfo(firstSheet);

        this.renderPreview();

    };

    reader.readAsArrayBuffer(file);

}

/* ==========================================================
   FILE INFO
========================================================== */

updateFileInfo(file){

    const name =
        document.getElementById("fileName");

    const size =
        document.getElementById("fileSize");

    if(name){

        name.textContent = file.name;

    }

    if(size){

        size.textContent =

            (file.size/1024).toFixed(2)

            +" KB";

    }

}

updateExcelInfo(sheet){

    const sheetName =
        document.getElementById("sheetName");

    const rows =
        document.getElementById("rowCount");

    if(sheetName){

        sheetName.textContent = sheet;

    }

    if(rows){

        rows.textContent =

            this.rows.length;

    }

}
/* ==========================================================
   PREVIEW
========================================================== */

renderPreview(){

    const tbody =

        document.getElementById(

            "previewTableBody"

        );

    if(!tbody) return;

    tbody.innerHTML = "";

    if(this.rows.length===0){

        tbody.innerHTML=`

            <tr>

                <td colspan="11"

                    class="empty-table">

                    Aucun fichier chargé.

                </td>

            </tr>

        `;

        return;

    }

    this.rows

        .slice(0,20)

        .forEach((row,index)=>{

            tbody.insertAdjacentHTML(

                "beforeend",

                `

                <tr>

                    <td>${index+1}</td>

                    <td>${row.Division ?? ""}</td>

                    <td>${row.Magasin ?? ""}</td>

                    <td>${row.Article ?? ""}</td>

                    <td>${row.Désignation ?? row.Designation ?? ""}</td>

                    <td>${row.Lot ?? ""}</td>

                    <td>${row.Quantité ?? row.Quantite ?? 0}</td>

                    <td>${row.Unité ?? row.Unite ?? ""}</td>

                    <td>${row.Type ?? ""}</td>

                    <td>${row.Groupe ?? ""}</td>

                    <td>${row.Qualité ?? row.Qualite ?? ""}</td>

                </tr>

                `

            );

        });

    this.updateSummary();

}

/* ==========================================================
   SUMMARY
========================================================== */

updateSummary(){

    const articles = new Set();

    const lots = new Set();

    const magasins = new Set();

    let total = 0;

    this.rows.forEach(row=>{

        if(row.Article){

            articles.add(

                row.Article

            );

        }

        if(row.Lot){

            lots.add(

                row.Lot

            );

        }

        if(row.Magasin){

            magasins.add(

                row.Magasin

            );

        }

        total += Number(

            row.Quantité ??

            row.Quantite ??

            0

        );

    });

    this.setValue(

        "summaryArticles",

        articles.size

    );

    this.setValue(

        "summaryLots",

        lots.size

    );

    this.setValue(

        "summaryMagasins",

        magasins.size

    );

    this.setValue(

        "summaryQuantity",

        total.toLocaleString(

            "fr-FR"

        )

    );

}

/* ==========================================================
   HELPERS
========================================================== */

setValue(id,value){

    const element =

        document.getElementById(id);

    if(element){

        element.textContent = value;

    }

}
/* ==========================================================
   COLUMN MAPPING
========================================================== */

mapRow(row){

    return{

        division:

            row.Division ??
            row["Division"] ??
            row["DIVISION"] ??
            "",

        magasin:

            row.Magasin ??
            row["Magasin"] ??
            row["MAGASIN"] ??
            row["Storage Location"] ??
            "",

        article:

            row.Article ??
            row["Article"] ??
            row["ARTICLE"] ??
            row["Material"] ??
            row["Code Article"] ??
            "",

        designation:

            row.Désignation ??
            row.Designation ??
            row["Désignation"] ??
            row["Designation"] ??
            row["Material Description"] ??
            "",

        lot:

            row.Lot ??
            row["Lot"] ??
            row["Batch"] ??
            "",

        quantite:Number(

            row.Quantité ??

            row.Quantite ??

            row["Quantité"] ??

            row["Quantite"] ??

            row["Stock"] ??

            row["Available Stock"] ??

            0

        ),

        unite:

            row.Unité ??

            row.Unite ??

            row["Unité"] ??

            row["Base Unit"] ??

            "",

        type:

            row.Type ??

            row["Type"] ??

            "",

        groupe:

            row.Groupe ??

            row["Groupe"] ??

            row["Material Group"] ??

            "",

        qualite:

            row.Qualité ??

            row.Qualite ??

            row["Qualité"] ??

            row["Qualite"] ??

            ""

    };

}

/* ==========================================================
   GET MAPPED ROWS
========================================================== */

getMappedRows(){

    return this.rows.map(

        row=>this.mapRow(row)

    );

}
/* ==========================================================
   IMPORT
========================================================== */

bindImportButton(){

    const button =

        document.getElementById(

            "startImportBtn"

        );

    if(!button) return;

    button.addEventListener(

        "click",

        ()=>this.startImport()

    );

}

/* ==========================================================
   START IMPORT
========================================================== */

async startImport(){

    try{

        if(this.rows.length===0){

            Toast.warning(

                "Import",

                "Aucun fichier sélectionné."

            );

            return;

        }

        Loader.show(

            "Importation...",

            "Traitement des données"

        );

        const data =

            this.getMappedRows();

        const result =

            await this.importData(

                data

            );

        this.updateReport(

            result

        );

        Toast.success(

            "Import",

            "Import terminé."

        );

    }

    catch(error){

        console.error(error);

        Toast.error(

            "Import",

            error.message

        );

    }

    finally{

        Loader.hide();

    }

}

/* ==========================================================
   API IMPORT
========================================================== */

async importData(data){

    return await Api.importStock({

        mode:this.importMode,

        rows:data

    });

}

/* ==========================================================
   REPORT
========================================================== */

updateReport(result){

    this.setValue(

        "addedCount",

        result?.added ?? 0

    );

    this.setValue(

        "updatedCount",

        result?.updated ?? 0

    );

    this.setValue(

        "deletedCount",

        result?.deleted ?? 0

    );

    this.setValue(

        "errorCount",

        result?.errors ?? 0

    );

}
/* ==========================================================
   IMPORT MODE
========================================================== */

bindImportMode(){

    document

        .querySelectorAll(

            "input[name='importMode']"

        )

        .forEach(radio=>{

            radio.addEventListener(

                "change",

                ()=>{

                    this.importMode =

                        radio.value;

                    this.updateSelectedMode();

                }

            );

        });

}

/* ==========================================================
   UPDATE MODE
========================================================== */

updateSelectedMode(){

    const element =

        document.getElementById(

            "selectedMode"

        );

    if(element){

        element.textContent =

            this.importMode

                .replaceAll(

                    "_",

                    " "

                );

    }

}

/* ==========================================================
   PROGRESS
========================================================== */

updateProgress(current,total){

    const percent =

        total===0

        ?0

        :Math.round(

            current*100/total

        );

    const bar =

        document.getElementById(

            "progressBar"

        );

    if(bar){

        bar.style.width =

            percent+"%";

    }

    this.setValue(

        "progressPercent",

        percent+"%"

    );

    this.setValue(

        "processedRows",

        current

    );

    this.setValue(

        "totalRowsImport",

        total

    );

}

/* ==========================================================
   HISTORY
========================================================== */

async loadHistory(){

    try{

        if(!Api.getImportHistory){

            return;

        }

        const history =

            await Api.getImportHistory();

        this.renderHistory(

            history

        );

    }

    catch(error){

        console.error(error);

    }

}

renderHistory(history=[]){

    const tbody =

        document.getElementById(

            "historyTableBody"

        );

    if(!tbody) return;

    tbody.innerHTML="";

    if(history.length===0){

        tbody.innerHTML=`

        <tr>

            <td colspan="10"

                class="empty-table">

                Aucun historique.

            </td>

        </tr>

        `;

        return;

    }

    history.forEach(item=>{

        tbody.insertAdjacentHTML(

            "beforeend",

            `

            <tr>

                <td>${item.date ?? "-"}</td>

                <td>${item.user ?? "-"}</td>

                <td>${item.file ?? "-"}</td>

                <td>${item.mode ?? "-"}</td>

                <td>${item.rows ?? 0}</td>

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

async refresh(){

    await this.loadHistory();

}

/* ==========================================================
   DESTROY
========================================================== */

destroy(){

    this.file = null;

    this.rows = [];

    this.sheet = null;

    this.workbook = null;

}
/* ==========================================================
   PART 7
   EVENTS + MODALS + HELPERS
========================================================== */

/* ===========================
   BUTTONS
=========================== */

bindButtons(){

    document

        .getElementById("cancelImportBtn")

        ?.addEventListener(

            "click",

            ()=>this.cancelImport()

        );

    document

        .getElementById("downloadReportBtn")

        ?.addEventListener(

            "click",

            ()=>this.downloadReport()

        );

    document

        .getElementById("finishImportBtn")

        ?.addEventListener(

            "click",

            ()=>this.finish()

        );

    document

        .getElementById("refreshHistoryBtn")

        ?.addEventListener(

            "click",

            ()=>this.loadHistory()

        );

}

/* ===========================
   CANCEL
=========================== */

cancelImport(){

    this.file = null;

    this.rows = [];

    this.workbook = null;

    this.sheet = null;

    const input =

        document.getElementById(

            "excelFile"

        );

    if(input){

        input.value = "";

    }

    this.renderPreview();

    this.updateProgress(0,0);

    Toast.info(

        "Import",

        "Import annulé."

    );

}

/* ===========================
   DOWNLOAD REPORT
=========================== */

downloadReport(){

    Toast.info(

        "Rapport",

        "Fonction disponible après connexion avec l'API."

    );

}

/* ===========================
   FINISH
=========================== */

finish(){

    window.location.href =

        "../stock/stock.html";

}

/* ===========================
   MODALS
=========================== */

openModal(id){

    document

        .getElementById(id)

        ?.classList

        .add("show");

}

closeModal(id){

    document

        .getElementById(id)

        ?.classList

        .remove("show");

}

bindModals(){

    document

        .querySelectorAll(

            ".modal-close"

        )

        .forEach(button=>{

            button.addEventListener(

                "click",

                ()=>{

                    button

                        .closest(".modal")

                        ?.classList

                        .remove("show");

                }

            );

        });

}

/* ===========================
   LOADER
=========================== */

showLoader(text="Chargement..."){

    const loader =

        document.getElementById(

            "pageLoader"

        );

    const label =

        document.getElementById(

            "loaderText"

        );

    if(label){

        label.textContent = text;

    }

    if(loader){

        loader.style.display="flex";

    }

}

hideLoader(){

    const loader =

        document.getElementById(

            "pageLoader"

        );

    if(loader){

        loader.style.display="none";

    }

}
