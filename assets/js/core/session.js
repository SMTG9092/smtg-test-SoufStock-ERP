/**
 * ============================================================
 * SoufStock Enterprise ERP/WMS
 * File : assets/js/core/supabase.js
 * ============================================================
 */

"use strict";

// Importation de la configuration de l'application (contenant les clés d'API)
import APP_CONFIG from "./config.js";

// Importation du client Supabase depuis le CDN officiel (si vous n'utilisez pas de bundler type Vite/Webpack)
// Si vous utilisez un bundler npm, remplacez cette ligne par : import { createClient } from '@supabase/supabase-js'
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/* ============================================================
   INITIALISATION DU CLIENT SUPABASE
============================================================ */

if (!APP_CONFIG.SUPABASE_URL || !APP_CONFIG.SUPABASE_ANON_KEY) {
    console.error(
        "Erreur d'initialisation : Les clés SUPABASE_URL ou SUPABASE_ANON_KEY sont manquantes dans votre fichier de configuration (config.js)."
    );
}

// Création de l'instance unique (Singleton) du client Supabase
const supabase = createClient(
    APP_CONFIG.SUPABASE_URL, 
    APP_CONFIG.SUPABASE_ANON_KEY,
    {
        auth: {
            persistSession: true, // Persiste la session dans le localStorage automatiquement
            autoRefreshToken: true, // Rafraîchit automatiquement le token d'accès expiré
            detectSessionInUrl: true // Nécessaire pour la gestion des redirections de connexion Google (SSO)
        }
    }
);

/* ============================================================
   FONCTIONS UTILITAIRES (Importées dans auth.js)
============================================================ */

/**
 * Récupère la session active actuelle
 * @returns {Promise<Object|null>} La session active ou null s'il n'y en a pas
 */
export async function getSession() {
    try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        return data.session;
    } catch (error) {
        console.error("Erreur lors de la récupération de la session :", error.message);
        return null;
    }
}

/**
 * Récupère l'utilisateur actuellement connecté de manière sécurisée auprès du serveur Supabase
 * @returns {Promise<Object|null>} L'objet utilisateur ou null s'il n'est pas connecté
 */
export async function getUser() {
    try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        return data.user;
    } catch (error) {
        console.error("Erreur lors de la récupération de l'utilisateur :", error.message);
        return null;
    }
}

// Export par défaut du client pour effectuer toutes les autres requêtes de base de données (select, insert, etc.)
export default supabase;
