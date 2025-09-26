const express = require("express");
const { client, deviceStatus, deviceToLed } = require("../services/mqttService");

const router = express.Router();

router.post("/control", (req, res) => {
  const { device, action } = req.body;
  const ledCommand = deviceToLed[device];

  if (ledCommand) {
    const ledAction = (action || "").toUpperCase() === "ON" ? "on" : "off";
    const mqttMessage = `${ledCommand}:${ledAction}`;
    client.publish("device/action", mqttMessage);
    console.log(`Sent to ESP32: ${mqttMessage}`);
  }

  res.json({ status: "ok" });
});

router.get("/status", (req, res) => {
  res.json({ ...deviceStatus });
});

module.exports = router;
