var trainingData = [];
var net = {};
var threshold = 90;
var captchaCount = 140;

if(!store.get('letters')) {
  store.set('letters', new Array(1000).fill(new Array(5).fill()));
}

$(function(){
  setTimeout(initSlider,0);
  setTimeout(bindButtons,5);
  setTimeout(createTrs,10);
  setTimeout(createTds,20);
  setTimeout(populateLetters,1000);

  setTimeout(parseLetters,2000);
  setTimeout(bindScaled,3000);

});

function initSlider() {
  $( "#slider" ).slider({
    value: threshold,
    min: 0,
    max: 255,
    step: 1,
    slide: function( event, ui ) {
      $( "#threshold" ).val( ui.value );
    },
    stop: function( event, ui ) {
      threshold = ui.value;
      parseLetters();
    },
  });
  $( "#threshold" ).val( $( "#slider" ).slider( "value" ) );
};

function createTrs() {
  for(var i=0; i<captchaCount; i++)
    $('tbody').append('<tr><td>' + i + '</td><td class="original"><img src="captchas/'+(+i+1)+'.jpeg" /></td></tr>');
}

function createTds() {
  $("tbody tr").each(function(index, elem){
    for(var i = 0; i<5; i++)
      $(elem).append('<td class="cropped"></td>');
    for(var i = 0; i<5; i++)
      $(elem).append('<td class="scaled"></td>');
    for(var i = 0; i<5; i++){
      $(elem).append('<td class="input"></td>');
    }
  });

  $(function(){
    $('.input').each(function(index, elem){
      $(elem).append('<input class="letterBox" type="text" />');
    });
  });

  $(function(){
    var $inputs = $('input.letterBox');
    $inputs.each(function(i, elem){
      $(elem).keyup(function(e){
        var inp = String.fromCharCode(e.keyCode || e.which).toUpperCase();
        if (/[a-zA-Z0-9-_ ]/.test(inp)){
          this.value = inp;
          letters[Math.floor(i/5)][i%5] = inp;
          store.set('letters',letters);
          $inputs[i+1].focus();
        }
      });
      $(elem).focus(function(e){
        $('.cropped').eq(i).addClass('focus');
        $('.scaled').eq(i).addClass('focus');
        $(this).parent().addClass('focus');
      });
      $(elem).blur(function(e){
        $('.cropped').eq(i).removeClass('focus');
        $('.scaled').eq(i).removeClass('focus');
        $(this).parent().removeClass('focus');
      });
    });
  });
};

function parseLetters() {

  // Empty all tds
  $(".cropped, .scaled").each(function(i, elem) {
    $(elem).empty();
  });

  // Loop trough images
  $(".original img").each(function(i, img) {
    
    // Start first with the easy algorithm
    var letters = barScanner(img, threshold);
    // If not working, use paint bucket recursively
    if(letters.length < 5) {
      var t = threshold;
      while(letters.length < 5 && t >= 0){
        letters = paintBucket(img, t);
        t -= 25;
      }
    }

    if(letters.length <5)
      letters = barScanner(img, threshold);

    // Now scale and draw the images
    letters.map(function(coords,j){
      var unscaledCanvas = draw(coords);
      var scaledCanvas = scaleLetter(unscaledCanvas);
      if(td = $(img).parents("tr").find(".cropped")[j]){
        td.append(unscaledCanvas);
      }
      if(td = $(img).parents("tr").find(".scaled")[j]){
        td.append(scaledCanvas);
      }
    });

  });

}

function populateLetters() {
  if(letters = store.get('letters')){
    $('tbody tr').each(function(i,tr){
      $(this).find('td.input input').each(function(j,input){
        input.value = letters[i][j];
      });
    })
  };

}

function barScanner(img, threshold) {

  threshold = threshold?threshold:100;

  // create canvas for processing
  this.c = document.createElement("canvas");
  this.ctx = this.c.getContext("2d");
  this.c.width = img.width;
  this.c.height= img.height;

  // draw image to canvas
  this.ctx.drawImage(img, 0, 0);
  var imageData = this.ctx.getImageData(0,0,img.width,img.height).data;

  var letters = [];
  var currentLetter = false;

  for(var x = 0; x < img.width; x++) {
    var foundBlack = false;    
    for(var y = 0; y < img.height; y++) {
      if(imageData[xyi(x,y,img.width)] < threshold) {
        foundBlack = true;
        if(currentLetter)
          currentLetter.push([x,y]);
        else
          currentLetter = [[x,y]];
      }
    }
    if(!foundBlack && currentLetter) {
      letters.push(currentLetter);
      currentLetter = false;
    }
  }

  letters = letters.filter(function(coords){
    return coords.length > 100;
  });

  return letters;
}

function paintBucket(img, threshold) {

  threshold = threshold?threshold:175;

  // create canvas for processing
  var c = document.createElement("canvas");
  var ctx = c.getContext("2d");
  c.width = img.width;
  c.height= img.height;
  // draw image on canvas
  ctx.drawImage(img, 0, 0);
  // retrieve data from canvas
  var data = ctx.getImageData(0,0,img.width,img.height).data;

  var letters = [];

  // First we traverse the image from left to right through the middle
  // looking for black pixels
  var middle = 4*Math.floor(img.height/2)*img.width;
  for(var i = middle; i<data.length; i = i+4){
    if(data[i]<threshold){
      // Found a black pixel, now discover the letter
      letters.push(fillLetter(i));
    }
  }

  // "Paint bucket" algorithm that starts with a point in the canvas
  // and finds all adjacent black pixels
  function fillLetter(i){

    // Create an array to store our letter coordinates
    var coords = [];

    // Get x and y of black pixel from index
    var x = ix(i,img.width);
    var y = iy(i,img.width);

    // Add our starting pixel to the stack
    var pixelStack = [[x,y]];

    // Loop through the stack which gets augmented as we discover pixels
    while(pixelStack.length){

      var newPos, x, y, pixelPos, reachLeft, reachRight;

      // newPos is temporary and only used here
      newPos = pixelStack.pop();
      x = newPos[0];
      y = newPos[1];

      // pixelPos is the index in the array
      var pixelPos = xyi(x,y,img.width);

      // Go up until no more black
      while(y>= 0 && data[pixelPos-img.width*4]<threshold){
        y--;
        pixelPos -= img.width * 4;
      }

      // Then we descend through this image
      // as long as there is black
      while(y < img.height && data[pixelPos]<threshold){

        // Collect the coordinate
        coords.push([x,y]);
        // Make the pixel white in the source data in
        // order not to match it again
        //data.splice(pixelPos, 4, 255, 255, 255, 255);
        data.fill(255,pixelPos,pixelPos+4);

        // Go one pixel down
        pixelPos += img.width*4;
        y++;
        // By default we don't grab the pixels on the side
        reachLeft = false;
        reachRight = false;

        // If we are not on the left edge we look left
        if(x > 0)
        {
          if(data[pixelPos-4]<threshold)
          {
            // The pixel on the left is black so we create a new anchor
            if(!reachLeft){
              // New column to explore
              pixelStack.push([x - 1, y]);
              reachLeft = true;
            }
          }
          else if(reachLeft)
          {
            // The pixel on the left is white so we remove the anchor
            reachLeft = false;
          }
        }

        // If we are not on the right edge we look right
        if(x < img.width-1)
        {
          if(data[pixelPos+4]<threshold)
          {
            // The pixel on the right is black so we create a new anchor
            if(!reachRight)
            {
              // New column to explore
              pixelStack.push([x + 1, y]);
              reachRight = true;
            }
          }
          else if(reachRight)
          {
            // The pixel on the right is white so we remove the anchor
            reachRight = false;
          }
        }

      }
    }

    return coords;

  }

  letters = letters.filter(function(coords){
    return coords.length > 100;
  });

  return letters;
}

function draw(coords){

  var maxX = Math.max.apply(Math,coords.map(function(c){return c[0];}));
  var maxY = Math.max.apply(Math,coords.map(function(c){return c[1];}));
  var minX = Math.min.apply(Math,coords.map(function(c){return c[0];}));
  var minY = Math.min.apply(Math,coords.map(function(c){return c[1];}));

  var c = document.createElement("canvas");
  var ctx = c.getContext("2d");
  c.width = maxX-minX;
  c.height= maxY-minY;

  coords.map(function(c){
    ctx.fillRect(c[0]-minX,c[1]-minY,1,1);
  });

  return c;
}

function scaleLetter(unscaledCanvas){

  var BigLetter = unscaledCanvas.getContext("2d").getImageData(0,0,unscaledCanvas.width,unscaledCanvas.height);

  var s = 15;
  var scaledCanvas = document.createElement('canvas');
  scaledCanvas.width = s;
  scaledCanvas.height = s;
  var square = scaledCanvas.getContext('2d').createImageData(s, s);
  
  // loop through every pixel in our small square
  for (var x = 0; x < s; ++x) {
    for (var y = 0; y < s; ++y) {
      // find index in large imgData
      var bigX = Math.floor(x/s * BigLetter.width),
          bigY = Math.floor(y/s * BigLetter.height),
          bigIndex = (bigY*BigLetter.width+bigX)*4,
          index = (y*s+x)*4;
      // set pixel in square to pixel in image data (only the transparency matters);
      square.data[index+3] = BigLetter.data[bigIndex+3];
    }
  }

  scaledCanvas.getContext('2d').putImageData(square,0,0);

  return scaledCanvas;
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

function bindButtons() {
  $('.trainBrain').click(function(){
    makeTrainingData();
    net = new brain.NeuralNetwork({hiddenLayers: [350,350]});
    console.log('Starting the training');
    net.train(trainingData,{
      errorThresh: 0.005,  // error threshold to reach
      iterations: 200,   // maximum training iterations
      log: true,           // console.log() progress periodically
      logPeriod: 10       // number of iterations between logging
    });
    console.log("Training Done");
  });
}

function makeTrainingData(){
  trainingData = [];
  var $scaled = $('.scaled');
  var $inputs = $('.input');

  $inputs.each(function(i, elem){
    if(val = $inputs.eq(i).find('input')[0].value) {
      var c = $scaled.eq(i).find('canvas')[0];
      var scaledLetter = c.getContext("2d").getImageData(0,0,c.width,c.height);
      var answer = {};
      answer[val] = 1;
      trainingData.push({
        input: formatForBrain(scaledLetter),
        output: answer
      });
    }
    });
}

function bindScaled(){
  $('.scaled').click(function(e){
    var c = $(this).find('canvas')[0];
    var data = c.getContext("2d").getImageData(0,0,c.width,c.height);
    $('.guess canvas')[0].getContext("2d").putImageData(data, 0, 0);
    var guesses = net.run(formatForBrain(data));
    var sortable = [];
    for (var k in guesses)
      sortable.push([k, Math.floor(guesses[k]*100)])
    sortable.sort(function(a, b){
      return b[1]-a[1]
    });
    $('.guess ol').empty();
    for (var k in sortable) {
      $('.guess ol').append('<li><b>' + sortable[k][0] + '</b> - ' + sortable[k][1] + '%</li>')
    }
  })
}

function formatForBrain(imgData){
  var outp = [];
  for (var i = 0, j = imgData.data.length; i < j; i+=4) {
    outp[i/4] = imgData.data[i+3] / 255;
  }
  return outp;
}

function ix(i,w){
  return Math.floor(i/4)%w;
}

function iy(i,w){
  return Math.floor(i/(4*w));
}

function xyi(x,y,w){
  return (y*w + x) * 4;
}
