function Message() {
	/* fixed header */
	this.type = 0;
	this.dup = 0;
	this.qos = 0;
	this.retain = 0;
	this.length = 0;
};

exports.Message = Message;

Message.types = {
	_0: 0,
	CONNECT: 1,
	CONNACK: 2,
	PUBLISH: 3,
	PUBACK: 4,
	PUBREC: 5,
	PUBREL: 6,
	PUBCOMP: 7,
	SUBSCRIBE: 8,
	SUBACK: 9,
	UNSUBSCRIBE: 10,
	UNSUBACK: 11,
	PINGREQ: 12,
	PINGRESP: 13,
	DISCONNECT: 14,
	_15: 15
};

Message.typeNames = {
	0: '_0',
	1: 'CONNECT',
	2: 'CONNACK',
	3: 'PUBLISH',
	4: 'PUBACK',
	5: 'PUBREC',
	6: 'PUBREL',
	7: 'PUBCOMP',
	8: 'SUBSCRIBE',
	9: 'SUBACK',
	10: 'UNSUBSCRIBE',
	11: 'UNSUBACK',
	12: 'PINGREQ',
	13: 'PINGRESP',
	14: 'DISCONNECT',
	15: '_15'
};

var EncoderConstructor = require('./EncoderConstructor.js').EncoderConstructor;
var DecoderConstructor = require('./DecoderConstructor.js').DecoderConstructor;

Message.CONNECT = require('./messages/CONNECT.js').CONNECT;
Message.CONNACK = require('./messages/CONNACK.js').CONNACK;
Message.PINGREQ = require('./messages/PINGREQ.js').PINGREQ;
Message.PINGRESP = require('./messages/PINGRESP.js').PINGRESP;
Message.PUBLISH = require('./messages/PUBLISH.js').PUBLISH;
Message.PUBACK = require('./messages/PUBACK.js').PUBACK;

Message.prototype.writeFixedHeader = (new EncoderConstructor)
	.flags8([
		['this.type', 4],
		['this.dup', 1],
		['this.qos', 2],
		['this.retain', 1]
	])
	.len('this.length')
	.toFunction()
;

Message.prototype.write = function(buf, offset) {
	var fixedHeaderLength = 1 + 4;

	var so = offset;

	offset += fixedHeaderLength;
	var bso = offset;
	offset = this.writeBody(buf, offset);

	this.length = offset - bso;
	this.writeFixedHeader(buf, so);

	return offset;
};

Message.prototype.readFixedHeader = (new DecoderConstructor)
	.flags8([
		['this.type', 4],
		['this.dup', 1],
		['this.qos', 2],
		['this.retain', 1]
	])
	.len('this.length')
	.toFunction()
;

Message.prototype.checkRemainingLength = function(buf, offset, len) {
	if(len - offset < this.length)
		throw new Error("mqtt-udp-proxy:bof");

	return offset;
};

//console.log(Message.prototype.readFixedHeader.toString());
