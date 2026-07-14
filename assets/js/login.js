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

/* ============================================================
   ELEMENTS SELECTORS
============================================================ */
const form = document.getElementById("loginForm");
const email = document.getElementById("email"); // Reçoit l'e-mail ou l'identifiant (type="text")
const password = document.getElementById("password");

const togglePassword = document.getElementById("togglePassword");
const rememberMe = document.getElementById("rememberMe");
const googleLoginBtn = document.getElementById("googleLoginBtn");

const message = document.getElementById("message");
const loginButton = document.getElementById("loginBtn");

/* ============================================================
   INITIALIZATION
============================================================ */
document.addEventListener("DOMContentLoaded", async () => {
    // Si l'utilisateur est déjà authentifié, redirection immédiate vers le dashboard
    if (await isAuthenticated()) {
        Router.dashboard();
        return;
    }

    // Récupération du dernier e-mail ou identifiant mémorisé
    const savedEmail = localStorage.getItem("soufstock_email");
    if (savedEmail && email) {
        email.value = savedEmail;
        if (rememberMe) {
            rememberMe.checked = true;
        }
    }
});

/* ============================================================
   SHOW / HIDE PASSWORD INPUT
============================================================ */
if (togglePassword) {
    togglePassword.addEventListener("click", () => {
        const isPassword = password.type === "password";
        password.type = isPassword ? "text" : "password";
        
        // Changement dynamique de l'icône SVG (Oeil ouvert / Oeil barré)
        togglePassword.innerHTML = isPassword 
            ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
               </svg>`
            : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
               </svg>`;
    });
}

/* ============================================================
   STANDARD LOGIN SUBMISSION
============================================================ */
form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMessage();

    if (!validate()) {
        return;
    }

    loading(true);
    // Appel de la méthode login (qui gère à la fois l'e-mail ou l'username)
    const result = await login(email.value.trim(), password.value);
    loading(false);

    if (!result.success) {
        showError(result.message);
        return;
    }

    // Gestion du cookie de mémorisation "Se souvenir de moi"
    if (rememberMe?.checked) {
        localStorage.setItem("soufstock_email", email.value.trim());
    } else {
        localStorage.removeItem("soufstock_email");
    }

    // Initialisation des rôles et permissions de l'utilisateur
    await initPermissions();

    showSuccess("Connexion réussie. Redirection...");

    setTimeout(() => {
        Router.dashboard();
    }, 500);
});

/* ============================================================
   GOOGLE SSO LOGIN
============================================================ */
googleLoginBtn?.addEventListener("click", async (e) => {
    e.preventDefault();
    clearMessage();
    
    showSuccess("Redirection vers Google...");
    
    const result = await loginWithGoogle();
    if (!result.success) {
        showError(result.message);
    }
});

/* ============================================================
   FORM VALIDATION
============================================================ */
function validate() {
    if (!email.value.trim()) {
        showError("Nom d'utilisateur ou e-mail obligatoire.");
        email.focus();
        return false;
    }

    if (!password.value) {
        showError("Mot de passe obligatoire.");
        password.focus();
        return false;
    }

    return true;
}

/* ============================================================
   LOADING BUTTON STATE ANIMATION
============================================================ */
function loading(state) {
    if (!loginButton) return;
    
    loginButton.disabled = state;
    
    // Ajoute un indicateur visuel de chargement en conservant la structure esthétique
    loginButton.innerHTML = state 
        ? `<svg class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px; display: inline-block; vertical-align: middle; margin-right: 8px; animation: spin 1s linear infinite;">
            <circle cx="12" cy="12" r="10" stroke-dasharray="31.4 31.4" stroke-dashoffset="0"></circle>
           </svg> Connexion en cours...` 
        : `<svg class="lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px; display: inline; vertical-align: middle; margin-right: 6px;">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
           </svg> Se connecter`;
}

/* ============================================================
   USER INTERFACE FEEDBACK MESSAGES
============================================================ */
function showError(text) {
    if (!message) return;
    message.style.color = "#ef4444"; // Rouge d'erreur (Tailwind rose-500)
    message.textContent = text;
}

function showSuccess(text) {
    if (!message) return;
    message.style.color = "#22c55e"; // Vert de validation (Tailwind green-500)
    message.textContent = text;
}

function clearMessage() {
    if (!message) return;
    message.textContent = "";
}
