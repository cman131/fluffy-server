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
  req.db.connect(config.url, function(err, db) {
    db.collection('participants').find({}).toArray(function(err, docs) {
      res.render('manage', {
        title: 'Fluffy Santa',
        participants: docs
      });
    });
  });
});

router.post('/register', function(req, res) {
  var config = require('../config');
  var MongoClient = req.db;
  var temp = {
    name: req.body.name,
    email: req.body.email
  };
  if(req.body.interests) {
    temp.interests = req.body.interests;
  }
  console.log(config.url);

  MongoClient.connect(config.url, function (err, db) {
    if (err) {
      throw err;
    } else {
      console.log("successfully connected to the database");
      var dbcol = db.collection('participants');
      if(dbcol.count({email: temp.email}) <= 0) {
        var cursor = dbcol.insert(temp);
      }
    }
    db.close();
  });
  res.send({ status: 200, body: temp });
});

router.post('/start', function(req, res) {
  initiateEvent(req.db);
  res.send({ status: 200, body: {} });
});

function initiateEvent(MongoClient) {
  var email = require('emailjs/email');
  var config = require('../config');
  var server = email.server.connect({
    user: config.email,
    password: config.epass,
    host: 'smtp.gmail.com',
    ssl: true
  });

  MongoClient.connect(config.url, function(err, db) {
    db.collection('participants').find({}).toArray(function(err, docs) {
      var participants = docs;
      participants = shuffle(participants);
      var emailSent = function(err, message) { console.log(err || message); };
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
        }, emailSent);
      }
    });
  });
}

function shuffle(o){
  for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
  return o;
}

module.exports = router;
