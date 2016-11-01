$(function(){
  setTimeout(initSlider,0);
  setTimeout(createTrs,10);
  setTimeout(createTds,20);
  setTimeout(parseLetters,200);
  setTimeout(scaleLetters,400);
  setTimeout(formatLetters,600);
});

function initSlider() {
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
      scaleLetters();
    },
  });
  $( "#threshold" ).val( $( "#slider" ).slider( "value" ) );
};

function createTrs() {
  for(var i=0; i<10; i++)
    $('tbody').append('<tr><td class="original"><img src="originals/'+(+i+1)+'.jpeg" /></td></tr>');
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


function parseLetters(threshold){

  threshold = threshold?threshold:100;

  // Empty all tds
  $(".original img").each(function(i, elem) {
    $(elem).parents("tr").find("td").each(function(i, elem){
      if(i>0 && i<11)
        $(elem).empty();
    });
  });

  $(".original img").each(function(i, elem) {
    
    var img = $(this)[0];

    // create canvas for processing
    this.c = document.createElement("canvas");
    this.ctx = this.c.getContext("2d");
    this.c.width = img.width;
    this.c.height= img.height;

    // draw image to canvas
    this.ctx.drawImage(img, 0, 0);
    var ImageData = this.ctx.getImageData(0,0,img.width,img.height);

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

      var td = $(img).parents("tr").find(".cropped")[i].append(canvas);

    })

  });

}

function scaleLetters(){

  $("tbody tr").each(function(i, elem) {
    $(elem).find(".cropped canvas").each(function(i, elem){

      var BigLetter = elem.getContext("2d").getImageData(0,0,elem.width,elem.height);

      var s = 15;
      var canvas = document.createElement('canvas');
      canvas.width = s;
      canvas.height = s;
      var square = canvas.getContext('2d').createImageData(s, s);
      
      // loop through every pixel in our small square
      for (var x = 0; x < s; ++x) {
        for (var y = 0; y < s; ++y) {
          // find index in large imgData
          var bigX = Math.floor(x/s * BigLetter.width),
              bigY = Math.floor(y/s * BigLetter.height),
              bigIndex = (bigY*BigLetter.width+bigX)*4,
              index = (y*s+x)*4;
          // set pixel in square to pixel in image data
          square.data[index] = BigLetter.data[bigIndex];
          // set alpha too, for display purposes
          square.data[index+3] = 255;
        }
      }

      canvas.getContext('2d').putImageData(square,0,0);

      $(elem).parents("tr").find(".scaled")[i].append(canvas);

    });
  });

}

function formatLetters(){

}

function colorPicker() {
  $(".original img").find("mousemove", function(event) {
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
  });
};

function xor(){
  var net = new brain.NeuralNetwork();
  net.train([{input: [0, 0], output: [0]},
             {input: [0, 1], output: [1]},
             {input: [1, 0], output: [1]},
             {input: [1, 1], output: [0]}]);
  var output = net.run([1, 0]);  // [0.987]
  console.log(output);
};

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


