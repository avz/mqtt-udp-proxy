var EventEmitter = require('events').EventEmitter;
var Message = require('./Message.js').Message;

function MessageStream(stream) {
	var self = this;
	EventEmitter.call(this);

	this.head = null;
	this.stream = stream;
	this.writeBuffer = new Buffer(1);

	stream.on('readable', function() {
		var chunk = stream.read();
		if(chunk)
			self._parse(chunk);
	});
};

require('util').inherits(MessageStream, EventEmitter);

MessageStream._createTypedMessage = function(type) {
	var typename = Message.typeNames[type];

	if(!typename)
		throw new Error("Unknown message type: " + type);

	return new (Message[typename]);
};

MessageStream.prototype._parse = function(chunk) {
	if(this.head) {
		chunk = Buffer.concat([this.head, chunk], this.head.length + chunk.length);
		this.head = null;
	}

	var offset = 0;

	while(offset < chunk.length) {
		try {
			var m = MessageStream._createTypedMessage(chunk[offset] >> 4);

			offset = m.read(chunk, offset, chunk.length);

			this.emit('message', m);
		} catch(e) {
			if(e.message !== 'mqtt-udp-proxy:bof')
				throw e;

			/* сообщение не влезло в этот чанк - ждём */
			break;
		}
	}

	if(offset < chunk.length) {
		if(!offset)
			this.head = chunk;
		else
			this.head = chunk.slice(offset);
	}
};

MessageStream.prototype.send = function(message) {
	while(true) {
		try {
			var len = message.write(this.writeBuffer, 0);

			this.stream.write(this.writeBuffer.slice(0, len));
			break;
		} catch(e) {
			if(e.message !== 'mqtt-udp-proxy:bof')
				throw e;

			this.writeBuffer = new Buffer(this.writeBuffer.length * 2);
		}
	}
};

exports.MessageStream = MessageStream;

var n = 0;
var net = require('net');
var s = net.connect(1883, 'localhost', function() {
	var ms = new MessageStream(s);

	var connect = new Message.CONNECT;
	connect.clientId = '12312321';
	connect.keepAlive = 10;

	ms.send(connect);
	ms.send(new Message.PINGREQ);

	for(var i = 0; i < 1000; i++) {
		setInterval(function() {
			ms.send(new Message.PINGREQ);
			n++;
		}, 1);
	}
});

setInterval(function() {
	console.log(n);
	n = 0;
}, 1000).unref();
