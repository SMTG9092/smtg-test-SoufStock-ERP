// Config Supabase (Badl had les valeurs b'les vôtres dyal Supabase)
const SUPABASE_URL = 'VOTRE_SUPABASE_URL';
const SUPABASE_KEY = 'VOTRE_SUPABASE_ANON_KEY';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let selectedFile = null;

const fileInput = document.getElementById('excelFile');
const dropZone = document.getElementById('dropZone');
const browseTrigger = document.getElementById('browseTrigger');
const fileNameSpan = document.getElementById('fileName');
const btnImport = document.getElementById('btnImport');
const logContainer = document.getElementById('logContainer');

function log(message, type = 'info') {
    const p = document.createElement('p');
    p.className = `log-${type}`;
    p.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logContainer.appendChild(p);
    logContainer.scrollTop = logContainer.scrollHeight;
}

// Gestion dyal Drag & Drop w Selection
browseTrigger.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.background = '#e2e8f0'; });
dropZone.addEventListener('dragleave', () => { dropZone.style.background = '#f1f5f9'; });
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.background = '#f1f5f9';
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});

function handleFile(file) {
    if (!file) return;
    selectedFile = file;
    fileNameSpan.textContent = file.name;
    btnImport.disabled = false;
    log(`Fichier sélectionné : ${file.name}`, 'info');
}

// Lancement de l'import
btnImport.addEventListener('click', async () => {
    if (!selectedFile) return;

    btnImport.disabled = true;
    log("Lecture du fichier Excel en cours...", "info");

    const reader = new FileReader();
    reader.onload = async function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // Conversion Excel l JSON
            const rawRows = XLSX.utils.sheet_to_json(worksheet);
            log(`${rawRows.length} lignes lues depuis le fichier Excel.`, 'info');

            const importType = document.getElementById('importType').value;
            const targetTable = importType === 'COMMANDES_KG' ? 'commandes_excel' : 'commandes_clients_pieces';

            // Mapping des colonnes (Kay-gérer gaç les variations l'li f les images)
            const mappedRows = rawRows.map((row, index) => {
                return {
                    document_vente: String(row['Document de vente'] || row['NUCOMD'] || ''),
                    ligne_commande: row['Ligne'] || (index + 1) * 10,
                    client: row['Client'] || row['RECEPTIONNAIRE'] || row['Nom Réceptionnaire'] || 'CLIENT INCONNU',
                    nom_receptionnaire: row['Nom Réceptionnaire'] || row['RECEPTIONNAIRE'] || null,
                    article: String(row['Article'] || row['ARTICLE'] || ''),
                    designation_article: row['Description d\'article'] || row['DESIGNATION'] || 'SANS DESIGNATION',
                    quantite_commandee: parseFloat(row['Quantité commandée (poste)'] || row['QT COMD'] || 0),
                    itineraire: row['Description Itinéraire'] || row['ZONE DISTRIBUTION'] || null,
                    date_livraison: row['Date de livraison'] || null,
                    statut: 'IMPORTEE'
                };
            }).filter(r => r.document_vente && r.article);

            log(`Données mappées avec succès (${mappedRows.length} lignes valides). Insertion dans Supabase...`, 'info');

            // Insertion f Supabase
            const { data, error } = await supabase
                .from(targetTable)
                .upsert(mappedRows, { onConflict: 'document_vente,ligne_commande' });

            if (error) throw error;

            log("Importation et synchronisation terminées avec succès !", "success");
        } catch (err) {
            log(`Erreur lors de l'import : ${err.message}`, 'error');
        } finally {
            btnImport.disabled = false;
        }
    };
    reader.readAsArrayBuffer(selectedFile);
});
