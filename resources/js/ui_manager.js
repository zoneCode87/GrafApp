// resources/js/ui_manager.js
import { SensorDashboard } from './sensor.js';
import { GraphManager } from './graph.js'; // استدعاء كلاس الرسوم البيانية

const sensor = new SensorDashboard("sensorGrid");

export class UIManager {
    constructor(configManager) {
        this.config = configManager;
        this.graphManager = new GraphManager('graphContainer'); // تهيئة مدير الرسوم البيانية

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

        // === عناصر نافذة الرسم البياني ===
        this.btnAddGraph = document.getElementById('btnAddGraph');
        this.addGraphModal = document.getElementById('addGraphModal');
        this.btnCloseGraphModal = document.getElementById('btnCloseGraphModal');
        this.btnConfirmAddGraph = document.getElementById('btnConfirmAddGraph');
        this.graphTypeRadios = document.getElementsByName('graphType');
        this.basicGraphSection = document.getElementById('basicGraphSection');
        this.equationGraphSection = document.getElementById('equationGraphSection');
        this.sensorGraphSelect = document.getElementById('sensorGraphSelect');
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
                alert("⚠️ الرجاء إيقاف القراءة (Stop) أولاً قبل حفظ الملف!");
                return;
            }
            if (this.csvBuffer.length === 0) {
                alert("⚠️ لا توجد بيانات مسجلة لحفظها!");
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
                    alert("✅ تم حفظ الملف بنجاح!");
        
                    let confirmClear = confirm("هل تريد مسح البيانات من الذاكرة لبدء تسجيل جديد؟");
                    if (confirmClear) {
                        this.csvBuffer = [];
                        this.csvHeaders.clear(); 
                    }
                }
            } catch (err) {
                console.error("❌ خطأ أثناء حفظ الملف:", err);
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

        // --- أحداث نافذة الرسم البياني الجديدة ---
        if (this.btnAddGraph) this.btnAddGraph.addEventListener('click', () => this.openGraphModal());
        if (this.btnCloseGraphModal) this.btnCloseGraphModal.addEventListener('click', () => this.closeGraphModal());
        if (this.btnConfirmAddGraph) this.btnConfirmAddGraph.addEventListener('click', () => this.createNewGraph());

        // التبديل بين نوعي الرسم البياني
        if (this.graphTypeRadios) {
            this.graphTypeRadios.forEach(radio => {
                radio.addEventListener('change', (e) => {
                    if (e.target.value === 'basic') {
                        this.basicGraphSection.classList.remove('hidden');
                        this.equationGraphSection.classList.add('hidden');
                    } else {
                        this.basicGraphSection.classList.add('hidden');
                        this.equationGraphSection.classList.remove('hidden');
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

    // --- دوال التحكم في نافذة الرسم ---
    openGraphModal() {
        // تم استبدال select بـ checkboxes
        this.sensorCheckboxes = document.getElementById('sensorCheckboxes');
        this.sensorCheckboxes.innerHTML = '';
        this.availableVarsList.innerText = '';
        
        let boardKeys = Object.keys(this.config.data);
        if (boardKeys.length === 0) {
            alert("⚠️ لم يتم استلام أي بيانات حتى الآن، انتظر قليلاً!");
            return;
        }

        let mainBoard = boardKeys[0];
        let sensors = this.config.data[mainBoard];
        let vars = [];

        for (let sensorId in sensors) {
            let s = sensors[sensorId];
            let name = s.name || sensorId;
            
            // إنشاء checkbox لكل حساس
            let label = document.createElement('label');
            label.style.cssText = "display: flex; align-items: center; gap: 5px; cursor: pointer; color: white;";
            label.innerHTML = `<input type="checkbox" value="${sensorId}" data-name="${name}"> ${name}`;
            
            this.sensorCheckboxes.appendChild(label);
            vars.push(sensorId);
        }

        this.availableVarsList.innerText = vars.join(', ');
        this.addGraphModal.classList.remove('hidden');
    }

    
    closeGraphModal() {
        this.addGraphModal.classList.add('hidden');
        this.eqGraphName.value = '';
        this.eqGraphFormula.value = '';
    }
createNewGraph() {
        let selectedType = document.querySelector('input[name="graphType"]:checked').value;
        
        if (selectedType === 'basic') {
            // جلب الحساسات المحددة
            let checkedBoxes = this.sensorCheckboxes.querySelectorAll('input:checked');
            if (checkedBoxes.length === 0) {
                alert("⚠️ الرجاء اختيار حساس واحد على الأقل!");
                return;
            }
            if (checkedBoxes.length > 3) {
                alert("⚠️ الحد الأقصى هو 3 حساسات للرسم البياني الواحد للحفاظ على الأداء والوضوح!");
                return;
            }

            let ids = [];
            let names = [];
            checkedBoxes.forEach(cb => {
                ids.push(cb.value);
                names.push(cb.dataset.name);
            });
            
            this.graphManager.addBasicGraph(ids, names);
        } else {
            let gName = this.eqGraphName.value.trim();
            let gFormula = this.eqGraphFormula.value.trim();
            if (!gName || !gFormula) {
                alert("⚠️ الرجاء إدخال اسم الرسم والمعادلة!");
                return;
            }
            this.graphManager.addEquationGraph(gName, gFormula);
        }
        
        this.closeGraphModal();
    }

    // دوال الإعدادات القديمة
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

        this.closeSettingsModal();
    }

    async resetSettings() {
        let confirmReset = confirm("⚠️ هل أنت متأكد من إعادة ضبط جميع الحساسات؟");
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
            this.closeSettingsModal();
            setTimeout(() => this.openSettingsModal(), 100);
        }
    }
}