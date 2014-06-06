var Message = require('../Message.js').Message;
var EncoderConstructor = require('../EncoderConstructor.js').EncoderConstructor;
var DecoderConstructor = require('../DecoderConstructor.js').DecoderConstructor;

function CONNECT() {
	CONNECT.super_.call(this);

	this.type = Message.types.CONNECT;

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

require('util').inherits(CONNECT, Message);

CONNECT.prototype.writeBody = (new EncoderConstructor)
	.string('this.protocolName')
	.uint8('this.protocolVersion')
	.flags8([
		['this.needUsername', 1],
		['this.needPassword', 1],
		['this.willRetain', 1],
		['this.willQos', 2],
		['this.willFlag', 1],
		['this.cleanSession', 1],
		[null, 1]
	])
	.uint16('this.keepAlive')
	.string('this.clientId')
	.optionalString('this.topic')
	.optionalString('this.message')
	.optionalString('this.username')
	.optionalString('this.password')
	.toFunction()
;

CONNECT.prototype.read = (new DecoderConstructor)
	.inline('this.readFixedHeader')
	.inline('this.checkRemainigLength')
	.string('this.protocolName')
	.uint8('this.protocolVersion')
	.flags8([
		['this.needUsername', 1],
		['this.needPassword', 1],
		['this.willRetain', 1],
		['this.willQos', 2],
		['this.willFlag', 1],
		['this.cleanSession', 1],
		[null, 1]
	])
	.uint16('this.keepAlive')
	.string('this.clientId')
	.conditionalString('this.willFlag', 'this.topic')
	.conditionalString('this.willFlag', 'this.message')
	.conditionalString('this.needUsername', 'this.username')
	.conditionalString('this.needPassword', 'this.password')
	.toFunction()
;

exports.CONNECT = CONNECT;
