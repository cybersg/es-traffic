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
            log: config.es_log_level || "error"
        });

        this.eventEmitter = new events.EventEmitter();
        this.eventEmitter.on("next", this.processDataChunk);
        this.eventEmitter.on("end", this.finish);
    };

    this.loadData = function() {

        var pathname = "files/src.json";
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
                var id = item.id || item._id;
                delete item.id; delete item._id;
                if (Object.keys(item).length) {
                    d.push(
                        {index: {_index: self.index, _type: self.type, _id: id}},
                        item
                    );
                }
            }
            if (n > chunkSize) {
                break;
            }
        }
        index = index + n;
        if (!d.length) {
            self.eventEmitter.emit("end");
        }
        else {
            self.bulk(d, index); 
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
    
    this.bulk = function(body, index) {
        
        this.client.bulk({
            body: body
        }, function (err, resp) {   
            if (err) throw err;
            console.log("Next chunk, index: " + index);
            self.eventEmitter.emit("next", index);
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

    this.monitor = function(query) {
        var db = new DB.DB();
        var nodes = {};
        var charts = function(rows) {            
            rows.forEach(function (row) {
                if (!nodes.hasOwnProperty(row.name)) {
                    nodes[row.name] = [];
                };
                nodes[row.name].push({
                    timeStat: row.timeStat,
                    cpuSys: row.cpuSys, cpuUser: row.cpuUser,
                    memUsed: row.memUsed, memFree: row.memFree
                });                   
            });
            // for (var name in nodes) {
            //      var cpuChart = new quiche('line');
            //     cpuChart.setTitle("CPU [%]");
            //     cpuChart.setWidth(800);

            //     var memChart = new quiche('bar');
            //     memChart.setTitle("Memory [MB]");
            //     memChart.setWidth(800);
                
            //     cpuChart.addData(nodes[name].cpuSys, "CPU SYS", "0000FF");
            //     cpuChart.addData(nodes[name].cpuUser, "CPU USER", "00FF00");
            //     cpuChart.addAxisLabels('x', nodes[name].times);
            //     cpuChart.setAutoScaling();

            //     memChart.setAutoScaling();
            //     memChart.setBarStacked();
            //     memChart.setLegendBottom();
            //     memChart.addData(nodes[name].memUsed, "Used", "FF0000");
            //     memChart.addData(nodes[name].memFree, "Free", "00FF00");
            //     memChart.addAxisLabels('x', nodes[name].times);
            //     resp[name] = {
            //         cpu: cpuChart.getUrl(true),
            //         mem: memChart.getUrl(true)
            //     };
            // }
            self.response.send(nodes);
        };
        db.getStats(charts);
    };
    
    this.init();
}

exports.ESClient = Client;
