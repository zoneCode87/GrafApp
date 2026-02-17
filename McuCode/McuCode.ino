struct stdataSend {
  uint8_t header = 0xf1;
  uint8_t id_board = 1;
  uint8_t size = 10; // حجم ثابت
  float sensor_list[30]; // المصفوفة بحجم ثابت
  uint32_t check_sum = 0;
};

int x = 0; 
unsigned long timer =0 ; 


stdataSend data;
uint32_t calculate_chk_sum(stdataSend &d) {
    float sum = 0;
    for (int i = 0; i < d.size; i++) {
        sum += d.sensor_list[i];
    }
    return (uint32_t)sum;
}
bool isHandshakeDone = false;

void setup() {
  Serial.begin(9600);
  pinMode(LED_BUILTIN, OUTPUT);
  timer = millis(); 
}

void loop() {
  if (!isHandshakeDone) {
    if (Serial.available() > 0) {
      uint8_t incomingByte = Serial.read();
      if (incomingByte == 0xA1) {
        Serial.write(0xB2);
        isHandshakeDone = true;
        digitalWrite(LED_BUILTIN, HIGH); 
      }
    }
  } 
  else {
    if (Serial.available() > 0) {
      uint8_t byte = Serial.peek(); 
      if (byte == 0xFF) {
        Serial.read(); 
        isHandshakeDone = false;
        digitalWrite(LED_BUILTIN, LOW); 
        return; 
      }
      else if (byte == 0xA1){
        Serial.write(0xB2);
      }
    }
    
    if (millis() - timer >= 1000){
        sendBinaryData();
        timer = millis(); 
    }

  }
  delay(10); 
}

void sendBinaryData() {
  if (x > 255){
    x = 50 ;
  }
  x++;
  data.sensor_list[0] = x;
  data.sensor_list[1] =5;
  data.sensor_list[2] = 7;
  data.sensor_list[3] = 2.0; 
  data.sensor_list[4] = 260;
  data.sensor_list[5] =5;
  data.sensor_list[6] = 7;
  data.sensor_list[7] = 2.0; 
  data.sensor_list[8] = 7;
  data.sensor_list[9] = 2.0;
  data.check_sum = calculate_chk_sum(data);
  Serial.write((uint8_t*)&data, sizeof(data));
} 
