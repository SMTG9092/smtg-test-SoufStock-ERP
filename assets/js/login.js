/**
 * ============================================================
 * SoufStock Enterprise ERP/WMS
 * File : assets/js/login.js
 * ============================================================
 */

"use strict";

import { login, loginWithGoogle, isAuthenticated } from "./core/auth.js";
import Router from "./core/router.js";
import { initPermissions } from "./core/permissions.js";
import Language from "./core/language.js";
import Theme from "./core/theme.js";

/* ============================================================
   ELEMENTS SELECTORS
============================================================ */
const form = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");
const rememberMe = document.getElementById("rememberMe");
const googleLoginBtn = document.getElementById("googleLoginBtn");
const message = document.getElementById("message");
const loginButton = document.getElementById("loginBtn");
const offlineBanner = document.getElementById("offlineBanner");

/* ============================================================
   INITIALIZATION
============================================================ */
document.addEventListener("DOMContentLoaded", async () => {
    try {
        // 1. Initialiser le thème utilisateur
        Theme.init();

        // 2. Initialiser le moteur de langues (i18n)
        Language.init();

        // 3. Restaurer le champ d'identifiant si "Se souvenir de moi" est actif
        restoreRememberedUser();

        // 4. Ecoute de l'état de la connexion réseau
        initNetworkMonitoring();

        // 5. Redirection immédiate si déjà authentifié
        if (await isAuthenticated()) {
            displayStatus(Language.translate("success_redirecting") || "Déjà connecté. Redirection...", "success");
            setTimeout(() => {
                Router.dashboard();
            }, 800);
            return;
        }

        // 6. Configurer les écouteurs d'événements
        setupEventListeners();

    } catch (err) {
        console.error("[Login Init Error]", err);
        displayStatus("Erreur d'initialisation de la page de connexion.", "error");
    }
});

/* ============================================================
   EVENT LISTENERS SETUP
============================================================ */
function setupEventListeners() {
    // Form submission event
    if (form) {
        form.addEventListener("submit", handleStandardLogin);
    }

    // Toggle showing password text
    if (togglePassword) {
        togglePassword.addEventListener("click", handleTogglePasswordVisibility);
    }

    // Google Single Sign-On (SSO) OAuth integration
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener("click", handleGoogleLogin);
    }
}

/* ============================================================
   EVENT HANDLERS
============================================================ */

/**
 * Handle form submission for Standard Login (Username or Email)
 */
async function handleStandardLogin(e) {
    e.preventDefault();
    clearMessage();

    if (!navigator.onLine) {
        displayStatus(Language.translate("err_offline") || "Vous êtes actuellement hors-ligne. Connexion impossible.", "error");
        return;
    }

    const identifier = emailInput.value.trim();
    const password = passwordInput.value;

    if (!identifier || !password) {
        displayStatus(Language.translate("err_missing_credentials") || "Veuillez remplir tous les champs obligatoires.", "error");
        return;
    }

    try {
        setLoading(true);

        // Connexion unifiée du Core (détecte automatiquement email ou nom d'utilisateur)
        await login(identifier, password);

        // Gérer l'état de mémorisation de l'utilisateur
        handleRememberMe(identifier);

        // Initialiser la session et charger la matrice des permissions
        await initPermissions();

        // Afficher le message de succès et rediriger
        displayStatus(Language.translate("success_connected") || "Connexion réussie ! Redirection en cours...", "success");

        setTimeout(() => {
            Router.dashboard();
        }, 1200);

    } catch (error) {
        console.error("[Login Process Error]", error);
        
        let errorMsg = error.message;
        
        // Traduction de messages d'erreur courants de Supabase Auth
        if (errorMsg.includes("Invalid login credentials") || errorMsg.includes("Nom d'utilisateur introuvable")) {
            errorMsg = Language.translate("err_invalid_credentials") || "Identifiants invalides. Veuillez réessayer.";
        } else if (errorMsg.includes("Failed to fetch")) {
            errorMsg = Language.translate("err_network") || "Erreur réseau : Connexion au serveur impossible.";
        }

        displayStatus(errorMsg, "error");
        setLoading(false);
    }
}

/**
 * Handle Google SSO OAuth sign-in flow
 */
async function handleGoogleLogin(e) {
    e.preventDefault();
    clearMessage();

    if (!navigator.onLine) {
        displayStatus(Language.translate("err_offline") || "Vous êtes actuellement hors-ligne. Connexion impossible.", "error");
        return;
    }

    try {
        setLoading(true);
        await loginWithGoogle();
    } catch (error) {
        console.error("[Google OAuth Login Error]", error);
        displayStatus(error.message || "Impossible de démarrer la connexion Google.", "error");
        setLoading(false);
    }
}

/**
 * Toggle visibility (show/hide) of the password text field
 */
function handleTogglePasswordVisibility() {
    if (!passwordInput) return;

    const eyeIcon = togglePassword.querySelector(".eye-icon");
    const eyeOffIcon = togglePassword.querySelector(".eye-off-icon");

    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        if (eyeIcon) eyeIcon.style.display = "none";
        if (eyeOffIcon) eyeOffIcon.style.display = "block";
    } else {
        passwordInput.type = "password";
        if (eyeIcon) eyeIcon.style.display = "block";
        if (eyeOffIcon) eyeOffIcon.style.display = "none";
    }
}

/* ============================================================
   UTILITY HELPER FUNCTIONS
============================================================ */

/**
 * Updates loading visual state of the primary connection button
 */
function setLoading(state) {
    if (!loginButton) return;

    loginButton.disabled = state;

    if (state) {
        const loadingText = Language.translate("btn_connecting") || "Connexion...";
        loginButton.innerHTML = `
            <svg class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px; display: inline-block; vertical-align: middle; margin-right: 8px; animation: spin 1s linear infinite;">
                <circle cx="12" cy="12" r="10" stroke-dasharray="31.4 31.4" stroke-dashoffset="0"></circle>
            </svg> ${loadingText}
        `;
    } else {
        const defaultText = Language.translate("btn_connect") || "Se connecter";
        loginButton.innerHTML = `
            <svg class="lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px; display: inline; vertical-align: middle; margin-right: 6px;">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg> ${defaultText}
        `;
    }
}

/**
 * Output customized warning, success or error feedback messages
 */
function displayStatus(text, type = "error") {
    if (!message) return;

    message.innerHTML = text;
    message.className = `message-area ${type}`;
    message.style.display = "block";
}

/**
 * Hide feedback box
 */
function clearMessage() {
    if (!message) return;
    message.style.display = "none";
    message.innerHTML = "";
}

/**
 * Saves or deletes the user's login identifier from storage according to checkbox state
 */
function handleRememberMe(identifier) {
    if (!rememberMe) return;

    const storageKey = "soufstock_remembered_username";

    if (rememberMe.checked) {
        localStorage.setItem(storageKey, identifier);
    } else {
        localStorage.removeItem(storageKey);
    }
}

/**
 * Automatically restores identifier from localStorage to input field if remembered
 */
function restoreRememberedUser() {
    const remembered = localStorage.getItem("soufstock_remembered_username");
    if (remembered && emailInput && rememberMe) {
        emailInput.value = remembered;
        rememberMe.checked = true;
    }
}

/**
 * Configures network online/offline listeners to show localized overlay banner
 */
function initNetworkMonitoring() {
    const updateNetworkStatus = () => {
        if (!offlineBanner) return;

        if (navigator.onLine) {
            offlineBanner.style.display = "none";
        } else {
            const warningText = Language.translate("err_offline") || "Mode hors-ligne détecté. Reconnexion en cours...";
            const textSpan = offlineBanner.querySelector("span");
            if (textSpan) textSpan.innerHTML = warningText;
            offlineBanner.style.display = "block";
        }
    };

    window.addEventListener("online", updateNetworkStatus);
    window.addEventListener("offline", updateNetworkStatus);

    // Run initial state verify
    updateNetworkStatus();
}
