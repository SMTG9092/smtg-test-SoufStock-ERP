/**
 * ============================================================
 * SoufStock Enterprise ERP/WMS
 * File : assets/js/login.js
 * ============================================================
 */

"use strict";

import { login, isAuthenticated } from "./core/auth.js";
import Router from "./core/router.js";
import { initPermissions } from "./core/permissions.js";

/* ============================================================
   ELEMENTS
============================================================ */
const form = document.getElementById("loginForm");
const email = document.getElementById("email");
const password = document.getElementById("password");

const togglePassword = document.getElementById("togglePassword");
const rememberMe = document.getElementById("rememberMe");
const googleLoginBtn = document.getElementById("googleLoginBtn");

const message = document.getElementById("message");
const loginButton = document.getElementById("loginBtn");

/* ============================================================
   INIT
============================================================ */
document.addEventListener("DOMContentLoaded", async () => {
    // Si l'utilisateur est déjà authentifié
    if (await isAuthenticated()) {
        Router.dashboard();
        return;
    }

    // Récupération du dernier e-mail enregistré
    const savedEmail = localStorage.getItem("soufstock_email");
    if (savedEmail && email) {
        email.value = savedEmail;
        if (rememberMe) rememberMe.checked = true;
    }
});

/* ============================================================
   AFFICHER / MASQUER LE MOT DE PASSE
============================================================ */
if (togglePassword) {
    togglePassword.addEventListener("click", () => {
        const isPassword = password.type === "password";
        password.type = isPassword ? "text" : "password";
        
        // Mise à jour de l'icône oeil
        togglePassword.innerHTML = isPassword 
            ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`
            : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    });
}

/* ============================================================
   SOUMISSION DU FORMULAIRE
============================================================ */
form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMessage();

    if (!validate()) {
        return;
    }

    loading(true);
    const result = await login(email.value.trim(), password.value);
    loading(false);

    if (!result.success) {
        showError(result.message);
        return;
    }

    // Remember Me
    if (rememberMe?.checked) {
        localStorage.setItem("soufstock_email", email.value.trim());
    } else {
        localStorage.removeItem("soufstock_email");
    }

    // Charger les permissions
    await initPermissions();

    showSuccess("Connexion réussie...");

    setTimeout(() => {
        Router.dashboard();
    }, 500);
});

/* ============================================================
   AUTHENTIFICATION GOOGLE
============================================================ */
googleLoginBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    showError("La connexion Google SSO n'est pas encore activée pour votre division.");
});

/* ============================================================
   VALIDATION
============================================================ */
function validate() {
    if (!email.value.trim()) {
        showError("Email ou identifiant obligatoire");
        email.focus();
        return false;
    }

    if (!password.value) {
        showError("Mot de passe obligatoire");
        password.focus();
        return false;
    }

    return true;
}

/* ============================================================
   ÉTAT DE CHARGEMENT (LOADING)
============================================================ */
function loading(state) {
    if (!loginButton) return;
    loginButton.disabled = state;
    loginButton.innerHTML = state 
        ? `Connexion en cours...` 
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px; display: inline; vertical-align: middle; margin-right: 6px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> Se connecter`;
}

/* ============================================================
   FEEDBACK UTILISATEUR
============================================================ */
function showError(text) {
    if (!message) return;
    message.style.color = "#ef4444";
    message.textContent = text;
}

function showSuccess(text) {
    if (!message) return;
    message.style.color = "#22c55e";
    message.textContent = text;
}

function clearMessage() {
    if (!message) return;
    message.textContent = "";
}
