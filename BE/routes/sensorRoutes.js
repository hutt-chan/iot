const express = require("express");
const db = require("../config/db");
const router = express.Router();

router.get("/data", (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 15;
  const offset = (page - 1) * limit;
  const search = req.query.search || "";
  const searchType = req.query.searchType || "all";

  let countQuery = "SELECT COUNT(*) as total FROM sensor_data";
  let dataQuery = "SELECT * FROM sensor_data";
  let where = "";
  let params = [];

  if (search) {
      switch(searchType) {
          case "temperature":
              where = "WHERE temperature LIKE ?"; 
              params.push(`%${search}%`); 
              break;
          case "humidity":
              where = "WHERE humidity LIKE ?"; 
              params.push(`%${search}%`); 
              break;
          case "light":
              where = "WHERE light LIKE ?"; 
              params.push(`%${search}%`); 
              break;
          case "datetime":
              where = "WHERE DATE_FORMAT(datetime, '%d/%m/%Y %H:%i:%s') LIKE ?"; 
              params.push(`%${search}%`); 
              break;
          default: // all
              where = `
                  WHERE temperature LIKE ? 
                  OR humidity LIKE ? 
                  OR light LIKE ? 
                  OR DATE_FORMAT(datetime, '%d/%m/%Y %H:%i:%s') LIKE ?
              `;
              params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
      }
  }


  // Đếm tổng số bản ghi
  db.query(countQuery + " " + where, params, (err, countResult) => {
    if (err) return res.status(500).json({ error: err.message });
    const total = countResult[0].total;

    // Lấy dữ liệu có phân trang
    db.query(
      dataQuery + " " + where + " ORDER BY datetime DESC LIMIT ? OFFSET ?",
      [...params, limit, offset],
      (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({
          data: results,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        });
      }
    );
  });
});


router.get("/latest", (req, res) => {
  db.query("SELECT * FROM sensor_data ORDER BY datetime DESC LIMIT 1", (err, results) => {
    if (err) throw err;
    res.json(results[0]);
  });
});

// ✅ API lấy toàn bộ dữ liệu (cho ds.html phân trang phía client)
router.get("/all", (req, res) => {
  db.query("SELECT * FROM sensor_data ORDER BY datetime DESC", (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

module.exports = router;