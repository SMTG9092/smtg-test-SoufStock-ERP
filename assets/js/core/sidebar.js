/**
 * ============================================================
 * SoufStock Enterprise ERP
 * sidebar.js
 * ============================================================
 */

import Permissions from "./permissions.js";

class SidebarManager {

    constructor() {

        this.sidebar = null;
        this.toggle = null;
        this.links = [];

        this.storageKey = "soufstock_sidebar";

    }

    /* ============================================================
     * INIT
     * ============================================================ */

    init() {

        this.sidebar = document.getElementById("sidebar");

        this.toggle = document.getElementById("sidebarToggle");

        this.links = [

            ...document.querySelectorAll(".nav-item")

        ];

        this.restore();

        this.applyPermissions();

        this.bindToggle();

        this.bindLinks();

    }

    /* ============================================================
     * PERMISSIONS
     * ============================================================ */

    applyPermissions() {

        this.links.forEach(link => {

            const permission =

                link.dataset.permission;

            if (!permission) return;

            if (Permissions.can(permission)) {

                link.hidden = false;

            }

            else {

                link.hidden = true;

            }

        });

    }

    /* ============================================================
     * EVENTS
     * ============================================================ */

    bindLinks() {

        this.links.forEach(link => {

            link.addEventListener("click", e => {

                e.preventDefault();

                const page =

                    link.dataset.page;

                if (!page) return;

                this.setActive(page);

                window.dispatchEvent(

                    new CustomEvent(

                        "navigate",

                        {

                            detail: {

                                page

                            }

                        }

                    )

                );

            });

        });

    }

    /* ============================================================
     * ACTIVE
     * ============================================================ */

    setActive(page) {

        this.links.forEach(link => {

            link.classList.remove("active");

            if (

                link.dataset.page === page

            ) {

                link.classList.add("active");

            }

        });

    }

    /* ============================================================
     * TOGGLE
     * ============================================================ */

    bindToggle() {

        if (

            !this.sidebar ||

            !this.toggle

        ) return;

        this.toggle.addEventListener(

            "click",

            () => this.toggleSidebar()

        );

    }

    toggleSidebar() {

        this.sidebar.classList.toggle(

            "collapsed"

        );

        this.save();

    }

    /* ============================================================
     * STORAGE
     * ============================================================ */

    save() {

        localStorage.setItem(

            this.storageKey,

            this.sidebar.classList.contains(

                "collapsed"

            )

        );

    }

    restore() {

        const value =

            localStorage.getItem(

                this.storageKey

            );

        if (

            value === "true"

        ) {

            this.sidebar?.classList.add(

                "collapsed"

            );

        }

    }

    /* ============================================================
     * HELPERS
     * ============================================================ */

    collapse() {

        this.sidebar?.classList.add(

            "collapsed"

        );

        this.save();

    }

    expand() {

        this.sidebar?.classList.remove(

            "collapsed"

        );

        this.save();

    }

    isCollapsed() {

        return this.sidebar?.classList.contains(

            "collapsed"

        );

    }

}

const Sidebar = new SidebarManager();

export default Sidebar;
