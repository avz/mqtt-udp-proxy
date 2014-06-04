var net = require('net');
var Message = require('./Message.js').Message;

var c = new Message.CONNECT;
c.clientId = '123456';
c.cleanSession = 3;

var b = new Buffer(240);
var len = c.write(b, 0);
console.log(len, b.slice(0, len));


var s = net.connect(1883, 'localhost');
s.on('data', function(buf) {
	console.log(buf);
})
s.write(b.slice(0, len));
