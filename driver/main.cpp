#include <iostream>
#include <string>
#include <thread>
#include <vector>
#include <atomic> // ضرورية للتحكم في الخيوط بشكل آمن
#include <windows.h>
#include "SerialPort.h"
#include "subFunction.h"
// نستخدم atomic لضمان أن جميع الخيوط ترى التغيير في اللحظة نفسها
std::atomic<bool> keepRunning(true);
SerialPort* globalArduino = nullptr;




// 🛡️ صائد إشارات الإغلاق المطور
BOOL WINAPI consoleHandler(DWORD signal) {
    if (signal == CTRL_CLOSE_EVENT || signal == CTRL_C_EVENT) {
        keepRunning = false; // نأمر الخيوط بالتوقف فوراً

        if (globalArduino != nullptr && globalArduino->isConnected()) {
            // 1. إرسال أمر الـ Reset للأردوينو
            char resetSignal = (char)0xFF;
            globalArduino->writeSerialPort(&resetSignal, 1);

            // 2. إعطاء وقت قصير جداً للإرسال
            Sleep(100);

            // 3. فرض إغلاق الاتصال لتحرير المنفذ للنظام فوراً
            // ملاحظة: تأكد أن كلاس SerialPort لديك يحتوي على آلية تغلق Handle المنفذ
            std::cout << "Port released by Handler." << std::endl;
        }
        return TRUE; // السماح للنظام بإنهاء العملية
    }
    return FALSE;
}

// Handshake
bool performHandshake(SerialPort* arduino) {
    char startSignal = (char)0xA1;
    char response = 0;
    int maxAttempts = 50;

    std::cout << "Waiting for Handshake with Arduino..." << std::endl;

    for (int i = 0; i < maxAttempts && keepRunning; ++i) {
        arduino->writeSerialPort(&startSignal, 1);
        int bytesRead = arduino->readSerialPort(&response, 1);
        if (bytesRead > 0 && (uint8_t)response == 0xB2) {
            std::cout << "Handshake Successful" << std::endl;
            return true;
        }
        Sleep(100);
    }
    return false;
}

// Read data from  hardware


void readFromHardware(SerialPort* arduino) {
    stdataSend receivedData;
    while (arduino->isConnected() && keepRunning) {
        int bytesRead = arduino->readSerialPort((char*)&receivedData, sizeof(stdataSend));

        if (bytesRead == sizeof(stdataSend)) {
            if (receivedData.header == 0xf1 && calculate_chk_sum(receivedData) == receivedData.check_sum  ) {
                    send_data_to_ui(receivedData);
            }
        }
        std::this_thread::sleep_for(std::chrono::milliseconds(10));
    }
    std::cout << "Read thread stopped." << std::endl;
}

// read form ui
void handleInputFromUI(SerialPort* arduino) {
    std::string inputFromJS;
    while (keepRunning && std::getline(std::cin, inputFromJS)) {
        std::cout << "C++ Processed: [" << inputFromJS << "]\n" << std::flush;
        if(inputFromJS == "DisConect"){
            std::cout<<"disConect Here"<<std::endl;
            keepRunning = false;
        }
    }
    std::cout << "JS thread stopped." << std::endl;

}


int main() {
    std::string portName;
    std::cout << "⏳ Waiting..." << std::endl;
    if (!(std::getline(std::cin, portName)) || portName.empty()) {
        return 1;
    }
    std::string fullPath = "\\\\.\\" + portName;
    SerialPort arduino(fullPath.c_str());
    globalArduino = &arduino;

    if (!arduino.isConnected()) {
        std::cerr << "{\"error\": \"Could not connect to " << portName << "\"}\n" << std::flush;
        return 1;
    }

    // 4. تفعيل صائد الإغلاق
    SetConsoleCtrlHandler(consoleHandler, TRUE);

    // 5. تنفيذ المصافحة وبدء العمل
    if (performHandshake(&arduino)) {
        std::thread readThread(readFromHardware, &arduino);
        std::thread jsInputThread(handleInputFromUI, &arduino);

        readThread.join();
        jsInputThread.join();

        char resetSignal = (char)0xFF;
        arduino.writeSerialPort(&resetSignal, 1);
    } else {
        std::cerr << "{\"error\": \"Handshake failed on " << portName << "\"}\n" << std::flush;
        return 1;
    }

    return 0;
}
