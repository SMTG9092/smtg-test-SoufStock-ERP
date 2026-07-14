/**
 * ============================================================
 * SoufStock Enterprise ERP/WMS
 * File : assets/js/login.js
 * ============================================================
 */

"use strict";

import { login, isAuthenticated, loginWithGoogle } from "./core/auth.js";
import Router from "./core/router.js";
import { initPermissions } from "./core/permissions.js";
import Language from "./core/language.js";
import Theme from "./core/theme.js";

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
const offlineBanner = document.getElementById("offlineBanner");

/* ============================================================
   INIT
============================================================ */
document.addEventListener("DOMContentLoaded", async () => {
    Theme.init();
    Language.init();

    const handleConnectivity = () => {
        if (offlineBanner) {
            offlineBanner.style.display = navigator.onLine ? "none" : "block";
        }
    };
    window.addEventListener("online", handleConnectivity);
    window.addEventListener("offline", handleConnectivity);
    handleConnectivity();

    if (await isAuthenticated()) {
        Router.dashboard();
        return;
    }

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

    if (!validate()) return;

    loading(true);

    try {

        const result = await login(
            email.value.trim(),
            password.value
        );

        if (!result.success) {
            showError(result.message);
            return;
        }

        // Remember Me
        if (rememberMe?.checked) {
            localStorage.setItem(
                "soufstock_email",
                email.value.trim()
            );
        } else {
            localStorage.removeItem(
                "soufstock_email"
            );
        }

        // Charger les permissions
        await initPermissions();

        showSuccess(
            Language.t("msg_success")
        );

        setTimeout(() => {
            Router.dashboard();
        }, 500);

    } catch (error) {

        console.error("[LOGIN ERROR]", error);

        showError(
            error?.message ||
            "Une erreur est survenue."
        );

    } finally {

        loading(false);

    }
});

/* ============================================================
   AUTHENTIFICATION GOOGLE
============================================================ */
googleLoginBtn?.addEventListener("click", async (e) => {
    e.preventDefault();

    clearMessage();

    if (!navigator.onLine) {
        showError(
            Language.t("err_offline") ||
            "Connexion Internet indisponible."
        );
        return;
    }

    loading(true);

    try {

        const result = await loginWithGoogle();

        if (!result.success) {
            showError(result.message);
            return;
        }

    } catch (error) {

        console.error("[GOOGLE LOGIN ERROR]", error);

        showError(
            error?.message ||
            "Erreur lors de la connexion Google."
        );

    } finally {

        loading(false);

    }
});

/* ============================================================
   VALIDATION
============================================================ */
function validate() {
    if (!email.value.trim()) {
        showError(Language.t("err_username_required"));
        email.focus();
        return false;
    }

    if (!password.value) {
        showError(Language.t("err_password_required"));
        password.focus();
        return false;
    }

    return true;
}

/* ============================================================
   ÉTAT DE CHARGEMENT
============================================================ */
function loading(state) {
    if (!loginButton) return;
    loginButton.disabled = state;
    loginButton.innerHTML = state 
        ? `<svg class="spinner" viewBox="0 0 50 50" style="width: 16px; height: 16px; animation: rotate 2s linear infinite; margin-right: 6px;"><circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5" stroke="currentColor"></circle></svg> ${Language.t("btn_connecting")}` 
        : Language.t("btn_connect");
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
    if (message) message.textContent = "";
}
