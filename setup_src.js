const fs = require('fs');
const JSONStream = require('JSONStream');
const map = require('through2-map');

var cols = ['custom_label0', 'custom_label1', 'custom_label2', 'custom_label3', 'custom_label4',
            'category1', 'category2', 'category3', 'category4', 'category5',
            'product_type1', 'product_type2', 'product_type3', 'product_type4', 'product_type5',
            'brand', 'condition'
];
var brands = JSON.parse(fs.readFileSync("static/brands.json"));

function transform(row, suff) {
    var p = row;
    suff = suff || '';
    p.custom_label0 = p.sempro_initial_campaign + suff;
    var categories = p.product_type.split(/\s*>\s*/);
    for (var k=0; k<=categories.length; k++) {
        if (k > 5) break;
        if (!categories[k] || categories[k] == 'undefined') continue;
        p['category' + k] = categories[k] + suff;
        p.brand = brands[parseInt(Math.random(99) * 100)] + suff;
    }
    p.product_type1 = p.product_type + suff;
    p.id = p.id + suff;
    for (var k=1; k<=p.adwords_labels.length; k++) {
        if (k > 4) break;
        if (!p.adwords_labels[k] || p.adwords_labels[k] == 'undefined') continue;
        p['custom_label' + k] = p.adwords_labels[k] + suff;
    }
    var tmp = {};
    cols.forEach(function (c) {
        tmp[c] = p[c] || "";                        
    });
    tmp.id = p.id;
    return tmp;                
}

fs.open(process.argv[2], "r", function (err, fd) {
    if (err) throw err;
    var rs = fs.createReadStream(process.argv[2]);
    var jstream = JSONStream.parse("response.products.*");
    // var ws = fs.createWriteStream(process.argv[3]);
    var ws = fs.createWriteStream(process.argv[3]);
    rs.pipe(jstream);
    var arr = [];
    jstream.on("data", function (data) {
        arr.push(JSON.stringify(transform(data)));
    });
    jstream.on("end", function () {
        var body = "[" + arr.join(",") + "]";
        ws.write(body);
    });
});

// fs.open(process.argv[2], "r", function (err, fd) {
//     if (err) throw err;
//     var rs = fs.createReadStream(process.argv[2]);    
//     var body = "";
//     rs.setEncoding("utf8");
//     rs.on("data", function (chunk) {
//         body += chunk; 
//     });
//     rs.on("end", function () {
//         console.log(body);
//         return;
//         var jsonData = JSON.parse(body);
//         var brands = JSON.parse(fs.readFileSync("static/brands.json"));
//         var products = jsonData.response.products;
//         for (var i=0; i<3; i++) {
//             var n = 0;
//             var outData = [];   
//             var suff = ' #' + i;
//             for (var j=0; j<products.length; j++) {
//                 var p = products[j];
//                 p.custom_label0 = p.sempro_initial_campaign + suff;
//                 var categories = p.product_type.split(/\s*>\s*/);
//                 for (var k=0; k<=categories.length; k++) {
//                     if (k > 5) break;
//                     if (!categories[k] || categories[k] == 'undefined') continue;
//                     p['category' + k] = categories[k] + suff;
//                     p.brand = brands[parseInt(Math.random(99) * 100)] + suff;
//                 }
//                 p.product_type1 = p.product_type + suff;
//                 p.id = p.id + suff;
//                 for (var k=1; k<=p.adwords_labels.length; k++) {
//                     if (k > 4) break;
//                     if (!p.adwords_labels[k] || p.adwords_labels[k] == 'undefined') continue;
//                     p['custom_label' + k] = p.adwords_labels[k] + suff;
//                 }
//                 var tmp = {};
//                 cols.forEach(function (c) {
//                     tmp[c] = p[c] || "";                        
//                 });
//                 tmp.id = p.id;
//                 outData.push(tmp);                
//                 if (n > 1000) {
//                     fs.appendFile(process.argv[3], JSON.stringify(outData), function (err) {
//                         if (err) throw err;
//                         console.log("Data appended\n");
//                         n = 0;
//                         outData = [];
//                     });
//                 }
//                 n++;    
//             }
//         }       
//     });
// });

