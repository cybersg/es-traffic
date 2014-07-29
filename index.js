$(document).ready(function() {
    ko.applyBindings(new AppViewModel());
    // $.getJSON('/monitor', function (data) {
    //     for (var nodeName in data) {
    //         var content = '<div id="node-' + nodeName + '">' +
    //             '<h3>Node: ' + nodeName + '</h3>' +
    //             '<span id="node-' + nodeName + '-cpu"><img src="' +
    //             data[nodeName].cpu + '"></img></span>' +
    //             '<span id="node-' + nodeName + '-mem"><img src="' +
    //             data[nodeName].mem + '"></img></span>' +
    //             '</div>';
    //         $('body').append(content);
    //     }
    // });
});

function AppViewModel() {
    var self = this;

    this.nodes = ko.observableArray([]);

    this.init = function() {
        $.getJSON('/monitor', function (data) {
            for (var nodeName in data) {
                self.nodes.push({nodeName: nodeName});
                self.render(nodeName, data[nodeName]);
            }
        });
    };

    this.render = function(containerId, data) {
        console.log(data);
        data.forEach(function (r) {
            r.timeStat = d3.time.format("%Y-%m-%d %H:%M").parse(r.timeStat);
        });
        var ndx = crossfilter(data);
        var dim = ndx.dimension(function (r) {return r.timeStat;});
        var mint = dim.bottom(1)[0].timeStat;
        var maxt = dim.top(1)[0].timeStat;
        var userg = dim.group().reduceSum(function (r) { return r.cpuUser; });
        var sysg = dim.group().reduceSum(function (r) { return r.cpuSys; });
        dc.lineChart('#' + containerId)
            .width(800)
            .dimension(dim)
            .group(sysg, "sys")        
            .stack(userg, "user")
            .renderArea(true)
            .legend(dc.legend().x(150).y(10))
            .x(d3.time.scale().domain([new Date(mint), new Date(maxt)]))
            .yAxisLabel("CPU [%]")
            .brushOn(false)
        ;
        dc.renderAll();
        
    };

    this.init();
}
