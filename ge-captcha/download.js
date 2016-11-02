var r = require('request-promise');
var request = require('request');
var cheerio = require('cheerio');
var fs = require('fs');

var download = function(uri, filename, callback){
  request.head(uri, function(err, res, body){
    console.log('content-type:', res.headers['content-type']);
    console.log('content-length:', res.headers['content-length']);

    request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
  });
};

var baseUrl = 'https://ge.ch/terextraitfoncier/adresse.aspx';

r(baseUrl)
  .then(function(htmlString){
    var $ = cheerio.load(htmlString);
    return $("img[alt='Captcha']").attr('src');
  })
  .then(function(captcha){
    var i = fs.readdirSync('./captchas').length+1;
    return download(baseUrl + '/' + captcha, './captchas/' + i + '.jpeg', function(){ return console.log('done'); });
  });