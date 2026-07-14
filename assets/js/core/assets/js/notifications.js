/**
 * ============================================================
 * SoufStock Enterprise ERP
 * notifications.js
 * ============================================================
 */

import { Toast } from "./utils.js";

class NotificationsManager {

    constructor() {

        this.notifications = [];

        this.container = null;
        this.badge = null;
        this.panel = null;

    }

    /* ============================================================
     * INIT
     * ============================================================
     */

    init() {

        this.container =
            document.getElementById("notificationsList");

        this.badge =
            document.getElementById("notificationsBadge");

        this.panel =
            document.getElementById("notificationsPanel");

        this.bindEvents();

        this.render();

    }

    /* ============================================================
     * EVENTS
     * ============================================================
     */

    bindEvents() {

        document

            .getElementById("notificationsButton")

            ?.addEventListener(

                "click",

                () => this.toggle()

            );

        document.addEventListener(

            "click",

            e => {

                if (!this.panel) return;

                if (

                    !this.panel.contains(e.target)

                    &&

                    !e.target.closest("#notificationsButton")

                ) {

                    this.panel.classList.remove("show");

                }

            }

        );

    }

    /* ============================================================
     * TOGGLE
     * ============================================================
     */

    toggle() {

        if (!this.panel) return;

        this.panel.classList.toggle("show");

    }

    /* ============================================================
     * ADD
     * ============================================================
     */

    add(title, message, type = "info") {

        this.notifications.unshift({

            id: Date.now(),

            title,

            message,

            type,

            read: false,

            createdAt: new Date()

        });

        Toast[type]?.(

            title,

            message

        );

        this.render();

    }

    /* ============================================================
     * MARK AS READ
     * ============================================================
     */

    markAsRead(id) {

        const notification =

            this.notifications.find(

                item => item.id === id

            );

        if (notification) {

            notification.read = true;

        }

        this.render();

    }

    /* ============================================================
     * REMOVE
     * ============================================================
     */

    remove(id) {

        this.notifications =

            this.notifications.filter(

                item => item.id !== id

            );

        this.render();

    }

    /* ============================================================
     * CLEAR
     * ============================================================
     */

    clear() {

        this.notifications = [];

        this.render();

    }

    /* ============================================================
     * BADGE
     * ============================================================
     */

    updateBadge() {

        if (!this.badge) return;

        const unread =

            this.notifications.filter(

                item => !item.read

            ).length;

        this.badge.textContent = unread;

        this.badge.style.display =

            unread ? "flex" : "none";

    }

    /* ============================================================
     * RENDER
     * ============================================================
     */

    render() {

        if (!this.container) return;

        this.container.innerHTML = "";

        if (

            this.notifications.length === 0

        ) {

            this.container.innerHTML =

            `

            <div class="notification-empty">

                Aucune notification

            </div>

            `;

            this.updateBadge();

            return;

        }

        this.notifications.forEach(item => {

            this.container.insertAdjacentHTML(

                "beforeend",

                `

                <div class="notification-item ${item.read ? "read" : ""}" data-id="${item.id}">

                    <div class="notification-title">

                        ${item.title}

                    </div>

                    <div class="notification-message">

                        ${item.message}

                    </div>

                    <div class="notification-date">

                        ${item.createdAt.toLocaleString("fr-FR")}

                    </div>

                </div>

                `

            );

        });

        this.container

            .querySelectorAll(".notification-item")

            .forEach(item => {

                item.addEventListener(

                    "click",

                    () => this.markAsRead(

                        Number(

                            item.dataset.id

                        )

                    )

                );

            });

        this.updateBadge();

    }

    /* ============================================================
     * DEFAULTS
     * ============================================================
     */

    loadDefaults() {

        this.add(

            "Bienvenue",

            "Connexion réussie.",

            "success"

        );

    }

    /* ============================================================
     * GETTERS
     * ============================================================
     */

    getAll() {

        return this.notifications;

    }

    getUnreadCount() {

        return this.notifications.filter(

            item => !item.read

        ).length;

    }

}

const Notifications = new NotificationsManager();

export default Notifications;
