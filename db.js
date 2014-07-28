const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

function DB(dbFile) {
    var self = this;
    
    this.dbFile = dbFile || "stats.db";
    this.db = null;
    
    this.init = function() {
        this.db = new sqlite3.Database(this.dbFile);
        this.db.serialize(function () {
            if (!fs.existsSync(this.dbFile)) {       
                self.db.run(
                        "CREATE TABLE IF NOT EXISTS NodeStats \
                        (name TEXT, stat_time INTEGER, \
                        cpu_user INTEGER, cpu_sys INTEGER, \
                        mem_used INTEGER, mem_free INTEGER)"
                );
                self.db.run(
                    "CREATE INDEX IF NOT EXISTS time_idx ON NodeStats (stat_time)"
                );
            }
        });   
    };

    this.close = function() {
        this.db.close();
    };

    this.addStats = function(stats) {
        this.db.serialize(function() {
            for (var n in stats.nodes) {
                var node = stats.nodes[n];
                self.db.run(
                    "INSERT INTO NodeStats VALUES (?, ?, ?, ?, ?, ?)",
                    [
                        node.name,
                        Math.round(+new Date()/1000),
                        node.os.cpu.user,
                        node.os.cpu.sys,
                        node.os.mem.actual_used_in_bytes,
                        node.os.mem.actual_free_in_bytes
                    ],
                    function (err) {
                        if (err) throw err;
                    }
                );
            }
        });
    };

    this.getStats = function(cb, hours) {
        if (!hours) hours = 1;
        var rows = [];
        var now = Math.round(+new Date()/1000) - (3600 * parseInt(hours));
        this.db.serialize(function () {
            self.db.get("SELECT max(stat_time) as maxTime FROM NodeStats", function (err, row) {
                if (err) throw err;
                var t = row.maxTime - (3600 * parseInt(hours));
                self.db.each(
                    "SELECT name, " + 
                        "strftime('%H:%M', stat_time, 'unixepoch', 'localtime') AS timeStat, " +
                        "round(avg(cpu_sys), 2) AS cpuSys, round(avg(cpu_user), 2) AS cpuUser, " + 
                        "round(avg(mem_used)/(1024*1024), 2) AS memUsed, " +
                        "round(avg(mem_free)/(1024*1024), 2) AS memFree FROM NodeStats " +
                        "WHERE stat_time >= ?" +
                        "GROUP BY 1, strftime('%Y-%m-%d %H:%M', stat_time, 'unixepoch', 'localtime')", t, 
                    function (err, row) {
                        if (err) throw err;
                        rows.push(row);
                    }, function () {
                        cb(rows);
                });
            });
        });
            
    };
    
    this.init();
}

exports.DB = DB;

