var Message = require('../Message.js').Message;
var EncoderConstructor = require('../EncoderConstructor.js').EncoderConstructor;
var DecoderConstructor = require('../DecoderConstructor.js').DecoderConstructor;

function CONNACK() {
	CONNACK.super_.call(this);

	this._reserved = 0;
	this.returnCode = 0;
};

require('util').inherits(CONNACK, Message);

CONNACK.prototype.writeBody = (new EncoderConstructor)
	.uint8('this._reserved')
	.uint8('this.returnCode')
	.toFunction()
;

CONNACK.prototype.read = (new DecoderConstructor)
	.inline('this.readFixedHeader')
	.inline('this.checkRemainingLength')
	.uint8('this._reserved')
	.uint8('this.returnCode')
	.toFunction()
;

exports.CONNACK = CONNACK;
