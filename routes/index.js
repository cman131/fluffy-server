var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Fluffy Server - Secret Santa' });
});

router.get('/create', function(req, res, next) {
  var result = {title: 'Create Secret Santa Event'};
  result.name = req.query.name || '';
  result.code = req.query.code || '';
  result.description = req.query.description || '';
  if(req.query.failure) {
    result.failure = true;
    result.message = req.query.message || 'Issue Unknown. Contact admin.';
  }
  res.render('create', result);
});

router.post('/createevent', function(req, res) {
  // Ensure we have required params
  if(!req.body.code || !req.body.name || !req.body.passwd) {
    console.log('Not added. Missing parameters.');
    res.redirect('/create?failure=true&message=Missing required fields.'+
     '&name='+(req.body.name || '')+
     '&code='+(req.body.code || '')+
     '&passwd='+(req.body.passwd || '')+
     '&description='+(req.body.description || ''));
    return;
  } else if(!validateCode(req.body.code)) {
    console.log('Not added. Invalid Code.');
    res.redirect('/create?failure=true&message=Invalid event code.'+
     '&name='+(req.body.name || '')+
     '&code='+(req.body.code || '')+
     '&passwd='+(req.body.passwd || '')+
     '&description='+(req.body.description || ''));
    return;
  }

  var config = require('../config');
  var MongoClient = req.db;
  var temp = {
    name: req.body.name,
    passwd: req.body.passwd,
    code: req.body.code.toUpperCase()
  };
  if(req.body.description) {
    temp.description = req.body.description;
  }

  MongoClient.connect(config.url, function (err, db) {
    if (err) {
      console.log(err);
      db.close();
      res.redirect('/create?failure=true'+
       '&name='+(req.body.name || '')+
       '&code='+(req.body.code || '')+
       '&passwd='+(req.body.passwd || '')+
       '&description='+(req.body.description || ''));
    } else {
      console.log("successfully connected to the database");
      var dbeve = db.collection('events');
      dbeve.count({code: temp.code}, function(err, count) {
        if(err || count > 0) {
          console.log(err);
          db.close();
          res.redirect('/create?failure=true&message=Event code already taken.'+
           '&name='+(req.body.name || '')+
           '&code='+(req.body.code || '')+
           '&passwd='+(req.body.passwd || '')+
           '&description='+(req.body.description || ''));
          return;
        } else {
          var cursor = dbeve.insert(temp, function(err) {
            console.log('Successfully created: ' + temp.name);
            db.close();
            res.redirect('/manage?iscreation=true&code='+temp.code);
          });
        }
      }); 
    }
  });
});

router.get('/registration', function(req, res, next) {
  var result = {title: 'Secret Santa - Register'};
  result.name = req.query.name || '';
  result.email = req.query.email || '';
  result.address = req.query.address || '';
  result.code = req.query.code || '';
  result.interests = req.query.interests || '';
  if(req.query.failure) {
    result.failure = true;
    result.message = req.query.message || 'Issue Unknown. Contact admin.';
  }
  res.render('registration', result);
});

router.get('/manage', function(req, res, next) {
  if(!req.query.code || !validateCode(req.query.code)) {
    res.render('choose', {title: 'Choose Event'});
    return;
  }
  var code = req.query.code.toUpperCase();
  var config = require('../config');
  req.db.connect(config.url, function(err, db) {
    if (err) {
      console.log(err);
      return;
    }
    db.collection('events').find({code: code}).toArray(function(err, events) {
      if(events.length <= 0) {
        res.render('choose', {title: 'Choose Event', failure: true});
        return;
      }
      db.collection('participants').find({code: code}).toArray(function(err, docs) {
        res.render('manage', {
          title: events[0].name + ' - Secret Santa Event',
          participants: docs,
          code: code,
          description: events[0].description,
          isaddition: (req.query.isaddition ? true : false),
          iscreation: (req.query.iscreation ? true : false)
        });
      });
    });
  });
});

router.post('/register', function(req, res) {
  // Ensure we have required params
  if(!req.body.email || !req.body.name || !req.body.address || !req.body.code) {
    console.log(req.body.address);
    console.log('Not added. Missing parameters.');
    res.redirect('/registration?failure=true&message=Missing required fields.'+
     '&name='+(req.body.name || '')+
     '&email='+(req.body.email || '')+
     '&address='+(req.body.address || '')+
     '&interests='+(req.body.interests || ''));
    return;
  } else if(!validateEmail(req.body.email.trim())) {
    console.log('Not added. Invalid email address.');
    res.redirect('/registration?failure=true&message=Invalid email address.'+
     '&name='+(req.body.name || '')+
     '&email='+(req.body.email || '')+
     '&address='+(req.body.address || '')+
     '&code='+(req.body.code || '')+
     '&interests='+(req.body.interests || ''));
    return;
  } else if(!validateCode(req.body.code)) {
    console.log('Not added. Invalid Code.');
    res.redirect('/registration?failure=true&message=Unrecognized event code.'+
     '&name='+(req.body.name || '')+
     '&email='+(req.body.email || '')+
     '&address='+(req.body.address || '')+
     '&code='+(req.body.code || '')+
     '&interests='+(req.body.interests || ''));
    return;
  }

  var config = require('../config');
  var MongoClient = req.db;
  var temp = {
    name: req.body.name,
    email: req.body.email.trim(),
    address: req.body.address,
    code: req.body.code.toUpperCase()
  };
  if(req.body.interests) {
    temp.interests = req.body.interests;
  }

  MongoClient.connect(config.url, function (err, db) {
    if (err) {
      throw err;
    } else {
      console.log("successfully connected to the database");
      var dbpar = db.collection('participants');
      var dbeve = db.collection('events');
      dbeve.count({code: temp.code}, function(err, count) {
        if(err || count <= 0) {
          console.log(err);
          db.close();
          res.redirect('/registration?failure=true&message=Unrecognized event code.'+
           '&name='+(temp.name || '')+
           '&email='+(temp.email || '')+
           '&address='+(temp.address || '')+
           '&code='+(temp.code || '')+
           '&interests='+(temp.interests || ''));
          return;
        }
        dbpar.count({email: temp.email, code: temp.code}, function(err, count) {
          if(err) {
            console.log(err);
            db.close();
            res.redirect('/manage?isaddition=true&code='+temp.code);
          } else if(count <= 0) {
            dbpar.insert(temp, function(err) {
              console.log('Successfully added: ' + temp.name);
              db.close();
              res.redirect('/manage?isaddition=true&code='+temp.code);
            });
          } else {
            console.log('Not added. Already in db.');
            db.close();
            res.redirect('/registration?failure=true&message=Already registered.&name='+temp.name+
             '&email='+temp.email+'&address='+temp.address+(temp.interests ? '&interests='+temp.interests : ''));
            return;
          }
        }); 
      });
    }
  });
});

router.post('/start', function(req, res) {
  if(!req.query.code || !validateCode(req.query.code) || !req.body.passwd) {
    res.send({ status: 401, body: {} });
    return;
  }
  var config = require('../config');
  var code = req.query.code.toUpperCase();
  req.db.connect(config.url, function(err, db) {
    db.collection('events').find({code: code, passwd: req.body.passwd}).toArray(function(err, events) {
      if(err || !events || events.length <= 0) {
        res.send({ status: 401, body: {} });
        db.close();
      } else {
        initiateEvent(db, events[0], config, code);
        res.send({ status: 200, body: {} });
      }
    });
  });
});

function initiateEvent(db, event, config, code) {
  var email = require('emailjs/email');
  var server = email.server.connect({
    user: config.email,
    password: config.epass,
    host: 'smtp.gmail.com',
    ssl: true
  });
  if (!!event.santaAssignments) {
    sendEmails(server, config, event.santaAssignments);
  } else {
    db.collection('participants').find({code: code}).toArray(function(err, docs) {
      if(err) {
        console.log(err);
        return;
      }
      var participants = docs;
      participants = shuffle(participants);
      sendEmails(server, config, participants);

      db.collection('events').update({ code: event.code }, {
        $set: {
          santaAssignments: participants
        }
      }, function(err) {
        console.log('Successfully updated: ' + event.name);
        db.close();
      });
    });
  }
}

function sendEmails(server, config, participants) {
  var emailSent = function(err, message) { console.log(err || message); };
  for(var i=0; i<participants.length; i++) {
    var recipient = i+1 >= participants.length ? participants[0] : participants[i+1];
    var santa = participants[i];

    server.send({
      text: 'You will be getting a gift for: ' + recipient.name + '. Merry Christmas!' +
        '\n\nTheir mailing address information is: \n' + recipient.address +
        (recipient.interests ? "\n\n Their interests include: \n"+recipient.interests : '')+
        "\n\n Thank you,\n - Fluffy-Server",
      from: 'Fluffy-Server <'+config.email+'>',
      to: santa.name+' <'+santa.email+'>',
      subject: 'Secret Santa'
    }, emailSent);
  }
}

function shuffle(o){
  for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
  return o;
}

function validateEmail(email) {
  var re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email);
}

function validateCode(code) {
  var re = new RegExp('\\w{3,7}$');
  console.log(re.test(code));
  return re.test(code);
}

module.exports = router;
