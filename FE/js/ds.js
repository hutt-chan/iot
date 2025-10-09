let currentData = [];
let currentPage = 1;
let recordsPerPage = 10; // Biến động, default 10
let totalPages = 1;
let sortColumn = -1;
let sortDirection = 'asc';
let currentSearch = "";
let currentSearchType = "all";

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
    // Set initial recordsPerPage từ select
    const select = document.getElementById("recordsPerPageSelect");
    if (select) {
        recordsPerPage = parseInt(select.value) || 10;
    }
    await loadData();
    displayData();
    updatePagination();
}

// Thay đổi số lượng bản ghi mỗi trang
function changeRecordsPerPage() {
    const select = document.getElementById("recordsPerPageSelect");
    if (select) {
        recordsPerPage = parseInt(select.value) || 10;
        currentPage = 1; // Reset về trang 1
        loadData().then(() => {
            displayData();
            updatePagination();
            updateTableInfo();
        });
    }
}

// Tải dữ liệu từ API (có phân trang & tìm kiếm & limit dynamic ở BE)
async function loadData() {
    try {
        const url = new URL("http://localhost:3000/api/sensor/data");
        url.searchParams.append("page", currentPage);
        url.searchParams.append("limit", recordsPerPage); // Gửi limit dynamic

        if (currentSearch) {
            url.searchParams.append("search", currentSearch);
            url.searchParams.append("searchType", currentSearchType);
        }

        // Thêm sort params
        if (sortColumn !== -1) {
            url.searchParams.append("sortColumn", sortColumn);
            url.searchParams.append("sortDirection", sortDirection);
        }

        console.log('Sending sort params:', { sortColumn, sortDirection, limit: recordsPerPage, fullURL: url.toString() });

        const response = await fetch(url);
        const result = await response.json();

        currentData = result.data.map((item) => ({
            id: item.id,
            temperature: parseFloat(item.temperature).toFixed(1),
            humidity: parseFloat(item.humidity).toFixed(1),
            light: parseInt(item.light),
            datetime: formatDateTime(new Date(item.datetime))
        }));

        totalPages = result.totalPages;

        console.log(`Loaded page ${currentPage}, ${currentData.length} records (limit: ${recordsPerPage})`);
    } catch (error) {
        console.error("Error loading data:", error);
        currentData = [];
        totalPages = 1;
    }
}

// Hiển thị dữ liệu
function displayData() {
    const tbody = document.getElementById("tableBody");
    tbody.innerHTML = "";

    currentData.forEach(row => {
        const tr = document.createElement("tr");
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
    const endIndex = startIndex + currentData.length - 1;
    const total = totalPages * recordsPerPage; // Dùng recordsPerPage dynamic
    document.getElementById("tableInfo").textContent =
        `Show ${startIndex}-${endIndex} of ~${total}`;
}

// Tìm kiếm dữ liệu (gửi query lên BE)
async function searchData() {
    currentSearch = document.getElementById("searchInput").value.trim();
    currentSearchType = document.getElementById("searchType").value;
    currentPage = 1;
    await loadData();
    displayData();
    updatePagination();
}

// Sắp xếp bảng (gửi lên server)
async function sortTable(columnIndex) {
    if (sortColumn === columnIndex) {
        sortDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
        sortColumn = columnIndex;
        sortDirection = "asc";
    }

    currentPage = 1;
    await loadData();
    displayData();
    updatePagination();
}

// Phân trang
function updatePagination() {
    const pageNumbers = document.getElementById("pageNumbers");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");

    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;

    pageNumbers.innerHTML = "";
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement("button");
        pageBtn.textContent = i;
        pageBtn.className = i === currentPage ? "active" : "";
        pageBtn.onclick = async () => {
            currentPage = i;
            await loadData();
            displayData();
            updatePagination();
        };
        pageNumbers.appendChild(pageBtn);
    }
}

async function changePage(direction) {
    const newPage = currentPage + direction;
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        await loadData();
        displayData();
        updatePagination();
    }
}

// Tìm kiếm khi nhấn Enter
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("searchInput").addEventListener("keypress", function(event) {
        if (event.key === "Enter") {
            searchData();
        }
    });

    // Event cho records per page select (nếu onchange inline chưa đủ)
    const recordsSelect = document.getElementById("recordsPerPageSelect");
    if (recordsSelect) {
        recordsSelect.addEventListener("change", changeRecordsPerPage);
    }

    // Copy datetime event (giữ nguyên)
    const table = document.getElementById("dataTable");
    table.addEventListener("click", (e) => {
        if (e.target.tagName === "TD" && e.target.cellIndex === 4) {
            const datetimeValue = e.target.textContent.trim();
            copyToClipboard(datetimeValue);

            e.target.style.transition = "background-color 0.3s";
            e.target.style.backgroundColor = "#667EEA";
            setTimeout(() => {
                e.target.style.backgroundColor = "";
            }, 500);

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

            setTimeout(() => {
                document.body.removeChild(tooltip);
            }, 1000);
        }
    });
});

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

// Khởi tạo khi tải trang
window.onload = initTable;