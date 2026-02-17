#ifndef SUBFUNCTION_H_INCLUDED
#define SUBFUNCTION_H_INCLUDED


#pragma pack(push, 1)
struct stdataSend {
    uint8_t header;
    uint8_t id_board;
    uint8_t size;
    float sensor_list[30];
    uint32_t check_sum;
};
#pragma pack(pop)

uint32_t  calculate_chk_sum(stdataSend &d) {
    float sum = 0;
    for (int i = 0; i < d.size; i++) {
        sum += d.sensor_list[i];
    }
    return (uint32_t)sum;
}


void send_data_to_ui(stdataSend &data) {
    std::string json = "{\"id\": " + std::to_string(data.id_board) + ",";
    json += "\"sensors\": [";

    for (int i = 0; i < data.size; i++) {
        // إضافة علامات التنصيص حول اسم الحساس مثل {"ch0":
        json += "{\"ch" + std::to_string(i) + "\": ";

        // إغلاق القوس بعد تحويل الرقم
        json += std::to_string(data.sensor_list[i]) + "}";

        // إضافة فاصلة إذا لم يكن هذا هو العنصر الأخير
        if (i < data.size - 1) {
            json += ",";
        }
    }
    json += "]}";

    std::cout << json << std::endl << std::flush;
}










#endif // SUBFUNCTION_H_INCLUDED
