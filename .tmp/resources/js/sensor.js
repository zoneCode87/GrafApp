// sensor.js

export class SensorDashboard {
    constructor(gridContainerId) {
        this.gridContainer = document.getElementById(gridContainerId);
        // أضفنا كائن جديد لتتبع حالة كل حساس (تاريخ القراءات وآخر وقت تحديث)
        this.sensorStates = {}; 
    }

    // بناء الكرت
    create_box_for_sensor(boardId, sensorId, settings) {
        const card = document.createElement('div');
        card.className = 'sensor-card';
        card.id = `${sensorId}`; 

        let displayName = settings ? settings.name : `Sensor ${sensorId}`;
        let displayUnit = settings ? settings.unit : "Raw";

        card.innerHTML = `
            <div class="sensor-header">
              <h3 class="sensor-name" id="name-${sensorId}">${displayName}</h3>
            </div>
            <div class="sensor-body">
              <span class="sensor-value" id="val-${sensorId}">0.00</span>
              <span class="sensor-unit" id="unit-${sensorId}">${displayUnit}</span>
            </div>
        `;
        
        this.gridContainer.appendChild(card);
    }

    process_sensor_data(boardId, sensorId, rawValue, settings) {
        let valElement = document.getElementById(`val-${sensorId}`);

        if (!valElement) {
            console.log(`✨ إنشاء كرت جديد: ${sensorId} التابع لبورد ${boardId}`);
            this.create_box_for_sensor(boardId, sensorId, settings);
            valElement = document.getElementById(`val-${sensorId}`);
        }

        // تهيئة حالة الحساس إذا لم تكن موجودة
        if (!this.sensorStates[sensorId]) {
            this.sensorStates[sensorId] = {
                history: [],
                lastUpdateTime: 0
            };
        }

        if (valElement) {
            let finalValue = parseFloat(rawValue);

            // تطبيق الـ Mapping إذا كان مفعلاً
            if (settings && settings.useMap) {
                let rMin = parseFloat(settings.rawMin);    
                let rMax = parseFloat(settings.rawMax);    
                let tMin = parseFloat(settings.targetMin); 
                let tMax = parseFloat(settings.targetMax); 

                if (Math.abs(rMax - rMin) > 0.0001) {
                    finalValue = ((finalValue - rMin) * (tMax - tMin) / (rMax - rMin)) + tMin;
                }
            }

            // --- تطبيق المتوسط الحسابي ---
            let state = this.sensorStates[sensorId];
            let avgSamples = (settings && settings.avgSamples > 0) ? parseInt(settings.avgSamples) : 1;
            
            // إضافة القراءة الجديدة للمصفوفة
            state.history.push(finalValue);
            
            // إزالة القراءات القديمة إذا تجاوزنا العدد المطلوب
            if (state.history.length > avgSamples) {
                state.history.shift(); 
            }

            // حساب المتوسط
            let sum = state.history.reduce((a, b) => a + b, 0);
            let averagedValue = sum / state.history.length;

            // --- تطبيق وقت التحديث (Update Interval) ---
            let updateTimeMs = (settings && settings.updateTime >= 0) ? parseFloat(settings.updateTime) * 1000 : 0;
            let currentTime = Date.now();

            // تحديث الشاشة فقط إذا مر الوقت المحدد
            if (currentTime - state.lastUpdateTime >= updateTimeMs) {
                valElement.innerText = averagedValue.toFixed(2);
                state.lastUpdateTime = currentTime;
            }
        }
    }

    get_sensor_info(SensorID) {
        const value = document.getElementById(`val-${SensorID}`).innerText; 
        const name  = document.getElementById(`name-${SensorID}`).innerText; 
        return {
                val : value , 
                unit : name 
        };
    }
}