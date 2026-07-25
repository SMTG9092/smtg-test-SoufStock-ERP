import supabase, { getUser } from "./assets/js/core/supabase.js";

// DOM Elements
const emailSpan = document.getElementById("user-email");
const userProfileForm = document.getElementById("user-profile-form");
const profilesTableBody = document.getElementById("profiles-table-body");

const profileIdInput = document.getElementById("profile-id");
const nomCompletInput = document.getElementById("nom-complet");
const matriculeInput = document.getElementById("matricule");
const serviceInput = document.getElementById("service");
const posteInput = document.getElementById("poste");
const roleIdInput = document.getElementById("role-id");

// Initialisation l-page
document.addEventListener("DOMContentLoaded", async () => {
    const user = await getUser();
    if (user) {
        emailSpan.textContent = user.email || "Admin";
    }
    loadProfiles();
});

// Chargement dyal les profils mn table user_profiles
async function loadProfiles() {
    try {
        const { data, error } = await supabase
            .from("user_profiles")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            profilesTableBody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-gray-500">Aucun profil trouvé dans user_profiles.</td></tr>`;
            return;
        }

        profilesTableBody.innerHTML = data.map(p => `
            <tr class="border-b border-gray-700 hover:bg-gray-750 transition">
                <td class="p-3 font-semibold text-indigo-300">${p.matricule || '-'}</td>
                <td class="p-3 text-white font-bold">
                    ${p.nom_complet || '-'} 
                    <br><span class="text-xs text-gray-400 font-normal">${p.email || ''}</span>
                </td>
                <td class="p-3 text-gray-300">
                    ${p.service || '-'} 
                    <br><span class="text-xs text-indigo-400">${p.poste || ''}</span>
                </td>
                <td class="p-3">
                    <span class="bg-gray-900 border border-gray-700 px-2.5 py-1 rounded text-xs text-indigo-300 font-semibold">
                        Role ID: ${p.role_id}
                    </span>
                </td>
                <td class="p-3 text-center">
                    <button type="button" onclick="window.editProfile('${p.id}', '${escapeHtml(p.nom_complet || '')}', '${escapeHtml(p.matricule || '')}', '${escapeHtml(p.service || '')}', '${escapeHtml(p.poste || '')}', '${p.role_id}')" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs transition shadow">
                        <i class="fa-solid fa-pen mr-1"></i> Modifier
                    </button>
                </td>
            </tr>
        `).join('');

    } catch (err) {
        console.error("Erreur chargement profiles:", err.message);
        profilesTableBody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-red-400">Erreur lors du chargement des données.</td></tr>`;
    }
}

// Gestion dyal Formulaire Update
if (userProfileForm) {
    userProfileForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const id = profileIdInput.value;

        if (!id) {
            alert("Erreur: Veuillez sélectionner un profil à modifier.");
            return;
        }

        const payload = {
            nom_complet: nomCompletInput.value.trim(),
            matricule: matriculeInput.value.trim() || null,
            service: serviceInput.value.trim() || null,
            poste: posteInput.value.trim() || null,
            role_id: parseInt(roleIdInput.value) || 1,
            updated_at: new Date().toISOString()
        };

        try {
            const { error } = await supabase
                .from("user_profiles")
                .update(payload)
                .eq("id", id);

            if (error) throw error;

            alert("Profil mis à jour avec succès !");
            window.resetForm();
            loadProfiles();

        } catch (err) {
            alert("Erreur lors de la mise à jour: " + err.message);
        }
    });
}

// Fonctions Globales bikhosos l-modification w reset
window.editProfile = function(id, nom, matricule, service, poste, roleId) {
    profileIdInput.value = id;
    nomCompletInput.value = nom;
    matriculeInput.value = matricule;
    serviceInput.value = service;
    posteInput.value = poste;
    roleIdInput.value = roleId;

    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.resetForm = function() {
    userProfileForm.reset();
    profileIdInput.value = "";
    roleIdInput.value = "1";
};

// Helper function bach n-evitiw l-problèmes dyal l-caractères spéciaux f l-HTML
function escapeHtml(str) {
    return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
