function Message() {
	/* fixed header */
	this.type = 0;
	this.dup = 0;
	this.qos = 0;
	this.retain = 0;
	this.length = 0;
};

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

Message.CONNECT = require('./messages/CONNECT.js').CONNECT;
Message.PINGREQ = require('./messages/PINGREQ.js').PINGREQ;

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
