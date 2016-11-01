$(document).ready(function() {

  init();
  parseLetters();

});

$( function() {
    $( "#slider" ).slider({
      value:100,
      min: 0,
      max: 255,
      step: 1,
      slide: function( event, ui ) {
        $( "#threshold" ).val( ui.value );
      },
      stop: function( event, ui ) {
        parseLetters(ui.value);
      },
    });
    $( "#threshold" ).val( $( "#slider" ).slider( "value" ) );
} );


function init() {
    $(".original img").parents("tr").each(function(index, elem){
      for(var i = 0; i<10; i++)
        $(elem).append($('<td></td>'));
    });
};


function parseLetters(threshold){

  threshold = threshold?threshold:100;

  // Empty all tds
  $(".original img").each(function(index, elem) {
    $(elem).parents("tr").find("td").each(function(index, elem){
      if(index>0)
        $(elem).empty();
    });
  });

  xor();

  $(".original img").find("mousemove", function(event) {

    /*

    // This is a color picker
    var img = $(this)[0];

    // create canvas for processing
    this.c = document.createElement("canvas");
    this.ctx = this.c.getContext("2d");
    this.c.width = img.width;
    this.c.height= img.height;

    // draw image to canvas
    this.ctx.drawImage(img, 0, 0);
    
    var x = event.offsetX;
    var y = event.offsetY;
    var pixel = this.ctx.getImageData(x, y, 1, 1);
    var data = pixel.data;
    var rgba = 'rgba(' + data[0] + ',' + data[1] +
             ',' + data[2] + ',' + (data[3] / 255) + ')';
    console.log(rgba);

    */

  })

  $(".original img").each(function(captchaIndex, value) {
    
    var img = $(this)[0];

    // create canvas for processing
    this.c = document.createElement("canvas");
    this.ctx = this.c.getContext("2d");
    this.c.width = img.width;
    this.c.height= img.height;

    // draw image to canvas
    this.ctx.drawImage(img, 0, 0);


    var ImageData = this.ctx.getImageData(0,0,this.c.width,this.c.height);


    var letters = [];
    
    var currentLetter = {};
    var foundLetter = false;
    for (var x = 0, j = ImageData.width; x < j; ++x) { // for every column
      var foundLetterInColumn = false;
      for (var y = 0, k = ImageData.height; y < k; ++y) { // for every pixel
        var pixIndex = (y*ImageData.width+x)*4;
        if (ImageData.data[pixIndex] < threshold) { // if we're dealing with a letter pixel
          foundLetterInColumn = foundLetter = true;
          // set data for this letter
          currentLetter.minX = Math.min(x, currentLetter.minX || Infinity);
          currentLetter.maxX = Math.max(x, currentLetter.maxX || -1);
          currentLetter.minY = Math.min(y, currentLetter.minY || Infinity);
          currentLetter.maxY = Math.max(y, currentLetter.maxY || -1);
        }
      }
      
      // if we've reached the end of this letter, push it to letters array
      if (!foundLetterInColumn && foundLetter) {
        // get letter pixels
        letters.push(this.ctx.getImageData(
          currentLetter.minX,
          currentLetter.minY,
          currentLetter.maxX - currentLetter.minX,
          currentLetter.maxY - currentLetter.minY
        ));

        // reset
        foundLetter = foundLetterInColumn = false;
        currentLetter = {};
      }
    }


    letters.map(function(letter, i){

      var canvas = document.createElement("canvas");
      canvas.width = letter.width;
      canvas.height = letter.height;
      var ctx = canvas.getContext("2d");
      ctx.putImageData(letter,0,0);

      console.log(canvas);

      $(img).parents("tr").find("td")[i+1].append(canvas);

    })

    var scaledLetters = [];

    letters.map(function(letter, i){
      
      var s = 15;
      var canvas = document.createElement('canvas');
      canvas.width = s;
      canvas.height = s;
      var square = canvas.getContext('2d').createImageData(s, s);

      // loop through every pixel in our small square
      for (var x = 0; x < s; ++x) {
        for (var y = 0; y < s; ++y) {
          // find index in large imgData
          var bigX = Math.floor(x/s * letter.width),
              bigY = Math.floor(y/s * letter.height),
              bigIndex = (bigY*letter.width+bigX)*4,
              index = (y*s+x)*4;
          // set pixel in square to pixel in image data
          square.data[index] = letter.data[bigIndex];
          // set alpha too, for display purposes
          square.data[index+3] = 255;
        }
      }
      
      canvas.getContext('2d').putImageData(square,0,0);

      console.log(square);
      scaledLetters.push(square);


      $(img).parents("tr").find("td")[i+6].append(canvas);


    });


  });

}

function xor(){
  var net = new brain.NeuralNetwork();

  net.train([{input: [0, 0], output: [0]},
             {input: [0, 1], output: [1]},
             {input: [1, 0], output: [1]},
             {input: [1, 1], output: [0]}]);

  var output = net.run([1, 0]);  // [0.987]

  console.log(output);
}

function guessImageDatas(imgDatas){
  var outp = [];
  for (var i = 0; i < imgDatas.length; ++i) {
    var guess = run(formatForBrain(imgDatas[i]));
    
    // find most likely guess
    var max = {txt: "", val: 0};
    for (var k in guess) {
      if (guess[k] > max.val) {
        max = {txt: k, val: guess[k]};
      }
    }
    
    outp.push(max.txt);
  }
  
  return outp;
}

function formatForBrain(imgData){
  var outp = [];
  for (var i = 0, j = imgData.data.length; i < j; i+=4) {
    outp[i/4] = imgData.data[i] / 255;
  }
  return outp;
}



// IMAGE PARSER
function ImageParser(img, cb, options){
  // merge defaults into options
  for (var k in this.defaults) {
    options[k] = options[k] || this.defaults[k];
  }
  this.opts = options;
  
  // create canvas for processing
  this.c = document.createElement("canvas");
  this.ctx = this.c.getContext("2d");
  this.c.width = img.width;
  this.c.height= img.height;
  
  // draw image to canvas
  this.ctx.drawImage(img, 0, 0);
  if(options.callbackEveryStep) { // and show it, if appropriate
    cb({
      title: "Base image",
      data: this.ctx.getImageData(0,0,this.c.width,this.c.height)
    });
  }
  
  // then run it through processing
  var process = [this.thresholder, this.extract, this.downscale];
  if (options.callbackEveryStep){ // show after every process, if we should
    process = process.map(function(process){
      // replace process list with proxy functions, that call cb
      return function(data){
        var outp = process.call(this,data),
            obj = {};
        
        // format the data
        if (outp instanceof Array && outp[0] instanceof ImageData) {
          obj.datas = outp;
        }
        if (outp instanceof ImageData) {
          obj.data = outp;
        }
        if (typeof outp === "string") {
          obj.text = outp;
        }
        // extract function name
        obj.title = (process+"").substr("function ".length);
        obj.title = obj.title.substr(0, obj.title.indexOf("("));
        obj.title = obj.title.replace(/([a-z])([A-Z])/g, "$1 $2");
        
        // show
        cb(obj);
        
        return outp;
      };
    });
  }
  
  // actually do the processing
  var that = this;
  var outp = process.reduce(function(prev,process){
    return process.call(that,prev);
  }, this.ctx.getImageData(0,0,this.c.width,this.c.height));
  
  // END ImageParser constructor
  return outp;
}



ImageParser.prototype.defaults = {
  callbackEveryStep: false,
  threshold: 150,
  downscaledSize: 16
};



// Image functions
ImageParser.prototype.thresholder = function Threshold(imgData){
  // for every pixels red channel value
  for (var i = 0, j = imgData.data.length; i<j; i+=4) {
    // threshold it
    if (imgData.data[i] > this.opts.threshold) {
      imgData.data[i] = 0;
    } else {
      imgData.data[i] = 255;
    }
  }
  
  return imgData;
};
ImageParser.prototype.extract = function ExtractLetters(imgData){
  this.ctx.putImageData(imgData,0,0); // for easy cropping
  var letters = [];
  
  var currentLetter = {};
  var foundLetter = false;
  for (var x = 0, j = imgData.width; x < j; ++x) { // for every column
    var foundLetterInColumn = false;
    
    for (var y = 0, k = imgData.height; y < k; ++y) { // for every pixel
      var pixIndex = (y*imgData.width+x)*4;
      if (imgData.data[pixIndex] === 255) { // if we're dealing with a letter pixel
        foundLetterInColumn = foundLetter = true;
        // set data for this letter
        currentLetter.minX = Math.min(x, currentLetter.minX || Infinity);
        currentLetter.maxX = Math.max(x, currentLetter.maxX || -1);
        currentLetter.minY = Math.min(y, currentLetter.minY || Infinity);
        currentLetter.maxY = Math.max(y, currentLetter.maxY || -1);
      }
    }
    
    // if we've reached the end of this letter, push it to letters array
    if (!foundLetterInColumn && foundLetter) {
      // get letter pixels
      letters.push(this.ctx.getImageData(
        currentLetter.minX,
        currentLetter.minY,
        currentLetter.maxX - currentLetter.minX,
        currentLetter.maxY - currentLetter.minY
      ));
      
      // reset
      foundLetter = foundLetterInColumn = false;
      currentLetter = {};
    }
  }
  
  return letters;
};

ImageParser.prototype.downscale = function Downscale(imgDatas){
  var letters = [];
  for (var i = 0, j = imgDatas.length; i < j; ++i) {
    var s = this.opts.downscaledSize,
        imgData = imgDatas[i],
        square = new ImageData(s,s);
    // loop through every pixel in our small square
    for (var x = 0; x < s; ++x) {
      for (var y = 0; y < s; ++y) {
        // find index in large imgData
        var bigX = Math.floor(x/s * imgData.width),
            bigY = Math.floor(y/s * imgData.height),
            bigIndex = (bigY*imgData.width+bigX)*4,
            index = (y*s+x)*4;
        // set pixel in square to pixel in image data
        square.data[index] = imgData.data[bigIndex];
        // set alpha too, for display purposes
        square.data[index+3] = 255;
      }
    }
    
    letters.push(square);
  }
  
  return letters;
};




// UTILS
var previewer = document.getElementsByClassName("previewer")[0];
function appendToPreviewer(obj){
  var preview = document.createElement("div");
  preview.classList.add("preview");
  if (obj.title) {
    var p = document.createElement("p");
    p.textContent = obj.title;
    p.classList.add("title");
    preview.appendChild(p);
  }
  
  // convert image data(s) to base64 URL
  if (obj.data) { obj.datas = [obj.data] }
  if (obj.datas) {
    var c = document.createElement("canvas"),
        ctx = c.getContext("2d");
    
    for (var i = 0; i < obj.datas.length; ++i) {
      c.width = obj.datas[i].width;
      c.height = obj.datas[i].height;
      ctx.putImageData(obj.datas[i], 0, 0);

      var img = document.createElement("img");
      img.src = c.toDataURL("image/png");
      
      // and show it
      preview.appendChild(img);
    }
  }
  
  if (obj.text) {
    var p = document.createElement("p");
    p.textContent = obj.text;
    preview.appendChild(p);
  }
  
  // finally show the preview
  previewer.appendChild(preview);
}

