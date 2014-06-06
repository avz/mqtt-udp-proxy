var Message = require('../Message.js').Message;
var EncoderConstructor = require('../EncoderConstructor.js').EncoderConstructor;
var DecoderConstructor = require('../DecoderConstructor.js').DecoderConstructor;

function PUBACK() {
	PUBACK.super_.call(this);

	this.id = 0;
};

require('util').inherits(PUBACK, Message);

PUBACK.prototype.write = function(buf, offset) {
	if(buf.length - offset < 4)
		throw new RangeError("mqtt-udp-proxy:bof");

	buf[offset] = Message.types.PUBACK << 4;
	buf[offset + 1] = 2;

	buf[offset + 2] = this.id >> 8;
	buf[offset + 3] = this.id & 0xff;

	return offset + 4;
};

PUBACK.prototype.read = function(buf, offset, len) {
	if(len - offset < 4)
		throw new RangeError("mqtt-udp-proxy:bof");

	if(buf[offset + 1] !== 2)
		throw new Error('PUBACK body length must be 2');

	this.id = (buf[offset + 2] << 8) + buf[offset + 3];

	return offset + 4;
};;

exports.PUBACK = PUBACK;
