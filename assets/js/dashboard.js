/**
 * SoufStock Enterprise ERP - Dashboard Module
 */
import API from "./core/api.js";
import Auth from "./core/auth.js";
import Language from "./core/language.js";
import Theme from "./core/theme.js";
import Router from "./core/router.js";
import { initPermissions, can } from "./core/permissions.js";

document.addEventListener("DOMContentLoaded", async () => {
    // Initialization
    await initPermissions();
    Language.init();
    Theme.init();

    const user = await Auth.getUser();
    if (!user) Router.navigate(Router.PATHS.login);

    // Load Data
    renderDashboard(user);
    initCharts();
});

async function renderDashboard(user) {
    document.getElementById("welcomeMsg").innerText = `Bienvenue, ${user.email}`;
    
    // Fetch stats using API core
    const stats = await API.count("items"); 
    renderStats(stats.data);
    
    // Initialize Sidebar based on permissions
    const sidebar = document.getElementById("sidebar");
    // Logic to build menu dynamically using Router and Permissions
}

async function initCharts() {
    const ctx = document.getElementById('stockChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr'],
            datasets: [{ label: 'Stock Evolution', data: [12, 19, 3, 5], borderColor: '#00703c' }]
        },
        options: { responsive: true }
    });
}

function renderStats(count) {
    const container = document.getElementById("statsContainer");
    container.innerHTML = `
        <div class="stat-card"><h3>Total Stock</h3><p>${count}</p></div>
        `;
}
