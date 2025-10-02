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
router.get("/", (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 15;
  const offset = (page - 1) * limit;

  const search = (req.query.search || "").trim();
  const device = (req.query.device || "ALL").toUpperCase(); // mặc định ALL
  const action = (req.query.action || "ALL").toUpperCase(); // mặc định ALL

  const whereClauses = [];
  const params = [];

  // Search chỉ trên cột datetime — so sánh theo format dd/mm/YYYY HH:ii:ss
  if (search) {
  whereClauses.push("DATE_FORMAT(datetime, '%d/%m/%Y %H:%i:%s') LIKE ?");
  params.push(`%${search}%`);
  }

  // Lọc device (nếu khác "all")
if (device !== "ALL") {
  whereClauses.push("device = ?");
  params.push(device);
  }


  // Lọc action (nếu khác "ALL")
  if (action !== "ALL") {
  whereClauses.push("action = ?");
  params.push(action);
  }

  const whereClause = whereClauses.length ? " WHERE " + whereClauses.join(" AND ") : "";

  // Lấy tổng số bản ghi
  const countSql = `SELECT COUNT(*) AS total FROM history ${whereClause}`;
  db.query(countSql, params, (err, countResult) => {
    if (err) {
      console.error("DB count error:", err);
      return res.status(500).json({ error: "DB error" });
    }

    const total = countResult[0].total || 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    // Lấy dữ liệu thực tế với phân trang
    const dataSql = `SELECT * FROM history ${whereClause} ORDER BY datetime DESC LIMIT ? OFFSET ?`;
    db.query(dataSql, [...params, limit, offset], (err, results) => {
      if (err) {
        console.error("DB fetch error:", err);
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
});

// API lấy toàn bộ history (nếu FE vẫn cần)
router.get("/all", (req, res) => {
  db.query("SELECT * FROM history ORDER BY datetime DESC", (err, results) => {
    if (err) {
      console.error("DB all error:", err);
      return res.status(500).json({ error: "DB error" });
    }
    res.json(results);
  });
});

module.exports = router;
