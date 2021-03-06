var fs = require('fs');
var http = require('http');
var util = require('util');
var os = require('os');
var DB = require('./db');
var esclient = require('./esclient');

var db = new DB.DB();
var client = new esclient.ESClient();

var baseUrl = util.format("http://%s:%d", os.hostname(), 2012);
var statsInterval = setInterval(stats, 10000);
var possibleValues = {};
loadData();

function loadData() {
    var fields = [];
    for (var i=2; i<process.argv.length; i++) {
        fields.push(process.argv[i]);
    }
    http.get(baseUrl + "/aggs?fields=" + fields.join(","), function (resp) {
        resp.on("data", function (data) {
            data = JSON.parse(data.toString());
            for (var i=0; i<fields.length; i++) {
                possibleValues[fields[i]] = data.aggregations[fields[i]].buckets.map(function (elem) {
                    return elem.key;
                });
            }
        });
        resp.on("end", function () {
            var countInterval = setInterval(count, 500);
        });
    }).on("error", function (e) {
        console.log(["ERROR", e]);
    });
}
function count() {
    var query = [];
    for (var field in possibleValues) {
        var fieldValues = possibleValues[field];
        var chosen = fieldValues[parseInt(Math.random(fieldValues.length-1) * fieldValues.length)];
        if (chosen) query.push(util.format("%s=%s", field, chosen));
    }
    if (!query.length) throw "Incomplete fields/values for query";
    http.get(baseUrl + "/count?" + query.join("&"), function (resp) {
        resp.on("data", function (data) {   
            console.log(data.toString());
        });
        resp.on("end", function () {});
    }).on("error", function (e) {
        console.log(["ERROR", e]);
    });;       
}

function stats() {
    http.get(baseUrl + "/stats", function (resp) {
        resp.on("data", function (data) {
            var stats = JSON.parse(data.toString());
            db.addStats(stats);
            console.log("Stats added");
        });
        resp.on("end", function () {});
    }).on("error", function (e) {
        console.log(["ERROR", e]);
    }); 
}


