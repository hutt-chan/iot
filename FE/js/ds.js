let currentData = [];
let filteredData = [];
let currentPage = 1;
const recordsPerPage = 5;
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
        const response = await fetch('http://localhost:3000/api/sensor/data?page=1&limit=100');
        const data = await response.json();
        
        // Chuyển đổi dữ liệu từ API thành format phù hợp
        currentData = data.map((item, index) => ({
            id: item.id || (index + 1),
            temperature: parseFloat(item.temperature).toFixed(1),
            humidity: parseFloat(item.humidity).toFixed(1),
            light: parseInt(item.light),
            datetime: formatDateTime(new Date(item.datetime))
        }));
        
        filteredData = [...currentData];
        console.log('Loaded data from API:', currentData.length, 'records');
    } catch (error) {
        console.error('Error loading data:', error);
        // Không sử dụng dữ liệu giả. Để trống dữ liệu khi lỗi.
        currentData = [];
        filteredData = [];
    }
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
            <td class="temperature-cell">${row.temperature}</td>
            <td class="humidity-cell">${row.humidity}</td>
            <td class="light-cell">${row.light}</td>
            <td>${row.datetime}</td>
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

// Tìm kiếm dữ liệu
function searchData() {
    const searchTerm = document.getElementById('searchInput').value.trim();
    const searchType = document.getElementById('searchType').value;
    
    if (!searchTerm) {
        // Nếu không có từ khóa tìm kiếm, hiển thị tất cả
        filteredData = [...currentData];
    } else {
        filteredData = currentData.filter(row => {
            switch (searchType) {
                case 'temperature':
                    return row.temperature.includes(searchTerm);
                case 'humidity':
                    return row.humidity.includes(searchTerm);
                case 'light':
                    return row.light.toString().includes(searchTerm);
                case 'datetime':
                    return row.datetime.toLowerCase().includes(searchTerm.toLowerCase());
                case 'all':
                default:
                    return row.id.toString().includes(searchTerm) ||
                           row.temperature.includes(searchTerm) ||
                           row.humidity.includes(searchTerm) ||
                           row.light.toString().includes(searchTerm) ||
                           row.datetime.toLowerCase().includes(searchTerm.toLowerCase());
            }
        });
    }
    
    currentPage = 1;
    displayData();
    updatePagination();
}

// Sắp xếp bảng
function sortTable(columnIndex) {
    if (sortColumn === columnIndex) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = columnIndex;
        sortDirection = 'asc';
    }

    const columnNames = ['id', 'temperature', 'humidity', 'light', 'datetime'];
    const columnName = columnNames[columnIndex];

    filteredData.sort((a, b) => {
        let aVal = a[columnName];
        let bVal = b[columnName];

        if (columnName === 'datetime') {
            aVal = parseDateTime(aVal);
            bVal = parseDateTime(bVal);
        } else {
            aVal = parseFloat(aVal);
            bVal = parseFloat(bVal);
        }

        if (sortDirection === 'asc') {
            return aVal > bVal ? 1 : -1;
        } else {
            return aVal < bVal ? 1 : -1;
        }
    });

    displayData();
}

// Phân trang
function updatePagination() {
    const totalPages = Math.ceil(filteredData.length / recordsPerPage);
    const pageNumbers = document.getElementById('pageNumbers');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    // Cập nhật nút Previous/Next
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;

    // Tạo số trang
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

// Tìm kiếm khi nhấn Enter trong ô input
document.getElementById('searchInput').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        searchData();
    }
});

// Khởi tạo khi tải trang
window.onload = initTable;
