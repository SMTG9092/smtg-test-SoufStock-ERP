/**
 * ============================================================
 * SoufStock Enterprise ERP
 * Charts Manager - Optimized for Dynamic Data
 * ============================================================
 */

import Api from "./api.js"; // تأكد من صحة مسار الاستيراد
import { Toast } from "./utils.js";

class ChartsManager {
    constructor() {
        this.charts = {}; // مخزن لجميع الـ Instances الخاصة بالرسوم البيانية
    }

    /**
     * تدمير الرسم البياني قبل إعادة إنشائه لمنع التداخل
     */
    destroy(name) {
        if (this.charts[name]) {
            this.charts[name].destroy();
            delete this.charts[name];
        }
    }

    /**
     * إعادة رسم جميع الرسوم البيانية (يُستدعى عند التحديث)
     */
    async renderAll() {
        try {
            await Promise.all([
                this.renderStockChart(),
                this.renderCommandesChart()
            ]);
        } catch (error) {
            console.error("[Charts] Error rendering:", error);
            Toast.error("Graphiques", "Erreur lors du chargement des graphiques");
        }
    }

    /**
     * رسم بياني: إجمالي المخزون حسب المستودع
     */
    async renderStockChart() {
        this.destroy("stock");
        
        const { data: rows, error } = await Api.select("stock", "magasin,quantite");
        if (error) throw error;

        const dataMap = rows.reduce((acc, row) => {
            const key = row.magasin || "N/A";
            acc[key] = (acc[key] || 0) + Number(row.quantite || 0);
            return acc;
        }, {});

        const canvas = document.getElementById("stockChart");
        if (!canvas) return;

        this.charts.stock = new Chart(canvas, {
            type: "bar",
            data: {
                labels: Object.keys(dataMap),
                datasets: [{
                    label: "Quantité en Stock",
                    data: Object.values(dataMap),
                    backgroundColor: "#16a34a",
                    borderRadius: 6
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    /**
     * رسم بياني دائري: حالة الطلبات
     */
    async renderCommandesChart() {
        this.destroy("commandes");

        const { data: rows, error } = await Api.select("commandes_excel", "statut");
        if (error) throw error;

        const dataMap = rows.reduce((acc, row) => {
            const key = row.statut || "N/A";
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});

        const canvas = document.getElementById("commandesChart");
        if (!canvas) return;

        this.charts.commandes = new Chart(canvas, {
            type: "doughnut",
            data: {
                labels: Object.keys(dataMap),
                datasets: [{
                    data: Object.values(dataMap),
                    backgroundColor: ["#f59e0b", "#3b82f6", "#10b981", "#ef4444"]
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    destroyAll() {
        Object.keys(this.charts).forEach(key => this.destroy(key));
    }
}

const Charts = new ChartsManager();
export default Charts;
