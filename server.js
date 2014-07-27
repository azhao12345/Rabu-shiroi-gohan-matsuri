'use strict';

var http = require('http');
var zlib = require('zlib');
var fs = require('fs');
var config = require('./config');

var dataCache = {};
// Create the proxy

var authorize;
var cacheEnabled = false;

var proxy = http.createServer(function (req, res)
{
    console.log('connection recieved');
    if(req.url.indexOf('webview.php') != -1)
    {
        res.write('<h1>HELLO WORLD FROM THE LOCAL FESTIVAL</h1><br/><img src="/image.gif"></img>');
        res.end();
        return;
    }
    if(req.url.indexOf('.gif') != -1)
    {
        var stream = fs.createReadStream('image.gif');
        stream.pipe(res);
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
    if(req.url.indexOf('noChange') != -1)
    {
        var stream = fs.createReadStream('image.gif');
        stream.pipe(res);
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
    
    if(req.url.indexOf('login') != -1 || req.url.indexOf('authkey') != -1)
    {
        cacheEnabled = false;
    }

    //check of the request is cached
    {
        //give the chached response
        if(!config.noChangeGirls && req.url.indexOf('live/play') != -1)//!config.noChangeGirls && dataCache[req.url] && cacheEnabled)
        console.log('giving cached response...');
        var cachedResponse = dataCache[req.url];
        console.log(cachedResponse.headers)

        if(authorize)
        {
            cachedResponse.headers.authorize  = authorize;
            //TODO FAX THIS LATORG WILL NOT WORK 4 2 DAGITS
            var index = req.headers.authorize.indexOf('nonce=');
            var nonce = req.headers.authorize.substring(index + 6, index + 7);
            var indexnew = authorize.indexOf('nonce=');
            var noncenew = authorize.substring(indexnew + 6, indexnew + 7);
            
            
            var index = req.headers.authorize.indexOf('timeStamp=');
            var ts = req.headers.authorize.substring(index + 10, index + 20);
            var indexnew = authorize.indexOf('requestTimeStamp=');
            var tsnew = authorize.substring(indexnew + 17, indexnew + 27);
            console.log(ts);
            console.log(tsnew);
            cachedResponse.headers.authorize = authorize.replace('requestTimeStamp=' + tsnew, 'requestTimeStamp=' + ts);
            //cachedResponse.headers.authorize = authorize.replace('nonce=' + noncenew, 'nonce=' + nonce).replace('requestTimeStamp=' + tsnew, 'requestTimeStamp=' + ts);
        }
        console.log(cachedResponse.headers)
        res.writeHead(cachedResponse.statusCode, cachedResponse.headers);
        for(var i = 0; i < cachedResponse.chunks.length; i++)
        {
            //turn it from text into a usable response
            res.write(new Buffer(cachedResponse.chunks[i], 'base64'));
        }
        res.end();
        return;
    }
    if(req.url.indexOf('lbonus') != -1)
    {
        cacheEnabled = true;
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
        
        console.log('updating auth token');
        authorize = proxyResponse.headers.authorize;

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

