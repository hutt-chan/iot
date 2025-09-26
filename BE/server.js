const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

// Khởi tạo app
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Import routes
const sensorRoutes = require("./routes/sensorRoutes");
const historyRoutes = require("./routes/historyRoutes");
const deviceRoutes = require("./routes/deviceRoutes");

// Định nghĩa routes
app.use("/api/sensor", sensorRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/device", deviceRoutes);

// Start server
app.listen(3000, () => console.log("Server running on port 3000"));
