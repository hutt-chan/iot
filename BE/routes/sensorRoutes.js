const express = require("express");
const db = require("../config/db");
const router = express.Router();

router.get("/data", (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 15;
  const offset = (page - 1) * limit;

  db.query(
    "SELECT * FROM sensor_data ORDER BY datetime DESC LIMIT ? OFFSET ?",
    [limit, offset],
    (err, results) => {
      if (err) throw err;
      res.json(results);
    }
  );
});

router.get("/latest", (req, res) => {
  db.query("SELECT * FROM sensor_data ORDER BY datetime DESC LIMIT 1", (err, results) => {
    if (err) throw err;
    res.json(results[0]);
  });
});

module.exports = router;
