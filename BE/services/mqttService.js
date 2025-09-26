const mqtt = require("mqtt");
const db = require("../config/db");

// Trạng thái thiết bị trong bộ nhớ
const deviceStatus = {
  fan: "OFF",
  air_conditioner: "OFF",
  light: "OFF"
};

// Mapping
const ledToDevice = {
  led1: "fan",
  led2: "air_conditioner",
  led3: "light"
};
const deviceToLed = {
  fan: "led1",
  air_conditioner: "led2",
  light: "led3"
};

// MQTT client
const client = mqtt.connect("mqtt://localhost:1883", {
  username: "esp32",
  password: "123"
});

client.on("connect", () => {
  console.log("MQTT connected!");
  client.subscribe("datasensor");
  client.subscribe("device/action");
  client.subscribe("device/status");
});

// Lắng nghe message
client.on("message", (topic, message) => {
  const text = message.toString();
  console.log(`MQTT Message: ${topic} => ${text}`);

  if (topic === "datasensor") {
    const data = JSON.parse(text);
    db.query(
      "INSERT INTO sensor_data (temperature, humidity, light) VALUES (?,?,?)",
      [data.temperature, data.humidity, data.light]
    );
  }

  if (topic === "device/action") {
    const [device, action] = text.split(":");
    const deviceName = ledToDevice[device] || device;
    const deviceAction = (action || "").toUpperCase() === "ON" ? "ON" : "OFF";

    db.query(
      "INSERT INTO history (device, action, description) VALUES (?,?,?)",
      [deviceName, deviceAction, `Device ${deviceName} turned ${deviceAction}`]
    );
  }

  if (topic === "device/status") {
    try {
      let parsedDevice, parsedStatus;
      if (text.includes(":")) {
        [parsedDevice, parsedStatus] = text.split(":");
      } else {
        const obj = JSON.parse(text);
        parsedDevice = obj.device;
        parsedStatus = obj.status;
      }

      const status = (parsedStatus || "").toUpperCase();
      const device = ledToDevice[parsedDevice] || parsedDevice;

      if (deviceStatus.hasOwnProperty(device)) {
        const oldStatus = deviceStatus[device];
        deviceStatus[device] = status === "ON" ? "ON" : "OFF";

        if (oldStatus !== deviceStatus[device]) {
          const statusMessage = `${device}:${deviceStatus[device]}`;
          client.publish("device/status", statusMessage);
          console.log(`Published device status to MQTT: ${statusMessage}`);
        }
      }
    } catch (e) {
      console.error("Parse device/status error:", e);
    }
  }
});

module.exports = { client, deviceStatus, deviceToLed };
