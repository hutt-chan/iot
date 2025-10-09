#include <WiFi.h>
#include <PubSubClient.h>
#include <Preferences.h> // Thêm thư viện Preferences
#include "DHT.h"

// WiFi
const char* ssid = "Nguyet Anh";     
const char* password = "03062006";
// const char* ssid = "Hutt";     
// const char* password = "00000000";

// MQTT Broker
const char* mqtt_server = "192.144.22.102";
// const char* mqtt_server = "10.118.203.214";
const int mqtt_port = 1883;
// 10.118.203.214
//192.144.22.102


WiFiClient espClient;
PubSubClient client(espClient);

// LED pins
int led1 = 2;
int led2 = 5;
int led3 = 18;

// LED states
bool led1State = false;
bool led2State = false;
bool led3State = false;

// Preferences để lưu trạng thái
Preferences preferences;

// DHT11
#define DHTPIN 4
#define DHTTYPE DHT11  
DHT dht(DHTPIN, DHTTYPE);

// Light sensor
#define LIGHTPIN 34

// Hàm publish trạng thái LED
void publishLedStatus(String led, String status) {
  String message = led + ":" + status;
  client.publish("device/status", message.c_str());
  Serial.println("Published LED status: " + message);
}

// Hàm lưu trạng thái LED vào Preferences
void saveLedStates() {
  preferences.begin("led-states", false);
  preferences.putBool("led1", led1State);
  preferences.putBool("led2", led2State);
  preferences.putBool("led3", led3State);
  preferences.end();
}

// Hàm đọc trạng thái LED từ Preferences
void loadLedStates() {
  preferences.begin("led-states", true);
  led1State = preferences.getBool("led1", false);
  led2State = preferences.getBool("led2", false);
  led3State = preferences.getBool("led3", false);
  preferences.end();

  // Áp dụng trạng thái cho LED
  digitalWrite(led1, led1State ? HIGH : LOW);
  digitalWrite(led2, led2State ? HIGH : LOW);
  digitalWrite(led3, led3State ? HIGH : LOW);
}

// Hàm gửi trạng thái LED qua MQTT khi khởi động
void publishInitialLedStates() {
  publishLedStatus("led1", led1State ? "on" : "off");
  publishLedStatus("led2", led2State ? "on" : "off");
  publishLedStatus("led3", led3State ? "on" : "off");
}

// Hàm xử lý tin nhắn MQTT
void callback(char* topic, byte* message, unsigned int length) {
  String msg;
  for (int i = 0; i < length; i++) {
    msg += (char)message[i];
  }

  Serial.print("Tin nhan tu topic: ");
  Serial.println(topic);
  Serial.print("Noi dung: ");
  Serial.println(msg);

  // Xử lý lệnh LED và cập nhật trạng thái
  if (msg == "led1:on") {
    digitalWrite(led1, HIGH);
    led1State = true;
    publishLedStatus("led1", "on");
    saveLedStates(); // Lưu trạng thái
  }
  if (msg == "led1:off") {
    digitalWrite(led1, LOW);
    led1State = false;
    publishLedStatus("led1", "off");
    saveLedStates();
  }
  if (msg == "led2:on") {
    digitalWrite(led2, HIGH);
    led2State = true;
    publishLedStatus("led2", "on");
    saveLedStates();
  }
  if (msg == "led2:off") {
    digitalWrite(led2, LOW);
    led2State = false;
    publishLedStatus("led2", "off");
    saveLedStates();
  }
  if (msg == "led3:on") {
    digitalWrite(led3, HIGH);
    led3State = true;
    publishLedStatus("led3", "on");
    saveLedStates();
  }
  if (msg == "led3:off") {
    digitalWrite(led3, LOW);
    led3State = false;
    publishLedStatus("led3", "off");
    saveLedStates();
  }
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Dang ket noi MQTT...");
    if (client.connect("ESP32Client")) {
      Serial.println("Da ket noi!");
      client.subscribe("device/action");
      // Gửi trạng thái LED ngay sau khi kết nối
      publishInitialLedStates();
    } else {
      Serial.print("That bai, rc=");
      Serial.print(client.state());
      Serial.println(" Thu lai sau 5s");
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);

  pinMode(led1, OUTPUT);
  pinMode(led2, OUTPUT);
  pinMode(led3, OUTPUT);

  // Đọc trạng thái LED từ Preferences
  loadLedStates();

  dht.begin();

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Dang ket noi WiFi...");
  }
  Serial.println("WiFi da ket noi!");

  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  // Đọc dữ liệu từ DHT11
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  int light = 4095 - analogRead(LIGHTPIN);

  if (isnan(h) || isnan(t)) {
    Serial.println("Loi doc tu DHT11!");
    return;
  }

  // Gửi dữ liệu sensor
  String payload = "{";
  payload += "\"temperature\":" + String(t) + ",";
  payload += "\"humidity\":" + String(h) + ",";
  payload += "\"light\":" + String(light);
  payload += "}";

  Serial.print("Publish: ");
  Serial.println(payload);

  client.publish("datasensor", payload.c_str());

  delay(5000);
}