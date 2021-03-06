var express = require('express');
var util = require('util');
var os = require('os');
var events = require('events');
var esclient = require('./js/esclient');

var app = express();
var client = new esclient.ESClient();

function sendResponse(response, result) {
    response.send(result);
}

app.use('/www', express.static(__dirname));

app.use(function (req, resp, next) {
    client.response = resp;
//    resp.set('Content-Type', 'application/json');
    next();
});

app.get('/', function (req, resp) {
});

app.get('/monitor', function (req, resp) {
    client.monitor(req.query);
});

app.get('/count', function (req, resp) {
    client.count(req.query);
});

app.get('/aggs', function (req, resp) {
    client.aggs(req.query.fields.split(','));
});

app.get('/stats', function (req, resp) {
    client.stats();
});

app.get('/create', function(req, resp) {
    client.create();
});


app.listen(2012, os.hostname(), function () {
    console.log(util.format("Listening on %s:%d", this.address().address, this.address().port));
}).on("error", function(e) {console.log(['ERROR', e]);});

