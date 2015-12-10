var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Fluffy Server' });
});

router.get('/user', function(req, res) {
  res.render('users', { title: 'Fluffy Server - Users' });
});

module.exports = router;
