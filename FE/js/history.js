let currentPage = 1;
let recordsPerPage = 10; // Biến động, default 10
let totalPages = 1;

// Lưu filter/search hiện tại
let currentSearch = '';
let currentDevice = 'ALL';
let currentAction = 'ALL';
let sortColumn = -1;
let sortDirection = 'desc';

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
    return new Date(year, (month || 1) - 1, day || 0, hour || 0, minute || 0, second || 0);
}

// Thay đổi số lượng bản ghi mỗi trang (async để await loadData)
async function changeRecordsPerPage() {
    const select = document.getElementById("recordsPerPageSelect");
    if (select) {
        recordsPerPage = parseInt(select.value) || 10;
        currentPage = 1; // Reset về trang 1
        await loadData(); // Await để loadData handle displayData + update
    }
}

// Load dữ liệu từ server
async function loadData() {
    try {
        const url = new URL('http://localhost:3000/api/history');
        url.searchParams.append('page', currentPage);
        url.searchParams.append('limit', recordsPerPage); // Gửi limit dynamic
        if (currentSearch) url.searchParams.append('search', currentSearch);
        if (currentDevice !== 'ALL') url.searchParams.append('device', currentDevice);
        if (currentAction !== 'ALL') url.searchParams.append('action', currentAction);

        // Thêm sort params
        const columnNames = ['id', 'device', 'action', 'datetime', 'description'];
        const sortColName = sortColumn >= 0 ? columnNames[sortColumn] : 'datetime';
        url.searchParams.append('sortColumn', sortColName);
        url.searchParams.append('sortDirection', sortDirection); // Gửi lowercase 'desc' hoặc 'asc' để khớp backend

        console.log('Sending sort params:', { sortColumn: sortColName, sortDirection, limit: recordsPerPage, fullURL: url.toString() });

        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        const json = await res.json();

        if (!json.data || !Array.isArray(json.data)) {
            console.error('Invalid response data:', json);
            displayData([]); // Truyền [] để tránh undefined
            updateTableInfo(0, currentPage, recordsPerPage);
            updatePagination();
            return;
        }

        const pageData = json.data.map(item => ({
            id: item.id,
            device: item.device,
            action: item.action,
            time: formatDateTime(new Date(item.datetime.replace(" ", "T"))),
            description: item.description || 'No description'
        }));

        displayData(pageData); // Truyền pageData
        totalPages = json.totalPages;
        updateTableInfo(json.total, json.page, recordsPerPage); // Dùng recordsPerPage dynamic
        updatePagination();
    } catch (err) {
        console.error('Load history failed:', err);
        displayData([]); // Truyền [] an toàn
        updateTableInfo(0, currentPage, recordsPerPage);
        updatePagination();
    }
}

// Sort table
function sortTable(columnIndex) {
    if (sortColumn === columnIndex) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = columnIndex;
        sortDirection = 'asc';
    }

    currentPage = 1;
    loadData();
}

// Hiển thị dữ liệu bảng
function displayData(pageData = []) { // Default [] để tránh undefined
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    pageData.forEach(row => { // Bây giờ an toàn
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
}

// Cập nhật thông tin bảng
function updateTableInfo(total, page, limit) {
    const startIndex = (page - 1) * limit + 1;
    const endIndex = Math.min(page * limit, total);
    document.getElementById('tableInfo').textContent =
        `Show ${startIndex}-${endIndex} of ${total}`;
}

// Search
function searchData() {
    currentSearch = document.getElementById('searchInput').value.trim();
    currentPage = 1;
    loadData();
}

// Filter
function applyFilters() {
    currentDevice = document.getElementById('deviceFilter').value;
    currentAction = document.getElementById('actionFilter').value;
    currentPage = 1;
    loadData();
}

// Pagination
function updatePagination() {
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
    const newPage = currentPage + direction;
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        loadData();
    }
}

function goToPage(page) {
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        loadData();
    }
}

// Copy datetime
function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => {
            console.log("Copied:", text);
        })
        .catch(err => {
            console.error("Failed to copy:", err);
        });
}

document.addEventListener("DOMContentLoaded", () => {
    // Set initial recordsPerPage từ select
    const recordsSelect = document.getElementById("recordsPerPageSelect");
    if (recordsSelect) {
        recordsPerPage = parseInt(recordsSelect.value) || 10;
        recordsSelect.addEventListener("change", changeRecordsPerPage); // Event listener
    }

    const table = document.getElementById("dataTable");

    table.addEventListener("click", (e) => {
        if (e.target.tagName === "TD" && e.target.cellIndex === 3) {
            const datetimeValue = e.target.textContent.trim();
            copyToClipboard(datetimeValue);

            // Hiệu ứng đổi màu
            e.target.style.transition = "background-color 0.3s";
            e.target.style.backgroundColor = "#667EEA";
            setTimeout(() => {
                e.target.style.backgroundColor = "";
            }, 500);

            // Thêm tooltip thông báo "Copied!"
            const tooltip = document.createElement("span");
            tooltip.textContent = "Copied!";
            tooltip.style.position = "absolute";
            tooltip.style.background = "#333";
            tooltip.style.color = "#fff";
            tooltip.style.padding = "3px 6px";
            tooltip.style.borderRadius = "4px";
            tooltip.style.fontSize = "12px";
            tooltip.style.top = `${e.pageY - 30}px`;
            tooltip.style.left = `${e.pageX}px`;
            tooltip.style.opacity = "0.9";
            tooltip.style.pointerEvents = "none";
            document.body.appendChild(tooltip);

            // Xóa tooltip sau 1 giây
            setTimeout(() => {
                document.body.removeChild(tooltip);
            }, 1000);
        }
    });
});


// Khởi tạo khi load trang
window.onload = () => {
    loadData();

    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') searchData();
    });
};