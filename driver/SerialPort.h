#ifndef SERIALPORT_H_INCLUDED
#define SERIALPORT_H_INCLUDED

#include <windows.h>
#include <string>
#include <iostream>

class SerialPort {
private:
    HANDLE hSerial;
    bool connected;

public:
    SerialPort(const char* portName) {
        connected = false;

        hSerial = CreateFile(
            portName, GENERIC_READ | GENERIC_WRITE, 0, NULL,
            OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, NULL
        );

        if (hSerial == INVALID_HANDLE_VALUE) {
            std::cerr << "مشكلة: لا يمكن فتح المنفذ " << portName << "\n";
        }
        else {
            // أ- الاتفاق على سرعة الكلام (Baud Rate = 9600)
            DCB dcbSerialParams = {0};
            dcbSerialParams.DCBlength = sizeof(dcbSerialParams);
            GetCommState(hSerial, &dcbSerialParams);
            dcbSerialParams.BaudRate = CBR_9600;
            dcbSerialParams.ByteSize = 8;
            dcbSerialParams.StopBits = ONESTOPBIT;
            dcbSerialParams.Parity   = NOPARITY;
            SetCommState(hSerial, &dcbSerialParams);
            COMMTIMEOUTS timeouts = {0};
            timeouts.ReadIntervalTimeout = 50;
            timeouts.ReadTotalTimeoutConstant = 50;
            timeouts.ReadTotalTimeoutMultiplier = 10;
            SetCommTimeouts(hSerial, &timeouts);

            connected = true; // نجح الاتصال! نضيء اللمبة الخضراء
        }
    }

    // 2. لحظة النهاية (الديسكتراكتور): إغلاق الخط بأمان عند إغلاق البرنامج
    ~SerialPort() {
        if (connected) {
            connected = false;
            CloseHandle(hSerial);

        }
    }

    // 3. الاستماع (قراءة البيانات القادمة من الحساسات)
    int readSerialPort(char* buffer, unsigned int buf_size) {
        DWORD bytesRead = 0; // عداد يحسب كم حرف وصلني

        if (connected) {
            // استمع للخط، واكتب ما تسمعه داخل الـ buffer
            ReadFile(hSerial, buffer, buf_size, &bytesRead, NULL);
        }

        return bytesRead; // أرجع عدد الأحرف التي تم قراءتها
    }

    // 4. سؤال سريع: هل نحن متصلون؟
    bool isConnected() {
        return connected;
    }


    bool writeSerialPort(const char* buffer, unsigned int buf_size) {
        DWORD bytesWritten;
        if (connected) {
            // نستخدم دالة WriteFile الخاصة بالويندوز للإرسال
            return WriteFile(hSerial, buffer, buf_size, &bytesWritten, NULL);
        }
        return false;
    }
};

#endif // SERIALPORT_H_INCLUDED
