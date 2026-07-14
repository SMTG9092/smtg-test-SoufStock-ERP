/**
 * ============================================================
 * SoufStock Enterprise ERP/WMS
 * File : assets/js/core/auth.js
 * ============================================================
 */

"use strict";

import supabase, {
    getSession,
    getUser
} from "./supabase.js";

import APP_CONFIG from "./config.js";

/* ============================================================
   LOGIN
============================================================ */

export async function login(email, password) {

    try {

        const { data, error } =
            await supabase.auth.signInWithPassword({

                email,
                password

            });

        if (error) throw error;

        // Charger le profil utilisateur

        const { data: profile, error: profileError } =
            await supabase

                .from(APP_CONFIG.DATABASE.USER_PROFILES_TABLE)

                .select("*")

                .eq("id", data.user.id)

                .single();

        if (profileError) throw profileError;

        // Charger le rôle

        const { data: role, error: roleError } =
            await supabase

                .from(APP_CONFIG.DATABASE.ROLES_TABLE)

                .select("*")

                .eq("id", profile.role_id)

                .single();

        if (roleError) throw roleError;

        // Sauvegarder

        localStorage.setItem(

            APP_CONFIG.AUTH.PROFILE_KEY,

            JSON.stringify(profile)

        );

        localStorage.setItem(

            "soufstock_role",

            JSON.stringify(role)

        );

        // Dernier login

        await updateLastLogin(data.user.id);

        return {

            success: true,

            user: data.user,

            session: data.session,

            profile,

            role

        };

    }

    catch (error) {

        return {

            success: false,

            message: error.message

        };

    }

}

/* ============================================================
   LOGOUT
============================================================ */

export async function logout() {

    localStorage.removeItem(APP_CONFIG.AUTH.PROFILE_KEY);

    localStorage.removeItem("soufstock_role");

    await supabase.auth.signOut();

}

/* ============================================================
   CURRENT SESSION
============================================================ */

export async function currentSession() {

    return await getSession();

}

/* ============================================================
   CURRENT USER
============================================================ */

export async function currentUser() {

    return await getUser();

}

/* ============================================================
   AUTH CHECK
============================================================ */

export async function isAuthenticated() {

    const session = await getSession();

    return session !== null;

}

/* ============================================================
   USER PROFILE
============================================================ */

export async function getProfile() {

    const user = await getUser();

    if (!user) return null;

    const { data } = await supabase

        .from(APP_CONFIG.DATABASE.USER_PROFILES_TABLE)

        .select("*")

        .eq("id", user.id)

        .single();

    return data;

}

/* ============================================================
   USER ROLE
============================================================ */

export async function getRole() {

    const profile = await getProfile();

    if (!profile) return null;

    const { data } = await supabase

        .from(APP_CONFIG.DATABASE.ROLES_TABLE)

        .select("*")

        .eq("id", profile.role_id)

        .single();

    return data;

}

/* ============================================================
   UPDATE LAST LOGIN
============================================================ */

export async function updateLastLogin(userId) {

    await supabase

        .from(APP_CONFIG.DATABASE.USER_PROFILES_TABLE)

        .update({

            dernier_login: new Date().toISOString()

        })

        .eq("id", userId);

}

/* ============================================================
   STORED PROFILE
============================================================ */

export function storedProfile() {

    const profile = localStorage.getItem(

        APP_CONFIG.AUTH.PROFILE_KEY

    );

    if (!profile) return null;

    return JSON.parse(profile);

}

/* ============================================================
   STORED ROLE
============================================================ */

export function storedRole() {

    const role = localStorage.getItem(

        "soufstock_role"

    );

    if (!role) return null;

    return JSON.parse(role);

}

/* ============================================================
   USER NAME
============================================================ */

export function currentUserName() {

    const profile = storedProfile();

    if (!profile) return "";

    return (

        profile.nom_complet ||

        profile.nom ||

        profile.username ||

        profile.email ||

        ""

    );

}

/* ============================================================
   USER PHOTO
============================================================ */

export function currentUserPhoto() {

    const profile = storedProfile();

    if (!profile) return "";

    return profile.photo || "";

}

/* ============================================================
   USER ID
============================================================ */

export async function currentUserId() {

    const user = await getUser();

    return user?.id || null;

}

/* ============================================================
   REFRESH PROFILE
============================================================ */

export async function refreshProfile() {

    const profile = await getProfile();

    if (profile) {

        localStorage.setItem(

            APP_CONFIG.AUTH.PROFILE_KEY,

            JSON.stringify(profile)

        );

    }

    return profile;

}
