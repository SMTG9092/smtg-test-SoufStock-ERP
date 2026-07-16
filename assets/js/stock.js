/**
 * ============================================================
 * SoufStock Enterprise ERP/WMS
 * File : assets/js/stock.js
 * ============================================================
 */

"use strict";

import APP_CONFIG from "./core/config.js";
import Api from "./core/api.js";
import SessionManager from "./core/session.js";
import ThemeManager from "./core/theme.js";
import LanguageManager from "./core/language.js";
import Sidebar from "./core/sidebar.js";
import Navigation from "./core/navigation.js";
import Profile from "./core/profile.js";
import Notifications from "./core/notifications.js";
import { Loader, Toast } from "./core/utils.js";

class StockController {

    constructor() {

        this.stock = [];

        this.filteredStock = [];

        this.currentPage = 1;

        this.rowsPerPage = 25;

        this.initialized = false;

    }

    /* ============================================================
       INIT
    ============================================================ */

    async init() {

        try {

            Loader.show(
                "Chargement...",
                "Initialisation du Stock..."
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

            await Promise.all([

                Profile.load(),

                Sidebar.init(),

                Navigation.init(),

                Notifications.init()

            ]);

            this.setupUI();

            await this.loadStock();

            this.initialized = true;

            Loader.hide();

            console.log(
                "[Stock] Initialisé."
            );

        }

        catch (error) {

            console.error(error);

            Loader.hide();

            Toast.error(
                "Stock",
                error.message
            );

        }

    }

    /* ============================================================
       UI
    ============================================================ */

    setupUI() {

        document

            .getElementById("btnRefresh")

            ?.addEventListener(

                "click",

                () => this.refresh()

            );

        document

            .getElementById("searchInput")

            ?.addEventListener(

                "input",

                () => this.applyFilters()

            );

        document

            .getElementById("filterArticle")

            ?.addEventListener(

                "change",

                () => this.applyFilters()

            );

        document

            .getElementById("filterMagasin")

            ?.addEventListener(

                "change",

                () => this.applyFilters()

            );

        document

            .getElementById("filterLot")

            ?.addEventListener(

                "input",

                () => this.applyFilters()

            );

        document

            .getElementById("btnExport")

            ?.addEventListener(

                "click",

                () => this.exportExcel()

            );

        document

            .getElementById("btnPrint")

            ?.addEventListener(

                "click",

                () => this.print()

            );

        document

            .getElementById("closeStockModal")

            ?.addEventListener(

                "click",

                () => this.closeModal()

            );

        document

            .getElementById("closeModalFooter")

            ?.addEventListener(

                "click",

                () => this.closeModal()

            );

        document

            .getElementById("stockModal")

            ?.addEventListener(

                "click",

                (e) => {

                    if (

                        e.target.id ===

                        "stockModal"

                    ) {

                        this.closeModal();

                    }

                }

            );

    }

    /* ============================================================
       REFRESH
    ============================================================ */

    async refresh() {

        await this.loadStock();

        Toast.success(

            "Stock",

            "Données actualisées."

        );

    }

}
    /* ============================================================
       LOAD STOCK
    ============================================================ */

    async loadStock() {

        try {

            Loader.show(

                "Chargement...",

                "Lecture du stock..."

            );

            this.stock = await Api.getStock();

            this.filteredStock = [

                ...this.stock

            ];

            this.currentPage = 1;

            this.renderCards();

            this.fillFilters();

            this.renderTable();

            this.renderPagination();

            Loader.hide();

        }

        catch (error) {

            Loader.hide();

            console.error(error);

            Toast.error(

                "Stock",

                error.message

            );

        }

    }

    /* ============================================================
       KPI
    ============================================================ */

    renderCards() {

        const totalStock =

            this.filteredStock.reduce(

                (sum, row) =>

                    sum +

                    Number(

                        row.stock_disponible || 0

                    ),

                0

            );

        const articles =

            new Set(

                this.filteredStock.map(

                    r => r.article

                )

            ).size;

        const lots =

            new Set(

                this.filteredStock.map(

                    r => r.lot

                )

            ).size;

        const magasins =

            new Set(

                this.filteredStock.map(

                    r => r.magasin

                )

            ).size;

        document.getElementById(

            "stockTotal"

        ).textContent =

            totalStock.toLocaleString(

                "fr-FR",

                {

                    minimumFractionDigits:3,

                    maximumFractionDigits:3

                }

            );

        document.getElementById(

            "totalArticles"

        ).textContent = articles;

        document.getElementById(

            "totalLots"

        ).textContent = lots;

        document.getElementById(

            "totalMagasins"

        ).textContent = magasins;

    }

    /* ============================================================
       TABLE
    ============================================================ */

    renderTable() {

        const tbody =

            document.getElementById(

                "stockTableBody"

            );

        tbody.innerHTML = "";

        const start =

            (

                this.currentPage - 1

            ) * this.rowsPerPage;

        const rows =

            this.filteredStock.slice(

                start,

                start +

                this.rowsPerPage

            );

        if (

            rows.length === 0

        ) {

            tbody.innerHTML =

            `

            <tr>

                <td colspan="8"

                    class="empty-row">

                    Aucun résultat.

                </td>

            </tr>

            `;

            return;

        }

        rows.forEach(

            (item,index)=>{

                tbody.insertAdjacentHTML(

                    "beforeend",

                    `

                    <tr>

                        <td>

                            ${start+index+1}

                        </td>

                        <td>

                            ${item.article}

                        </td>

                        <td>

                            ${item.designation_article}

                        </td>

                        <td>

                            ${item.lot}

                        </td>

                        <td>

                            ${item.magasin}

                        </td>

                        <td>

                            ${Number(

                                item.stock_disponible

                            ).toLocaleString(

                                "fr-FR",

                                {

                                    minimumFractionDigits:3,

                                    maximumFractionDigits:3

                                }

                            )}

                        </td>

                        <td>

                            ${item.unite}

                        </td>

                        <td>

                            <div class="action-buttons">

                                <button

                                    class="action-btn view"

                                    data-index="${start+index}">

                                    <i class="fa-solid fa-eye"></i>

                                </button>

                            </div>

                        </td>

                    </tr>

                    `

                );

            }

        );

        document.querySelectorAll(

            ".action-btn.view"

        ).forEach(

            btn=>{

                btn.addEventListener(

                    "click",

                    ()=>{

                        this.showDetails(

                            this.filteredStock[

                                btn.dataset.index

                            ]

                        );

                    }

                );

            }

        );

        document.getElementById(

            "tableCount"

        ).textContent =

            `${this.filteredStock.length} lignes`;

    }

    /* ============================================================
       FILTERS
    ============================================================ */

    fillFilters() {

        const article =

            document.getElementById(

                "filterArticle"

            );

        const magasin =

            document.getElementById(

                "filterMagasin"

            );

        article.innerHTML =

            `<option value="">Tous</option>`;

        magasin.innerHTML =

            `<option value="">Tous</option>`;

        [

            ...new Set(

                this.stock.map(

                    r=>r.article

                )

            )

        ]

        .sort()

        .forEach(

            value=>{

                article.insertAdjacentHTML(

                    "beforeend",

                    `<option>${value}</option>`

                );

            }

        );

        [

            ...new Set(

                this.stock.map(

                    r=>r.magasin

                )

            )

        ]

        .sort()

        .forEach(

            value=>{

                magasin.insertAdjacentHTML(

                    "beforeend",

                    `<option>${value}</option>`

                );

            }

        );

    }

    /* ============================================================
       PAGINATION
    ============================================================ */

    renderPagination() {

        const pagination =

            document.getElementById(

                "pagination"

            );

        pagination.innerHTML = "";

        const pages =

            Math.ceil(

                this.filteredStock.length /

                this.rowsPerPage

            );

        for(

            let i=1;

            i<=pages;

            i++

        ){

            pagination.insertAdjacentHTML(

                "beforeend",

                `

                <button

                    class="${

                        i===this.currentPage

                        ? "active"

                        : ""

                    }"

                    data-page="${i}">

                    ${i}

                </button>

                `

            );

        }

        pagination

        .querySelectorAll(

            "button"

        )

        .forEach(

            btn=>{

                btn.onclick=()=>{

                    this.currentPage=

                        Number(

                            btn.dataset.page

                        );

                    this.renderTable();

                    this.renderPagination();

                };

            }

        );

        document.getElementById(

            "paginationInfo"

        ).textContent =

            `${this.filteredStock.length} résultat(s)`;

    }
    /* ============================================================
       APPLY FILTERS
    ============================================================ */

    applyFilters() {

        const search = document
            .getElementById("searchInput")
            .value
            .trim()
            .toLowerCase();

        const article = document
            .getElementById("filterArticle")
            .value;

        const magasin = document
            .getElementById("filterMagasin")
            .value;

        const lot = document
            .getElementById("filterLot")
            .value
            .trim()
            .toLowerCase();

        this.filteredStock = this.stock.filter(row => {

            const matchSearch =

                search === "" ||

                row.article?.toLowerCase().includes(search) ||

                row.designation_article?.toLowerCase().includes(search) ||

                row.lot?.toLowerCase().includes(search);

            const matchArticle =

                article === "" ||

                row.article === article;

            const matchMagasin =

                magasin === "" ||

                row.magasin === magasin;

            const matchLot =

                lot === "" ||

                row.lot?.toLowerCase().includes(lot);

            return (

                matchSearch &&

                matchArticle &&

                matchMagasin &&

                matchLot

            );

        });

        this.currentPage = 1;

        this.renderCards();

        this.renderTable();

        this.renderPagination();

    }

    /* ============================================================
       DETAILS
    ============================================================ */

    showDetails(item) {

        document.getElementById("detailArticle").textContent =
            item.article || "-";

        document.getElementById("detailDesignation").textContent =
            item.designation_article || "-";

        document.getElementById("detailLot").textContent =
            item.lot || "-";

        document.getElementById("detailMagasin").textContent =
            item.magasin || "-";

        document.getElementById("detailDivision").textContent =
            item.division || "-";

        document.getElementById("detailStock").textContent =
            Number(item.stock_disponible || 0)
            .toLocaleString("fr-FR",{
                minimumFractionDigits:3,
                maximumFractionDigits:3
            });

        document.getElementById("detailUnite").textContent =
            item.unite || "-";

        document.getElementById("detailType").textContent =
            item.type_article || "-";

        document.getElementById("detailGroupe").textContent =
            item.groupe_article || "-";

        document.getElementById("detailDocument").textContent =
            item.document_article || "-";

        document.getElementById("detailDateEntree").textContent =
            item.date_entree || "-";

        document.getElementById("detailStatut").textContent =
            item.statut || "Disponible";

        const modal =
            document.getElementById("stockModal");

        modal.hidden = false;

        modal.classList.add("show");

    }

    /* ============================================================
       CLOSE MODAL
    ============================================================ */

    closeModal() {

        const modal =
            document.getElementById("stockModal");

        modal.classList.remove("show");

        setTimeout(() => {

            modal.hidden = true;

        },250);

    }

    /* ============================================================
       EXPORT EXCEL
    ============================================================ */

    exportExcel() {

        if(typeof XLSX === "undefined"){

            Toast.warning(

                "Export",

                "SheetJS n'est pas chargé."

            );

            return;

        }

        const ws = XLSX.utils.json_to_sheet(

            this.filteredStock

        );

        const wb = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(

            wb,

            ws,

            "Stock"

        );

        XLSX.writeFile(

            wb,

            "Stock.xlsx"

        );

    }

    /* ============================================================
       PRINT TABLE
    ============================================================ */

    print() {

        window.print();

    }

    /* ============================================================
       PRINT FICHE
    ============================================================ */

    printFiche() {

        window.print();

    }
    /* ============================================================
       HELPERS
    ============================================================ */

    formatNumber(value) {

        return Number(value || 0).toLocaleString(

            "fr-FR",

            {

                minimumFractionDigits: 3,

                maximumFractionDigits: 3

            }

        );

    }

    formatDate(value) {

        if (!value) return "-";

        return new Date(value)

            .toLocaleDateString("fr-FR");

    }

    /* ============================================================
       GETTERS
    ============================================================ */

    getStock() {

        return this.stock;

    }

    getFilteredStock() {

        return this.filteredStock;

    }

    /* ============================================================
       DESTROY
    ============================================================ */

    destroy() {

        console.log(

            "[Stock] Ressources libérées."

        );

    }

}

/* ============================================================
   INSTANCE
============================================================ */

const stock =

    new StockController();

/* ============================================================
   DOM READY
============================================================ */

document.addEventListener(

    "DOMContentLoaded",

    () => {

        stock.init();

    }

);

/* ============================================================
   BEFORE UNLOAD
============================================================ */

window.addEventListener(

    "beforeunload",

    () => {

        stock.destroy();

    }

);

/* ============================================================
   EXPORT
============================================================ */

export default stock;
