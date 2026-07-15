/**
 * ============================================================
 * SoufStock Enterprise ERP/WMS
 * File : assets/js/core/supabase.js
 * ============================================================
 */

"use strict";

import APP_CONFIG from "./config.js";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/* ============================================================
   CONFIGURATION
============================================================ */

const SUPABASE_URL = APP_CONFIG.SUPABASE?.URL;
const SUPABASE_ANON_KEY = APP_CONFIG.SUPABASE?.ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
        "Configuration Supabase invalide : APP_CONFIG.SUPABASE.URL ou APP_CONFIG.SUPABASE.ANON_KEY est manquant."
    );
}

/* ============================================================
   CLIENT
============================================================ */

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            flowType: "pkce"
        },
        realtime: {
            params: {
                eventsPerSecond: 10
            }
        },
        db: {
            schema: "public"
        },
        global: {
            headers: {
                "X-Client-Info": APP_CONFIG.APP.NAME,
                "X-App-Version": APP_CONFIG.APP.VERSION
            }
        }
    }
);

/* ============================================================
   TEST CONNECTION
============================================================ */

export async function testConnection() {
    try {

        const { error } = await supabase
            .from(APP_CONFIG.DATABASE.ROLES_TABLE)
            .select("id")
            .limit(1);

        if (error) {
            console.error("❌ Supabase:", error.message);
            return false;
        }

        console.log("✅ Supabase connecté");

        return true;

    } catch (err) {

        console.error(err);

        return false;
    }
}

/* ============================================================
   SESSION
============================================================ */

export async function getSession() {

    try {

        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;

        return data.session;

    } catch (err) {

        console.error(err);

        return null;

    }

}

/* ============================================================
   USER
============================================================ */

export async function getUser() {

    try {

        const { data, error } = await supabase.auth.getUser();

        if (error) throw error;

        return data.user;

    } catch (err) {

        console.error(err);

        return null;

    }

}

/* ============================================================
   AUTH
============================================================ */

export async function isAuthenticated() {

    const session = await getSession();

    return session !== null;

}

/* ============================================================
   EXPORT
============================================================ */

export default supabase;
