/* ============================================================
 * AJOUT DYNAMIQUE DE LOTS & INTERACTION EN TEMPS RÉEL
 * ============================================================
 */

/**
 * Génère une ligne de lot (lot-row) pour un article spécifique
 * @param {number} articleIndex - L'index de l'article parent
 * @returns {HTMLElement} L'élément div de la ligne de lot
 */
function createLotRow(articleIndex) {
    const row = document.createElement("div");
    row.className = "lot-row";

    row.innerHTML = `
        <div class="lot-grid">
            <input
                type="text"
                class="lot-input"
                placeholder="Lot"
                autocomplete="off">
            <input
                type="number"
                class="qty-input"
                placeholder="Qté"
                min="0"
                step="0.001">
            <button
                type="button"
                class="btn-remove"
                title="Supprimer ce lot">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;

    // Écouteur pour la suppression du lot
    row.querySelector(".btn-remove").addEventListener("click", () => {
        row.remove();
        calculatePrepared(articleIndex);
        calculateSummary();
    });

    // Écouteur pour la mise à jour des quantités saisies au clavier
    row.querySelector(".qty-input").addEventListener("input", () => {
        calculatePrepared(articleIndex);
        calculateSummary();
    });

    // Écouteur sur la perte de focus du lot pour déclencher l'aide à la sélection ou vérification de stock
    row.querySelector(".lot-input").addEventListener("blur", async (e) => {
        const lotValue = e.target.value.trim();
        const articleObj = articles[articleIndex];
        if (lotValue && articleObj) {
            try {
                // Recherche des emplacements disponibles pour ce lot
                const stockDispo = await searchLotStock(articleObj.article, lotValue);
                if (stockDispo.length === 0) {
                    Toast.warning(`Aucun stock disponible pour l'article ${articleObj.article} sur le lot ${lotValue}.`);
                } else {
                    const totalDispo = stockDispo.reduce((acc, curr) => acc + curr.quantite, 0);
                    Toast.info(`Lot trouvé. Stock total disponible dans les emplacements prioritaires : ${totalDispo.toFixed(3)} KG.`);
                }
            } catch (err) {
                console.error("Erreur vérification lot :", err);
            }
        }
    });

    return row;
}

/**
 * Calcule et met à jour la quantité préparée totale pour un article donné
 * @param {number} articleIndex - L'index de l'article concerné
 */
function calculatePrepared(articleIndex) {
    const container = document.getElementById(`lots_${articleIndex}`);
    if (!container) return;

    let total = 0;
    container.querySelectorAll(".qty-input").forEach(input => {
        total += Number(input.value || 0);
    });

    const span = document.getElementById(`prepared_${articleIndex}`);
    if (span) {
        span.textContent = total.toFixed(3);
    }

    // Gestion visuelle d'alerte en cas de dépassement de la quantité commandée
    const articleRow = container.closest(".article-row");
    if (articleRow && articles[articleIndex]) {
        const qteCommandee = articles[articleIndex].quantite;
        if (total > qteCommandee) {
            articleRow.style.backgroundColor = "rgba(220, 53, 69, 0.08)"; // Légère surbrillance rouge
        } else {
            articleRow.style.backgroundColor = "";
        }
    }
}

/**
 * Recalcule le résumé global du picking et met à jour la barre de progression
 */
function calculateSummary() {
    let totalArticlesCount = articles.length;
    let totalCommande = 0;
    let totalPrepare = 0;

    articles.forEach((article, index) => {
        totalCommande += article.quantite;
        const span = document.getElementById(`prepared_${index}`);
        if (span) {
            totalPrepare += Number(span.textContent || 0);
        }
    });

    if (els.totalArticles) els.totalArticles.textContent = totalArticlesCount;
    if (els.totalQuantity) els.totalQuantity.textContent = totalCommande.toFixed(3);
    if (els.preparedQuantity) els.preparedQuantity.textContent = totalPrepare.toFixed(3);

    const percent = totalCommande > 0 ? (totalPrepare / totalCommande) * 100 : 0;

    if (els.pickingProgress) els.pickingProgress.style.width = `${percent}%`;
    if (els.progressText) els.progressText.textContent = `${Math.min(100, percent).toFixed(0)}%`;
}

/* ============================================================
 * ALGORITHME DE RECHERCHE ET STRATÉGIE DE SÉLECTION DE STOCK
 * ============================================================
 */

const PRIORITY_LOCATIONS = [
    "A407",
    "A408",
    "A409",
    "A411"
];

/**
 * Recherche les lignes de stock d'un article et d'un lot donnés, triées par priorité d'emplacement
 */
async function searchLotStock(article, lot) {
    const { data, error } = await supabase
        .from("stock")
        .select(`
            id,
            article,
            lot,
            emplacement,
            quantite
        `)
        .eq("article", article)
        .eq("lot", lot)
        .gt("quantite", 0);

    if (error) throw error;
    if (!data) return [];

    return sortStockPriority(data);
}

/**
 * Trie les lignes de stock selon la priorité des emplacements de l'abattoir
 */
function sortStockPriority(stock) {
    return stock.sort((a, b) => {
        const pa = PRIORITY_LOCATIONS.indexOf(a.emplacement);
        const pb = PRIORITY_LOCATIONS.indexOf(b.emplacement);

        // Si aucun des deux n'est dans les zones prioritaires, tri alphabétique classique
        if (pa === -1 && pb === -1) {
            return a.emplacement.localeCompare(b.emplacement);
        }

        if (pa === -1) return 1;  // 'a' n'est pas prioritaire, on place 'b' avant
        if (pb === -1) return -1; // 'b' n'est pas prioritaire, on place 'a' avant

        return pa - pb; // Tri selon l'ordre défini dans le tableau PRIORITY_LOCATIONS
    });
}

/**
 * Propose une ventilation automatique des stocks disponibles pour une quantité requise
 */
async function getAvailableStock(article, lot, quantityNeeded) {
    const stock = await searchLotStock(article, lot);
    let remaining = quantityNeeded;
    const result = [];

    for (const item of stock) {
        if (remaining <= 0) break;

        const qty = Math.min(item.quantite, remaining);
        result.push({
            stock_id: item.id,
            emplacement: item.emplacement,
            lot: item.lot,
            disponible: item.quantite,
            preleve: qty
        });

        remaining -= qty;
    }

    return {
        lignes: result,
        restant: remaining
    };
}

/* ============================================================
 * ENREGISTREMENT ET PERSISTANCE SUPABASE (PERSISTENCE WORKFLOW)
 * ============================================================
 */

/**
 * Sauvegarde temporaire du picking à l'état "EN_COURS"
 */
async function savePicking() {
    if (!currentCommande) {
        Toast.warning("Aucune commande chargée.");
        return;
    }

    try {
        Loader.show?.();

        // 1. Vérification ou création du document d'en-tête de Picking
        if (!currentPicking) {
            const { data, error } = await supabase
                .from("picking")
                .insert({
                    document_vente: currentCommande.numero,
                    utilisateur: currentUser.id,
                    statut: "EN_COURS"
                })
                .select()
                .single();

            if (error) throw error;
            currentPicking = data;
            if (els.pickingId) els.pickingId.value = data.id;
        }

        // 2. Collecte des lots saisis dans le tableau dynamique
        const details = [];
        let totalPreparedForOrder = 0;

        for (let articleIndex = 0; articleIndex < articles.length; articleIndex++) {
            const article = articles[articleIndex];
            const container = document.getElementById(`lots_${articleIndex}`);
            if (!container) continue;

            const lotRows = container.querySelectorAll(".lot-row");
            for (const row of lotRows) {
                const lot = row.querySelector(".lot-input").value.trim();
                const qty = Number(row.querySelector(".qty-input").value || 0);

                if (!lot || qty <= 0) continue;

                totalPreparedForOrder += qty;

                // Identification intelligente de l'ID du stock physique associé pour tracer l'emplacement
                const stockResolution = await searchLotStock(article.article, lot);
                const primaryStockItem = stockResolution[0] || {};

                details.push({
                    picking_id: currentPicking.id,
                    article: article.article,
                    designation_article: article.designation || "",
                    lot: lot,
                    quantite_preparee: qty,
                    quantite_commandee: article.quantite,
                    magasin: "MAG_DEFAULT", // Ajustable selon vos besoins d'abattoir
                    emplacement: primaryStockItem.emplacement || "N/A",
                    stock_id: primaryStockItem.id || null
                });
            }
        }

        // 3. Suppression des anciens détails de picking pour éviter les doublons lors de la réécriture
        await supabase
            .from("picking_details")
            .delete()
            .eq("picking_id", currentPicking.id);

        // 4. Insertion des nouvelles lignes de détails collectées
        if (details.length > 0) {
            const { error: insertError } = await supabase
                .from("picking_details")
                .insert(details);

            if (insertError) throw insertError;
        }

        // 5. Mise à jour de l'avancement global sur l'en-tête picking
        const totalCommandeQty = articles.reduce((acc, curr) => acc + curr.quantite, 0);
        const progressionRatio = totalCommandeQty > 0 ? (totalPreparedForOrder / totalCommandeQty) * 100 : 0;

        await supabase
            .from("picking")
            .update({
                total_articles: articles.length,
                total_prepare: totalPreparedForOrder,
                progression: Math.round(progressionRatio)
            })
            .eq("id", currentPicking.id);

        // 6. Basculer le statut du suivi de commande à l'état d'avancement adéquat
        await supabase
            .from("suivi_commandes_lancer")
            .update({ 
                statut: "EN_PICKING",
                picking_par: currentUser.id
            })
            .eq("document_vente", currentCommande.numero);

        Toast.success("Picking sauvegardé avec succès.");

    } catch (error) {
        console.error("Erreur savePicking :", error);
        Toast.error(`Erreur lors de la sauvegarde : ${error.message || error}`);
    } finally {
        Loader.hide?.();
    }
}

/**
 * Validation finale du picking et verrouillage des états de stock
 */
async function validatePicking() {
    // Une sauvegarde préalable est requise pour s'assurer que l'objet global 'currentPicking' existe
    if (!currentPicking) {
        Toast.warning("Veuillez enregistrer le picking avant de procéder à la validation.");
        return;
    }

    // Double vérification des dépassements de quantités avant clôture définitive
    let hasOverpreparation = false;
    articles.forEach((article, index) => {
        const span = document.getElementById(`prepared_${index}`);
        if (span && Number(span.textContent || 0) > article.quantite) {
            hasOverpreparation = true;
        }
    });

    if (hasOverpreparation) {
        Toast.error("Impossible de valider : des articles comportent des quantités préparées supérieures aux quantités commandées.");
        return;
    }

    // Affichage de la boîte de dialogue de confirmation intégrée
    if (els.confirmModal && els.confirmMessage) {
        els.confirmMessage.textContent = "Êtes-vous sûr de vouloir valider définitivement ce picking ? Cette action verrouillera les lots.";
        els.confirmModal.classList.add("show");
        els.confirmModal.style.display = "flex";

        // Nettoyage des anciens écouteurs sur le bouton "Oui" pour éviter les déclenchements multiples
        const newConfirmYes = els.confirmYes.cloneNode(true);
        els.confirmYes.parentNode.replaceChild(newConfirmYes, els.confirmYes);
        els.confirmYes = newConfirmYes;

        els.confirmYes.addEventListener("click", async () => {
            closeConfirmModal();
            await executeFinalValidation();
        });
    } else {
        // Fallback si la modal personnalisée HTML n'est pas disponible
        if (confirm("Valider définitivement ce picking ?")) {
            await executeFinalValidation();
        }
    }
}

/**
 * Exécute la requête finale de validation dans Supabase et clôture les statuts
 */
async function executeFinalValidation() {
    try {
        Loader.show?.();

        // 1. Passage de l'en-tête à l'état VALIDE
        const { error: pickingErr } = await supabase
            .from("picking")
            .update({
                statut: "VALIDE",
                date_validation: new Date().toISOString()
            })
            .eq("id", currentPicking.id);

        if (pickingErr) throw pickingErr;

        // 2. Clôture de l'étape de suivi de commande
        const { error: suiviErr } = await supabase
            .from("suivi_commandes_lancer")
            .update({ 
                statut: "PICKING_TERMINE",
                date_fin_picking: new Date().toISOString(),
                validation_par: currentUser.id,
                date_validation: new Date().toISOString()
            })
            .eq("document_vente", currentCommande.numero);

        if (suiviErr) throw suiviErr;

        Toast.success("Picking validé et clôturé avec succès.");
        
        // Blocage des boutons pour éviter toute double action sur un document validé
        if (els.btnSave) els.btnSave.disabled = true;
        if (els.btnValidate) els.btnValidate.disabled = true;
        if (els.btnSaveFooter) els.btnSaveFooter.disabled = true;
        if (els.btnValidateFooter) els.btnValidateFooter.disabled = true;
        
        if (els.statutCommande) {
            els.statutCommande.textContent = "VALIDE";
            els.statutCommande.className = "badge badge-success";
        }

    } catch (error) {
        console.error("Erreur executeFinalValidation :", error);
        Toast.error(`Erreur lors de la validation finale : ${error.message}`);
    } finally {
        Loader.hide?.();
    }
}
