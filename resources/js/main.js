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
    isRun = true;
    ui.style_Run_Stop_btn(isRun)
})



btnStop.addEventListener('click',()=>{
    isRun = false;
    ui.style_Run_Stop_btn(isRun)
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
                        
                        if (liveData.sensors && Array.isArray(liveData.sensors) && isRun ) {
                            let boardId = liveData.id; 

                            // إذا كان البورد جديداً، ننشئ له سجلاً فارغاً في الذاكرة
                            if (!config.data[`board_${boardId}`]) {
                                config.data[`board_${boardId}`] = {};
                            }

                            liveData.sensors.forEach((sensorObj) => {
                                let sensorKey = Object.keys(sensorObj)[0];   
                                let rawValue = sensorObj[sensorKey];            
                                
                                // جلب الإعدادات (الاسم، الوحدة، min، max) من الهارد ديسك
                                let currentSettings = config.getSensorConfig(boardId, sensorKey);
                                
                                // إرسال البيانات للكلاس لبناء أو تحديث الكرت
                                sensor.process_sensor_data(boardId, sensorKey, rawValue, currentSettings);
                            });
                        }
                    } catch (e) {
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
    await config.loadAll(); // تحميل الإعدادات من الهارد ديسك أولاً
    await refreshComPorts(); // جلب المنافذ
    await startHardwareDriver(); // تشغيل الـ C++
}

window.addEventListener('beforeunload', () => {
    if (driverProcessId !== null) {
        Neutralino.os.execCommand(`taskkill /PID ${driverProcessId} /F /T`);
        console.log("🛑 تم قتل المحرك وتحرير البورت بسبب تحديث الصفحة.");
    }
});


function handleMessageDriver(Message){
        if (Message.includes("Handshake Successful")) {
            isSystemConnected = true;
            isRun = true ; 
            console.log(isSystemConnected);
            ui.styleConectBtn(isSystemConnected);
            ui.style_Run_Stop_btn(isRun); 
        }
}



initializeApp();