/*
    globals require console
*/
var Express = require('express');
var Http = require('http');
var app = Express();
app.use(Express.static(__dirname + '/www', {
    setHeaders: function(res, path) {
        res.set("Access-Control-Allow-Origin", "*");
        res.set('Cross-Origin-Opener-Policy', 'same-origin');
        res.set('Cross-Origin-Embedder-Policy', 'require-corp');
    }
}));
var httpServer = Http.createServer(app);
httpServer.listen('3000', '127.0.0.1', function(){
    var roughAddress = 'http://localhost:3000/';
    console.log('Serving content via %s.\n', roughAddress);
});

