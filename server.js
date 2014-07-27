var http = require('http');

var zlib = require('zlib');


// Create the proxy

var proxy = http.createServer(function (req, res)
{
    if(req.url.indexOf('webview.php') != -1)
    {
        res.write('HELLO WORLD FROM THE LOCAL FESTIVAL');
        res.end();
        return;
    }
    var proxy = http.createClient(80, req.headers['host']);
    console.log(req.method);
    console.log(req.url);
    console.log(req.headers);
    var proxyRequest = proxy.request(req.method, req.url, req.headers);
    proxyRequest.addListener('response', function(proxyResponse)
    {
        var responseData = '';
        proxyResponse.addListener('data', function(chunk)
        {
            responseData += chunk.toString();
            res.write(chunk);
        });
        proxyResponse.addListener('end', function()
        {
            console.log(responseData);
            res.end();
        });
        console.log(proxyResponse.statusCode);
        console.log(proxyResponse.headers);
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

proxy.listen(80);

