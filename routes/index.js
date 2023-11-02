var express = require('express');
var router = express.Router();
const ObjectId = require('mongodb').ObjectId;

function databaseConnection(req, dbFunction) {
  var config = require('../config');
  var MongoClient = req.db;
  MongoClient.connect(config.url, (err, client) => {
    try {
      dbFunction(err, client, err ? undefined : client.db('secretsanta'));
    }
    catch(err) {
      console.log(err);
      client.close();
    }
  });
};

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
     '&name='+encodeURIComponent(req.body.name || '')+
     '&code='+encodeURIComponent(req.body.code || '')+
     '&passwd='+encodeURIComponent(req.body.passwd || '')+
     '&description='+encodeURIComponent(req.body.description || ''));
    return;
  } else if(!validateCode(req.body.code)) {
    console.log('Not added. Invalid Code.');
    res.redirect('/create?failure=true&message=Invalid event code.'+
     '&name='+encodeURIComponent(req.body.name || '')+
     '&code='+encodeURIComponent(req.body.code || '')+
     '&passwd='+encodeURIComponent(req.body.passwd || '')+
     '&description='+encodeURIComponent(req.body.description || ''));
    return;
  }

  var temp = {
    name: req.body.name,
    passwd: req.body.passwd,
    code: req.body.code.toUpperCase()
  };
  if(req.body.description) {
    temp.description = req.body.description;
  }

  databaseConnection(req, (err, client, db) => {
    if (err) {
      console.log(err);
      client.close();
      res.redirect('/create?failure=true'+
       '&name='+encodeURIComponent(req.body.name || '')+
       '&code='+encodeURIComponent(req.body.code || '')+
       '&passwd='+encodeURIComponent(req.body.passwd || '')+
       '&description='+encodeURIComponent(req.body.description || ''));
    } else {
      console.log("successfully connected to the database");
      var dbeve = db.collection('events');
      dbeve.count({code: temp.code}, function(err, count) {
        if(err || count > 0) {
          console.log(err);
          client.close();
          res.redirect('/create?failure=true&message=Event code already taken.'+
           '&name='+encodeURIComponent(req.body.name || '')+
           '&code='+encodeURIComponent(req.body.code || '')+
           '&passwd='+encodeURIComponent(req.body.passwd || '')+
           '&description='+encodeURIComponent(req.body.description || ''));
          return;
        } else {
          var cursor = dbeve.insert(temp, function(err) {
            console.log('Successfully created: ' + temp.name);
            client.close();
            res.redirect('/manage?iscreation=true&code='+temp.code);
          });
        }
      }); 
    }
  });
});

router.get('/message-participant', function(req, res, next) {
  var result = {title: 'Secret Santa - Message a participant anonymously'};
  result.recipient = req.query.recipient || '';
  result.code = req.query.code || '';
  result.messagebody = req.query.messagebody || '';
  if(req.query.failure) {
    result.failure = true;
    result.message = req.query.message || 'Issue Unknown. Contact admin.';
  }
  res.render('message-participant', result);
});

router.get('/message-santa', function(req, res, next) {
  var result = {title: 'Secret Santa - Message your secret santa'};
  result.email = req.query.email || '';
  result.code = req.query.code || '';
  result.messagebody = req.query.messagebody || '';
  if(req.query.failure) {
    result.failure = true;
    result.message = req.query.message || 'Issue Unknown. Contact admin.';
  }
  res.render('message-santa', result);
});

router.post('/message-santa', function(req, res) {
  console.log(req.body);
  // Ensure we have required params
  if(!req.body.email || !req.body.messagebody || !req.body.code) {
    console.log('Not added. Missing parameters.');
    res.redirect('/message-santa?failure=true&message=Missing required fields.'+
     '&messagebody='+encodeURIComponent(req.body.messagebody || '')+
     '&email='+encodeURIComponent(req.body.email || '')+
     '&code='+encodeURIComponent(req.body.code || ''));
    return;
  } else if(!validateEmail(req.body.email.trim())) {
    console.log('Not added. Invalid email address.');
    res.redirect('/message-santa?failure=true&message=Invalid email address.'+
     '&messagebody='+encodeURIComponent(req.body.messagebody || '')+
     '&email='+encodeURIComponent(req.body.email || '')+
     '&code='+encodeURIComponent(req.body.code || ''));
    return;
  } else if(!validateCode(req.body.code)) {
    console.log('Not added. Invalid Code.');
    res.redirect('/message-santa?failure=true&message=Unrecognized event code.'+
     '&messagebody='+encodeURIComponent(req.body.messagebody || '')+
     '&email='+encodeURIComponent(req.body.email || '')+
     '&code='+encodeURIComponent(req.body.code || ''));
    return;
  }

  var config = require('../config');
  var MongoClient = req.db;
  var temp = {
    messagebody: req.body.messagebody,
    email: req.body.email.trim(),
    code: req.body.code.toUpperCase()
  };

  databaseConnection(req, (err, client, db) => {
    if (err) {
      throw err;
    } else {
      console.log("successfully connected to the database");
      var dbeve = db.collection('events');
      dbeve.find({code: temp.code}).toArray(function(err, events) {
        if(err || !events || events.length <= 0) {
          console.log(err);
          client.close();
          res.redirect('/message-santa?failure=true&message=Unrecognized event code.'+
            '&messagebody='+encodeURIComponent(req.body.messagebody || '')+
            '&email='+encodeURIComponent(req.body.email || '')+
            '&code='+encodeURIComponent(req.body.code || ''));
          return;
        }
        const event = events[0];
        if (!event.santaAssignments) {
          client.close();
          res.redirect('/message-santa?failure=true&message=This event has not started yet.'+
            '&messagebody='+encodeURIComponent(req.body.messagebody || '')+
            '&email='+encodeURIComponent(req.body.email || '')+
            '&code='+encodeURIComponent(req.body.code || ''));
          return;
        }
        const filteredParticipants = event.santaAssignments.filter(participant => participant.email.trim().toUpperCase() === temp.email.trim().toUpperCase());
        if (filteredParticipants.length <= 0) {
          client.close();
          res.redirect('/message-santa?failure=true&message=Email unrecognized.'+
            '&messagebody='+encodeURIComponent(req.body.messagebody || '')+
            '&email='+encodeURIComponent(req.body.email || '')+
            '&code='+encodeURIComponent(req.body.code || ''));
          return;
        }
        const sendingParticipant = filteredParticipants[0];
        let recipientIndex = event.santaAssignments.indexOf(sendingParticipant) - 1;
        recipientIndex = recipientIndex <= -1 ? event.santaAssignments.length - 1 : recipientIndex;
        const receivingParticipant = event.santaAssignments[recipientIndex];

        sendCustomEmail(config, receivingParticipant, temp.messagebody);
        client.close();
        res.redirect('/manage?successfuloperation=true&code='+temp.code);
      });
    }
  });
});

router.post('/message-participant', function(req, res) {
  // Ensure we have required params
  if(!req.body.recipient || !req.body.messagebody || !req.body.code) {
    console.log('Not added. Missing parameters.');
    res.redirect('/message-participant?failure=true&message=Missing required fields.'+
     '&recipient='+encodeURIComponent(req.body.recipient || '')+
     '&messagebody='+encodeURIComponent(req.body.messagebody || '')+
     '&code='+encodeURIComponent(req.body.code || ''));
    return;
  } else if(!validateCode(req.body.code)) {
    console.log('Not added. Invalid Code.');
    res.redirect('/message-participant?failure=true&message=Unrecognized event code.'+
     '&recipient='+encodeURIComponent(req.body.recipient || '')+
     '&messagebody='+encodeURIComponent(req.body.messagebody || '')+
     '&code='+encodeURIComponent(req.body.code || ''));
    return;
  }

  var config = require('../config');
  var MongoClient = req.db;
  var temp = {
    recipient: req.body.recipient.trim(),
    messagebody: req.body.messagebody,
    code: req.body.code.toUpperCase()
  };

  databaseConnection(req, (err, client, db) => {
    if (err) {
      throw err;
    } else {
      console.log("successfully connected to the database");
      var dbpar = db.collection('participants');
      dbpar.find({code: temp.code}).toArray(function(err, participants) {
        if(err || !participants || participants.length <= 0) {
          console.log(err);
          client.close();
          res.redirect('/message-participant?failure=true&message=Unrecognized event code.'+
          '&recipient='+encodeURIComponent(req.body.recipient || '')+
          '&messagebody='+encodeURIComponent(req.body.messagebody || '')+
          '&code='+encodeURIComponent(req.body.code || ''));
          return;
        }
        const filteredParticipants = participants.filter(participant => participant.name.trim().toUpperCase() === temp.recipient.trim().toUpperCase());
        if (filteredParticipants.length <= 0) {
          client.close();
          res.redirect('/message-participant?failure=true&message=Recipient unrecognized.'+
            '&recipient='+encodeURIComponent(req.body.recipient || '')+
            '&messagebody='+encodeURIComponent(req.body.messagebody || '')+
            '&code='+encodeURIComponent(req.body.code || ''));
          return;
        }
        sendCustomEmail(config, filteredParticipants[0], temp.messagebody);
        client.close();
        res.redirect('/manage?successfuloperation=true&code='+temp.code);
      });
    }
  });
});

function getParticipants(code, req, res, func) {
  databaseConnection(req, (err, client, db) => {
    if (err) {
      console.log(err);
      client.close();
      return;
    }
    db.collection('events').find({code: code}).toArray(function(err, events) {
      if(events.length <= 0) {
        res.send({status: 404});
        client.close();
        return;
      }
      db.collection('participants').find({code: code}).toArray((err, docs) => {
        func(err, docs);
        client.close();
      });
    });
  });
};

router.get('/report-shipping', function(req, res, next) {
  var result = {title: 'Secret Santa - Report shipping'};
  result.recipient = req.query.recipient || '';
  result.code = req.query.code || '';
  result.email = req.query.email || '';
  result.deliveryestimate = req.query.deliveryestimate || '';
  if(req.query.failure) {
    result.failure = true;
    result.message = req.query.message || 'Issue Unknown. Contact admin.';
  }

  getParticipants(result.code, req, res, (err, docs) => {
    result.participants = docs;
    res.render('report-shipping', result);
  })
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

router.get('/update-registration', function(req, res, next) {
  var code = req.query.code.toUpperCase();
  var participantId = req.query.participant_id;
  databaseConnection(req, (err, client, db) => {
    if (err) {
      console.log(err);
      client.close();
      return;
    }
    db.collection('events').find({code: code}).toArray(function(err, events) {
      if(events.length <= 0) {
        res.send({ status: 404 });
        client.close();
        return;
      }
      else if (!!events[0].santaAssignments) {
        res.send({ status: 400, message: 'Event has already begun.' });
      }
      db.collection('participants').find({code: code}).toArray(function(err, docs) {
        const participants = docs.filter(par => par._id == participantId);
        if (participants.length <= 0) {
          res.send({ status: 404 });
          client.close();
          return;
        }
        const participant = participants[0];
        res.render('update-registration', {
          title: events[0].name + ' - Update Registration',
          code: code,
          participant_id: participant._id,
          name: req.query.name || participant.name,
          email: req.query.email || '',
          spouse: req.query.spouse || participant.spouse,
          address: req.query.address || participant.address,
          interests: req.query.interests || participant.interests,
          failure: req.query.failure,
          message: req.query.message || 'Issue Unknown. Contact admin.'
        });
        client.close();
      });
    });
  });
});

router.post('/update-registration', function(req, res) {
  // Ensure we have required params
  console.log(req.body);
  if(!req.body.email || !req.body.name || !req.body.address || !req.body.code || !req.body.participant_id) {
    console.log('Not added. Missing parameters.');
    res.redirect('/update-registration?failure=true&message=Missing required fields.'+
     '&name='+encodeURIComponent(req.body.name || '')+
     '&email='+encodeURIComponent(req.body.email || '')+
     '&address='+encodeURIComponent(req.body.address || '')+
     '&interests='+encodeURIComponent(req.body.interests || '')+
     '&spouse='+encodeURIComponent(req.body.spouse || '')+
     '&participant_id='+encodeURIComponent(req.body.participant_id || '')+
     '&code='+encodeURIComponent(req.body.code || ''));
    return;
  } else if(!validateEmail(req.body.email.trim())) {
    console.log('Not added. Invalid email address.');
    res.redirect('/update-registration?failure=true&message=Invalid email address.'+
     '&name='+encodeURIComponent(req.body.name || '')+
     '&email='+encodeURIComponent(req.body.email || '')+
     '&address='+encodeURIComponent(req.body.address || '')+
     '&interests='+encodeURIComponent(req.body.interests || '')+
     '&spouse='+encodeURIComponent(req.body.spouse || '')+
     '&participant_id='+encodeURIComponent(req.body.participant_id || '')+
     '&code='+encodeURIComponent(req.body.code || ''));
    return;
  } else if(!validateCode(req.body.code)) {
    console.log('Not added. Invalid Code.');
    res.redirect('/update-registration?failure=true&message=Unrecognized event code.'+
     '&name='+encodeURIComponent(req.body.name || '')+
     '&email='+encodeURIComponent(req.body.email || '')+
     '&address='+encodeURIComponent(req.body.address || '')+
     '&interests='+encodeURIComponent(req.body.interests || '')+
     '&spouse='+encodeURIComponent(req.body.spouse || '')+
     '&participant_id='+encodeURIComponent(req.body.participant_id || '')+
     '&code='+encodeURIComponent(req.body.code || ''));
    return;
  }

  var temp = {
    name: req.body.name.trim(),
    email: req.body.email.trim(),
    address: req.body.address.trim(),
    code: req.body.code.trim().toUpperCase(),
    interests: req.body.interests || undefined,
    spouse: req.body.spouse || undefined
  };

  databaseConnection(req, (err, client, db) => {
    if (err) {
      throw err;
    } else {
      console.log("successfully connected to the database");
      var dbpar = db.collection('participants');
      var dbeve = db.collection('events');
      dbeve.count({code: temp.code}, function(err, count) {
        if(err || count <= 0) {
          console.log(err);
          client.close();
          res.redirect('/update-registration?failure=true&message=Unrecognized event code.'+
           '&name='+encodeURIComponent(temp.name || '')+
           '&email='+encodeURIComponent(temp.email || '')+
           '&address='+encodeURIComponent(temp.address || '')+
           '&code='+encodeURIComponent(temp.code || '')+
           '&spouse='+encodeURIComponent(req.body.spouse || '')+
           '&participant_id='+encodeURIComponent(req.body.participant_id || '')+
           '&interests='+encodeURIComponent(temp.interests || ''));
          return;
        }
        dbpar.find({_id: ObjectId(req.body.participant_id), code: temp.code}).toArray(function(err, results) {
          if(err) {
            console.log(err);
            client.close();
            res.redirect('/manage?code='+temp.code);
          } else if(results.length <= 0 || results[0].email.toUpperCase() !== temp.email.toUpperCase()) {
            console.log('Participant not recognized.');
            client.close();
            res.redirect('/update-registration?failure=true&message=Unrecognized participant email address.'+
            '&name='+encodeURIComponent(req.body.name || '')+
            '&email='+encodeURIComponent(req.body.email || '')+
            '&address='+encodeURIComponent(req.body.address || '')+
            '&interests='+encodeURIComponent(req.body.interests || '')+
            '&spouse='+encodeURIComponent(req.body.spouse || '')+
            '&participant_id='+encodeURIComponent(req.body.participant_id || '')+
            '&code='+encodeURIComponent(req.body.code || ''));
            return;
          } else {
            dbpar.update({ email: temp.email, code: temp.code }, {$set: temp}, function(err) {
              console.log('Successfully added: ' + temp.name);
              client.close();
              res.redirect('/manage?isupdated=true&code='+temp.code);
            });
          }
        }); 
      });
    }
  });
});

router.get('/manage', function(req, res, next) {
  if(!req.query.code || !validateCode(req.query.code)) {
    res.render('choose', {title: 'Choose Event'});
    return;
  }
  var code = req.query.code.toUpperCase();
  databaseConnection(req, (err, client, db) => {
    if (err) {
      console.log(err);
      client?.close();
      return;
    }
    db.collection('events').find({code: code}).toArray(function(err, events) {
      if(events.length <= 0) {
        res.render('choose', {title: 'Choose Event', failure: true});
        client.close();
        return;
      }
      db.collection('participants').find({code: code}).toArray(function(err, docs) {
        res.render('manage', {
          title: events[0].name + ' - Secret Santa Event',
          participants: docs,
          code: code,
          description: events[0].description,
          isStarted: !!events[0].santaAssignments,
          isaddition: (req.query.isaddition ? true : false),
          iscreation: (req.query.iscreation ? true : false)
        });
        client.close();
      });
    });
  });
});

router.get('/event-participants-list/:code', function(req, res) {
  if(!req.params.code || !validateCode(req.params.code)) {
    res.send({status: 404});
    return;
  }
  var code = req.params.code.toUpperCase();
  return getParticipants(code, req, res, function(err, docs) {
    res.send({ status: 200, items: docs });
  });
});

router.post('/register', function(req, res) {
  // Ensure we have required params
  if(!req.body.email || !req.body.name || !req.body.address || !req.body.code) {
    console.log('Not added. Missing parameters.');
    res.redirect('/registration?failure=true&message=Missing required fields.'+
     '&name='+encodeURIComponent(req.body.name || '')+
     '&email='+encodeURIComponent(req.body.email || '')+
     '&address='+encodeURIComponent(req.body.address || '')+
     '&interests='+encodeURIComponent(req.body.interests || ''));
    return;
  } else if(!validateEmail(req.body.email.trim())) {
    console.log('Not added. Invalid email address.');
    res.redirect('/registration?failure=true&message=Invalid email address.'+
     '&name='+encodeURIComponent(req.body.name || '')+
     '&email='+encodeURIComponent(req.body.email || '')+
     '&address='+encodeURIComponent(req.body.address || '')+
     '&code='+encodeURIComponent(req.body.code || '')+
     '&interests='+encodeURIComponent(req.body.interests || ''));
    return;
  } else if(!validateCode(req.body.code)) {
    console.log('Not added. Invalid Code.');
    res.redirect('/registration?failure=true&message=Unrecognized event code.'+
     '&name='+encodeURIComponent(req.body.name || '')+
     '&email='+encodeURIComponent(req.body.email || '')+
     '&address='+encodeURIComponent(req.body.address || '')+
     '&code='+encodeURIComponent(req.body.code || '')+
     '&interests='+encodeURIComponent(req.body.interests || ''));
    return;
  }

  var temp = {
    name: req.body.name.trim(),
    email: req.body.email.trim(),
    address: req.body.address.trim(),
    code: req.body.code.trim().toUpperCase(),
    spouse: req.body.spouse
  };
  if(req.body.interests) {
    temp.interests = req.body.interests;
  }

  databaseConnection(req, (err, client, db) => {
    if (err) {
      throw err;
    } else {
      console.log("successfully connected to the database");
      var dbpar = db.collection('participants');
      var dbeve = db.collection('events');
      dbeve.count({code: temp.code}, function(err, count) {
        if(err || count <= 0) {
          console.log(err);
          client.close();
          res.redirect('/registration?failure=true&message=Unrecognized event code.'+
           '&name='+encodeURIComponent(temp.name || '')+
           '&email='+encodeURIComponent(temp.email || '')+
           '&address='+encodeURIComponent(temp.address || '')+
           '&code='+encodeURIComponent(temp.code || '')+
           '&interests='+encodeURIComponent(temp.interests || ''));
          return;
        }
        dbpar.count({email: temp.email, code: temp.code}, function(err, count) {
          if(err) {
            console.log(err);
            client.close();
            res.redirect('/manage?isaddition=true&code='+temp.code);
          } else if(count <= 0) {
            dbpar.insert(temp, function(err) {
              console.log('Successfully added: ' + temp.name);
              client.close();
              res.redirect('/manage?isaddition=true&code='+temp.code);
            });
          } else {
            console.log('Not added. Already in db.');
            client.close();
            res.redirect('/registration?failure=true&message=Already registered.'+
             '&name='+encodeURIComponent(temp.name || '')+
             '&email='+encodeURIComponent(temp.email || '')+
             '&address='+encodeURIComponent(temp.address || '')+
             '&code='+encodeURIComponent(temp.code || '')+
             '&interests='+encodeURIComponent(temp.interests || ''));
            return;
          }
        }); 
      });
    }
  });
});

router.post('/report-shipping', function(req, res) {
  console.log(req.body);
  // Ensure we have required params
  if(!req.body.email || !req.body.recipient || !req.body.code) {
    console.log('Not added. Missing parameters.');
    res.redirect('/report-shipping?failure=true&message=Missing required fields.'+
     '&recipient='+encodeURIComponent(req.body.recipient || '')+
     '&email='+encodeURIComponent(req.body.email || '')+
     '&code='+encodeURIComponent(req.body.code || '')+
     '&deliveryestimate='+encodeURIComponent(req.body.deliveryestimate || ''));
    return;
  } else if(!validateEmail(req.body.email.trim())) {
    console.log('Not added. Invalid email address.');
    res.redirect('/report-shipping?failure=true&message=Invalid email address.'+
     '&recipient='+encodeURIComponent(req.body.recipient || '')+
     '&email='+encodeURIComponent(req.body.email || '')+
     '&code='+encodeURIComponent(req.body.code || '')+
     '&deliveryestimate='+encodeURIComponent(req.body.deliveryestimate || ''));
    return;
  } else if(!validateCode(req.body.code)) {
    console.log('Not added. Invalid Code.');
    res.redirect('/report-shipping?failure=true&message=Unrecognized event code.'+
     '&recipient='+encodeURIComponent(req.body.recipient || '')+
     '&email='+encodeURIComponent(req.body.email || '')+
     '&code='+encodeURIComponent(req.body.code || '')+
     '&deliveryestimate='+encodeURIComponent(req.body.deliveryestimate || ''));
    return;
  }

  var temp = {
    recipient: req.body.recipient,
    email: req.body.email.trim(),
    code: req.body.code.toUpperCase()
  };
  if(req.body.deliveryestimate) {
    temp.estimatedDeliveryDate = req.body.deliveryestimate;
  }

  databaseConnection(req, (err, client, db) => {
    if (err) {
      throw err;
    } else {
      console.log("successfully connected to the database");
      var dbpar = db.collection('participants');
      var dbeve = db.collection('events');
      dbeve.find({code: temp.code}).toArray(function(err, events) {
        if(err || !events || events.length <= 0) {
          console.log(err);
          client.close();
          res.redirect('/report-shipping?failure=true&message=Unrecognized event code.'+
           '&recipient='+encodeURIComponent(temp.recipient || '')+
           '&email='+encodeURIComponent(temp.email || '')+
           '&deliveryestimate='+encodeURIComponent(temp.estimatedDeliveryDate || '')+
           '&code='+encodeURIComponent(temp.code || ''));
          return;
        }
        const event = events[0];
        if (!event.santaAssignments) {
          client.close();
          res.redirect('/report-shipping?failure=true&message=This event has not started yet.'+
           '&recipient='+encodeURIComponent(temp.recipient || '')+
           '&email='+encodeURIComponent(temp.email || '')+
           '&deliveryestimate='+encodeURIComponent(temp.estimatedDeliveryDate || '')+
           '&code='+encodeURIComponent(temp.code || ''));
          return;
        }
        const filteredParticipants = event.santaAssignments.filter(participant => participant.email.trim().toUpperCase() === temp.email.trim().toUpperCase());
        if (filteredParticipants.length <= 0) {
          client.close();
          res.redirect('/report-shipping?failure=true&message=Email unrecognized.'+
           '&recipient='+encodeURIComponent(temp.recipient || '')+
           '&email='+encodeURIComponent(temp.email || '')+
           '&deliveryestimate='+encodeURIComponent(temp.estimatedDeliveryDate || '')+
           '&code='+encodeURIComponent(temp.code || ''));
          return;
        }
        const sendingParticipant = filteredParticipants[0];
        let recipientIndex = event.santaAssignments.indexOf(sendingParticipant) + 1;
        recipientIndex = recipientIndex >= event.santaAssignments.length ? 0 : recipientIndex;
        const receivingParticipant = event.santaAssignments[recipientIndex];
        if (receivingParticipant.name.trim().toUpperCase() !== temp.recipient.trim().toUpperCase()) {
          res.redirect('/report-shipping?failure=true&message=You are not '+temp.recipient.trim()+'\'s santa.'+
           '&recipient='+encodeURIComponent(temp.recipient || '')+
           '&email='+encodeURIComponent(temp.email || '')+
           '&deliveryestimate='+encodeURIComponent(temp.estimatedDeliveryDate || '')+
           '&code='+encodeURIComponent(temp.code || ''));
          return;
        }

        const updateBody = {
          giftShipped: true,
          estimatedDeliveryDate: temp.estimatedDeliveryDate
        };
        console.log(updateBody)
        dbpar.update({email: receivingParticipant.email, code: temp.code}, { $set: updateBody }, function(err) {
          console.log('Successfully shipped: ' + temp.recipient);
          client.close();
          res.redirect('/manage?isshipped=true&code='+temp.code);
        });

        additionalInfo = temp.estimatedDeliveryDate ? `\nThe estimated delivery info is: ${temp.estimatedDeliveryDate}.` : '';
        var config = require('../config');
        sendCustomEmail(config, receivingParticipant, 'Your secret santa package has been shipped! Keep an eye out for it. ' + additionalInfo);
      });
    }
  });
});

router.get('/report-received', function(req, res, next) {
  var result = {title: 'Secret Santa - Report gift received'};
  result.code = req.query.code || '';
  result.email = req.query.email || '';
  if(req.query.failure) {
    result.failure = true;
    result.message = req.query.message || 'Issue Unknown. Contact admin.';
  }
  res.render('report-received', result);
});

router.post('/report-received', function(req, res) {
  console.log(req.body);
  // Ensure we have required params
  if(!req.body.email || !req.body.code) {
    console.log('Not added. Missing parameters.');
    res.redirect('/report-received?failure=true&message=Missing required fields.'+
     '&email='+encodeURIComponent(req.body.email || '')+
     '&code='+encodeURIComponent(req.body.code || ''));
    return;
  } else if(!validateEmail(req.body.email.trim())) {
    console.log('Not added. Invalid email address.');
    res.redirect('/report-received?failure=true&message=Invalid email address.'+
     '&email='+encodeURIComponent(req.body.email || '')+
     '&code='+encodeURIComponent(req.body.code || ''));
    return;
  } else if(!validateCode(req.body.code)) {
    console.log('Not added. Invalid Code.');
    res.redirect('/report-received?failure=true&message=Unrecognized event code.'+
     '&email='+encodeURIComponent(req.body.email || '')+
     '&code='+encodeURIComponent(req.body.code || ''));
    return;
  }

  var temp = {
    email: req.body.email.trim(),
    code: req.body.code.toUpperCase()
  };

  databaseConnection(req, (err, client, db) => {
    if (err) {
      throw err;
    } else {
      console.log("successfully connected to the database");
      var dbpar = db.collection('participants');
      var dbeve = db.collection('events');
      dbeve.count({code: temp.code}, function(err, count) {
        if(err || count <= 0) {
          console.log(err);
          client.close();
          res.redirect('/report-received?failure=true&message=Unrecognized event code.'+
           '&email='+encodeURIComponent(temp.email || '')+
           '&code='+encodeURIComponent(temp.code || ''));
          return;
        }
        dbpar.find({email: temp.email, code: temp.code}).toArray(function(err, results) {
          if(err) {
            console.log(err);
            client.close();
            res.redirect('/manage?isaddition=true&code='+temp.code);
          } else if (results.length === 0) {
            console.log('Not added. Unrecognized.');
            client.close();
            res.redirect('/report-received?failure=true&message=Email unrecognized.&code='+temp.code+'&email='+temp.email);
            return;
          } else if (!results[0].giftShipped) {
            console.log('Not added. Not yet shipped.');
            client.close();
            res.redirect('/report-received?failure=true&message=Your gift has not yet shipped.&code='+temp.code+'&email='+temp.email);
            return;
          } else {
            dbpar.update({ email: temp.email, giftShipped: true, code: temp.code }, { $set: { giftReceived: true } }, function(err) {
              console.log('Successfully received gift: ' + temp.email);
              client.close();
              res.redirect('/manage?isreceived=true&code='+temp.code);
            });
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
  databaseConnection(req, (err, client, db) => {
    db.collection('events').find({code: code, passwd: req.body.passwd}).toArray(function(err, events) {
      if(err || !events || events.length <= 0) {
        res.send({ status: 401, body: {} });
        client.close();
      } else {
        initiateEvent(client, db, events[0], config, code, req.query.hardreset == 'true');
        res.redirect('/manage?code=' + code);
      }
    });
  });
});

function initiateEvent(client, db, event, config, code, hardReset = false) {
  var email = require('emailjs/email');
  var server = email.server.connect({
    user: config.email,
    password: config.epass,
    host: 'smtp.gmail.com',
    ssl: true
  });
  if (!!event.santaAssignments && !hardReset) {
    sendEmails(server, config, event.santaAssignments);
  } else {
    db.collection('participants').find({code: code}).toArray(function(err, docs) {
      if(err) {
        console.log(err);
        return;
      }
      var participants = customize(shuffle(docs));
      let attempts = 0;
      const attemptLimit = 400;
      while (!hasValidPairings(participants) && attempts < attemptLimit) {
        participants = customize(shuffle(participants));
        attempts += 1;
      }
      if (attempts >= attemptLimit) {
        console.log(`Failed to achieve a valid match set after ${attemptLimit} attempts.`);
        client.close();
        return;
      }
      console.log('Found a valid result after ' + attempts + ' retries.');
      console.log(participants.map(part => part.name));

      sendEmails(server, config, participants);

      db.collection('events').update({ code: event.code }, {
        $set: {
          santaAssignments: participants
        }
      }, function(err) {
        console.log('Successfully updated: ' + event.name);
        client.close();
      });
    });
  }
}

// In case we need weird special handling again. Used to be for spouses
function customize(participants) {
  return participants;
}

function hasValidPairings(participants) {
  for (let i = 0; i < participants.length; i++) {
    const participant = participants[i];

    let nextIndex = i + 1;
    nextIndex = nextIndex >= participants.length ? 0 : nextIndex;

    const nextParticipant = participants[nextIndex];
    if (nextParticipant.spouse == participant._id || nextParticipant._id == participant.spouse) {
      return false;
    }
  }
  return true;
}

function sendCustomEmail(config, recipient, message) {
  var email = require('emailjs/email');
  var server = email.server.connect({
    user: config.email,
    password: config.epass,
    host: 'smtp.gmail.com',
    ssl: true
  });

  server.send(
    {
      text: message,
      from: 'Fluffy-Server <'+config.email+'>',
      to: recipient.name+' <'+recipient.email+'>',
      subject: 'Secret Santa - Anonymous message'
    },
    (err, message) => console.log(err || message)
  )
  console.log('email sent to ' + recipient.email);
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
