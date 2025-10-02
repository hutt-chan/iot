let currentData = [];
let filteredData = [];
let currentPage = 1;
const recordsPerPage = 10;
let sortColumn = -1;
let sortDirection = 'asc';

// Helper: format Date to dd/mm/yyyy hh:mm:ss
function formatDateTime(dateObj) {
    const pad = (n) => n.toString().padStart(2, '0');
    const d = pad(dateObj.getDate());
    const m = pad(dateObj.getMonth() + 1);
    const y = dateObj.getFullYear();
    const hh = pad(dateObj.getHours());
    const mm = pad(dateObj.getMinutes());
    const ss = pad(dateObj.getSeconds());
    return `${d}/${m}/${y} ${hh}:${mm}:${ss}`;
}

// Helper: parse dd/mm/yyyy hh:mm:ss to Date
function parseDateTime(str) {
    const [datePart, timePart] = str.split(' ');
    if (!datePart || !timePart) return new Date(str);
    const [day, month, year] = datePart.split('/').map(Number);
    const [hour, minute, second] = timePart.split(':').map(Number);
    return new Date(year, (month || 1) - 1, day || 1, hour || 0, minute || 0, second || 0);
}

// Khởi tạo bảng
async function initTable() {
    await loadData();
    displayData();
    updatePagination();
}

// Tải dữ liệu từ API
async function loadData() {
    try {
        // const response = await fetch('http://localhost:3000/api/history?page=1&limit=1000');
        const res = await fetch('http://localhost:3000/api/history/all');
        const data = await res.json();

        
        if (data && data.length > 0) {
            currentData = data.map((item, index) => ({
                id: item.id || (index + 1),
                device: item.device || 'Unknown',
                action: item.action || 'Unknown',
                // time: formatDateTime(new Date(item.time)),
                time: formatDateTime(new Date(item.datetime.replace(" ", "T"))),
                description: item.description || 'No description'
            }));
            
            filteredData = [...currentData];
            console.log('Loaded history data from API:', currentData.length, 'records');
            updateDataStatus(`Data from API (${currentData.length})`, 'success');
        } else {
            console.log('No history data found in API');
            currentData = [];
            filteredData = [];
            updateDataStatus('No data', 'warning');
        }
    } catch (error) {
        console.error('Error loading history data:', error);
        updateDataStatus('Error fetching API', 'error');
        currentData = [];
        filteredData = [];
    }
}

// Cập nhật trạng thái dữ liệu
function updateDataStatus(message, type) {
    const statusText = document.getElementById('statusText');
    statusText.textContent = message;
    statusText.className = type;
}

// Hiển thị dữ liệu
function displayData() {
    const tbody = document.getElementById('tableBody');
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    const pageData = filteredData.slice(startIndex, endIndex);

    tbody.innerHTML = '';
    pageData.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.id}</td>
            <td class="device-cell">${row.device}</td>
            <td class="action-cell">${row.action}</td>
            <td>${row.time}</td>
            <td>${row.description}</td>
        `;
        tbody.appendChild(tr);
    });

    updateTableInfo();
}

// Cập nhật thông tin bảng
function updateTableInfo() {
    const startIndex = (currentPage - 1) * recordsPerPage + 1;
    const endIndex = Math.min(currentPage * recordsPerPage, filteredData.length);
    document.getElementById('tableInfo').textContent = 
        `Show ${startIndex}-${endIndex} of ${filteredData.length}`;
}

// Tìm kiếm
function searchData() {
    const searchTerm = document.getElementById('searchInput').value.trim();
    
    if (!searchTerm) {
        filteredData = [...currentData];
    } else {
        filteredData = currentData.filter(row => row.time.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    
    currentPage = 1;
    displayData();
    updatePagination();
}

// Lọc
function applyFilters() {
    const deviceFilter = document.getElementById('deviceFilter').value;
    const actionFilter = document.getElementById('actionFilter').value;
    
    filteredData = currentData.filter(row => {
        let deviceMatch = deviceFilter === 'ALL' || row.device === deviceFilter;
        let actionMatch = actionFilter === 'ALL' || row.action === actionFilter;
        return deviceMatch && actionMatch;
    });
    
    currentPage = 1;
    displayData();
    updatePagination();
}

// Sắp xếp
function sortTable(columnIndex) {
    if (sortColumn === columnIndex) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = columnIndex;
        sortDirection = 'asc';
    }

    const columnNames = ['id', 'device', 'action', 'time', 'description'];
    const columnName = columnNames[columnIndex];

    filteredData.sort((a, b) => {
        let aVal = a[columnName];
        let bVal = b[columnName];

        if (columnName === 'time') {
            aVal = parseDateTime(aVal);
            bVal = parseDateTime(bVal);
        } else if (columnName === 'id') {
            aVal = parseInt(aVal);
            bVal = parseInt(bVal);
        } else {
            aVal = aVal.toString().toLowerCase();
            bVal = bVal.toString().toLowerCase();
        }

        return sortDirection === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });

    displayData();
}

// Phân trang
function updatePagination() {
    const totalPages = Math.ceil(filteredData.length / recordsPerPage);
    const pageNumbers = document.getElementById('pageNumbers');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;

    pageNumbers.innerHTML = '';
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        pageBtn.className = i === currentPage ? 'active' : '';
        pageBtn.onclick = () => goToPage(i);
        pageNumbers.appendChild(pageBtn);
    }
}

function changePage(direction) {
    const totalPages = Math.ceil(filteredData.length / recordsPerPage);
    const newPage = currentPage + direction;
    
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        displayData();
        updatePagination();
    }
}

function goToPage(page) {
    currentPage = page;
    displayData();
    updatePagination();
}

// Search khi nhấn Enter
document.getElementById('searchInput').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        searchData();
    }
});

// Hàm copy vào clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        console.log("Copied:", text);
    }).catch(err => {
        console.error("Failed to copy:", err);
    });
}


// Gắn sự kiện cho cột DateTime (cột số 4 - index = 4)
document.addEventListener("DOMContentLoaded", () => {
    const table = document.getElementById("dataTable");

    table.addEventListener("click", (e) => {
        if (e.target.tagName === "TD" && e.target.cellIndex === 3) {
            const datetimeValue = e.target.textContent.trim();
            copyToClipboard(datetimeValue);

            // Hiệu ứng báo copy thành công
            e.target.style.backgroundColor = "#667EEA";
            setTimeout(() => {
                e.target.style.backgroundColor = "";
            }, 500);
        }
    });
});



// Khởi tạo khi tải trang
window.onload = initTable;
