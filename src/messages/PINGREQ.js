var Message = require('../Message.js').Message;
var EncoderConstructor = require('../EncoderConstructor.js').EncoderConstructor;
var DecoderConstructor = require('../DecoderConstructor.js').DecoderConstructor;

function PINGREQ() {
	PINGREQ.super_.call(this);

	this.protocolName = 'MQIsdp';
	this.protocolVersion = 3;

	this.needUsername = false;
	this.needPassword = false;
	this.willRetain = false;
	this.willQos = 0;
	this.willFlag = 0;
	this.cleanSession = false;

	this.keepAlive = 0;

	this.clientId = null;
	this.topic = null;
	this.message = null;
	this.username = null;
	this.password = null;
};

require('util').inherits(PINGREQ, Message);

PINGREQ.prototype.write = function(buf, offset) {
	buf[offset] = Message.types.PINGREQ << 4;
	buf[offset + 1] = 0;

	return offset + 2;
};

PINGREQ.prototype.read = function(buf, offset, len) {
	if(buf[offset + 1] !== 0)
		throw new Error('PINGREQ must be zero-body');

	return offset + 2;
};;

exports.PINGREQ = PINGREQ;
