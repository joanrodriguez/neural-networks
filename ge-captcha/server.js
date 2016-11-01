var Datastore = require('nedb');
var db = new Datastore({ filename: 'captcha.db', autoload: true });