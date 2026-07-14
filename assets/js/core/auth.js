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
    LOGIN (Supporte E-mail OU Nom d'utilisateur)
============================================================ */
export async function login(identifier, password) {
    try {
        let email = identifier.trim();

        // 1. Détection : Si ce n'est pas un e-mail (ne contient pas de '@'), on cherche l'e-mail associé au username
        if (!email.includes("@")) {
            const { data: userProfile, error: searchError } = await supabase
                .from(APP_CONFIG.DATABASE.USER_PROFILES_TABLE)
                .select("email")
                .eq("username", email)
                .maybeSingle(); // Retourne null si non trouvé sans lever d'exception bloquante

            if (searchError || !userProfile) {
                throw new Error("Nom d'utilisateur introuvable.");
            }
            email = userProfile.email;
        }

        // 2. Connexion Supabase avec l'e-mail résolu
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        // 3. Charger le profil utilisateur
        const { data: profile, error: profileError } = await supabase
            .from(APP_CONFIG.DATABASE.USER_PROFILES_TABLE)
            .select("*")
            .eq("id", data.user.id)
            .single();

        if (profileError) throw profileError;

        // 4. Charger le rôle
        const { data: role, error: roleError } = await supabase
            .from(APP_CONFIG.DATABASE.ROLES_TABLE)
            .select("*")
            .eq("id", profile.role_id)
            .single();

        if (roleError) throw roleError;

        // 5. Sauvegarder localement
        localStorage.setItem(
            APP_CONFIG.AUTH.PROFILE_KEY,
            JSON.stringify(profile)
        );

        localStorage.setItem(
            "soufstock_role",
            JSON.stringify(role)
        );

        // 6. Mettre à jour la date de dernière connexion
        await updateLastLogin(data.user.id);

        return {
            success: true,
            user: data.user,
            session: data.session,
            profile,
            role
        };

    } catch (error) {
        return {
            success: false,
            message: error.message
        };
    }
}

/* ============================================================
    LOGIN WITH GOOGLE (SSO)
============================================================ */
export async function loginWithGoogle() {
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/index.html', // Redirection après connexion réussie
            }
        });
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        return { success: false, message: error.message };
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
