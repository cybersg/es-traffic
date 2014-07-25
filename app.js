var express = require('express');
var util = require('util');
var os = require('os');
var events = require('events');
var esclient = require('./esclient');

var app = express();
var client = new esclient.ESClient();

function sendResponse(response, result) {
    response.send(result);
}

app.use(express.static(__dirname));
app.use(function (req, resp, next) {
    client.response = resp;
    resp.set('Content-Type', 'application/json');
    next();
});

app.get('/', function (req, resp) {
    client.search({});
});

app.get('/monitor', function (req, resp) {
    client.monitor();
});

app.get('/count', function (req, resp) {
    client.count(req.query);
});

app.get('/aggs', function (req, resp) {
    console.log(req.url);
    client.aggs(req.query.fields.split(','));
});

app.get('/stats', function (req, resp) {
    client.stats();
});


app.listen(2012, os.hostname(), function () {
    console.log(util.format("Listening on %s:%d", this.address().address, this.address().port));
});

