/**
 * ============================================================
 * SoufStock Enterprise ERP/WMS
 * File : assets/js/core/language.js
 * ============================================================
 */

"use strict";

/* ============================================================
   DICTIONNAIRES DE TRADUCTION (LOGIN & CORE)
============================================================ */
const TRANSLATIONS = {
    fr: {
        // Métadonnées & Titres
        brand_title: "SoufStock",
        brand_subtitle: "Enterprise ERP",
        welcome_title: "Bienvenue sur <br><span class=\"highlight\">SoufStock</span> <br>Enterprise ERP",
        brand_pitch: "La solution complète pour la gestion de votre stock et de vos opérations.",
        
        // Fonctionnalités (Panneau de gauche)
        feat_stock_title: "Gestion de Stock",
        feat_stock_desc: "Suivi en temps réel de vos stocks",
        feat_comm_title: "Gestion Commerciale",
        feat_comm_desc: "Commandes, clients et fournisseurs",
        feat_stats_title: "Rapports & Analyses",
        feat_stats_desc: "Tableaux de bord et statistiques détaillées",
        feat_security_title: "Sécurité Avancée",
        feat_security_desc: "Protection des données et accès sécurisés",
        
        // Droits d'auteur
        copyright: "© 2026 SoufStock Enterprise ERP. Tous droits réservés.",

        // Formulaire de connexion (Panneau de droite)
        login_title: "Connexion",
        login_subtitle: "Connectez-vous à votre compte",
        label_username: "Nom d'utilisateur ou e-mail",
        placeholder_username: "Entrez votre nom d'utilisateur ou e-mail",
        label_password: "Mot de passe",
        placeholder_password: "Entrez votre mot de passe",
        remember_me: "Se souvenir de moi",
        forgot_password: "Mot de passe oublié ?",
        btn_connect: "Se connecter",
        btn_connecting: "Connexion en cours...",
        divider_text: "ou continuer avec",
        btn_google: "Se connecter avec Google",
        no_account: "Pas encore de compte ?",
        contact_admin: "Contactez l'administrateur",

        // Badges système (Pied de page)
        badge_secure_title: "Sécurisé",
        badge_secure_desc: "Données protégées",
        badge_backup_title: "Sauvegarde",
        badge_backup_desc: "Sauvegarde automatique",
        badge_perf_title: "Performant",
        badge_perf_desc: "Rapide et efficace",
        badge_support_title: "Support",
        badge_support_desc: "Assistance 24/7",

        // Messages d'erreur & Validation
        err_username_required: "Nom d'utilisateur ou e-mail obligatoire.",
        err_password_required: "Mot de passe obligatoire.",
        msg_connecting: "Redirection vers Google...",
        msg_success: "Connexion réussie. Redirection..."
    },
    ar: {
        // Métadonnées & Titres
        brand_title: "سوف ستوك",
        brand_subtitle: "نظام ERP للمؤسسات",
        welcome_title: "مرحباً بك في <br><span class=\"highlight\">سوف ستوك</span> <br>Enterprise ERP",
        brand_pitch: "الحل المتكامل لإدارة مخزونك وعملياتك التجارية بكل سهولة.",
        
        // Fonctionnalités (Panneau de gauche)
        feat_stock_title: "إدارة المخزون",
        feat_stock_desc: "متابعة فورية ومباشرة لحركة مخزونك",
        feat_comm_title: "الإدارة التجارية",
        feat_comm_desc: "الطلبيات، الزبائن والموردين في مكان واحد",
        feat_stats_title: "التقارير والتحليلات",
        feat_stats_desc: "لوحات تحكم ذكية وإحصائيات مفصلة لعملك",
        feat_security_title: "حماية متقدمة",
        feat_security_desc: "تشفير وحماية كاملة لبياناتك وصلاحيات الدخول",
        
        // Droits d'auteur
        copyright: "© 2026 سوف ستوك ERP. جميع الحقوق محفوظة.",

        // Formulaire de connexion (Panneau de droite)
        login_title: "تسجيل الدخول",
        login_subtitle: "الرجاء تسجيل الدخول إلى حسابك",
        label_username: "اسم المستخدم أو البريد الإلكتروني",
        placeholder_username: "أدخل اسم المستخدم أو البريد الإلكتروني",
        label_password: "كلمة المرور",
        placeholder_password: "أدخل كلمة المرور الخاصة بك",
        remember_me: "تذكرني على هذا الجهاز",
        forgot_password: "نسيت كلمة المرور؟",
        btn_connect: "تسجيل الدخول",
        btn_connecting: "جاري الاتصال...",
        divider_text: "أو الاستمرار باستخدام",
        btn_google: "تسجيل الدخول بواسطة Google",
        no_account: "ليس لديك حساب بعد؟",
        contact_admin: "اتصل بمسؤول النظام",

        // Badges système (Pied de page)
        badge_secure_title: "آمن بالكامل",
        badge_secure_desc: "بيانات مشفرة ومحمية",
        badge_backup_title: "نسخ احتياطي",
        badge_backup_desc: "حفظ تلقائي ودوري للمعلومات",
        badge_perf_title: "أداء سريع",
        badge_perf_desc: "سرعة فائقة وكفاءة عالية",
        badge_support_title: "الدعم الفني",
        badge_support_desc: "مساعدة فنية متواصلة 24/7",

        // Messages d'erreur & Validation
        err_username_required: "اسم المستخدم أو البريد الإلكتروني مطلوب.",
        err_password_required: "كلمة المرور مطلوبة.",
        msg_connecting: "جاري التحويل إلى Google...",
        msg_success: "تم تسجيل الدخول بنجاح. جاري التحويل..."
    }
};

const STORAGE_KEY = "soufstock_lang";
const DEFAULT_LANG = "fr";

/* ============================================================
   FONCTIONS EXPORTÉES
============================================================ */

/**
 * Récupère la langue actuellement configurée (depuis le localStorage ou navigateur)
 * @returns {string} 'fr' ou 'ar'
 */
public function getCurrentLanguage() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && TRANSLATIONS[saved]) {
        return saved;
    }
    // Détection de la langue du navigateur par défaut (ar ou fr)
    const browserLang = navigator.language.split('-')[0];
    return TRANSLATIONS[browserLang] ? browserLang : DEFAULT_LANG;
}

/**
 * Définit et applique la nouvelle langue
 * @param {string} lang - 'fr' ou 'ar'
 */
public function setLanguage(lang) {
    if (!TRANSLATIONS[lang]) return;
    
    localStorage.setItem(STORAGE_KEY, lang);
    applyLanguage(lang);
}

/**
 * Applique les traductions dynamiques et adapte le sens du texte (LTR / RTL)
 * @param {string} lang 
 */
function applyLanguage(lang) {
    const dict = TRANSLATIONS[lang];
    const htmlElement = document.documentElement;

    // 1. Configurer la direction d'écriture (RTL pour l'arabe, LTR pour le français)
    if (lang === "ar") {
        htmlElement.setAttribute("dir", "rtl");
        htmlElement.setAttribute("lang", "ar");
        htmlElement.classList.add("rtl-mode");
    } else {
        htmlElement.setAttribute("dir", "ltr");
        htmlElement.setAttribute("lang", "fr");
        htmlElement.classList.remove("rtl-mode");
    }

    // 2. Parcourir et traduire tous les éléments portant l'attribut [data-i18n]
    document.querySelectorAll("[data-i18n]").forEach(element => {
        const key = element.getAttribute("data-i18n");
        if (dict[key]) {
            // Si l'élément est un input, traduire le placeholder
            if (element.tagName === "INPUT") {
                element.placeholder = dict[key];
            } else {
                // Utiliser innerHTML pour conserver les balises stylisées (ex: <span class="highlight">)
                element.innerHTML = dict[key];
            }
        }
    });
}

/**
 * Traduit un identifiant spécifique programmatiquement
 * @param {string} key - Clé de traduction
 * @returns {string} Texte traduit
 */
public function translate(key) {
    const lang = getCurrentLanguage();
    return TRANSLATIONS[lang][key] || key;
}

/**
 * Initialise le module de langue sur la page actuelle
 */
public function initLanguage() {
    const activeLang = getCurrentLanguage();
    applyLanguage(activeLang);

    // Initialisation automatique du sélecteur HTML (s'il existe sur la page)
    const select = document.getElementById("langSelect");
    if (select) {
        select.value = activeLang;
        select.addEventListener("change", (e) => {
            setLanguage(e.target.value);
        });
    }
}

// Export de l'API publique de gestion de langue
export default {
    init: initLanguage,
    set: setLanguage,
    getCurrent: getCurrentLanguage,
    t: translate
};
