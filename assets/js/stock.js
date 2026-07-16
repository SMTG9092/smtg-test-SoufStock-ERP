/**
 * ============================================================
 * SoufStock Enterprise ERP/WMS
 * File : assets/js/stock.js
 * ============================================================
 */

"use strict";

import Api from "./core/api.js";
import SessionManager from "./core/session.js";
import ThemeManager from "./core/theme.js";
import LanguageManager from "./core/language.js";
import { Loader, Toast } from "./core/utils.js";

class StockManager {

    constructor() {

        this.rows = [];
        this.filteredRows = [];

        this.currentPage = 1;
        this.pageSize = 20;

        this.cacheDOM();

        this.initialize();

    }

    /* ==========================================================
       INITIALIZE
    ========================================================== */

    async initialize() {

        try {

            Loader.show();

            await SessionManager.initialize();

            ThemeManager.initialize();

            LanguageManager.initialize();

            this.bindEvents();

            await this.loadStock();

        }

        catch (error) {

            console.error(error);

            Toast.error(error.message);

        }

        finally {

            Loader.hide();

        }

    }

    /* ==========================================================
       DOM
    ========================================================== */

    cacheDOM() {

        this.tableBody =
            document.getElementById("stockTableBody");

        this.searchInput =
            document.getElementById("searchInput");

        this.filterMagasin =
            document.getElementById("filterMagasin");

        this.filterEmplacement =
            document.getElementById("filterEmplacement");

        this.filterUnite =
            document.getElementById("filterUnite");

    }

    /* ==========================================================
       EVENTS
    ========================================================== */

    bindEvents() {

        this.searchInput?.addEventListener(

            "input",

            () => this.applyFilters()

        );

        this.filterMagasin?.addEventListener(

            "change",

            () => this.applyFilters()

        );

        this.filterEmplacement?.addEventListener(

            "change",

            () => this.applyFilters()

        );

        this.filterUnite?.addEventListener(

            "change",

            () => this.applyFilters()

        );

        document
            .getElementById("refreshBtn")
            ?.addEventListener(

                "click",

                () => this.loadStock()

            );

    }

    /* ==========================================================
       LOAD STOCK
    ========================================================== */

    async loadStock() {

        Loader.show();

        try {

            const result = await Api.select(

                "stock",

                `
                id,
                article,
                designation_article,
                lot,
                magasin,
                emplacement,
                unite,
                stock_disponible,
                created_at
                `,

                {

                    order: {

                        col: "article",

                        asc: true

                    }

                }

            );

            if (!result.success)

                throw new Error(result.error);

            this.rows = result.data || [];

            this.filteredRows = [...this.rows];

            this.loadFilters();

            this.updateCards();

            this.renderTable();

        }

        catch (error) {

            Toast.error(error.message);

        }

        finally {

            Loader.hide();

        }

    }

}

document.addEventListener(

    "DOMContentLoaded",

    () => {

        new StockManager();

    }

);
/* ==========================================================
   LOAD FILTERS
========================================================== */

loadFilters() {

    const magasins = [...new Set(
        this.rows
            .map(r => r.magasin)
            .filter(Boolean)
    )].sort();

    const emplacements = [...new Set(
        this.rows
            .map(r => r.emplacement)
            .filter(Boolean)
    )].sort();

    this.filterMagasin.innerHTML =
        `<option value="">Tous les magasins</option>`;

    magasins.forEach(m => {

        this.filterMagasin.insertAdjacentHTML(

            "beforeend",

            `<option value="${m}">${m}</option>`

        );

    });

    this.filterEmplacement.innerHTML =
        `<option value="">Tous les emplacements</option>`;

    emplacements.forEach(e => {

        this.filterEmplacement.insertAdjacentHTML(

            "beforeend",

            `<option value="${e}">${e}</option>`

        );

    });

}

/* ==========================================================
   FILTERS
========================================================== */

applyFilters() {

    const search =
        this.searchInput.value
            .toLowerCase()
            .trim();

    const magasin =
        this.filterMagasin.value;

    const emplacement =
        this.filterEmplacement.value;

    const unite =
        this.filterUnite.value;

    this.filteredRows = this.rows.filter(row => {

        const matchSearch =

            !search ||

            row.article
                ?.toLowerCase()
                .includes(search) ||

            row.designation_article
                ?.toLowerCase()
                .includes(search) ||

            row.lot
                ?.toLowerCase()
                .includes(search);

        const matchMagasin =

            !magasin ||

            row.magasin === magasin;

        const matchEmplacement =

            !emplacement ||

            row.emplacement === emplacement;

        const matchUnite =

            !unite ||

            row.unite === unite;

        return (

            matchSearch &&

            matchMagasin &&

            matchEmplacement &&

            matchUnite

        );

    });

    this.currentPage = 1;

    this.updateCards();

    this.renderTable();

}

/* ==========================================================
   SUMMARY
========================================================== */

updateCards() {

    document.getElementById("totalArticles").textContent =

        this.filteredRows.length;

    document.getElementById("totalLots").textContent =

        new Set(

            this.filteredRows.map(x => x.lot)

        ).size;

    document.getElementById("totalMagasins").textContent =

        new Set(

            this.filteredRows.map(x => x.magasin)

        ).size;

    const total =

        this.filteredRows.reduce(

            (sum, row) =>

                sum +

                Number(

                    row.stock_disponible || 0

                ),

            0

        );

    document.getElementById("totalDisponible").textContent =

        total.toLocaleString("fr-FR");

}

/* ==========================================================
   TABLE
========================================================== */

renderTable() {

    this.tableBody.innerHTML = "";

    if (!this.filteredRows.length) {

        this.tableBody.innerHTML = `

            <tr>

                <td colspan="7" class="empty">

                    Aucun stock disponible.

                </td>

            </tr>

        `;

        return;

    }

    const start =

        (this.currentPage - 1)

        * this.pageSize;

    const rows =

        this.filteredRows.slice(

            start,

            start + this.pageSize

        );

    rows.forEach(row => {

        this.tableBody.insertAdjacentHTML(

            "beforeend",

            `

            <tr>

                <td>${row.article}</td>

                <td>${row.designation_article}</td>

                <td>${row.lot}</td>

                <td>${row.magasin}</td>

                <td>${row.emplacement ?? "-"}</td>

                <td>

                    <span class="stock-value">

                        ${Number(

                            row.stock_disponible

                        ).toLocaleString("fr-FR")}

                    </span>

                    <span class="stock-unit">

                        ${row.unite}

                    </span>

                </td>

                <td>

                    <div class="action-group">

                        <button

                            class="action-btn btn-details"

                            data-id="${row.id}"

                            title="Voir">

                            <i class="fa-solid fa-eye"></i>

                        </button>

                    </div>

                </td>

            </tr>

            `

        );

    });

}
/* ==========================================================
   PAGINATION
========================================================== */

updatePagination() {

    const totalPages = Math.max(
        1,
        Math.ceil(
            this.filteredRows.length / this.pageSize
        )
    );

    const start =
        (this.currentPage - 1) * this.pageSize + 1;

    const end = Math.min(
        this.currentPage * this.pageSize,
        this.filteredRows.length
    );

    document.getElementById("currentPage").textContent =
        `${this.currentPage} / ${totalPages}`;

    document.getElementById("paginationInfo").textContent =
        `Affichage ${start} - ${end} sur ${this.filteredRows.length}`;

}

nextPage() {

    const totalPages = Math.ceil(
        this.filteredRows.length / this.pageSize
    );

    if (this.currentPage < totalPages) {

        this.currentPage++;

        this.renderTable();

        this.updatePagination();

    }

}

previousPage() {

    if (this.currentPage > 1) {

        this.currentPage--;

        this.renderTable();

        this.updatePagination();

    }

}

/* ==========================================================
   DETAILS
========================================================== */

bindTableEvents() {

    this.tableBody.addEventListener(

        "click",

        (event) => {

            const btn = event.target.closest(".btn-details");

            if (!btn) return;

            const id = Number(btn.dataset.id);

            this.openDetails(id);

        }

    );

}

openDetails(id) {

    const row = this.rows.find(
        x => x.id === id
    );

    if (!row) return;

    document.getElementById("dArticle").textContent =
        row.article;

    document.getElementById("dDesignation").textContent =
        row.designation_article;

    document.getElementById("dLot").textContent =
        row.lot;

    document.getElementById("dMagasin").textContent =
        row.magasin;

    document.getElementById("dEmplacement").textContent =
        row.emplacement ?? "-";

    document.getElementById("dDisponible").textContent =

        Number(row.stock_disponible)
            .toLocaleString("fr-FR") +

        " " +

        row.unite;

    document.getElementById("stockDrawer")
        .classList.add("open");

}

closeDetails() {

    document
        .getElementById("stockDrawer")
        .classList.remove("open");

}

/* ==========================================================
   EXPORT
========================================================== */

exportExcel() {

    const rows = this.filteredRows.map(r => ({

        Article: r.article,

        Designation: r.designation_article,

        Lot: r.lot,

        Magasin: r.magasin,

        Emplacement: r.emplacement,

        Disponible: r.stock_disponible,

        Unite: r.unite

    }));

    const ws = XLSX.utils.json_to_sheet(rows);

    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
        wb,
        ws,
        "Stock"
    );

    XLSX.writeFile(
        wb,
        "Stock_Disponible.xlsx"
    );

}

/* ==========================================================
   PRINT
========================================================== */

printTable() {

    window.print();

}

/* ==========================================================
   EVENTS
========================================================== */

bindActions() {

    document
        .getElementById("nextPageBtn")
        ?.addEventListener(
            "click",
            () => this.nextPage()
        );

    document
        .getElementById("prevPageBtn")
        ?.addEventListener(
            "click",
            () => this.previousPage()
        );

    document
        .getElementById("closeDrawer")
        ?.addEventListener(
            "click",
            () => this.closeDetails()
        );

    document
        .getElementById("exportExcelBtn")
        ?.addEventListener(
            "click",
            () => this.exportExcel()
        );

    document
        .getElementById("printBtn")
        ?.addEventListener(
            "click",
            () => this.printTable()
        );

    this.bindTableEvents();

}
/* ==========================================================
   RESET FILTERS
========================================================== */

resetFilters() {

    this.searchInput.value = "";

    this.filterMagasin.value = "";

    this.filterEmplacement.value = "";

    this.filterUnite.value = "";

    this.filteredRows = [...this.rows];

    this.currentPage = 1;

    this.updateCards();

    this.renderTable();

    this.updatePagination();

}

/* ==========================================================
   DRAWER
========================================================== */

showDrawer() {

    document
        .getElementById("drawerOverlay")
        ?.classList.add("show");

    document
        .getElementById("stockDrawer")
        ?.classList.add("open");

}

hideDrawer() {

    document
        .getElementById("drawerOverlay")
        ?.classList.remove("show");

    document
        .getElementById("stockDrawer")
        ?.classList.remove("open");

}

/* ==========================================================
   REFRESH
========================================================== */

async refresh() {

    await this.loadStock();

    Toast.success(

        "Stock actualisé."

    );

}

/* ==========================================================
   EVENTS
========================================================== */

bindExtraEvents() {

    document
        .getElementById("btnReset")
        ?.addEventListener(

            "click",

            () => this.resetFilters()

        );

    document
        .getElementById("refreshBtn")
        ?.addEventListener(

            "click",

            () => this.refresh()

        );

    document
        .getElementById("drawerOverlay")
        ?.addEventListener(

            "click",

            () => this.hideDrawer()

        );

}

/* ==========================================================
   LOADER
========================================================== */

startLoading() {

    Loader.show();

}

stopLoading() {

    Loader.hide();

}

/* ==========================================================
   MESSAGE
========================================================== */

success(message) {

    Toast.success(message);

}

error(message) {

    Toast.error(message);

}

/* ==========================================================
   FORMAT NUMBER
========================================================== */

formatNumber(value) {

    return Number(value || 0)

        .toLocaleString(

            "fr-FR",

            {

                minimumFractionDigits:3,

                maximumFractionDigits:3

            }

        );

}

/* ==========================================================
   FORMAT DATE
========================================================== */

formatDate(date) {

    if (!date)

        return "-";

    return new Date(date)

        .toLocaleString(

            "fr-FR"

        );

}

/* ==========================================================
   INIT
========================================================== */

initializeUI() {

    this.bindEvents();

    this.bindActions();

    this.bindExtraEvents();

    this.updateCards();

    this.updatePagination();

}

/* ==========================================================
   START
========================================================== */

async start() {

    try {

        this.startLoading();

        await this.loadStock();

        this.initializeUI();

    }

    catch(error){

        this.error(error.message);

    }

    finally{

        this.stopLoading();

    }

}

}

/* ==========================================================
   APP
========================================================== */

document.addEventListener(

    "DOMContentLoaded",

    async () => {

        const app =

            new StockManager();

        await app.start();

    }

);
