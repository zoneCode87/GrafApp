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

    // 3. دالة ذكية لجلب إعدادات حساس معين (مع إرجاع قيم افتراضية إذا كان جديداً)
getSensorConfig(boardId, sensorId) {
        let boardKey = `board_${boardId}`;
        
        // 1. إذا البورد مش موجود في الذاكرة، ننشئ له مكان
        if (!this.data[boardKey]) {
            this.data[boardKey] = {};
        }
        
        // 2. إذا الحساس مش مسجل داخل هذا البورد، ننشئه بقيم افتراضية ونسجله في الذاكرة!
        if (!this.data[boardKey][sensorId]) {
            this.data[boardKey][sensorId] = { 
                name: `Sensor ${sensorId}`, 
                unit: "Raw",
                min: 0,
                max: 1023
            };
            // ملاحظة هندسية: نحن نحفظها في الـ RAM فقط هنا (this.data) ولا نستدعي saveAll() 
            // لكي لا نرهق القرص الصلب. الحفظ الدائم يحدث فقط عندما تضغط زر Save في النافذة.
        }
        
        return this.data[boardKey][sensorId];
    }

    // 4. دالة تحديث إعدادات حساس معين وحفظها فوراً (تُستخدم مع زر الحفظ في الـ Modal)
    async updateSensorConfig(boardId, sensorId, newConfig) {
        let boardKey = `board_${boardId}`;
        
        // إذا البورد مش مسجل قبل هيك، بننشئ له مكان
        if (!this.data[boardKey]) {
            this.data[boardKey] = {};
        }
        
        // تحديث البيانات في الـ RAM
        this.data[boardKey][sensorId] = newConfig;
        
        // حفظ التعديلات على الهارد ديسك فوراً
        await this.saveAll();
    }
}