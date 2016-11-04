var r = require('request-promise');
var request = require('request');
var cheerio = require('cheerio');
var fs = require('fs');

var baseUrl = 'https://ge.ch/terextraitfoncier/adresse.aspx';

function download() {

  r(baseUrl)
    .then(function(htmlString){
      var $ = cheerio.load(htmlString);
      return $("img[alt='Captcha']").attr('src');
    })
    .then(function(captcha){
      var i = fs.readdirSync('./captchas').length+1;
      return saveImage(baseUrl + '/' + captcha, './captchas/' + i + '.jpeg', function(){ return console.log('done'); });
    });

  function saveImage(uri, filename, callback) {
    request.head(uri, function(err, res, body){
      console.log('content-type:', res.headers['content-type']);
      console.log('content-length:', res.headers['content-length']);

      request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
    });
  };

  var wait = Math.random()*10000+1000;
  console.log("waiting " + wait/1000 + "s before next download")
  setTimeout(download,wait);
  
}

download();