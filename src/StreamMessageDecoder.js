var Message = require('./Message.js').Message;

function StreamMessageDecoder(stream) {
	var self = this;
	var remainingLength = 0;
	var type = 0;

	var dummyMessage = new Message;

	stream.on('readable', function() {
		if(remainingLength) {
			var packet = stream.read(remainingLength);
			if(packet) {
				self.emit('packet', type, packet);
				remainingLength = 0;
				type = 0;
			}

			return;
		}

		var buf = stream.read();
		if(!buf)
			return;

		if(buf.length < 2) {
			stream.unshift(buf);
			return;
		}

		dummyMessage.readFixedHeader(buf, 0);

		stream.unshift(buf);
	});

	self.on('packet', function(type, buffer) {
		var message = null;
		switch(type) {
			case Message.types.CONNACK:
				message = Message.VariableHeaders.CONNACT.decode(buffer);
			break;
			case Message.types.PINGREQ:
				message = new Message.VariableHeaders.PINGREQ;
			break;
			case Message.types.PINGRESP:
				message = new Message.VariableHeaders.PINGRESP;
			break;
			case Message.types.PUBACK:
				message = Message.VariableHeaders.PUBACK.decode(buffer);
			break;
			case Message.types.PUBREC:
				message = Message.VariableHeaders.PUBREC.decode(buffer);
			break;
			case Message.types.PUBREL:
				message = Message.VariableHeaders.PUBREL.decode(buffer);
			break;
			case Message.types.PUBCOMP:
				message = Message.VariableHeaders.PUBCOMP.decode(buffer);
			break;
		}

		if(message) {
			console.error('->', Message.typeNames[type], message);
			self.emit(Message.typeNames[type], message);
		} else {
			console.error('Unknown type: ' + type, buffer);
		}
	});
};

require('util').inherits(Message.StreamMessageDecoder, require('events').EventEmitter);

exports.StreamMessageDecoder = StreamMessageDecoder;
