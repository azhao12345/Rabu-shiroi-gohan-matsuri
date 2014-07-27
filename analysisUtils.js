var fs = require('fs');
var zlib = require('zlib');

var analysis = function(filename)
{
    console.log('WARNING, this utility is for analysis only and should not be used in production');
    this.data = JSON.parse(fs.readFileSync(filename));
}

module.exports = analysis;

analysis.prototype.getRoutes = function()
{
    var ary = [];
    for(var prop in this.data)
    {
        ary.push(prop);
    }
    return ary;
}

analysis.prototype.getHeaders = function(route)
{
    return this.data[route].headers;
}


analysis.prototype.getBody = function(route, cb)
{
    var body = '';
    var gunzip = zlib.createGunzip();
    gunzip.on('data', function(chunk)
    {
        body += chunk.toString();
    });
    gunzip.on('end', function()
    {
        cb(body);
    });
    var chunks = this.data[route].chunks;
    for(var i = 0; i < chunks.length; i++)
    {
        gunzip.write(new Buffer(chunks[i], 'base64'));
    }
    gunzip.end();
}
