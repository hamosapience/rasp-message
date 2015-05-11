var express = require('express');

var rasp = require('./rasp');

var SERVER_PORT = process.env.SERVER_PORT || 8000;

var app = express();

app.get('/get', function (req) {

    rasp()
        .then(function(result){

        })
        .catch(function(err){
            console.log(err);
        });

});

var server = app.listen(SERVER_PORT, function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('rasp-message listening at http://%s:%s', host, port);

});
