// resources/js/storg.js

export class StorageManager {
    constructor(storageKey = 'boards_config') {
        this.storageKey = storageKey;
        this.data = {}; // المتغير اللي رح يحمل كل الإعدادات في الـ RAM
    }

    // 1. دالة استرجاع البيانات (تُستدعى مرة واحدة عند تشغيل التطبيق)
    async loadAll() {
        try {
            let rawData = await Neutralino.storage.getData(this.storageKey);
            this.data = JSON.parse(rawData);
            console.log("📂 تم تحميل إعدادات البوردات:", this.data);
        } catch (err) {
            console.log("ℹ️ أول تشغيل: لا توجد إعدادات محفوظة، سيتم البدء بسجل فارغ.");
            this.data = {}; // إذا الملف مش موجود، بنبدأ بـ Object فاضي
        }
    }

    // 2. دالة حفظ البيانات (تُستدعى بعد أي تعديل)
    async saveAll() {
        try {
            await Neutralino.storage.setData(this.storageKey, JSON.stringify(this.data));
            console.log("✅ تم حفظ الإعدادات بنجاح في النظام!");
        } catch (err) {
            console.error("❌ خطأ أثناء الحفظ:", err);
        }
    }

    // ==========================================
    // إضافة: دوال خاصة لإدارة الرسوم البيانية لكل بورد
    // ==========================================
    getBoardGraphs(boardId) {
        let boardKey = `board_${boardId}`;
        if (!this.data[boardKey]) this.data[boardKey] = {};
        if (!this.data[boardKey].graphs) this.data[boardKey].graphs = [];
        
        return this.data[boardKey].graphs;
    }

    async saveBoardGraphs(boardId, graphsArray) {
        let boardKey = `board_${boardId}`;
        if (!this.data[boardKey]) this.data[boardKey] = {};
        
        this.data[boardKey].graphs = graphsArray;
        await this.saveAll();
    }
    // ==========================================

    // 3. دالة ذكية لجلب إعدادات حساس معين 
    getSensorConfig(boardId, sensorId) {
        let boardKey = `board_${boardId}`;
        
        if (!this.data[boardKey]) {
            this.data[boardKey] = {};
        }
        
        // تعديل هندسي: فصل الحساسات عن الرسوم في التخزين وترحيل القديم
        if (!this.data[boardKey].sensors) {
            this.data[boardKey].sensors = {};
            // ترحيل البيانات القديمة للحفاظ على إعداداتك السابقة
            for (let key in this.data[boardKey]) {
                if (key !== 'sensors' && key !== 'graphs') {
                    this.data[boardKey].sensors[key] = this.data[boardKey][key];
                    delete this.data[boardKey][key];
                }
            }
        }
        
        if (!this.data[boardKey].sensors[sensorId]) {
            this.data[boardKey].sensors[sensorId] = { 
                name: `Sensor ${sensorId}`, 
                unit: "Raw",
                min: 0,
                max: 1023
            };
        }
        
        return this.data[boardKey].sensors[sensorId];
    }

    // 4. دالة تحديث إعدادات حساس معين وحفظها فوراً
    async updateSensorConfig(boardId, sensorId, newConfig) {
        let boardKey = `board_${boardId}`;
        
        if (!this.data[boardKey]) {
            this.data[boardKey] = {};
        }
        
        if (!this.data[boardKey].sensors) {
            this.data[boardKey].sensors = {};
        }
        
        // تحديث البيانات في الـ RAM
        this.data[boardKey].sensors[sensorId] = newConfig;
        
        // حفظ التعديلات على الهارد ديسك فوراً
        await this.saveAll();
    }
}