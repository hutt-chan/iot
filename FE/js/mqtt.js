// mqtt.js
// MQTT Client để nhận trạng thái thiết bị real-time
let mqttClient = null;

// Track last update time để tránh spam
const lastUpdateTime = {
    fan: 0,
    air_conditioner: 0,
    light: 0
};

// Track device connection status
let deviceConnected = true;
let chartUpdateInterval = null;

// Hàm kiểm tra trạng thái kết nối thiết bị - THÊM VÀO WINDOW
window.checkDeviceConnection = function(sensorData) {
    if (!sensorData) return false;
    
    console.log("🔍 Checking device connection:", sensorData);
    
    // Kiểm tra dựa trên dữ liệu sensor
    const isDisconnected = 
        (sensorData.temperature === 0 || sensorData.temperature === null) && 
        (sensorData.humidity === 0 || sensorData.humidity === null) && 
        (sensorData.light === 0 || sensorData.light === null);
    
    // Kiểm tra timestamp
    const currentTime = new Date().getTime();
    const dataTime = sensorData.timestamp ? new Date(sensorData.timestamp).getTime() : currentTime;
    const isDataStale = (currentTime - dataTime) > 30000;
    
    const connected = !(isDisconnected || isDataStale);
    console.log(`📡 Device connected: ${connected}`);
    
    return connected;
}

// Kết nối MQTT
function connectMQTT() {
    try {
        // Sử dụng MQTT over WebSocket
        mqttClient = mqtt.connect('ws://localhost:9001', {
            username: 'esp32',
            password: '123'
        });

        mqttClient.on('connect', () => {
            console.log('MQTT WebSocket connected');
            mqttClient.subscribe('device/status');
        });

        mqttClient.on('message', (topic, message) => {
            if (topic === 'device/status') {
                const text = message.toString();
                console.log('Received device status from MQTT:', text);
                
                try {
                    let device, status;
                    if (text.includes(":")) {
                        [device, status] = text.split(":");
                    } else {
                        const obj = JSON.parse(text);
                        device = obj.device;
                        status = obj.status;
                    }
                    
                    // Normalize status to uppercase
                    status = (status || "").toUpperCase();
                    
                    // Cập nhật switch tương ứng
                    updateDeviceSwitch(device, status);
                } catch (e) {
                    console.error('Error parsing MQTT status:', e);
                }
            }
        });

        mqttClient.on('error', (err) => {
            console.error('MQTT error:', err);
        });
    } catch (err) {
        console.error('Failed to connect MQTT:', err);
    }
}

// Hàm kiểm tra trạng thái kết nối thiết bị
function checkDeviceConnection(sensorData) {
    if (!sensorData) return false;
    
    // Kiểm tra dựa trên dữ liệu sensor
    // Nếu tất cả giá trị = 0 hoặc không hợp lệ, coi như disconnected
    const isDisconnected = 
        (sensorData.temperature === 0 || sensorData.temperature === null) && 
        (sensorData.humidity === 0 || sensorData.humidity === null) && 
        (sensorData.light === 0 || sensorData.light === null);
    
    // Hoặc kiểm tra timestamp (nếu dữ liệu quá cũ)
    const currentTime = new Date().getTime();
    const dataTime = sensorData.timestamp ? new Date(sensorData.timestamp).getTime() : currentTime;
    const isDataStale = (currentTime - dataTime) > 30000; // 30 giây
    
    return !(isDisconnected || isDataStale);
}

// Hàm dừng cập nhật biểu đồ
function stopChartUpdates() {
    if (chartUpdateInterval) {
        clearInterval(chartUpdateInterval);
        chartUpdateInterval = null;
    }
    
    // Dừng animation biểu đồ nếu có
    if (window.pauseChart) {
        window.pauseChart();
    }
}

// Hàm hiển thị trạng thái disconnected
function showDisconnectedStatus() {
    // Thêm indicator vào UI
    const statusIndicator = document.getElementById('device-status') || createStatusIndicator();
    statusIndicator.innerHTML = '🔴 Thiết bị ngắt kết nối';
    statusIndicator.style.color = '#ff4444';
    
    // Hiển thị giá trị mặc định
    const tempEl = document.getElementById("temp");
    const humiEl = document.getElementById("humi");
    const lightEl = document.getElementById("light");
    
    if (tempEl) tempEl.innerText = "-- ℃";
    if (humiEl) humiEl.innerText = "-- %";
    if (lightEl) lightEl.innerText = "-- lux";
}

// Hàm hiển thị trạng thái connected
function showConnectedStatus() {
    const statusIndicator = document.getElementById('device-status');
    if (statusIndicator) {
        statusIndicator.innerHTML = '🟢 Thiết bị đã kết nối';
        statusIndicator.style.color = '#00c853';
    }
}

// Tạo indicator nếu chưa có
function createStatusIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'device-status';
    indicator.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: white;
        padding: 5px 10px;
        border-radius: 5px;
        font-size: 12px;
        z-index: 1000;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(indicator);
    return indicator;
}

// Cập nhật switch dựa trên trạng thái từ MQTT
function updateDeviceSwitch(device, status) {
    const deviceMap = {
        'fan': 0,
        'air_conditioner': 1,
        'light': 2
    };
    
    const switchIndex = deviceMap[device];
    if (switchIndex !== undefined) {
        const switches = document.querySelectorAll(".devices input[type=checkbox]");
        if (switches[switchIndex]) {
            const isOn = status === "ON";
            const currentState = switches[switchIndex].checked;
            const now = Date.now();
            
            console.log(`MQTT received: ${device} = ${status}, current switch state: ${currentState ? 'ON' : 'OFF'}`);
            
            // Chỉ cập nhật nếu:
            // 1. Trạng thái thực sự khác
            // 2. Chưa cập nhật trong 500ms (tránh spam)
            if (currentState !== isOn && (now - lastUpdateTime[device]) > 500) {
                switches[switchIndex].checked = isOn;
                lastUpdateTime[device] = now;
                console.log(`✅ MQTT: Updated ${device} switch from ${currentState ? 'ON' : 'OFF'} to ${isOn ? 'ON' : 'OFF'}`);
            } else if (currentState === isOn) {
                console.log(`⏭️ MQTT: ${device} switch already correct (${isOn ? 'ON' : 'OFF'}), no update needed`);
            } else {
                console.log(`⏭️ MQTT: ${device} update too frequent, skipping`);
            }
            
            // Re-enable switch sau khi nhận được MQTT update
            switches[switchIndex].disabled = false;
            
            // Ẩn spinner khi nhận MQTT update
            const spinnerMap = {
                'fan': document.getElementById("fan-spinner"),
                'air_conditioner': document.getElementById("ac-spinner"),
                'light': document.getElementById("light-spinner")
            };
            if (spinnerMap[device]) {
                spinnerMap[device].style.display = "none";
            }
        }
    }
}

// Kết nối tới backend để load dữ liệu sensor mới nhất định kỳ
// Kết nối tới backend để load dữ liệu sensor mới nhất định kỳ
async function fetchLatestSensor() {
    try {
        const res = await fetch("http://localhost:3000/api/sensor/latest");
        const data = await res.json();

        if (data) {
            // Kiểm tra trạng thái kết nối - SỬA THÀNH window.checkDeviceConnection
            const isConnected = window.checkDeviceConnection(data);
            
            if (!isConnected && deviceConnected) {
                // Chuyển từ connected sang disconnected
                console.log("⚠️ Device disconnected - stopping chart updates");
                deviceConnected = false;
                stopChartUpdates();
                showDisconnectedStatus();
            } else if (isConnected && !deviceConnected) {
                // Chuyển từ disconnected sang connected
                console.log("✅ Device reconnected - resuming chart updates");
                deviceConnected = true;
                showConnectedStatus();
            }
            
            // Chỉ cập nhật dashboard nếu device connected
            if (deviceConnected) {
                if (typeof window !== 'undefined' && typeof window.updateDashboard === 'function') {
                    window.updateDashboard(data);
                } else {
                    const tempEl = document.getElementById("temp");
                    const humiEl = document.getElementById("humi");
                    const lightEl = document.getElementById("light");
                    if (tempEl) tempEl.innerText = data.temperature + "℃";
                    if (humiEl) humiEl.innerText = data.humidity + "%";
                    if (lightEl) lightEl.innerText = data.light + " lux";
                }
            } else {
                // Nếu disconnected, vẫn hiển thị giá trị nhưng với style khác
                const tempEl = document.getElementById("temp");
                const humiEl = document.getElementById("humi");
                const lightEl = document.getElementById("light");
                if (tempEl) tempEl.innerText = data.temperature + "℃";
                if (humiEl) humiEl.innerText = data.humidity + "%";
                if (lightEl) lightEl.innerText = data.light + " lux";
            }
        }
    } catch (err) {
        console.error("Lỗi fetch sensor:", err);
        // Nếu fetch lỗi, coi như disconnected
        if (deviceConnected) {
            deviceConnected = false;
            stopChartUpdates();
            showDisconnectedStatus();
        }
    }
}

// Gọi API để điều khiển thiết bị
async function controlDevice(device, action) {
    try {
        const res = await fetch("http://localhost:3000/api/device/control", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ device, action })
        });
        const result = await res.json();
        console.log("Device control result:", result);
        return { ok: true };
    } catch (err) {
        console.error("Lỗi control device:", err);
        return { ok: false };
    }
}

// Đồng bộ trạng thái công tắc với backend
async function syncDeviceStatus() {
    try {
        const res = await fetch("http://localhost:3000/api/device/status");
        const status = await res.json();
        console.log("Received device status:", status);
        
        // Map: index -> device key
        const deviceKeys = ["fan", "air_conditioner", "light"];
        document.querySelectorAll(".devices input[type=checkbox]").forEach((el, idx) => {
            const key = deviceKeys[idx];
            const on = (status && status[key]) === "ON";
            console.log(`Setting ${key} to ${on ? 'ON' : 'OFF'} (was ${el.checked ? 'ON' : 'OFF'})`);
            
            // Chỉ cập nhật nếu trạng thái thực sự khác
            if (el.checked !== on) {
                el.checked = !!on;
                console.log(`Updated ${key} switch to reflect actual device status`);
            }
        });
    } catch (err) {
        console.error("Lỗi đồng bộ trạng thái thiết bị:", err);
    }
}

// Gắn event cho các switch
// Map device -> spinner ID
const spinnerMap = {
    fan: document.getElementById("fan-spinner"),
    air_conditioner: document.getElementById("ac-spinner"),
    light: document.getElementById("light-spinner")
};

document.querySelectorAll(".devices input[type=checkbox]").forEach((el, idx) => {
    el.addEventListener("change", async () => {
        let deviceName = idx === 0 ? "fan" : idx === 1 ? "air_conditioner" : "light";
        const desiredChecked = el.checked;
        const desiredAction = desiredChecked ? "ON" : "OFF";

        // Revert switch để chờ lệnh
        el.checked = !desiredChecked;

        // Hiển thị spinner
        if (spinnerMap[deviceName]) {
            spinnerMap[deviceName].style.display = "inline-block";
        }

        // Disable switch
        el.disabled = true;
        
        const result = await controlDevice(deviceName, desiredAction);
        if (!result.ok) {
            el.disabled = false;
            if (spinnerMap[deviceName]) {
                spinnerMap[deviceName].style.display = "none"; // ẩn spinner nếu thất bại
            }
            return;
        }

        // Timeout: nếu không nhận MQTT update sau 5s
        setTimeout(() => {
            if (el.disabled) {
                el.disabled = false;
                if (spinnerMap[deviceName]) {
                    spinnerMap[deviceName].style.display = "none";
                }
            }
        }, 5000);
    });
});

// Khởi tạo biểu đồ với cơ chế interval
function initializeChartWithInterval() {
    // Nếu bạn đang dùng biểu đồ real-time
    chartUpdateInterval = setInterval(() => {
        if (deviceConnected && window.addChartData) {
            // Chỉ thêm điểm dữ liệu nếu device connected
            // Hàm fetchLatestSensor sẽ gọi addChartData
        }
    }, 3000);
}

// Cập nhật dữ liệu sensor mỗi 3s
document.addEventListener('DOMContentLoaded', () => {
    // Tạo status indicator
    createStatusIndicator();
    
    // Load dữ liệu ban đầu
    fetchLatestSensor();
    
    // Cập nhật sensor mỗi 3s nhưng có kiểm tra trạng thái
    setInterval(fetchLatestSensor, 3000);
    
    // Đồng bộ trạng thái thiết bị khi trang tải
    syncDeviceStatus();
    
    // Kết nối MQTT để nhận trạng thái real-time
    connectMQTT();
    
    // Khởi tạo biểu đồ
    initializeChartWithInterval();
    
    // Tắt đồng bộ định kỳ để tránh conflict với MQTT real-time
    // setInterval(syncDeviceStatus, 5000); // Đã comment out
});