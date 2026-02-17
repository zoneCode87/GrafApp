// ui_manager.js

export class UIManager {
    constructor(configManager) {
        this.config = configManager; // نحتاج كلاس الإعدادات لقراءة وحفظ التعديلات

        // جلب عناصر التنقل بين الشاشات
        this.btnViewDashboard = document.getElementById('btnViewDashboard');
        this.btnViewGraph = document.getElementById('btnViewGraph');
        this.viewDashboard = document.getElementById('view-dashboard');
        this.viewGraphs = document.getElementById('view-graphs');

        this.settingsModal = document.getElementById('settingsModal');
        this.btnSettings = document.getElementById('btnSettings');
        this.btnCloseSettings = document.getElementById('btnCloseSettings');
        this.btnSaveSettings = document.getElementById('btnSaveSettings');
        this.settingsTableBody = document.getElementById('settingsTableBody');
        this.initEvents();        
        this.btnConect = document.getElementById("btnConnect");
        this.btnStart = document.getElementById("btnPlay");
        this.btnStop = document.getElementById("btnStop");
    }



    style_Run_Stop_btn(stats){
        if(stats){
           this.btnStart.classList.add("btn-act-play");
           this.btnStop.classList.remove("btn-act-stop");
        }else{
            this.btnStart.classList.remove("btn-act-play");
           this.btnStop.classList.add("btn-act-stop");
        }
    }

    styleConectBtn(stats){
        if(stats ==  true){
            this.btnConect.classList.remove("btn-primary");
            this.btnConect.classList.add("button-error");
            this.btnConect.innerHTML = "<i class='fa-solid fa-link'></i> Disconnect"
        }
        else {
            this.btnConect.classList.add("btn-primary");
            this.btnConect.classList.remove("button-error");
            this.btnConect.innerHTML = `<i class="fa-solid fa-link"></i> Connect`
        }

    }






    // ربط الأزرار بالوظائف
    initEvents() {
        // أحداث التنقل
        this.btnViewDashboard.addEventListener('click', () => this.switchView('dashboard'));
        this.btnViewGraph.addEventListener('click', () => this.switchView('graphs'));

        // أحداث الإعدادات
        this.btnSettings.addEventListener('click', () => this.openSettingsModal());
        this.btnCloseSettings.addEventListener('click', () => this.closeSettingsModal());
        this.btnSaveSettings.addEventListener('click', () => this.saveSettings());
        
        const btnResetSettings = document.getElementById('btnResetSettings');
        if (btnResetSettings) {
            btnResetSettings.addEventListener('click', () => this.resetSettings());
        }
    }

    // دالة التبديل بين الشاشات (Tabs)
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

    // دالة فتح نافذة الإعدادات وتعبئة الجدول
    openSettingsModal() {
        this.settingsTableBody.innerHTML = ''; 

        let boardKeys = Object.keys(this.config.data);
        if (boardKeys.length === 0) {
            alert("لم يتم استلام أي بيانات من البورد حتى الآن!");
            return;
        }

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
`;
            this.settingsTableBody.appendChild(tr);
        }
        this.settingsModal.classList.remove('hidden');
    }

    closeSettingsModal() {
        this.settingsModal.classList.add('hidden');
    }

    // دالة حفظ الإعدادات من الجدول
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
            useMap: document.getElementById(`input-useMap-${sensorId}`).checked
        };

        await this.config.updateSensorConfig(mainBoardId, sensorId, newConfig);
            
            // تحديث الشاشة فوراً
            let nameTag = document.getElementById(`name-${sensorId}`);
            let unitTag = document.getElementById(`unit-${sensorId}`);
            if(nameTag) nameTag.innerText = newConfig.name;
            if(unitTag) unitTag.innerText = newConfig.unit;
        }

        this.closeSettingsModal();
        console.log("✅ تم تحديث الإعدادات بنجاح!");
    }



    async resetSettings() {
        // رسالة تأكيد عشان ما يمسح الإعدادات بالغلط
        let confirmReset = confirm("⚠️ هل أنت متأكد من إعادة ضبط جميع الحساسات للقيم الافتراضية؟");
        
        if (confirmReset) {
            let boardKeys = Object.keys(this.config.data);
            if (boardKeys.length === 0) return;
            
            let mainBoardId = boardKeys[0].replace('board_', '');
            let sensors = this.config.data[boardKeys[0]];

            // إعادة القيم للوضع الافتراضي لكل حساس
            for (let sensorId in sensors) {
                let defaultVal = {
                    name: `Sensor ${sensorId}`,
                    unit: "Raw",
                    rawMin: 0,
                    rawMax: 1023,
                    targetMin: 0,
                    targetMax: 100,
                    useMap: false
                };
                
                await this.config.updateSensorConfig(mainBoardId, sensorId, defaultVal);
            }

            console.log("🔄 تم إعادة ضبط الإعدادات للوضع الافتراضي!");
            
            // إغلاق النافذة وفتحها مرة ثانية عشان الجدول يتحدث قدام اليوزر
            this.closeSettingsModal();
            setTimeout(() => this.openSettingsModal(), 100);
        }
    }

}