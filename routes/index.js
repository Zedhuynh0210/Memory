var express = require('express');
var router = express.Router();

/* GET API root. */
router.get('/', function(req, res, next) {
  res.json({ message: 'Memory API running', docs: '/swagger' });
});

module.exports = router;
