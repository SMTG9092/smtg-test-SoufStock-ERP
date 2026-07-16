/**
 * ============================================================
 * SoufStock Enterprise ERP/WMS
 * File : assets/js/core/api.js
 * ============================================================
 */

"use strict";

import supabase, { getUser } from "./supabase.js";
import * as Permissions from "./permissions.js";

/**
 * ============================================================
 * Structure de réponse standardisée
 * ============================================================
 */

const apiResponse = (
    success,
    data = null,
    error = null
) => ({
    success,
    data,
    error
});

/* ============================================================
   MOTEUR DE REQUÊTES GÉNÉRIQUES (CRUD)
============================================================ */

/**
 * Effectue une requête de lecture (SELECT)
 */
async function select(
    table,
    fields = "*",
    options = {},
    requiredPermission = null
) {

    if (
        requiredPermission &&
        !Permissions.can(requiredPermission)
    ) {
        return apiResponse(
            false,
            null,
            `Accès refusé : Permission '${requiredPermission}' requise.`
        );
    }

    try {

        let query = supabase
            .from(table)
            .select(fields);

        if (options.eq) {

            Object.entries(options.eq).forEach(([key, value]) => {

                if (value !== undefined && value !== null) {

                    query = query.eq(key, value);

                }

            });

        }

        if (options.ilike) {

            Object.entries(options.ilike).forEach(([key, value]) => {

                if (value) {

                    query = query.ilike(key, `%${value}%`);

                }

            });

        }

        if (options.order) {

            query = query.order(
                options.order.col,
                {
                    ascending: options.order.asc ?? true
                }
            );

        }

        if (options.limit) {

            query = query.limit(options.limit);

        }

        const { data, error } = await query;

        if (error) throw error;

        return apiResponse(true, data);

    }

    catch (err) {

        console.error("[API SELECT]", err);

        return apiResponse(false, null, err.message);

    }

}

/**
 * INSERT
 */
async function insert(
    table,
    payload,
    requiredPermission = null
) {

    if (
        requiredPermission &&
        !Permissions.can(requiredPermission)
    ) {
        return apiResponse(
            false,
            null,
            `Accès refusé : Permission '${requiredPermission}' requise.`
        );
    }

    try {

        const { data, error } = await supabase
            .from(table)
            .insert(payload)
            .select();

        if (error) throw error;

        return apiResponse(true, data);

    }

    catch (err) {

        console.error("[API INSERT]", err);

        return apiResponse(false, null, err.message);

    }

}

/**
 * UPDATE
 */
async function update(
    table,
    id,
    payload,
    requiredPermission = null
) {

    if (
        requiredPermission &&
        !Permissions.can(requiredPermission)
    ) {
        return apiResponse(
            false,
            null,
            `Accès refusé : Permission '${requiredPermission}' requise.`
        );
    }

    try {

        const { data, error } = await supabase
            .from(table)
            .update(payload)
            .eq("id", id)
            .select();

        if (error) throw error;

        return apiResponse(true, data);

    }

    catch (err) {

        console.error("[API UPDATE]", err);

        return apiResponse(false, null, err.message);

    }

}

/**
 * DELETE
 */
async function remove(
    table,
    id,
    requiredPermission = null
) {

    if (
        requiredPermission &&
        !Permissions.can(requiredPermission)
    ) {
        return apiResponse(
            false,
            null,
            `Accès refusé : Permission '${requiredPermission}' requise.`
        );
    }

    try {

        const { data, error } = await supabase
            .from(table)
            .delete()
            .eq("id", id)
            .select();

        if (error) throw error;

        return apiResponse(true, data);

    }

    catch (err) {

        console.error("[API DELETE]", err);

        return apiResponse(false, null, err.message);

    }

}


/* ============================================================
   MÉTHODES MÉTIER ERP / WMS
============================================================ */

/**
 * État actuel du stock
 */
async function getStockStatus() {

    return await select(
        "stock",
        "*",
        {
            order: {
                col: "quantite",
                asc: true
            }
        }
    );

}

/* ============================================================
   AJOUT MOUVEMENT DE STOCK
============================================================ */

async function logStockMovement(
    itemId,
    type,
    quantity,
    reference = ""
) {

    const user = await getUser();

    const userId = user?.id ?? null;

    return await insert(
        "mouvements_stock",
        {
            item_id: itemId,
            type,
            quantity,
            reference,
            created_by: userId
        }
    );

}

/* ============================================================
   PROFILE
============================================================ */

async function getProfile(userId) {

    const { data, error } = await supabase
        .from("user_profiles")
        .select(`
            *,
            roles (
                id,
                nom,
                code
            )
        `)
        .eq("id", userId)
        .single();

    if (error) throw error;

    return data;

}

/* ============================================================
   DASHBOARD STATS
============================================================ */

async function getDashboardStats() {

    const [

        stock,

        commandes,

        picking,

        expeditions

    ] = await Promise.all([

        supabase
            .from("stock")
            .select("stock_disponible"),

        supabase
            .from("commandes_excel")
            .select("*", {
                count: "exact",
                head: true
            }),

        supabase
            .from("picking")
            .select("*", {
                count: "exact",
                head: true
            }),

        supabase
            .from("expeditions")
            .select("*", {
                count: "exact",
                head: true
            })

    ]);

    if (stock.error) throw stock.error;

    const totalStock =

        (stock.data || []).reduce(

            (sum, row) =>

                sum + Number(row.stock_disponible || 0),

            0

        );

    return {

        stock: totalStock,

        commandes: commandes.count || 0,

        picking: picking.count || 0,

        expeditions: expeditions.count || 0

    };

}
/* ============================================================
   DERNIERS MOUVEMENTS
============================================================ */

async function getLastMovements(limit = 10) {

    const { data, error } = await supabase
        .from("mouvements_stock")
        .select("*")
        .order("created_at", {
            ascending: false
        })
        .limit(limit);

    if (error) throw error;

    return data || [];

}

/* ============================================================
   IMPORT STOCK
============================================================ */

async function importStock(payload) {

    return await insert(

        "stock",

        payload.rows

    );

}

/* ============================================================
   IMPORT HISTORY
============================================================ */

async function getImportHistory() {

    return await select(

        "historique_imports",

        "*",

        {

            order: {

                col: "created_at",

                asc: false

            },

            limit: 20

        }

    );

}

/* ============================================================
   EXPORT
============================================================ */

export default {

    select,

    insert,

    update,

    delete: remove,

    getProfile,

    getDashboardStats,

    getLastMovements,

    getStockStatus,

    logStockMovement,

    importStock,

    getImportHistory

};
