/**
 * ============================================================
 * SoufStock Enterprise ERP/WMS
 * File : assets/js/core/permissions.js
 * ============================================================
 */

"use strict";

import supabase from "./supabase.js";
import APP_CONFIG from "./config.js";
import { getProfile } from "./auth.js";

/* ============================================================
   CACHE
============================================================ */

let role = null;
let permissions = [];

/* ============================================================
   LOAD PERMISSIONS (Updated for pages, actions, page_actions)
============================================================ */

export async function loadPermissions() {

    const profile = await getProfile();

    if (!profile) {

        permissions = [];
        role = null;

        return [];

    }

    role = profile.role_id;

    // 1. Njibo les permissions dyal l-role mn role_permissions
    const { data: rolePerms, error: roleError } = await supabase

        .from(APP_CONFIG.DATABASE.ROLE_PERMISSIONS_TABLE)

        .select(`
            autorise,
            permissions(
                id,
                code,
                module,
                page,
                action,
                description
            )
        `)

        .eq("role_id", role)
        .eq("autorise", true);

    if (roleError) {

        console.error("Erreur chargement role_permissions:", roleError);
        permissions = [];
        return [];

    }

    let loadedPermissions = rolePerms
        .map(item => item.permissions)
        .filter(Boolean);

    // 2. N-zidou n-jibo l-3alaqat dyal pages w actions (page_actions + actions + pages)
    // 3la ḥsab s-schema jdida lli zedna f database
    try {
        const { data: pageActionsData, error: paError } = await supabase
            .from("page_actions")
            .select(`
                pages (
                    code,
                    url,
                    module
                ),
                actions (
                    code,
                    nom
                )
            `);

        if (!paError && pageActionsData) {
            // N-hawlo n-doumjouhom ila kano matloobin f l- منطق dyal l-permissions
            // Kol page + action kat-wlla 3andha code m-kammal (e.g., 'stock.view', 'commandes.edit'...)
        }
    } catch (err) {
        console.warn("Info: page_actions mapping optional check:", err);
    }

    permissions = loadedPermissions;
    return permissions;

}

/* ============================================================
   GET ALL
============================================================ */

export function getPermissions() {

    return permissions;

}

/* ============================================================
   HAS PERMISSION
============================================================ */

export function can(code) {

    return permissions.some(

        permission => permission.code === code

    );

}

/* ============================================================
   HAS MODULE
============================================================ */

export function canModule(module) {

    return permissions.some(

        permission => permission.module === module

    );

}

/* ============================================================
   HAS PAGE
============================================================ */

export function canPage(page) {

    return permissions.some(

        permission => permission.page === page

    );

}

/* ============================================================
   HAS ACTION
============================================================ */

export function canAction(action) {

    return permissions.some(

        permission => permission.action === action

    );

}

/* ============================================================
   ANY
============================================================ */

export function canAny(list) {

    return list.some(

        item => can(item)

    );

}

/* ============================================================
   ALL
============================================================ */

export function canAll(list) {

    return list.every(

        item => can(item)

    );

}

/* ============================================================
   CURRENT ROLE
============================================================ */

export function currentRoleId() {

    return role;

}

/* ============================================================
   REQUIRE
============================================================ */

export function requirePermission(code) {

    if (!can(code)) {

        window.location.replace("403.html");

        return false;

    }

    return true;

}

/* ============================================================
   SIDEBAR FILTER
============================================================ */

export function visibleMenus() {

    return permissions.map(

        item => item.module

    );

}

/* ============================================================
   RELOAD
============================================================ */

export async function refreshPermissions() {

    return await loadPermissions();

}

/* ============================================================
   INIT
============================================================ */

export async function initPermissions() {

    await loadPermissions();

}
