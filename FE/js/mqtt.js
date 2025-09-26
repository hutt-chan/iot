// mqtt.js
// MQTT Client để nhận trạng thái thiết bị real-time
let mqttClient = null;

// Track last update time để tránh spam
const lastUpdateTime = {
    fan: 0,
    air_conditioner: 0,
    light: 0
};

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
        }
    }
}

// Kết nối tới backend để load dữ liệu sensor mới nhất định kỳ
async function fetchLatestSensor() {
    try {
        const res = await fetch("http://localhost:3000/api/sensor/latest");
        const data = await res.json();

        if (data) {
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
        }
    } catch (err) {
        console.error("Lỗi fetch sensor:", err);
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
document.querySelectorAll(".devices input[type=checkbox]").forEach((el, idx) => {
    el.addEventListener("change", async () => {
        let deviceName = "";
        if (idx === 0) deviceName = "fan";
        if (idx === 1) deviceName = "air_conditioner";
        if (idx === 2) deviceName = "light";

        // Lấy trạng thái mà user muốn (trạng thái mới sau click, nhưng sẽ revert để không thay đổi ngay)
        const desiredChecked = el.checked;
        const desiredAction = desiredChecked ? "ON" : "OFF";

        // Revert switch về trạng thái cũ ngay lập tức để không thay đổi visual
        el.checked = !desiredChecked;

        // Vô hiệu hóa switch trong lúc gửi lệnh và chờ phản hồi
        el.disabled = true;
        
        console.log(`User clicked ${deviceName} switch, requesting: ${desiredAction}, reverted switch temporarily`);
        
        const result = await controlDevice(deviceName, desiredAction);
        if (!result.ok) {
            // Nếu gửi lệnh thất bại, enable lại mà không thay đổi
            el.disabled = false;
            console.log(`Failed to send command for ${deviceName}, enabled switch without change`);
            return;
        }
        
        console.log(`Command sent for ${deviceName}, waiting for MQTT status update...`);
        
        // Để handle timeout (nếu không nhận MQTT sau 5s, enable lại và giữ nguyên trạng thái cũ)
        setTimeout(() => {
            if (el.disabled) {
                el.disabled = false;
                console.log(`Timeout waiting for MQTT for ${deviceName}, enabled switch without update`);
            }
        }, 5000);
    });
});

// Cập nhật dữ liệu sensor mỗi 2s
document.addEventListener('DOMContentLoaded', () => {
    fetchLatestSensor();
    setInterval(fetchLatestSensor, 2000);
    // Đồng bộ trạng thái thiết bị khi trang tải
    syncDeviceStatus();
    // Kết nối MQTT để nhận trạng thái real-time
    connectMQTT();
    
    // Tắt đồng bộ định kỳ để tránh conflict với MQTT real-time
    // setInterval(syncDeviceStatus, 5000); // Đã comment out
});