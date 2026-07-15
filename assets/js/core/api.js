/**
 * ============================================================
 * SoufStock Enterprise ERP/WMS
 * File : assets/js/core/api.js
 * ============================================================
 */

"use strict";

import supabase from "./supabase.js";
import * as Auth from "./auth.js";

/**
 * Structure de réponse standardisée pour toutes les opérations de l'API
 * @param {boolean} success - État de réussite de la requête
 * @param {any} data - Les données renvoyées par la base de données
 * @param {string|null} error - Message d'erreur détaillé en cas d'échec
 * @returns {Object}
 */
const apiResponse = (success, data = null, error = null) => ({
    success,
    data,
    error
});

/* ============================================================
   MOTEUR DE REQUÊTES GÉNÉRIQUES (CRUD)
============================================================ */

/**
 * Effectue une requête de lecture (SELECT) sur une table de la base de données.
 * @param {string} table - Nom de la table cible
 * @param {string} select - Champs à récupérer (par défaut tous: "*")
 * @param {Object} [options] - Filtres additionnels { eq: { status: 'active' }, order: { col: 'created_at', asc: false }, limit: 100 }
 * @param {string} [requiredPermission] - Permission optionnelle requise pour effectuer l'action
 * @returns {Promise<{success: boolean, data: any, error: string|null}>}
 */
async function select(table, select = "*", options = {}, requiredPermission = null) {
    // Sécurité : Vérification de la permission requise côté client
    if (requiredPermission && !Auth.can(requiredPermission)) {
        return apiResponse(false, null, `Accès refusé : Permission '${requiredPermission}' requise.`);
    }

    try {
        let query = supabase.from(table).select(select);

        // Application dynamique des filtres d'égalité (eq)
        if (options.eq) {
            Object.entries(options.eq).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    query = query.eq(key, value);
                }
            });
        }

        // Application de recherche textuelle partielle (ilike)
        if (options.ilike) {
            Object.entries(options.ilike).forEach(([key, value]) => {
                if (value) query = query.ilike(key, `%${value}%`);
            });
        }

        // Tri (order)
        if (options.order) {
            const { col, asc = true } = options.order;
            query = query.order(col, { ascending: asc });
        }

        // Limitation du nombre de résultats (limit)
        if (options.limit) {
            query = query.limit(options.limit);
        }

        const { data, error } = await query;
        if (error) throw error;

        return apiResponse(true, data);
    } catch (err) {
        console.error(`[API Select Error] Table: ${table}`, err.message);
        return apiResponse(false, null, err.message);
    }
}

/**
 * Insère un ou plusieurs nouveaux enregistrements (INSERT) dans une table.
 * @param {string} table - Nom de la table cible
 * @param {Object|Array} payload - Données à insérer (objet ou tableau d'objets)
 * @param {string} [requiredPermission] - Permission optionnelle requise
 * @returns {Promise<{success: boolean, data: any, error: string|null}>}
 */
async function insert(table, payload, requiredPermission = null) {
    if (requiredPermission && !Auth.can(requiredPermission)) {
        return apiResponse(false, null, `Accès refusé : Permission '${requiredPermission}' requise.`);
    }

    try {
        const { data, error } = await supabase
            .from(table)
            .insert(payload)
            .select(); // Récupère l'enregistrement inséré (avec son ID généré)

        if (error) throw error;
        return apiResponse(true, data);
    } catch (err) {
        console.error(`[API Insert Error] Table: ${table}`, err.message);
        return apiResponse(false, null, err.message);
    }
}

/**
 * Met à jour un enregistrement existant (UPDATE) ciblé par son ID.
 * @param {string} table - Nom de la table cible
 * @param {string|number} id - Identifiant unique de l'enregistrement
 * @param {Object} payload - Données de mise à jour
 * @param {string} [requiredPermission] - Permission optionnelle requise
 * @returns {Promise<{success: boolean, data: any, error: string|null}>}
 */
async function update(table, id, payload, requiredPermission = null) {
    if (requiredPermission && !Auth.can(requiredPermission)) {
        return apiResponse(false, null, `Accès refusé : Permission '${requiredPermission}' requise.`);
    }

    try {
        const { data, error } = await supabase
            .from(table)
            .update(payload)
            .eq("id", id)
            .select();

        if (error) throw error;
        return apiResponse(true, data);
    } catch (err) {
        console.error(`[API Update Error] Table: ${table}, ID: ${id}`, err.message);
        return apiResponse(false, null, err.message);
    }
}

/**
 * Supprime de manière définitive un enregistrement (DELETE) ciblé par son ID.
 * @param {string} table - Nom de la table cible
 * @param {string|number} id - Identifiant unique de l'enregistrement
 * @param {string} [requiredPermission] - Permission optionnelle requise
 * @returns {Promise<{success: boolean, data: any, error: string|null}>}
 */
async function remove(table, id, requiredPermission = null) {
    if (requiredPermission && !Auth.can(requiredPermission)) {
        return apiResponse(false, null, `Accès refusé : Permission '${requiredPermission}' requise.`);
    }

    try {
        const { data, error } = await supabase
            .from(table)
            .delete()
            .eq("id", id)
            .select();

        if (error) throw error;
        return apiResponse(true, data);
    } catch (err) {
        console.error(`[API Delete Error] Table: ${table}, ID: ${id}`, err.message);
        return apiResponse(false, null, err.message);
    }
}

/* ============================================================
   MÉTHODES DE COMMERCE ET STOCKS SPÉCIFIQUES (ERP/WMS)
   ============================================================ */

/**
 * Récupère l'état actuel des stocks avec alertes sur seuil minimal (WMS helper)
 */
async function getStockStatus() {
    return select("items", "id, name, sku, quantity, min_threshold", {
        order: { col: "quantity", asc: true }
    }, "items.read");
}

/**
 * Ajoute un mouvement de stock dans le grand livre des stocks (Stock Ledger)
 * et met à jour automatiquement la table des articles via déclencheur Supabase (ou transaction manuelle).
 */
async function logStockMovement(itemId, type, quantity, reference = "") {
    const userId = Auth.getUser()?.id;
    return insert("stock_movements", {
        item_id: itemId,
        type, // 'IN' (Entrée), 'OUT' (Sortie), 'ADJ' (Ajustement)
        quantity,
        reference,
        created_by: userId
    }, "items.write");
}

// Export de l'API SoufStock ERP
export default {
    select,
    insert,
    update,
    delete: remove,
    // Méthodes métier ERP/WMS spécialisées
    getStockStatus,
    logStockMovement
};
