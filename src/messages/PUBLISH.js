var Message = require('../Message.js').Message;
var EncoderConstructor = require('../EncoderConstructor.js').EncoderConstructor;
var DecoderConstructor = require('../DecoderConstructor.js').DecoderConstructor;

function PUBLISH() {
	PUBLISH.super_.call(this);

	this.type = Message.types.PUBLISH;

	this.topic = null;
	this.body = null;
	this.id = null;
};

require('util').inherits(PUBLISH, Message);

PUBLISH.prototype.writeBody = (new EncoderConstructor)
	.string('this.topic')
	.uint16('this.id')
	.string('this.body')
	.toFunction()
;

PUBLISH.prototype.read = (new DecoderConstructor)
	.inline('this.readFixedHeader')
	.inline('this.checkRemainingLength')
	.string('this.topic')
	.uint16('this.id')
	.string('this.body')
	.toFunction()
;

exports.PUBLISH = PUBLISH;
