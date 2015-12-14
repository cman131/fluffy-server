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
  res.send({ status: 200, body: {name: req.body.name, email: req.body.email} });
});

router.post('/start', function(req, res) {
  initiateEvent();
  res.send({ status: 200, body: {} });
});

function initiateEvent() {
  var email = require('emailjs/email');
  var config = require('../config');
  var server = email.server.connect({
    user: config.email,
    password: config.epass,
    host: 'smtp.gmail.com', 
    ssl: true
  });
  var participants = [
    {name: 'Conor', email: 'conor13@msn.com'},
    {name: 'oswald', email: 'oswald131@gmail.com', interests: 'yards'},
    {name: 'cgw5994', email: 'cgw5994@rit.edu'},
    {name: 'pimpsy', email: 'lieutenant.colonel.pimp@gmail.com', interests: 'pandas'},
    {name: 'patrick', email: 'guild131@msn.com'},
    {name: 'samuel', email: 'oswald13@msn.com', interests: 'all the things'}
  ];
  participants = shuffle(participants);
  for(var i=0; i<participants.length; i++) {
    var recipient = i+1 >= participants.length ? participants[0] : participants[i+1];
    var santa = participants[i];
    
    server.send({
      text: 'You will be getting a gift for: ' + recipient.name + '. Merry Christmas!'+
        (recipient.interests ? "\n\n They're interests include: \n"+recipient.interests : '')+
        "\n\n Thank you,\n - Fluffy-Server",
      from: 'Fluffy-Server <'+config.email+'>',
      to: santa.name+' <'+santa.email+'>',
      subject: 'Secret Santa'
    }, function(err, message) { console.log(err || message); });
  }
}

function shuffle(o){
  for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
  return o;
}

module.exports = router;
