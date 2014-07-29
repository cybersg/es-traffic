var fs = require('fs');

function loadConfig() {
    if (!fs.existsSync('config.json')) {
        throw "Unable to locate config file.\n" +
            "Create config.json with index_name and type_name keys";
    }
    return JSON.parse(fs.readFileSync('config.json'));
}
exports.appconfig = loadConfig;
