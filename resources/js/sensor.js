// sensor.js

export class SensorDashboard {
    constructor(gridContainerId) {
        this.gridContainer = document.getElementById(gridContainerId);
    }

    // بناء الكرت
    create_box_for_sensor(boardId, sensorId, settings) {
        const card = document.createElement('div');
        card.className = 'sensor-card';
        card.id = `card-${sensorId}`; 

        // التأكد من وجود إعدادات أو وضع قيم افتراضية
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
        // 1. البحث عن الكرت
        let valElement = document.getElementById(`val-${sensorId}`);

        // 2. إذا لم يكن موجوداً، ننشئه
        if (!valElement) {
            console.log(`✨ إنشاء كرت جديد: ${sensorId} التابع لبورد ${boardId}`);
            this.create_box_for_sensor(boardId, sensorId, settings);
            valElement = document.getElementById(`val-${sensorId}`);
        }

        // 3. تحديث القيمة وتطبيق المعايرة (Calibration)
        if (valElement) {
            let finalValue = parseFloat(rawValue);

            // التحقق من تفعيل خيار الـ Mapping ووجود الإعدادات
            if (settings && settings.useMap) {
                // استخراج القيم من الإعدادات المحفوظة
                let rMin = parseFloat(settings.rawMin);    // أقل قيمة يرسلها الحساس فعلياً
                let rMax = parseFloat(settings.rawMax);    // أعلى قيمة يرسلها الحساس فعلياً
                let tMin = parseFloat(settings.targetMin); // النتيجة التي تريد رؤيتها عند الحد الأدنى
                let tMax = parseFloat(settings.targetMax); // النتيجة التي تريد رؤيتها عند الحد الأقصى

                // معادلة Linear Scaling (تحويل من نطاق الحساس إلى نطاق المستخدم)
                // التأكد أن الفرق بين Max و Min ليس صفراً لتجنب انهيار الكود (Division by zero)
                if (Math.abs(rMax - rMin) > 0.0001) {
                    finalValue = ((finalValue - rMin) * (tMax - tMin) / (rMax - rMin)) + tMin;
                }
            }

            // عرض الرقم مقرباً لمنزلتين عشريتين
            valElement.innerText = finalValue.toFixed(2);
        }
    }
}