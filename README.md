# fluffy-server
The Fluffiest Server you ever darn saw

This server gets repurposed often, but for now it is a secret santa manager. People can register for the event and any post request to /start will send out emails to the folks with their assigned people and any interests that person may have put in.

## Requirements
 - git
 - npm
 - mongodb database
   - add a "participants" collection
   - add an "events" collection
 - smtp email address
   - I used gmail

## Setup
1. Let's pull it down: `git clone https://github.com/cman131/fluffy-server.git`
2. Enter the new directory: `cd fluffy-server`
3. Install the dependencies: `npm install`
4. Setup the config file: `cp config.js.template config.js`
5. Open config.js and insert your information:
    - Email address
    - Email Password
    - Url to mongo database. (ex: `mongodb://localhost:27017/fluffydb`)
6. Done. Launch it: `npm start`
   - It should be running on <a href='http://localhost:3000'>localhost:3000</a>
