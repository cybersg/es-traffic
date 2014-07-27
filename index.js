$(document).ready(function() {
    $.getJSON('/monitor', function (data) {
        for (var nodeName in data) {
            var content = '<div id="node-' + nodeName + '">' +
                '<h3>Node: ' + nodeName + '</h3>' +
                '<span id="node-' + nodeName + '-cpu"><img src="' +
                data[nodeName].cpu + '"></img></span>' +
                '<span id="node-' + nodeName + '-mem"><img src="' +
                data[nodeName].mem + '"></img></span>' +
                '</div>';
            $('body').append(content);
        }
    });
});
