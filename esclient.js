var elasticsearch = require('elasticsearch');
var events = require('events');
var fs = require('fs');
var quiche = require('quiche');
var DB = require('./db');
var config = require('./appconfig').appconfig();

function Client() {
    var self = this;
    
    this.init = function() {
        this.index = config.index_name;
        this.type = config.type_name;

        this.response = null;
        
	    this.client = new elasticsearch.Client({
            host: "localhost:9200",
            log: "error"
        });

        this.eventEmitter = new events.EventEmitter();
        this.eventEmitter.on("next", this.processDataChunk);
        this.eventEmitter.on("end", this.finish);

        this.brand = {};
        this.custom_label0 = {};
        this.custom_label1 = {};
    };

    this.loadData = function() {

        var pathname = "static/src.json";
        return JSON.parse(fs.readFileSync(pathname, {encoding: "utf8"}));
    };

    this.finish = function() {
        self.client.indices.flush({index: self.index}, function (err, resp) {
            if (err) throw err;
            var msg = "Documents added to index: " + self.index;
            self.client.count({
                index: self.index,
                type: self.type
            }, function (err, resp) {
                if (err) throw err;
                fs.writeFileSync("static/brand.json", JSON.stringify(Object.keys(self.brand)));
                console.log("Written: static/brand.json");                  
                fs.writeFileSync("static/custom_label0.json", JSON.stringify(Object.keys(self.custom_label0)));
                console.log("Written: static/custom_label0.json");                               
                fs.writeFileSync("static/custom_label1.json", JSON.stringify(Object.keys(self.custom_label1)));
                console.log("Written: static/custom_label1.json");
                self.response.send({message: msg, current_state: resp});
            });
        });
    };
    
    this.processDataChunk = function(index) {
        
        var chunkSize = 1000;
        var d = [];
        var n = 0;
        for (var i=index; i<self.data.length; i++) {
            n++;    
            var item = self.data[i];
            if (item) {
                var id = item.id;
                delete item.id;
                if (Object.keys(item).length) {
                    d.push(
                        {index: {_index: self.index, _type: self.type, _id: id}},
                        item
                    );
                    self.brand[item.brand] = null;
                    self.custom_label0[item.custom_label0] = null;
                    self.custom_label1[item.custom_label1] = null;
                }
            }
            if (n > chunkSize) {
                break;
            }
        }
        if (d.length) {
            self.bulk(d, index + d.length);
        }
        else {
            self.eventEmitter.emit("end");
        }
        return d;
    };

    this.indexDocs = function(mapping) {
        this.client.indices.create({index: self.index}, function (err, resp) {
            if (err) throw err;
            self.client.indices.putMapping(mapping, function (err, resp) {
                if (err) throw err;
                self.client.indices.flush({index: self.index}, function (err, resp) {
                    if (err) throw err;
                    self.processDataChunk(0);
                });
            });
        });
    };
    
    this.create = function() {
        this.data = this.loadData() || [];
        this.columns = [];
        var row = this.data[0];
        for (var c in row) {
            this.columns.push(c);
        }
        var _type = self.type;
        var props = {};
        this.columns.forEach(function (c) {
            props[c] = {
                type: "string", index: "not_analyzed"
            };
        });
        var mapping = {index: self.index, type: self.type, body: {}};
        mapping['body'][_type] = {
            _all: {disabled: true}
            //_source: {enabled: false}
        };
        mapping['body'][_type]['properties'] = props;
        this.client.indices.exists({index: this.index}, function (err, resp) {            
            if (resp) {
                self.client.indices.delete({index: self.index}, function (err, resp) {
                    if (err) throw err;
                    self.indexDocs(mapping);
                });   
            }
            else {
                self.indexDocs(mapping);
            }
        });
    };

    this.bulk = function(body, index) {
        
        this.client.bulk({
            body: body
        }, function (err, resp) {   
            if (err) throw err;
            console.log("Next chunk, index: " + index);
            self.eventEmitter.emit("next", index);
        });    
    };

    this.count = function(query) {
        var terms = []; 
        if (query) {
            for (var k in query) {
                var term = {};
                term[k] = query[k];
                terms.push({term: term});
            }
        }
        if (!terms.length) throw "Define a query!\n";
        console.log("Executing count request for: " +
                    JSON.stringify(query)
        );
        var body = {
            query: { filtered: { filter: { bool: {
                must: terms
            }}}}
        };
        this.client.count({
            index: this.index, type: this.type,
            body: body
        }, function (err, resp) {
            if (err) throw err;
            self.response.send(resp);
        });
    };

    this.aggs = function(fields) {
        var aggs = {};
        if (!fields.length) throw ("Please provide fields list");
        fields.forEach(function (f) {
            aggs[f] = {terms: {field: f, size: 0}};
        });
        this.client.search({
            index: this.index, type: this.type,
            body: {
                aggs: aggs
            }
        }, function (err, resp) {
            if (err) throw err;
            self.response.send(resp);
        });
    };
    
    this.stats = function(params) {
        this.client.nodes.stats({
            fields: ["os"]
        }, function (err, resp) {
            if (err) throw err;
            self.response.send(resp);
        });
    };

    this.monitor = function(params) {
        var db = new DB.DB();
        var charts = function(rows) {
            
            var cpuChart = new quiche('line');
            cpuChart.setTitle("CPU");
            cpuChart.setWidth(800);

            var memChart = new quiche('bar');
            memChart.setTitle("Memory");
            memChart.setWidth(800);
            
            var times = [];
            var cpuSys = [], cpuUser = [];
            var memUsed = [], memFree = [];
            
            rows.forEach(function (row) {
                times.push(row.timeStat);
                cpuSys.push(row.cpuSys);
                cpuUser.push(row.cpuUser);
                memUsed.push(row.memUsed);
                memFree.push(row.memFree);
            });
            
            cpuChart.addData(cpuSys, "CPU SYS", "0000FF");
            cpuChart.addData(cpuUser, "CPU USER", "00FF00");
            cpuChart.addAxisLabels('x', times);
            cpuChart.setAutoScaling();

            memChart.setAutoScaling();
            memChart.setBarStacked();
            memChart.setLegendBottom();
            memChart.addData(memUsed, "Used", "FF0000");
            memChart.addData(memFree, "Free", "00FF00");
            memChart.addAxisLabels('x', times);
            
            self.response.send({
                cpu: cpuChart.getUrl(true),
                mem: memChart.getUrl(true)
            });
        };
        db.getStats(charts);
    };
    
    this.init();
}

exports.ESClient = Client;
