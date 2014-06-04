var net = require('net');
var Message = require('./Message.js').Message;
var EncoderConstructor = require('./EncoderConstructor.js').EncoderConstructor;
var DecoderConstructor = require('./DecoderConstructor.js').DecoderConstructor;

var ec = new EncoderConstructor;

var encodeFixedHeader = ec
	.flags8([
		['this.type', 4],
		['this.dup', 1],
		['this.qos', 2],
		['this.retain', 1]
	])
	.inline('hello')
	.len('this.length')
;
