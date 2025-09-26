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
                { label: 'Temperature (°C)', data: [], borderColor: 'blue', borderWidth: 2, fill: false, yAxisID: 'y' },
                { label: 'Humidity (%)', data: [], borderColor: 'orange', borderWidth: 2, fill: false, yAxisID: 'y' },
                { label: 'Light (Lux)', data: [], borderColor: 'green', borderWidth: 2, fill: false, yAxisID: 'y' }
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
                        font: {
                            size: 12
                        }
                    }
                }
            },
            scales: {
                x: { 
                    title: { 
                        display: true, 
                        text: 'TIME',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        font: {
                            size: 11
                        }
                    }
                },
                y: {
                    type: 'linear',
                    position: 'left',
                    title: { 
                        display: true, 
                        text: 'Temperature (°C) / Humidity (%) / Light (Lux)',
                        font: {
                            size: 12,
                            weight: 'bold'
                        }
                    },
                    min: 0,
                    max: 5000, // để đủ chứa cả Lux
                    ticks: {
                        font: {
                            size: 11
                        }
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

        const timeLabel = new Date().toLocaleTimeString();
        chart.data.labels.push(timeLabel);
        chart.data.datasets[0].data.push(data.temperature);
        chart.data.datasets[1].data.push(data.humidity);
        chart.data.datasets[2].data.push(data.light);

        if (chart.data.labels.length > 11) {
            chart.data.labels.shift();
            chart.data.datasets.forEach(ds => ds.data.shift());
        }

        chart.update();
    }

    window.updateDashboard = updateDashboard;
});
