// ==========================================
// 1. استدعاء الكلاسات (Modules)
// ==========================================
import { SensorDashboard } from './sensor.js';
import { StorageManager } from './storg.js';
import { UIManager } from './ui_manager.js';

// تهيئة بيئة Neutralino أولاً قبل استدعاء أي أوامر أخرى
Neutralino.init();

// ==========================================
// 2. تهيئة الأنظمة والكلاسات
// ==========================================
const config = new StorageManager('boards_config');
const sensor = new SensorDashboard('sensorGrid');
const ui = new UIManager(config); // نمرر الإعدادات لمدير الواجهة للتحكم بالنافذة المنبثقة

// عناصر الاتصال بالهاردوير
const btnConnect = document.getElementById('btnConnect');
const comPortList = document.getElementById('comPortList');
const btnPlay = document.getElementById("btnPlay");
const btnStop = document.getElementById("btnStop");



let driverProcessId = null;
let isSystemConnected = false;
let dataBuffer = ""; 
let isRun = false; 

btnPlay.addEventListener('click',()=>{
    if(isSystemConnected){
        isRun = true;
        ui.style_Run_Stop_btn(isRun)
    }
})



btnStop.addEventListener('click',()=>{
    if(isSystemConnected){
        isRun = false;
        ui.style_Run_Stop_btn(isRun)
    }
})


// ==========================================
// 3. إدارة المنافذ (COM Ports)
// ==========================================
async function refreshComPorts() {
    try {
        let command = "powershell -Command \"[System.IO.Ports.SerialPort]::getportnames()\"";
        let result = await Neutralino.os.execCommand(command);
        
        if (result.stdOut) {
            const ports = result.stdOut.trim().split('\r\n').filter(p => p.trim() !== "");
            comPortList.innerHTML = ''; 
            
            if (ports.length === 0) {
                comPortList.innerHTML = '<option value="">لم يتم العثور على منافذ</option>';
                return;
            }

            ports.forEach(port => {
                let option = document.createElement('option');
                option.value = port;
                option.textContent = port;
                comPortList.appendChild(option);
            });
        }
    } catch (err) {
        console.error("❌ خطأ في جلب المنافذ:", err);
    }
}

// ==========================================
// 4. منطق تشغيل المحرك والاتصال
// ==========================================
async function startHardwareDriver() {
    try {
        // 1. الإعدام الفوري لأي نسخة C++ معلقة في الذاكرة من تحديث سابق
        try {
            await Neutralino.os.execCommand("taskkill /IM driver.exe /F /T");
            console.log("🧹 تم تنظيف الذاكرة من المحرك القديم.");
        } catch (e) {
            
        }

        let exePath = NL_PATH + "/extensions/driver/bin/Debug/driver.exe";
        let command = `"${exePath}"`; 

        let process = await Neutralino.os.spawnProcess(command);
        driverProcessId = process.id;
        console.log(`✅ تم تشغيل المحرك بنجاح! ID: ${driverProcessId}`);

    } catch (err) {
        console.error("❌ فشل تشغيل المحرك: ", err);
    }
}

async function sendDataToDriver(data) {
    if (driverProcessId !== null && driverProcessId !== undefined) {
        try {
            await Neutralino.os.updateSpawnedProcess(driverProcessId, 'stdIn', data + '\n');
            console.log("📤 تم الإرسال إلى C++: ", data);
        } catch (err) {
            console.error("❌ خطأ أثناء الإرسال: ", err);
        }
    } else {
        console.warn("⚠️ المحرك غير جاهز! تأكد من تشغيله أولاً.");
    }
}

btnConnect.addEventListener('click', async () => {
    const selectedPort = comPortList.value;
    if (!selectedPort) {
        alert("الرجاء اختيار منفذ COM أولاً!");
        return;
    }
    if (isSystemConnected === false ){
            await sendDataToDriver(selectedPort);
    }
    else if (isSystemConnected){
        setTimeout(() => {
            window.location.reload();
        }, 500);
    }
    
});

// ==========================================
// 5. الاستماع لردود المحرك (الاستقبال الذكي)
// ==========================================
Neutralino.events.on('spawnedProcess', (event) => {
    if(event.detail.id === driverProcessId) {
        
        if(event.detail.action === 'stdOut') {
            dataBuffer += event.detail.data;
            let lines = dataBuffer.split('\n');
            dataBuffer = lines.pop();        
            
            for (let line of lines) {
                let cleanData = line.trim();
                
                if(cleanData) {
                    console.log(cleanData);
                    try {
                        let liveData = JSON.parse(cleanData);
                        
                        if (liveData.sensors && Array.isArray(liveData.sensors) && isRun) {
                            let boardId = liveData.id; 

                            if (!config.data[`board_${boardId}`]) {
                                config.data[`board_${boardId}`] = {};
                            }

                            // تحديث قيم Dashboard
                            liveData.sensors.forEach((sensorObj) => {
                                let sensorKey = Object.keys(sensorObj)[0];   
                                let rawValue = sensorObj[sensorKey];            
                                
                                let currentSettings = config.getSensorConfig(boardId, sensorKey);
                                sensor.process_sensor_data(boardId, sensorKey, rawValue, currentSettings);
                            });
                            
                            // تسجيل البيانات في ملف الـ CSV
                            ui.logCSVFrame(liveData.sensors);

                            // ==========================================
                            // إضافة: إرسال البيانات إلى الرسوم البيانية
                            // ==========================================
                            let flatSensorData = {};
                            
                            liveData.sensors.forEach((sensorObj) => {
                                let sensorKey = Object.keys(sensorObj)[0];
                                // نجلب القيمة المفلترة/المعاملة مباشرة من الشاشة (Dashboard) لتكون مطابقة لما يراه المستخدم
                                let valElement = document.getElementById(`val-${sensorKey}`);
                                flatSensorData[sensorKey] = valElement ? parseFloat(valElement.innerText) : parseFloat(sensorObj[sensorKey]);
                            });

                            // تحديث جميع الرسوم البيانية بالبيانات الجديدة
                            ui.graphManager.updateAllGraphs(flatSensorData);
                            // ==========================================

                        }
                    }
                    
                    catch (e) {
                        let msg = cleanData;
                        console.log("🖥️ [C++]: ", msg);
                        handleMessageDriver(msg);
                    }
                }
            }
        }
        else if(event.detail.action === 'stdErr') {
            console.error("⚠️ خطأ من المحرك: ", event.detail.data);
        }
    }
});

// تنظيف العملية عند إغلاق التطبيق
Neutralino.events.on('windowClose', async () => {
    await Neutralino.app.exit();
});

// ==========================================
// 6. البدء (Initialization)
// ==========================================

async function initializeApp() {
     // تحميل الإعدادات من الهارد ديسك أولاً
    await refreshComPorts(); // جلب المنافذ
    await startHardwareDriver(); // تشغيل الـ C++
    await checkForUpdates();
}

window.addEventListener('beforeunload', () => {
    if (driverProcessId !== null) {
        Neutralino.os.execCommand(`taskkill /PID ${driverProcessId} /F /T`);
        console.log("🛑 تم قتل المحرك وتحرير البورت بسبب تحديث الصفحة.");
    }
});

// ==========================================
// 7. الكماند الي بتيجي من ال driver 
// ==========================================


async function handleMessageDriver(Message){
        if (Message.includes("Handshake Successful")) {
            isSystemConnected = true;
            isRun = true ; 
            console.log(isSystemConnected);
            ui.styleConectBtn(isSystemConnected);
            ui.style_Run_Stop_btn(isRun); 
            await config.loadAll(); // تحميل إعدادات الحساسات والرسوم
            
            // +++++ إضافة جديدة: رسم المخططات البيانية المحفوظة +++++
            ui.loadSavedGraphs();
            // ++++++++++++++++++++++++++++++++++++++++++++++++++++++
        }
}

async function checkForUpdates() {
    try {
        // هذا رابط ملف manifest من المستودع الخاص بك على جيتهاب (رابط Raw)
        // إذا كان مسار مشروعك مختلف عن zonecode87/grafapp الرجاء تعديله
        const manifestUrl = "https://raw.githubusercontent.com/zoneCode87/GrafApp/refs/heads/main/manifest.json";
        
        console.log("جاري البحث عن تحديثات...");
        let manifest = await Neutralino.updater.checkForUpdates(manifestUrl);

        if (manifest.version !== NL_APPVERSION) {
            console.log(`يوجد تحديث جديد: الإصدار ${manifest.version}`);            
            // هنا ممكن تطلع تنبيه للمستخدم باستخدام Notyf اللي بتستخدمه بمشروعك
            // notyf.success('يوجد تحديث جديد، جاري التحميل...');

            await Neutralino.updater.install();
            console.log("تم تثبيت التحديث بنجاح. سيتم إعادة التشغيل...");
            // إعادة تشغيل التطبيق لتطبيق التحديث
            await Neutralino.app.restartProcess();
        } else {
            console.log("التطبيق محدث لآخر إصدار.");
        }
    } catch (err) {
        console.error("فشل البحث عن تحديثات:", err);
    }
}

ui.save_csv_file();

initializeApp();