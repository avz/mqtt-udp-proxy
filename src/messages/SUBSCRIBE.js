var Message = require('../Message.js').Message;
var EncoderConstructor = require('../EncoderConstructor.js').EncoderConstructor;
var DecoderConstructor = require('../DecoderConstructor.js').DecoderConstructor;

function SUBSCRIBE() {
	SUBSCRIBE.super_.call(this);

	this.type = Message.types.SUBSCRIBE;

	this.subscribes = [];
	this.id = 0;
};

require('util').inherits(SUBSCRIBE, Message);

SUBSCRIBE.prototype.writeBody = function(buf, offset) {
	if(buf.length - offset < 2)
		throw new RangeError("mqtt-udp-proxy:bof");

	buf[offset++] = this.id >> 8;
	buf[offset++] = this.id & 0xff;

	for(var i = 0; i < this.subscribes.length; i++) {
		var len = Buffer.byteLength(this.subscribes[i].topic);
		if(len > 65535)
			throw new Error('SUBSCRIBE topic is too large');

		if(buf.length - offset < 2 + len)
			throw new RangeError("mqtt-udp-proxy:bof");

		buf[offset++] = len >> 8;
		buf[offset++] = len & 0xff;
		offset += buf.write(this.subscribes[i].topic, offset);
		buf[offset++] = this.subscribes[i].qos;
	}

	return offset;
};

SUBSCRIBE.prototype.read = (new DecoderConstructor)
	.inline('this.readFixedHeader')
	.inline('this.checkRemainingLength')
	.string('this.topic')
	.uint16('this.id')
	.string('this.body')
	.toFunction()
;

exports.SUBSCRIBE = SUBSCRIBE;
