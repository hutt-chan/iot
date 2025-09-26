const express = require("express");
const db = require("../config/db");
const router = express.Router();

router.get("/", (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 15;
  const offset = (page - 1) * limit;

  db.query(
    "SELECT * FROM history ORDER BY time DESC LIMIT ? OFFSET ?",
    [limit, offset],
    (err, results) => {
      if (err) throw err;
      res.json(results);
    }
  );
});

module.exports = router;
