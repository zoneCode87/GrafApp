// resources/js/ui_manager.js
import { SensorDashboard } from './sensor.js';
import { GraphManager } from './Graph.js'; 

const sensor = new SensorDashboard("sensorGrid");

export class UIManager {
    constructor(configManager) {
        this.config = configManager;
        this.graphManager = new GraphManager('graphContainer'); 
        
        this.graphManager.onGraphDeleted = (graphId) => {
            this.removeGraphFromStorage(graphId);
        };

        // Initialize Notyf for professional notifications
        this.notyf = new Notyf({
            duration: 3000,
            position: { x: 'right', y: 'top' },
            types: [
                {
                    type: 'warning',
                    background: 'orange',
                    icon: {
                        className: 'fa-solid fa-triangle-exclamation',
                        tagName: 'i',
                        color: 'white'
                    }
                }
            ]
        });

        this.btnViewDashboard = document.getElementById('btnViewDashboard');
        this.btnViewGraph = document.getElementById('btnViewGraph');
        this.viewDashboard = document.getElementById('view-dashboard');
        this.viewGraphs = document.getElementById('view-graphs');

        this.settingsModal = document.getElementById('settingsModal');
        this.btnSettings = document.getElementById('btnSettings');
        this.btnCloseSettings = document.getElementById('btnCloseSettings');
        this.btnSaveSettings = document.getElementById('btnSaveSettings');
        this.settingsTableBody = document.getElementById('settingsTableBody');
        
        this.btnConect = document.getElementById("btnConnect");
        this.btnStart = document.getElementById("btnPlay");
        this.btnStop = document.getElementById("btnStop");
        this.btnCSV = document.getElementById("btnCsv");

        this.btnAddGraph = document.getElementById('btnAddGraph');
        this.addGraphModal = document.getElementById('addGraphModal');
        this.btnCloseGraphModal = document.getElementById('btnCloseGraphModal');
        this.btnConfirmAddGraph = document.getElementById('btnConfirmAddGraph');
        this.graphTypeRadios = document.getElementsByName('graphType');
        this.basicGraphSection = document.getElementById('basicGraphSection');
        this.equationGraphSection = document.getElementById('equationGraphSection');
        this.csvGraphSection = document.getElementById('csvGraphSection'); 
        
        this.sensorCheckboxes = document.getElementById('sensorCheckboxes');
        this.eqGraphName = document.getElementById('eqGraphName');
        this.eqGraphFormula = document.getElementById('eqGraphFormula');
        this.availableVarsList = document.getElementById('availableVarsList');

        this.csvBuffer = []; 
        this.csvHeaders = new Map(); 
        this.startTime = Date.now(); 
        this.isRunning = false; 

        this.initEvents();        
    }

    logCSVFrame(sensorsArray) {
        if (this.csvBuffer.length === 0) {
            this.csvHeaders.clear();
            this.csvHeaders.set('No', '#'); 
            this.csvHeaders.set('Time', 'Time'); 
        }

        let now = new Date();
        let hours = String(now.getHours()).padStart(2, '0');
        let minutes = String(now.getMinutes()).padStart(2, '0');
        let seconds = String(now.getSeconds()).padStart(2, '0');
        let realTime = `${hours}:${minutes}:${seconds}`;
        
        let rowNumber = this.csvBuffer.length + 1;
        let row = { 'No': rowNumber, 'Time': realTime };

        sensorsArray.forEach(sensorObj => {
            let sensorKey = Object.keys(sensorObj)[0];
            let nameElement = document.getElementById(`name-${sensorKey}`);
            let valElement = document.getElementById(`val-${sensorKey}`);
            
            let displayName = nameElement ? nameElement.innerText : sensorKey;
            let displayValue = valElement ? valElement.innerText : sensorObj[sensorKey];
            
            this.csvHeaders.set(sensorKey, displayName); 
            row[sensorKey] = displayValue;      
        });

        this.csvBuffer.push(row);
    }

    save_csv_file() {
        this.btnCSV.addEventListener('click', async () => {
            if (this.isRunning) {
                this.notyf.open({ type: 'warning', message: "Please stop data acquisition before saving the file!" });
                return;
            }
            if (this.csvBuffer.length === 0) {
                this.notyf.error("No recorded data available to save!");
                return;
            }

            try {
                let keys = Array.from(this.csvHeaders.keys()); 
                let displayNames = keys.map(k => this.csvHeaders.get(k)); 
                let csvString = displayNames.join(",") + "\n";

                this.csvBuffer.forEach(row => {
                    let rowData = keys.map(key => row[key] !== undefined ? row[key] : "");
                    csvString += rowData.join(",") + "\n";
                });
                
                let filePath = await Neutralino.os.showSaveDialog('Save Sensor Data', {
                    defaultPath: 'sensor_data.csv',
                    filters: [{ name: 'CSV Files', extensions: ['csv'] }]
                });

                if (filePath) {
                    await Neutralino.filesystem.writeFile(filePath, csvString);
                    this.notyf.success("File saved successfully!");
        
                    let confirmClear = confirm("Would you like to clear the recorded data to start a fresh session?");
                    if (confirmClear) {
                        this.csvBuffer = [];
                        this.csvHeaders.clear(); 
                    }
                }
            } catch (err) {
                console.error("❌ File Save Error:", err);
                this.notyf.error("An error occurred while saving the CSV file.");
            }
        });    
    }

    style_Run_Stop_btn(stats) {
        this.isRunning = stats; 
        if(stats) {
           this.btnStart.classList.add("btn-act-play");
           this.btnStop.classList.remove("btn-act-stop");
        } else {
           this.btnStart.classList.remove("btn-act-play");
           this.btnStop.classList.add("btn-act-stop");
        }
    }

    styleConectBtn(stats){
        if(stats == true){
            this.btnConect.classList.remove("btn-primary");
            this.btnConect.classList.add("button-error");
            this.btnConect.innerHTML = "<i class='fa-solid fa-link'></i> Disconnect"
        } else {
            this.btnConect.classList.add("btn-primary");
            this.btnConect.classList.remove("button-error");
            this.btnConect.innerHTML = `<i class="fa-solid fa-link"></i> Connect`
        }
    }

    initEvents() {
        this.btnViewDashboard.addEventListener('click', () => this.switchView('dashboard'));
        this.btnViewGraph.addEventListener('click', () => this.switchView('graphs'));

        this.btnSettings.addEventListener('click', () => this.openSettingsModal());
        this.btnCloseSettings.addEventListener('click', () => this.closeSettingsModal());
        this.btnSaveSettings.addEventListener('click', () => this.saveSettings());
        
        const btnResetSettings = document.getElementById('btnResetSettings');
        if (btnResetSettings) btnResetSettings.addEventListener('click', () => this.resetSettings());

        if (this.btnAddGraph) this.btnAddGraph.addEventListener('click', () => this.openGraphModal());
        if (this.btnCloseGraphModal) this.btnCloseGraphModal.addEventListener('click', () => this.closeGraphModal());
        if (this.btnConfirmAddGraph) this.btnConfirmAddGraph.addEventListener('click', () => this.createNewGraph());

        if (this.graphTypeRadios) {
            this.graphTypeRadios.forEach(radio => {
                radio.addEventListener('change', (e) => {
                    this.basicGraphSection.classList.add('hidden');
                    this.equationGraphSection.classList.add('hidden');
                    if(this.csvGraphSection) this.csvGraphSection.classList.add('hidden');

                    if (e.target.value === 'basic') {
                        this.basicGraphSection.classList.remove('hidden');
                    } else if (e.target.value === 'equation') {
                        this.equationGraphSection.classList.remove('hidden');
                    } else if (e.target.value === 'csv') {
                        if(this.csvGraphSection) this.csvGraphSection.classList.remove('hidden');
                    }
                });
            });
        }
    }

    switchView(viewName) {
        if (viewName === 'dashboard') {
            this.viewGraphs.classList.remove('view-active');
            this.viewGraphs.classList.add('view-hidden');
            this.viewDashboard.classList.remove('view-hidden');
            this.viewDashboard.classList.add('view-active');
            
            this.btnViewDashboard.classList.replace('btn-ghost', 'btn-primary');
            this.btnViewGraph.classList.replace('btn-primary', 'btn-ghost');
        } else {
            this.viewDashboard.classList.remove('view-active');
            this.viewDashboard.classList.add('view-hidden');
            this.viewGraphs.classList.remove('view-hidden');
            this.viewGraphs.classList.add('view-active');
            
            this.btnViewGraph.classList.replace('btn-ghost', 'btn-primary');
            this.btnViewDashboard.classList.replace('btn-primary', 'btn-ghost');
        }
    }

    createVirtualSensorCard(id, name) {
        const grid = document.getElementById('sensorGrid');
        if(!grid || document.getElementById(`card-${id}`)) return; 
        
        const card = document.createElement('div');
        card.id = `card-${id}`;
        card.className = 'sensor-card'; 
        card.style.cssText = 'background-color: #1a1a1a; border-left: 4px solid #00FFFF; padding: 15px; border-radius: 6px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); display: flex; flex-direction: column; align-items: center; justify-content: center; min-width: 150px;';
        
        card.innerHTML = `
            <div id="name-${id}" style="font-size: 1.1rem; color: #00FFFF; margin-bottom: 10px; font-weight: bold; font-family: monospace;">
                <i class="fa-solid fa-calculator"></i> ${name}
            </div>
            <div id="val-${id}" style="font-size: 2rem; color: #fff; font-weight: bold; font-family: 'Courier New', monospace;">
                0.00
            </div>
        `;
        grid.appendChild(card);
    }

    openGraphModal() {
        this.sensorCheckboxes.innerHTML = '';
        this.availableVarsList.innerHTML = '';
        
        this.availableVarsList.style.display = 'flex';
        this.availableVarsList.style.flexWrap = 'wrap';
        this.availableVarsList.style.gap = '8px';
        this.availableVarsList.style.marginTop = '10px';

        let boardKeys = Object.keys(this.config.data);
        if (boardKeys.length === 0) {
            this.notyf.open({ type: 'warning', message: "No data received yet. Please wait for incoming packets." });
            return;
        }

        let mainBoard = boardKeys[0];
        let sensors = this.config.data[mainBoard];
        let vars = [];

        for (let sensorId in sensors) {
            if (sensorId === 'graphs') continue; 
            let s = sensors[sensorId];
            let name = s.name || sensorId;
            
            let wrapper = document.createElement('div');
            wrapper.className = 'sensor-select-item'; 
            wrapper.innerHTML = `
                <input type="checkbox" id="chk_${sensorId}" value="${sensorId}" data-name="${name}">
                <label for="chk_${sensorId}">${name}</label>
            `;
            this.sensorCheckboxes.appendChild(wrapper);
            
            vars.push(`
                <div style="background: #1e1e1e; border: 1px solid #333; padding: 4px 8px; border-radius: 4px; display: inline-flex; align-items: center; font-size: 13px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                    <code style="color: #00FF00; background: #000; padding: 3px 6px; border-radius: 3px; font-weight: bold; margin-right: 8px; font-family: monospace; border: 1px solid #003300;">${sensorId}</code>
                    <span style="color: #ccc;">${name}</span>
                </div>
            `);
        }

        for (let gId in this.graphManager.graphs) {
            let g = this.graphManager.graphs[gId];
            if (g.type === 'equation') {
                let name = g.name || gId;
                let wrapper = document.createElement('div');
                wrapper.className = 'sensor-select-item';
                wrapper.innerHTML = `
                    <input type="checkbox" id="chk_${gId}" value="${gId}" data-name="${name}">
                    <label for="chk_${gId}" style="color: #00FFFF; border-color: #005555;">${name} (Math)</label>
                `;
                this.sensorCheckboxes.appendChild(wrapper);
                
                vars.push(`
                    <div style="background: #001a1a; border: 1px solid #004d4d; padding: 4px 8px; border-radius: 4px; display: inline-flex; align-items: center; font-size: 13px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                        <code style="color: #00FFFF; background: #000; padding: 3px 6px; border-radius: 3px; font-weight: bold; margin-right: 8px; font-family: monospace; border: 1px solid #005555;">${gId}</code>
                        <span style="color: #00cccc;">${name}</span>
                    </div>
                `);
            }
        }

        this.availableVarsList.innerHTML = vars.join('');
        this.addGraphModal.classList.remove('hidden');
    }

    closeGraphModal() {
        this.addGraphModal.classList.add('hidden');
        this.eqGraphName.value = '';
        this.eqGraphFormula.value = '';
    }

    createNewGraph() {
        let selectedType = document.querySelector('input[name="graphType"]:checked').value;
        
        if (selectedType === 'csv') {
            this.importCSVAndGraph();
            this.closeGraphModal();
            return; 
        }

        let boardKeys = Object.keys(this.config.data);
        let mainBoard = boardKeys.length > 0 ? boardKeys[0] : null;

        if (!mainBoard) {
            this.notyf.error("No active board found!");
            return;
        }

// التأكد من أن المتغير عبارة عن مصفوفة صالحة، وإلا قم بتهيئته كمصفوفة
        if (!Array.isArray(this.config.data[mainBoard].graphs)) {
            this.config.data[mainBoard].graphs = [];
        }

        let graphConfig = {};

        if (selectedType === 'basic') {
            let checkedBoxes = this.sensorCheckboxes.querySelectorAll('input:checked');
            if (checkedBoxes.length === 0) {
                this.notyf.error('At least one sensor must be selected.');
                return;
            }
            if (checkedBoxes.length > 3) {
                this.notyf.error("Maximum 3 sensors allowed per graph.");
                return;
            }

            let ids = [];
            let names = [];
            checkedBoxes.forEach(cb => {
                ids.push(cb.value);
                names.push(cb.dataset.name);
            });
            
            this.graphManager.addBasicGraph(ids, names);
            
            graphConfig.type = 'basic';
            graphConfig.id = `basic_${Date.now()}`;
            graphConfig.sensorIds = ids;
            graphConfig.sensorNames = names;

            this.notyf.success("Basic Graph added successfully.");

        } else {
            let gName = this.eqGraphName.value.trim();
            let gFormula = this.eqGraphFormula.value.trim();
            if (!gName || !gFormula) {
                this.notyf.error("Please provide both a name and a formula!");
                return;
            }
            
            let gId = this.graphManager.addEquationGraph(gName, gFormula);
            this.createVirtualSensorCard(gId, gName);
            
            graphConfig.type = 'equation';
            graphConfig.id = gId; 
            graphConfig.equationName = gName;
            graphConfig.equationFormula = gFormula;

            this.notyf.success("Equation Graph generated successfully.");
        }
        
        this.config.data[mainBoard].graphs.push(graphConfig);
        if(typeof this.config.saveAll === 'function') this.config.saveAll();

        this.closeGraphModal();
    }

    async importCSVAndGraph() {
        try {
            let entries = await Neutralino.os.showOpenDialog('Select SCADA CSV File', {
                filters: [{ name: 'CSV Files', extensions: ['csv'] }]
            });
            
            if (entries && entries.length > 0) {
                let filePath = entries[0];
                let fileName = filePath.split('\\').pop().split('/').pop(); 
                
                let csvContent = await Neutralino.filesystem.readFile(filePath);
                this.graphManager.addCSVGraph(fileName, csvContent);
                this.notyf.success("CSV file imported and graphed successfully.");
            }
        } catch (err) {
            console.error("❌ CSV Import Error: ", err);
            this.notyf.error("Failed to open the file. Check permissions.");
        }
    }

    loadSavedGraphs() {
        let boardKeys = Object.keys(this.config.data);
        if (boardKeys.length === 0) return;
        let mainBoard = boardKeys[0];

        let savedGraphs = this.config.data[mainBoard].graphs;
        if (savedGraphs && Array.isArray(savedGraphs)) {
            this.graphManager.container.querySelectorAll('.graph-wrapper').forEach(e => e.remove());
            this.graphManager.graphs = {};

            savedGraphs.forEach(g => {
                if (g.type === 'basic') {
                    this.graphManager.addBasicGraph(g.sensorIds, g.sensorNames);
                } else if (g.type === 'equation') {
                    let gId = this.graphManager.addEquationGraph(g.equationName, g.equationFormula, g.id);
                    this.createVirtualSensorCard(gId, g.equationName);
                }
            });
        }
    }

    removeGraphFromStorage(graphId) {
        let boardKeys = Object.keys(this.config.data);
        if (boardKeys.length === 0) return;
        let mainBoard = boardKeys[0];

        if (this.config.data[mainBoard].graphs) {
            this.config.data[mainBoard].graphs = [];
            for (let id in this.graphManager.graphs) {
                let g = this.graphManager.graphs[id];
                if (g.type === 'basic') {
                    this.config.data[mainBoard].graphs.push({ type: 'basic', id: id, sensorIds: g.sensorIds, sensorNames: g.sensorIds.map(sId => document.getElementById(`name-${sId}`)?.innerText || sId) });
                } else if (g.type === 'equation') {
                    this.config.data[mainBoard].graphs.push({ type: 'equation', id: id, equationName: g.name, equationFormula: g.equation });
                }
            }
            if(typeof this.config.saveAll === 'function') this.config.saveAll();
        }
    }

    openSettingsModal() {
        this.settingsTableBody.innerHTML = ''; 
        let boardKeys = Object.keys(this.config.data);
        if (boardKeys.length === 0) return;

        let mainBoard = boardKeys[0]; 
        let sensors = this.config.data[mainBoard];

        for (let sensorId in sensors) {
            let s = sensors[sensorId];
            let tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${sensorId}</strong></td>
                <td><input type="text" id="input-name-${sensorId}" value="${s.name || ''}"></td>
                <td><input type="text" id="input-unit-${sensorId}" value="${s.unit || ''}" style="width:40px;"></td>
                <td><input type="number" id="raw-min-${sensorId}" value="${s.rawMin || 0}" style="width:60px;"></td>
                <td><input type="number" id="raw-max-${sensorId}" value="${s.rawMax || 1023}" style="width:60px;"></td>
                <td><i class="fa-solid fa-arrow-right"></i></td>
                <td><input type="number" id="target-min-${sensorId}" value="${s.targetMin || 0}" style="width:60px;"></td>
                <td><input type="number" id="target-max-${sensorId}" value="${s.targetMax || 100}" style="width:60px;"></td>
                <td><input type="checkbox" id="input-useMap-${sensorId}" ${s.useMap ? 'checked' : ''}> Map</td>
                <td><input type="number" step="0.1" id="update-time-${sensorId}" value="${s.updateTime || 0}" style="width:60px;" placeholder="s"></td>                
                <td><input type="number" id="avg-samples-${sensorId}" value="${s.avgSamples || 1}" style="width:50px;"></td>
            `;
            this.settingsTableBody.appendChild(tr);
        }
        this.settingsModal.classList.remove('hidden');
    }

    closeSettingsModal() {
        this.settingsModal.classList.add('hidden');
    }

    async saveSettings() {
        let boardKeys = Object.keys(this.config.data);
        if (boardKeys.length === 0) return;
        
        let mainBoardId = boardKeys[0].replace('board_', '');
        let sensors = this.config.data[boardKeys[0]];

        for (let sensorId in sensors) {
            let newConfig = {
                name: document.getElementById(`input-name-${sensorId}`).value,
                unit: document.getElementById(`input-unit-${sensorId}`).value,
                rawMin: parseFloat(document.getElementById(`raw-min-${sensorId}`).value),
                rawMax: parseFloat(document.getElementById(`raw-max-${sensorId}`).value),
                targetMin: parseFloat(document.getElementById(`target-min-${sensorId}`).value),
                targetMax: parseFloat(document.getElementById(`target-max-${sensorId}`).value),
                useMap: document.getElementById(`input-useMap-${sensorId}`).checked,
                updateTime: parseFloat(document.getElementById(`update-time-${sensorId}`).value) || 0,
                avgSamples: parseInt(document.getElementById(`avg-samples-${sensorId}`).value) || 1
            };
            await this.config.updateSensorConfig(mainBoardId, sensorId, newConfig);
            
            let nameTag = document.getElementById(`name-${sensorId}`);
            let unitTag = document.getElementById(`unit-${sensorId}`);
            if(nameTag) nameTag.innerText = newConfig.name;
            if(unitTag) unitTag.innerText = newConfig.unit;
        }

        this.notyf.success("Settings saved and applied successfully.");
        this.closeSettingsModal();
    }

    async resetSettings() {
        let confirmReset = confirm("⚠️ Are you sure you want to reset all sensor configurations to default?");
        if (confirmReset) {
            let boardKeys = Object.keys(this.config.data);
            if (boardKeys.length === 0) return;
            
            let mainBoardId = boardKeys[0].replace('board_', '');
            let sensors = this.config.data[boardKeys[0]];

            for (let sensorId in sensors) {
                let defaultVal = {
                    name: `Sensor ${sensorId}`, unit: "Raw", rawMin: 0, rawMax: 1023,
                    targetMin: 0, targetMax: 100, useMap: false, updateTime: 0, avgSamples: 1
                };
                await this.config.updateSensorConfig(mainBoardId, sensorId, defaultVal);
            }
            this.notyf.success("All sensors have been reset.");
            this.closeSettingsModal();
            setTimeout(() => this.openSettingsModal(), 100);
        }
    }
}