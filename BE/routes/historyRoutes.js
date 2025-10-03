// routes/historyRoutes.js
const express = require("express");
const db = require("../config/db");
const router = express.Router();

// API phân trang + tìm kiếm (chỉ theo datetime) + lọc device/action
// Query params:
//  - page (default 1)
//  - limit (default 15)
//  - search (chuỗi tìm kiếm theo định dạng dd/mm/yyyy HH:mm[:ss], partial ok)
//  - device (ví dụ fan, air_conditioner, light) or "all" (mặc định)
//  - action (ON / OFF) or "all" (mặc định)
// API phân trang + tìm kiếm (chỉ theo datetime) + lọc device/action + sort server-side
router.get("/", (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 15;
    const offset = (page - 1) * limit;

    const search = (req.query.search || "").trim();
    const device = (req.query.device || "ALL").toUpperCase();
    const action = (req.query.action || "ALL").toUpperCase();

    // Sort params (string name, không index)
    const allowedSortColumns = ['id', 'device', 'action', 'datetime', 'description'];
    const sortColumn = allowedSortColumns.includes(req.query.sortColumn) ? req.query.sortColumn : 'datetime';
    const sortDirectionRaw = req.query.sortDirection ? req.query.sortDirection.toLowerCase() : 'desc';
    const sortDirection = sortDirectionRaw === 'asc' ? 'ASC' : 'DESC';
    const orderBy = `ORDER BY ${sortColumn} ${sortDirection}`;

    console.log('Raw query params:', req.query);
    console.log('Parsed sort:', { sortColumn, sortDirection, orderBy });

    const whereClauses = [];
    const params = [];

    // Search chỉ trên cột datetime
    if (search) {
      whereClauses.push("DATE_FORMAT(datetime, '%d/%m/%Y %H:%i:%s') LIKE ?");
      params.push(`%${search}%`);
    }

    // Lọc device
    if (device !== "ALL") {
      whereClauses.push("device = ?");
      params.push(device);
    }

    // Lọc action
    if (action !== "ALL") {
      whereClauses.push("action = ?");
      params.push(action);
    }

    const whereClause = whereClauses.length ? " WHERE " + whereClauses.join(" AND ") : "";

    // Lấy tổng số bản ghi
    const countSql = `SELECT COUNT(*) AS total FROM history ${whereClause}`;
    console.log('Full count SQL:', countSql, 'Params:', params);
    db.query(countSql, params, (err, countResult) => {
      if (err) {
        console.error("DB count error:", err.message);
        return res.status(500).json({ error: "DB error" });
      }

      const total = countResult[0].total || 0;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      console.log('Total records:', total);

      // Lấy dữ liệu với phân trang + sort
      const dataSql = `SELECT * FROM history ${whereClause} ${orderBy} LIMIT ? OFFSET ?`;
      console.log('Full data SQL:', dataSql, 'Params:', [...params, limit, offset]);
      db.query(dataSql, [...params, limit, offset], (err, results) => {
        if (err) {
          console.error("DB fetch error:", err.message);
          return res.status(500).json({ error: "DB error" });
        }

        res.json({
          data: results,
          total,
          page,
          limit,
          totalPages
        });
      });
    });
  } catch (error) {
    console.error("Route /history error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// API lấy toàn bộ history (nếu FE vẫn cần)
// router.get("/all", (req, res) => {
//   db.query("SELECT * FROM history ORDER BY datetime DESC", (err, results) => {
//     if (err) {
//       console.error("DB all error:", err);
//       return res.status(500).json({ error: "DB error" });
//     }
//     res.json(results);
//   });
// });

module.exports = router;
