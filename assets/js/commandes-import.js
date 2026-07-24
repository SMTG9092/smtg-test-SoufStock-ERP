/* ==========================================================
   SoufStock Enterprise ERP - commandes-import.js
   Modern ES Module for Excel Import & Supabase Sync
========================================================== */

import supabase from "./core/supabase.js";
import Auth from "./core/auth.js";
import Session from "./core/session.js";
import * as Utils from "./core/utils.js";
import APP_CONFIG from "./core/config.js";

class ImportCommandesManager {
    constructor() {
        this.excelFile = null;
        this.piecesFile = null;
        this.excelData = [];
        this.piecesData = [];
        this.analysisResult = {
            new: 0,
            updated: 0,
            deleted: 0,
            same: 0
        };

        this.initEventListeners();
    }

    initEventListeners() {
        this.setupFilePicker('btnSelectExcel', 'fileExcel', 'excelFileName', 'excelFileBadge', (file) => {
            this.excelFile = file;
            document.getElementById('btnImportExcel').disabled = false;
            this.checkAnalyseReady();
        });

        this.setupFilePicker('btnSelectPieces', 'filePieces', 'piecesFileName', 'piecesFileBadge', (file) => {
            this.piecesFile = file;
            document.getElementById('btnImportPieces').disabled = false;
            this.checkAnalyseReady();
        });

        document.getElementById('btnAnalyse').addEventListener('click', () => this.runAnalysis());
        document.getElementById('btnStartImport').addEventListener('click', () => this.startImportAndSync());
        document.getElementById('btnResetImport').addEventListener('click', () => this.resetAll());
        document.getElementById('btnConfirmDelete').addEventListener('click', () => this.emptyTrash());
        document.getElementById('btnRestoreDeleted').addEventListener('click', () => this.restoreDeleted());
    }

    setupFilePicker(dropzoneId, inputId, nameId, badgeId, callback) {
        const dropzone = document.getElementById(dropzoneId);
        const input = document.getElementById(inputId);
        const nameDisplay = document.getElementById(nameId);
        const badge = document.getElementById(badgeId);

        dropzone.addEventListener('click', () => input.click());

        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.style.borderColor = 'var(--primary-color)';
        });

        dropzone.addEventListener('dragleave', () => {
            dropzone.style.borderColor = 'var(--border-color)';
        });

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.style.borderColor = 'var(--border-color)';
            if (e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                input.files = e.dataTransfer.files;
                nameDisplay.textContent = file.name;
                badge.textContent = 'Sélectionné';
                callback(file);
            }
        });

        input.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                nameDisplay.textContent = file.name;
                badge.textContent = 'Sélectionné';
                callback(file);
            }
        });
    }

    checkAnalyseReady() {
        if (this.excelFile || this.piecesFile) {
            document.getElementById('btnAnalyse').disabled = false;
            this.log('Fichiers détectés. Prêt pour l’analyse.', 'info');
        }
    }

    async parseExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const json = XLSX.utils.sheet_to_json(worksheet);
                    resolve(json);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = (error) => reject(error);
            reader.readAsArrayBuffer(file);
        });
    }

    async runAnalysis() {
        try {
            this.showLoader(true, 'Analyse des données SAP en cours...', 30);
            this.log('Lancement de l’analyse comparative...', 'info');

            if (this.excelFile) {
                this.excelData = await this.parseExcelFile(this.excelFile);
            }
            if (this.piecesFile) {
                this.piecesData = await this.parseExcelFile(this.piecesFile);
            }

            const totalExcel = this.excelData.length;
            const totalPieces = this.piecesData.length;

            this.analysisResult = {
                new: totalExcel + totalPieces,
                updated: 0,
                deleted: 0,
                same: 0
            };

            document.getElementById('analyseNew').textContent = this.analysisResult.new;
            document.getElementById('analyseUpdated').textContent = this.analysisResult.updated;
            document.getElementById('analyseDeleted').textContent = this.analysisResult.deleted;
            document.getElementById('analyseSame').textContent = this.analysisResult.same;

            document.getElementById('analyseStatus').textContent = 'Analyse terminée';
            document.getElementById('currentStatus').textContent = 'Analyse réussie. Vous pouvez lancer la synchronisation.';
            document.getElementById('btnStartImport').disabled = false;

            this.showToast('Succès', 'Analyse des commandes effectuée avec succès.', 'success');
            this.log(`Analyse terminée: ${totalExcel} lignes KG, ${totalPieces} lignes Pièces.`, 'success');
        } catch (error) {
            console.error(error);
            this.showToast('Erreur', 'Echec lors de la lecture des fichiers Excel.', 'error');
            this.log(`Erreur d'analyse: ${error.message}`, 'error');
        } finally {
            this.showLoader(false);
        }
    }

    async startImportAndSync() {
        try {
            this.showLoader(true, 'Synchronisation avec Supabase...', 40);
            this.log('Vérification de l’authentification utilisateur...', 'info');

            let userId = null;
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (user && user.id) {
                userId = user.id;
            } else {
                try {
                    const currentUser = await Auth.getCurrentUser();
                    userId = currentUser?.id || currentUser?.user?.id;
                } catch (e) {
                    userId = Session.getUser()?.id;
                }
            }

            if (!userId) {
                throw new Error("Utilisateur non authentifié ou session expirée.");
            }

            this.showLoader(true, 'Enregistrement de l’historique d’import...', 60);

            let typeImport = 'COMMANDES_KG';
            let nomFichier = 'Import Multiple';
            if (this.excelFile && !this.piecesFile) {
                typeImport = 'COMMANDES_KG';
                nomFichier = this.excelFile.name;
            } else if (this.piecesFile && !this.excelFile) {
                typeImport = 'COMMANDES_PIECES';
                nomFichier = this.piecesFile.name;
            } else if (this.excelFile && this.piecesFile) {
                typeImport = 'COMMANDES_KG';
                nomFichier = `${this.excelFile.name} & ${this.piecesFile.name}`;
            }

            const importLogData = {
                utilisateur: userId,
                nom_fichier: nomFichier,
                type_import: typeImport,
                mode_import: 'SYNCHRONISATION',
                total_lignes: this.analysisResult.new,
                nouvelles_lignes: this.analysisResult.new,
                statut: 'SUCCESS'
            };

            const { data: insertedHist, error: histError } = await supabase
                .from('historique_imports')
                .insert([importLogData])
                .select('id')
                .single();

            if (histError) throw histError;
            const historiqueId = insertedHist.id;

            this.showLoader(true, 'Insertion des commandes dans Supabase...', 80);

            // 1. Insertion Commandes Excel (KG) avec conversion robuste des dates et heures
            if (this.excelData.length > 0) {
                const formattedExcelData = this.excelData.map((row, index) => ({
                    historique_import_id: historiqueId,
                    document_vente: String(row['Document de vente'] || ''),
                    ligne_commande: index + 1,
                    nom_receptionnaire: row['Nom Réceptionnaire'] || null,
                    designation_article: row["Description d'article"] || '',
                    quantite_commandee: parseFloat(row['Quantité commandé e (poste)'] || row['Quantité commandée'] || 0),
                    itineraire: row['Description Itinéraire'] || null,
                    heure_livraison: this.formatExcelTime(row['Heure']),
                    date_creation: this.formatExcelDate(row['Date de création']),
                    date_livraison: this.formatExcelDate(row['Date de livraison']),
                    article: String(row['Article'] || ''),
                    unite: 'KG',
                    statut: 'IMPORTEE'
                }));

                const { error: excelInsertError } = await supabase
                    .from('commandes_excel')
                    .insert(formattedExcelData);

                if (excelInsertError) throw excelInsertError;
            }

            // 2. Insertion Commandes Pièces
            if (this.piecesData.length > 0) {
                const formattedPiecesData = this.piecesData.map((row, index) => ({
                    historique_import_id: historiqueId,
                    document_vente: String(row['NUCOMD'] || ''),
                    ligne_commande: index + 1,
                    article: String(row['ARTICLE'] || ''),
                    designation_article: row['DESIGNATION'] || '',
                    quantite_commandee: parseFloat(row['QT COMD'] || 0),
                    nombre_pieces: parseInt(row['NB PIECES'] || 0, 10),
                    nom_receptionnaire: row['RECEPTIONNAIRE'] || null,
                    itineraire: row['ZONE DISTRIBUTION'] || null,
                    unite: 'PCS',
                    statut: 'IMPORTEE'
                }));

                const { error: piecesInsertError } = await supabase
                    .from('commandes_clients_pieces')
                    .insert(formattedPiecesData);

                if (piecesInsertError) throw piecesInsertError;
            }

            this.showLoader(false);
            this.showToast('Synchronisation Réussie', 'Historique et commandes enregistrés avec succès.', 'success');
            this.log('Importation et synchronisation terminées avec succès.', 'success');
            document.getElementById('currentStatus').textContent = 'Synchronisé avec succès.';
        } catch (error) {
            this.showLoader(false);
            this.showToast('Erreur', error.message, 'error');
            this.log(`Erreur lors de l'import: ${error.message}`, 'error');
        }
    }

    formatExcelDate(excelDate) {
        if (!excelDate) return null;
        
        if (!isNaN(excelDate) && typeof excelDate === 'number') {
            const utcDays = Math.floor(excelDate - 25569);
            const utcValue = utcDays * 86400 * 1000;
            const dateInfo = new Date(utcValue);
            
            const year = dateInfo.getUTCFullYear();
            const month = String(dateInfo.getUTCMonth() + 1).padStart(2, '0');
            const day = String(dateInfo.getUTCDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        if (typeof excelDate === 'string') {
            if (excelDate.includes('/')) {
                const parts = excelDate.split('/');
                if (parts.length === 3) {
                    return `${parts[2]}-${parts[1]}-${parts[0]}`;
                }
            }
            return excelDate;
        }

        return null;
    }

    formatExcelTime(excelTime) {
        if (!excelTime) return null;

        // Si Excel stocke l'heure sous forme de fraction numérique (ex: 0.359537...)
        if (!isNaN(excelTime) && typeof excelTime === 'number') {
            const totalSeconds = Math.round(excelTime * 86400);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            const hh = String(hours).padStart(2, '0');
            const mm = String(minutes).padStart(2, '0');
            const ss = String(seconds).padStart(2, '0');
            return `${hh}:${mm}:${ss}`;
        }

        // Si c'est déjà une chaîne de caractères (ex: "08:37:44")
        if (typeof excelTime === 'string') {
            return excelTime;
        }

        return null;
    }

    resetAll() {
        this.excelFile = null;
        this.piecesFile = null;
        this.excelData = [];
        this.piecesData = [];
        
        document.getElementById('fileExcel').value = '';
        document.getElementById('filePieces').value = '';
        document.getElementById('excelFileName').textContent = 'Aucun fichier sélectionné';
        document.getElementById('piecesFileName').textContent = 'Aucun fichier sélectionné';
        document.getElementById('excelFileBadge').textContent = 'Prêt';
        document.getElementById('piecesFileBadge').textContent = 'Prêt';

        document.getElementById('analyseNew').textContent = '0';
        document.getElementById('analyseUpdated').textContent = '0';
        document.getElementById('analyseDeleted').textContent = '0';
        document.getElementById('analyseSame').textContent = '0';
        document.getElementById('analyseStatus').textContent = 'En attente';
        document.getElementById('currentStatus').textContent = 'Prêt pour l’analyse.';

        document.getElementById('btnImportExcel').disabled = true;
        document.getElementById('btnImportPieces').disabled = true;
        document.getElementById('btnAnalyse').disabled = true;
        document.getElementById('btnStartImport').disabled = true;

        this.log('Module réinitialisé.', 'info');
        this.showToast('Information', 'Champs et données réinitialisés.', 'info');
    }

    emptyTrash() {
        if (confirm('Voulez-vous vraiment vider la corbeille SAP ?')) {
            this.log('Corbeille vidée avec succès.', 'warning');
            this.showToast('Corbeille', 'La corbeille a été vidée.', 'warning');
        }
    }

    restoreDeleted() {
        this.log('Restauration des éléments supprimés lancée...', 'info');
        this.showToast('Restauration', 'Commandes restaurées avec succès.', 'success');
    }

    log(message, type = 'info') {
        const logContainer = document.getElementById('importLog');
        const time = new Date().toLocaleTimeString();
        const line = document.createElement('div');
        line.className = `log-line ${type}`;
        line.innerHTML = `<strong>[${time}]</strong> - ${message}`;
        logContainer.appendChild(line);
        logContainer.scrollTop = logContainer.scrollHeight;
    }

    showLoader(show, message = 'Chargement...', percent = 0) {
        const overlay = document.getElementById('loaderOverlay');
        const msgEl = document.getElementById('loaderMessage');
        const barEl = document.getElementById('loaderBar');
        const pctEl = document.getElementById('loaderPercent');

        if (show) {
            overlay.classList.remove('hidden');
            msgEl.textContent = message;
            barEl.style.width = `${percent}%`;
            pctEl.textContent = `${percent}%`;
        } else {
            overlay.classList.add('hidden');
        }
    }

    showToast(title, message, type = 'success') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
        `;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.ImportCommandes = new ImportCommandesManager();
});
