/**
 * ============================================================
 * SoufStock Enterprise ERP/WMS
 * File : assets/js/picking.js
 * ============================================================
 */

Part 1
-------
- Imports
- Variables
- DOM Elements
- Initialisation
- Event Listeners

Part 2
-------
- Charger Commande
- Lire Supabase
- Afficher Informations Commande

Part 3
-------
- Construire Tableau
- createArticleRow()
- createLotRow()

Part 4
-------
- Ajouter Lot
- Supprimer Lot
- Calcul Préparée
- Calcul Résumé

Part 5
-------
- Validation
- Sauvegarde
- Messages
- Loader

Part 6
-------
- Helpers
- Format
- Reset
- Export default
/**
 * ============================================================
 * Charger Commande
 * Part 2
 * ============================================================
 */

/**
 * Charger une commande
 */
async function loadCommande() {

    try {

        const numeroCommande = commandeInput.value.trim();

        if (!numeroCommande) {

            Toast.warning("Veuillez saisir un numéro de commande.");

            commandeInput.focus();

            return;

        }

        Loader.show("Chargement de la commande...");

        resetPicking();

        /* =======================================================
           Informations Commande
        ======================================================= */

        const { data: commande, error: commandeError } = await supabase
            .from("commandes_excel")
            .select("*")
            .eq("document_vente", numeroCommande)
            .limit(1)
            .single();

        if (commandeError || !commande) {

            Loader.hide();

            Toast.error("Commande introuvable.");

            return;

        }

        displayCommandeInfo(commande);

        /* =======================================================
           Articles Commande
        ======================================================= */

        const { data: articles, error: articlesError } = await supabase
            .from("commandes_excel")
            .select("*")
            .eq("document_vente", numeroCommande)
            .order("id", { ascending: true });

        Loader.hide();

        if (articlesError) {

            Toast.error(articlesError.message);

            return;

        }

        if (!articles || !articles.length) {

            Toast.warning("Aucun article trouvé.");

            return;

        }

        buildPickingTable(articles);

    } catch (error) {

        Loader.hide();

        console.error(error);

        Toast.error(error.message);

    }

}


/**
 * ============================================================
 * Affichage Informations Commande
 * ============================================================
 */

function displayCommandeInfo(commande) {

    clientName.textContent =
        commande.nom_receptionnaire ?? "-";

    dateCreation.textContent =
        formatDate(commande.date_creation);

    dateLivraison.textContent =
        formatDate(commande.date_livraison);

    tournee.textContent =
        commande.tournee ?? "-";

    chauffeur.textContent =
        commande.chauffeur ?? "-";

    statutCommande.textContent =
        "En préparation";

    statutCommande.className =
        "badge badge-warning";

}


/**
 * ============================================================
 * Reset
 * ============================================================
 */

function resetPicking() {

    pickingBody.innerHTML = "";

    clientName.textContent = "-";

    dateCreation.textContent = "-";

    dateLivraison.textContent = "-";

    tournee.textContent = "-";

    chauffeur.textContent = "-";

    statutCommande.textContent = "-";

    totalArticles.textContent = "0";

    totalQuantity.textContent = "0";

    preparedQuantity.textContent = "0";

}
/**
 * ============================================================
 * Picking Table
 * Part 3
 * ============================================================
 */

/**
 * Construire le tableau
 */
function buildPickingTable(articles) {

    pickingBody.innerHTML = "";

    totalArticles.textContent = articles.length;

    let totalQte = 0;

    articles.forEach(article => {

        totalQte += Number(article.quantite_commandee || 0);

        createArticleRow(article);

    });

    totalQuantity.textContent = totalQte;

}


/**
 * ============================================================
 * Ligne Article
 * ============================================================
 */

function createArticleRow(article) {

    const tr = document.createElement("tr");

    tr.className = "article-row";

    tr.dataset.article = article.article;

    tr.innerHTML = `

        <td class="article-name">

            ${article.designation_article}

        </td>

        <td class="text-center">

            ${article.quantite_commandee}

        </td>

        <td class="prepared-total">

            0

        </td>

        <td class="text-center">

            ${article.nb_pieces || 0}

        </td>

        <td>

            <input
                type="text"
                class="lot-input"
                placeholder="Lot">

        </td>

        <td>

            <input
                type="number"
                class="qty-input"
                min="0"
                value="">

        </td>

        <td>

            <button
                class="btn-add"
                type="button">

                +

            </button>

        </td>

    `;

    pickingBody.appendChild(tr);

}


/**
 * ============================================================
 * Ajouter une ligne Lot
 * ============================================================
 */

function createLotRow(articleRow) {

    const row = document.createElement("tr");

    row.className = "lot-row";

    row.innerHTML = `

        <td colspan="4"></td>

        <td>

            <input
                type="text"
                class="lot-input"
                placeholder="Lot">

        </td>

        <td>

            <input
                type="number"
                class="qty-input"
                min="0">

        </td>

        <td>

            <button
                class="btn-remove"
                type="button">

                -

            </button>

        </td>

    `;

    articleRow.insertAdjacentElement("afterend", row);

}
