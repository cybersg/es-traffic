$(document).ready(function() {
    $.getJSON('/monitor', function (data) {
        $('#cpu').html(
            '<img src="' + data.cpu + '"></img>'
        );
        $('#mem').html(
            '<img src="' + data.mem + '"></img>'
        );  
    });
});
