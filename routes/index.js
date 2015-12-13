var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Fluffy Server' });
});

router.get('/registration', function(req, res, next) {
  res.render('registration', { title: 'Fluffy Server - Register' });
});

router.get('/manage', function(req, res, next) {
    res.render('manage', {
        title: 'Fluffy Santa',
        participants: [{name: 'Conor'}, {name: 'Isaac'}, {name: 'Tom'}]
    });
});

router.post('/register', function(req, res) {
    res.send({ status: 200, body: {} });
});

router.post('/start', function(req, res) {
    res.send({ status: 200, body: {} });
});

module.exports = router;
