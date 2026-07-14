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
   LOAD PERMISSIONS
============================================================ */

export async function loadPermissions() {

    const profile = await getProfile();

    if (!profile) {

        permissions = [];
        role = null;

        return [];

    }

    role = profile.role_id;

    const { data, error } = await supabase

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

    if (error) {

        console.error(error);

        permissions = [];

        return [];

    }

    permissions = data
        .map(item => item.permissions)
        .filter(Boolean);

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
