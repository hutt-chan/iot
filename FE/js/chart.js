// chart.js
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('myChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                { 
                    label: 'Temperature (°C)', 
                    data: [], 
                    borderColor: 'blue', 
                    borderWidth: 2, 
                    fill: false, 
                    yAxisID: 'y'
                },
                { 
                    label: 'Humidity (%)', 
                    data: [], 
                    borderColor: 'orange', 
                    borderWidth: 2, 
                    fill: false, 
                    yAxisID: 'y'
                },
                { 
                    label: 'Light (Lux)', 
                    data: [], 
                    borderColor: 'green', 
                    borderWidth: 2, 
                    fill: false, 
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: { size: 12 }
                    }
                }
            },
            scales: {
                x: { 
                    title: { 
                        display: true, 
                        text: 'TIME',
                        font: { size: 13, weight: 'bold' }
                    },
                    ticks: { font: { size: 11 } }
                },
                y: {
                    type: 'linear',
                    position: 'left',
                    title: { 
                        display: true, 
                        text: 'Temperature (°C) / Humidity (%)',
                        font: { size: 12, weight: 'bold' }
                    },
                    min: 0,
                    max: 100,
                    ticks: { font: { size: 11 } }
                },
                y1: {
                    type: 'linear',
                    position: 'right',
                    title: { 
                        display: true, 
                        text: 'Light (Lux)',
                        font: { size: 12, weight: 'bold' }
                    },
                    min: 0,
                    max: 5000,
                    ticks: { font: { size: 11 } },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });

    function updateDashboard(data) {
        if (!data) return;

        const tempEl = document.getElementById("temp");
        const humiEl = document.getElementById("humi");
        const lightEl = document.getElementById("light");
        if (tempEl) tempEl.innerText = data.temperature + "℃";
        if (humiEl) humiEl.innerText = data.humidity + "%";
        if (lightEl) lightEl.innerText = data.light + " lux";

        // QUAN TRỌNG: Kiểm tra device connected trước khi cập nhật biểu đồ
        const isConnected = window.checkDeviceConnection && window.checkDeviceConnection(data);
        
        if (!isConnected) {
            console.log("⏸️ Chart: Device disconnected, skipping chart update");
            return; // DỪNG CẬP NHẬT BIỂU ĐỒ
        }

        console.log("✅ Chart: Device connected, updating chart");

        const timeLabel = new Date().toLocaleTimeString();
        chart.data.labels.push(timeLabel);
        chart.data.datasets[0].data.push(data.temperature);
        chart.data.datasets[1].data.push(data.humidity);
        chart.data.datasets[2].data.push(data.light);

        if (chart.data.labels.length > 13) {
            chart.data.labels.shift();
            chart.data.datasets.forEach(ds => ds.data.shift());
        }

        chart.update();
    }

    // Hàm dừng biểu đồ
    function pauseChart() {
        console.log("⏸️ Chart updates paused");
    }

    // Expose functions to global scope
    window.updateDashboard = updateDashboard;
    window.pauseChart = pauseChart;
});