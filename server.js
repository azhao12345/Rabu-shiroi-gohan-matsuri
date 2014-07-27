'use strict';

var http = require('http');
var zlib = require('zlib');
var fs = require('fs');

var dataCache = {};
// Create the proxy

var proxy = http.createServer(function (req, res)
{
    console.log('connection recieved');
    if(req.url.indexOf('webview.php') != -1)
    {
        res.write('HELLO WORLD FROM THE LOCAL FESTIVAL');
        res.end();
        return;
    }
    if(req.url.indexOf('saveData') != -1)
    {
        console.log('saving data');
        fs.writeFile('./data.json', JSON.stringify(dataCache), function()
        {
            res.end();
        });
        return;
    }
    if(req.url.indexOf('favicon') != -1)
    {
        res.end();
        return;
    }
    console.log(req.method);
    console.log(req.url);
    console.log(req.headers);

    //check of the request is cached
    if(dataCache[req.url])
    {
        //give the chached response
        console.log('giving cached response...');
        var cachedResponse = dataCache[req.url];
        res.writeHead(cachedResponse.statusCode, cachedResponse.headers);
        for(var i = 0; i < cachedResponse.chunks.length; i++)
        {
            //turn it from text into a usable response
            res.write(new Buffer(cachedResponse.chunks[i], 'base64'));
        }
        res.end();
    }

    var proxy = http.createClient(80, req.headers['host']);
    var proxyRequest = proxy.request(req.method, req.url, req.headers);
    proxyRequest.addListener('response', function(proxyResponse)
    {
        var cachedResponse = {};
        cachedResponse.statusCode = proxyResponse.statusCode;
        cachedResponse.headers = proxyResponse.headers;
        cachedResponse.chunks = [];

        //unzipping code for content encoding
        var gunzip = zlib.createGunzip();
        if(proxyResponse.headers['content-encoding'] == 'gzip')
        {
            proxyResponse.pipe(gunzip);
        }
        var unzipped = '';

        gunzip.addListener('data', function(chunk)
        {
            unzipped += chunk.toString();
        });

        gunzip.addListener('end', function()
        {
            console.log(unzipped);
        });

        //listeners for data from the server we're proxying
        proxyResponse.addListener('data', function(chunk)
        {
            cachedResponse.chunks.push(chunk.toString('base64'));
            res.write(chunk);
        });
        proxyResponse.addListener('end', function()
        {
            dataCache[req.url] = cachedResponse;
            res.end();
        });
        //log the things
        console.log(proxyResponse.statusCode);
        console.log(proxyResponse.headers);
        //write the response to the client
        res.writeHead(proxyResponse.statusCode, proxyResponse.headers);
    });
    req.addListener('data', function(chunk)
    {
        proxyRequest.write(chunk, 'binary');
    });
    req.addListener('end', function()
    {
        proxyRequest.end();
    });
});


//load the data from file then liten
fs.readFile('./data.json', function(err, data)
{
    //parse the data if it's valid
    if(data)
    {
        console.log('restoring data from cache');
        dataCache = JSON.parse(data);
    }
    console.log('listening for incoming connections');
    proxy.listen(80);
});

