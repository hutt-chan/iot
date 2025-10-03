const express = require("express");
const db = require("../config/db");
const router = express.Router();

router.get("/data", (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";
    const searchType = req.query.searchType || "all";

    // Sort params
    const sortColumnParamRaw = parseInt(req.query.sortColumn);
  const sortColumnParam = isNaN(sortColumnParamRaw) ? -1 : sortColumnParamRaw;
  const sortDirectionParam = req.query.sortDirection || "desc";

  console.log('Raw query params:', req.query);
  console.log('Parsed sortColumn:', sortColumnParam);
    let countQuery = "SELECT COUNT(*) as total FROM sensor_data";
    let dataQuery = "SELECT * FROM sensor_data";
    let where = "";
    let params = [];
    let orderBy = "ORDER BY datetime DESC"; // Declare trước, fallback an toàn

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

    // Xây dựng ORDER BY (override nếu valid)
    if (sortColumnParam !== -1) {
        const columnMap = {
            0: "id",
            1: "temperature",
            2: "humidity",
            3: "light",
            4: "datetime"
        };
        const columnName = columnMap[sortColumnParam];
        if (columnName) {
            orderBy = `ORDER BY ${columnName} ${sortDirectionParam}`;
        } else {
            console.warn(`Invalid sort column: ${sortColumnParam}, fallback to datetime DESC`);
        }
    }

    console.log('Received sort params:', { sortColumn: sortColumnParam, sortDirection: sortDirectionParam, orderBy });
    console.log('SQL parts:', { where, params, orderBy });

    // Đếm tổng số bản ghi
    const fullCountQuery = countQuery + " " + where;
    console.log('Full count SQL:', fullCountQuery, 'Params:', params);
    db.query(fullCountQuery, params, (err, countResult) => {
      if (err) {
        console.error('Count query error:', err.message);
        return res.status(500).json({ error: `Count query failed: ${err.message}` });
      }
      const total = countResult[0].total;
      console.log('Total records:', total);

      // Lấy dữ liệu có phân trang
      const fullDataQuery = dataQuery + " " + where + " " + orderBy + " LIMIT ? OFFSET ?";
      console.log('Full data SQL:', fullDataQuery, 'Params:', [...params, limit, offset]);
      db.query(fullDataQuery, [...params, limit, offset], (err, results) => {
        if (err) {
          console.error('Data query error:', err.message);
          return res.status(500).json({ error: `Data query failed: ${err.message}` });
        }
        res.json({
          data: results,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        });
      });
    });
  } catch (error) {
    console.error('Route /data error:', error);
    res.status(500).json({ error: `Server error: ${error.message}` });
  }
});

router.get("/latest", (req, res) => {
  db.query("SELECT * FROM sensor_data ORDER BY datetime DESC LIMIT 1", (err, results) => {
    if (err) {
      console.error('Latest query error:', err.message);
      res.status(500).json({ error: err.message });
    } else {
      res.json(results[0]);
    }
  });
});

// ✅ API lấy toàn bộ dữ liệu (cho ds.html phân trang phía client)
// router.get("/all", (req, res) => {
//   db.query("SELECT * FROM sensor_data ORDER BY datetime DESC", (err, results) => {
//     if (err) throw err;
//     res.json(results);
//   });
// });

module.exports = router;