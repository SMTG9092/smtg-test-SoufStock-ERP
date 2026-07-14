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

const message = document.getElementById("message");
const loginButton = document.getElementById("loginBtn");

/* ============================================================
   INIT
============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

    // إذا المستخدم راه داخل بالفعل
    if (await isAuthenticated()) {

        Router.dashboard();

        return;

    }

    // استرجاع آخر Email
    const savedEmail = localStorage.getItem("soufstock_email");

    if (savedEmail && email) {

        email.value = savedEmail;

    }

});

/* ============================================================
   SHOW PASSWORD
============================================================ */

if (togglePassword) {

    togglePassword.addEventListener("click", () => {

        password.type =
            password.type === "password"
                ? "text"
                : "password";

    });

}

/* ============================================================
   LOGIN
============================================================ */

form?.addEventListener("submit", async (e) => {

    e.preventDefault();

    clearMessage();

    if (!validate()) {

        return;

    }

    loading(true);

    const result = await login(

        email.value.trim(),

        password.value

    );

    loading(false);

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

    showSuccess("Connexion réussie...");

    setTimeout(() => {

        Router.dashboard();

    }, 500);

});

/* ============================================================
   VALIDATION
============================================================ */

function validate() {

    if (!email.value.trim()) {

        showError("Email obligatoire");

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
   LOADING
============================================================ */

function loading(state) {

    if (!loginButton) return;

    loginButton.disabled = state;

    loginButton.textContent = state
        ? "Connexion..."
        : "Se connecter";

}

/* ============================================================
   MESSAGE
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
