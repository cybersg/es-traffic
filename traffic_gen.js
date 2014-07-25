var fs = require('fs');
var http = require('http');
var util = require('util');
var os = require('os');
var DB = require('./db');
var esclient = require('./esclient');

var db = new DB.DB();
var client = new esclient.ESClient();

var baseUrl = util.format("http://%s:%d", os.hostname(), 2012);
var countInterval = setInterval(count, 500);
var statsInterval = setInterval(stats, 10000);

function count() {
    http.get(baseUrl + "/aggs", function (resp) {
    });
    var brands = JSON.parse(fs.readFileSync("static/brand.json"));
    var custom_labels0 = JSON.parse(fs.readFileSync("static/custom_label0.json"));

    var br = brands[parseInt(Math.random(brands.length-1) * brands.length)];
    var cl0 = custom_labels0[parseInt(Math.random(custom_labels0.length-1) * custom_labels0.length)];
    if (!br || !cl0) return;
    http.get(
        baseUrl + util.format("/count?custom_label0=%s&brand=%s", cl0, br),
        function (resp) {
            resp.on("data", function (data) {
                console.log(data.toString());
            });
        });
}

function stats() {
    http.get(
        baseUrl + "/stats",
        function (resp) {
            resp.on("data", function (data) {
                var stats = JSON.parse(data.toString()).result;
                db.addStats(stats);
                console.log("Stats added");
            });
        }); 
}


