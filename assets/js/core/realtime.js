/**
 * ============================================================
 * SoufStock Enterprise ERP
 * realtime.js
 * ============================================================
 */

import supabase from "./supabase.js";
import DashboardData from "./dashboard-data.js";
import Charts from "./charts.js";
import Notifications from "./notifications.js";

class RealtimeManager {

    constructor() {

        this.supabase = AuthManager.supabase;

        this.channels = [];

    }

    /* ============================================================
     * INIT
     * ============================================================
     */

    init() {

        this.subscribeStock();

        this.subscribeCommandes();

        this.subscribePicking();

        this.subscribeExpeditions();

        this.subscribeMovements();

    }

    /* ============================================================
     * CHANNEL
     * ============================================================
     */

    createChannel(name, table, callback, event = "*") {

        const channel = this.supabase

            .channel(name)

            .on(

                "postgres_changes",

                {

                    event,

                    schema: "public",

                    table

                },

                callback

            )

            .subscribe();

        this.channels.push(channel);

    }

    /* ============================================================
     * STOCK
     * ============================================================
     */

    subscribeStock() {

        this.createChannel(

            "stock",

            "stock",

            async () => {

                await DashboardData.refresh();

                await Charts.refresh();

                Notifications.add(

                    "Stock",

                    "Le stock a été mis à jour.",

                    "info"

                );

            }

        );

    }

    /* ============================================================
     * COMMANDES
     * ============================================================
     */

    subscribeCommandes() {

        this.createChannel(

            "commandes",

            "commandes_excel",

            async () => {

                await DashboardData.refresh();

                await Charts.refresh();

                Notifications.add(

                    "Commandes",

                    "Les commandes ont été mises à jour.",

                    "success"

                );

            }

        );

    }

    /* ============================================================
     * PICKING
     * ============================================================
     */

    subscribePicking() {

        this.createChannel(

            "picking",

            "picking",

            async () => {

                await DashboardData.refresh();

            }

        );

    }

    /* ============================================================
     * EXPEDITIONS
     * ============================================================
     */

    subscribeExpeditions() {

        this.createChannel(

            "expeditions",

            "expeditions",

            async () => {

                await DashboardData.refresh();

            }

        );

    }

    /* ============================================================
     * MOUVEMENTS
     * ============================================================
     */

    subscribeMovements() {

        this.createChannel(

            "mouvements",

            "mouvements_stock",

            async payload => {

                await DashboardData.refresh();

                Notifications.add(

                    "Nouveau mouvement",

                    payload.new.article ||

                    "Nouvelle opération",

                    "info"

                );

            },

            "INSERT"

        );

    }

    /* ============================================================
     * REFRESH
     * ============================================================
     */

    async refresh() {

        await DashboardData.refresh();

        await Charts.refresh();

    }

    /* ============================================================
     * STOP
     * ============================================================
     */

    destroy() {

        this.channels.forEach(channel => {

            this.supabase.removeChannel(channel);

        });

        this.channels = [];

    }

    /* ============================================================
     * STATUS
     * ============================================================
     */

    isRunning() {

        return this.channels.length > 0;

    }

}

const Realtime = new RealtimeManager();

export default Realtime;
