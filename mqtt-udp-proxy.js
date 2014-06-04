var net = require('net');

function EncoderConstructor() {
	this.codeBlocks = [];
};

EncoderConstructor.prototype.toFunction = function() {
	return new Function('_buf, _offset', this._bodyWrap(this.codeBlocks.join('\n')));
};

EncoderConstructor.prototype._replace = function(code, replacements) {
	for(var r in replacements) {
		code = code.replace(
			new RegExp('\\$\\{' + r + '\\}', 'g'),
			replacements[r]
		);
	}

	return code;
};

EncoderConstructor.prototype._string = function(property, maxLength) {
	var code =
		'if(Buffer.isBuffer(${property})) {\n'
			+ this._bufferBody(property, maxLength).replace(/^/gm, '\t') + '\n'
		+ '} else if(typeof(${property}) === "string") {\n'
			+ this._stringBody(property, maxLength).replace(/^/gm, '\t') + '\n'
		+ '} else {\n'
			+ '	throw new Error("String or Buffer expected in ${property}");\n'
		+ '}\n';

	code = this._replace(code, {property: property});

	return code;
};

EncoderConstructor.prototype.string = function(property, maxLength) {
	this.codeBlocks.push(this._string(property, maxLength));

	return this;
};

EncoderConstructor.prototype.uint16 = function(property) {
	this.codeBlocks.push(this._uint16Body(property));

	return this;
};

EncoderConstructor.prototype.uint8 = function(property) {
	this.codeBlocks.push(this._uint8Body(property));

	return this;
};

EncoderConstructor.prototype.flags8 = function(defs) {
	this.codeBlocks.push(this._flags8Body(defs));

	return this;
};

EncoderConstructor.prototype._flags8Body = function(fields) {
	var code = '/* _flags8Body(' + JSON.stringify(fields) + '); */\n\n'
		+ 'var _flags = 0;\n\n';

	if(!fields instanceof Array)
		throw new Error('Array expected');

	var masks = {
		1: '0x01',
		2: '0x03',
		3: '0x07',
		4: '0x0f',
		5: '0x1f',
		6: '0x3f',
		7: '0x7f',
		8: '0xff'
	};
	var bitsOffset = 0;

	for(var i = 0; i < fields.length; i++) {
		var d = fields[i];
		if(!d instanceof Array)
			throw new Error('Array expected');

		if(d.length !== 2)
			throw new Error('Array[2] expected');

		var property = d[0];
		var bits = d[1] | 0;

		if(bits <= 0 || bits > 7)
			throw new Error('Field max length = 7 bit');

		if(!property) {
			bitsOffset += bits;
			continue;
		}

		if(bitsOffset + bits > 8)
			throw new Error('flags8 overflow');

		var mask = masks[bits];
		var off = 8 - bitsOffset - bits;
		if(bits === 1) {
			code += '_flags |= (' + property + ' ? 1 : 0)'
		} else {
			code += '_flags |= (' + property + ' & ' + mask + ')'
		}

		if(off)
			code += ' << ' + off;

		code += ';\n';

		bitsOffset += bits;
	}

	code += '\n';
	code += '_buf[_offset++] = _flags;\n';

	return code;
};

EncoderConstructor.prototype._bodyWrap = function(bodyCode) {
	var code = bodyCode + '\n'
		+ 'return _offset;\n';

	return code.replace(/^/gm, '\t');
};

EncoderConstructor.prototype._stringBody = function(property, maxLength) {
	var code = '/* _stringBody(' + JSON.stringify(property) + ', ' + maxLength + '); */\n\n'
		+ 'var _len = Buffer.byteLength(${property});\n\n';

	if(maxLength) {
		code += 'if(_len > ${maxLength})\n'
			+ '	throw new Error("${property} is too long");\n\n'
	}

	code += this._uint16Body('_len') + '\n';
	code += '_offset += _buf.write(${property}, _offset);\n';

	return this._replace(code, {property: property, maxLength: maxLength});
};

EncoderConstructor.prototype._bufferBody = function(property, maxLength) {
	var code = '/* _bufferBody(' + JSON.stringify(property) + ', ' + maxLength + '); */\n\n'
		+ 'var _len = ${property}.length;\n\n';

	if(maxLength) {
		code += 'if(_len > ${maxLength})\n'
			+ '	throw new Error("${property} is too long");\n\n'
	}

	code += this._uint16Body('_len') + '\n';
	code += '${property}.copy(_buf, _offset);\n';
	code += '_offset += _len;\n'

	return this._replace(code, {property: property, maxLength: maxLength});
};

EncoderConstructor.prototype._uint16Body = function(property) {
	var code = '/* _uint16Body(' + JSON.stringify(property) + '); */\n\n'
		+ 'if(${property} < 0 || ${property} > 0xffff)\n'
		+ '	throw new Error("Uint16 overflow/underflow: " + ${property});\n\n';

	code += '_buf[_offset++] = ${property} >> 8;\n';
	code += '_buf[_offset++] = ${property} & 0xff;\n';

	return this._replace(code, {property: property});
};

EncoderConstructor.prototype._uint8Body = function(property) {
	var code = '/* _uint8Body(' + JSON.stringify(property) + '); */\n\n'
		+ 'if(${property} < 0 || ${property} > 0xff)\n'
		+ '	throw new Error("Uint8 overflow/underflow: " + ${property});\n\n';

	code += '_buf[_offset++] = ${property};\n';

	return this._replace(code, {property: property});
};

var p = new EncoderConstructor;
console.log(p.flags8([
	['hello', 2],
	[null, 1],
	['world', 1],
	['qos', 3],
	['bit', 1]
]).uint8('this.hello8')
		.uint16('this.hello16')
		.string('this.hello16')
		.toFunction().toString());

function MqttMessage() {
	this.fixedHeader = null;

	this.type = 0;
};

MqttMessage.types = {
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

MqttMessage.typeNames = {
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

MqttMessage.VariableHeaders = {};

MqttMessage.VariableHeaders.CONNECT = function() {
	this.type = MqttMessage.types.CONNECT;

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

MqttMessage.BinConstructor = function(buf, offset) {
	this.buf = buf ? buf : new Buffer(16 * 1024);
	this.bufOffset = offset ? offset : 0;
	this.realLength = this.bufOffset;
};

MqttMessage.BinConstructor.prototype.appendUint8 = function(number) {
	if(typeof(number) !== 'number')
		throw new Error('Number expected');

	if(number < 0 || number > 255)
		throw new Error('Underflow/overflow uint8: ' + number);

	this.buf[this.realLength++] = number;

	return this;
};

MqttMessage.BinConstructor.prototype.appendUint16 = function(number) {
	if(typeof(number) !== 'number')
		throw new Error('Number expected');

	if(number < 0 || number > 65535)
		throw new Error('Underflow/overflow uint16: ' + number);

	this.buf[this.realLength++] = number >> 8;
	this.buf[this.realLength++] = number & 0xff;

	return this;
};

MqttMessage.BinConstructor.prototype.appendString = function(string) {
	if(Buffer.isBuffer(string))
		return this.appendBuffer(string);

	if(typeof(string) !== 'string')
		throw new Error('string expected');

	var buf = new Buffer(string);

	return this.appendBuffer(buf);
};

MqttMessage.BinConstructor.prototype.optionalAppendString = function(string) {
	if(string !== null)
		return this.appendString(string);

	return this;
};

MqttMessage.BinConstructor.prototype.appendBuffer = function(buffer) {
	this.appendUint16(buffer.length);

	buffer.copy(this.buf, this.realLength);

	this.realLength += buffer.length;

	return this;
};

MqttMessage.BinConstructor.prototype.getResultBuffer = function() {
	return this.buf.slice(this.bufOffset, this.realLength);
};

MqttMessage.VariableHeaders.CONNECT.prototype.encode = function() {
	if(!this.clientId)
		throw new Error('clientId is not defined');

	if(typeof(this.clientId) !== 'string')
		throw new Error('clientId is not string');

	if(!this.clientId.length || this.clientId.length > 23)
		throw new Error('clientId must be between 1 and 23 characters long');

	if(this.willQos > 2)
		throw new Exception('QoS is too large');

	var flags = 0
		| (this.username !== null ? 1 << 7 : 0)
		| (this.password !== null ? 1 << 6 : 0)
		| (this.willRetain ? 1 << 5 : 0)
		| ((this.willQos & 0x03) << 3)
		| (this.willFlag ? 1 << 2 : 0)
		| (this.cleanSession ? 1 << 1 : 0)
	;

	var buf = (new MqttMessage.BinConstructor)
		.appendString(this.protocolName)
		.appendUint8(this.protocolVersion)
		.appendUint8(flags)
		.appendUint16(this.keepAlive)
		.appendString(this.clientId)
		.optionalAppendString(this.topic)
		.optionalAppendString(this.message)
		.optionalAppendString(this.username)
		.optionalAppendString(this.password)
		.getResultBuffer()
	;

	return buf;
};

MqttMessage.StreamDecoder = function(stream) {
	var self = this;
	var remainingLength = 0;
	var type = 0;

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

		for(var i = 0; i < 4 && i < buf.length - 1; i++) {
			if(!(buf[1 + i] & 0x80)) {
				// end of fixed header
				var fh = MqttMessage.FixedHeader.decode(buf);

				remainingLength = fh.length;
				type = fh.type;

				if(!remainingLength)
					self.emit('packet', type, null);

				stream.unshift(buf.slice(2 + i));

				return;
			}
		}

		if(i === 4)
			throw new Error('Broken packet');

		stream.unshift(buf);
	});

	self.on('packet', function(type, buffer) {
		var message = null;
		switch(type) {
			case MqttMessage.types.CONNACK:
				message = MqttMessage.VariableHeaders.CONNACT.decode(buffer);
			break;
			case MqttMessage.types.PINGREQ:
				message = new MqttMessage.VariableHeaders.PINGREQ;
			break;
			case MqttMessage.types.PINGRESP:
				message = new MqttMessage.VariableHeaders.PINGRESP;
			break;
			case MqttMessage.types.PUBACK:
				message = MqttMessage.VariableHeaders.PUBACK.decode(buffer);
			break;
			case MqttMessage.types.PUBREC:
				message = MqttMessage.VariableHeaders.PUBREC.decode(buffer);
			break;
			case MqttMessage.types.PUBREL:
				message = MqttMessage.VariableHeaders.PUBREL.decode(buffer);
			break;
			case MqttMessage.types.PUBCOMP:
				message = MqttMessage.VariableHeaders.PUBCOMP.decode(buffer);
			break;
		}

		if(message) {
			console.error('->', MqttMessage.typeNames[type], message);
			self.emit(MqttMessage.typeNames[type], message);
		} else {
			console.error('Unknown type: ' + type, buffer);
		}
	});
};

require('util').inherits(MqttMessage.StreamDecoder, require('events').EventEmitter);

MqttMessage.VariableHeaders.CONNACT = function() {
	this.returnCode = 0;
};

MqttMessage.VariableHeaders.CONNACT.decode = function(buf) {
	if(buf.length !== 2)
		throw new Error('Not enough length');

	var h = new MqttMessage.VariableHeaders.CONNACT;

	h.returnCode = buf[1];

	return h;
};

MqttMessage.VariableHeaders.PINGREQ = function() {

};

MqttMessage.VariableHeaders.PINGRESP = function() {

};

MqttMessage.VariableHeaders.PUBACK = function() {
	this.messageId = null;
};

MqttMessage.VariableHeaders.PUBACK.decode = function(buf) {
	if(buf.length !== 2)
		throw new Error('Not enough length');

	var h = new MqttMessage.VariableHeaders.PUBACK;

	h.messageId = (buf[0] << 8) + buf[1];

	return h;
};

MqttMessage.VariableHeaders.PUBLISH = function() {
	this.type = MqttMessage.types.PUBLISH;

	this.messageId = null;
	this.topic = null;
	this.body = null;
};

MqttMessage.VariableHeaders.PUBLISH.prototype.encode = function(buf, offset) {
	var buf = (new MqttMessage.BinConstructor(buf, offset))
		.appendString(this.topic)
		.appendUint16(this.messageId ? this.messageId : 0)
		.appendString(this.body)
		.getResultBuffer()
	;

	return buf;
};

MqttMessage.VariableHeaders.PUBREC = function() {
	this.messageId = null;
};

MqttMessage.VariableHeaders.PUBREC.decode = function(buf) {
	if(buf.length !== 2)
		throw new Error('Not enough length');

	var h = new MqttMessage.VariableHeaders.PUBREC;

	h.messageId = (buf[0] << 8) + buf[1];

	return h;
};

MqttMessage.VariableHeaders.PUBREL = function() {
	this.messageId = null;
};

MqttMessage.VariableHeaders.PUBREL.decode = function(buf) {
	if(buf.length !== 2)
		throw new Error('Not enough length');

	var h = new MqttMessage.VariableHeaders.PUBREL;

	h.messageId = (buf[0] << 8) + buf[1];

	return h;
};

MqttMessage.VariableHeaders.PUBCOMP = function() {
	this.messageId = null;
};

MqttMessage.VariableHeaders.PUBCOMP.decode = function(buf) {
	if(buf.length !== 2)
		throw new Error('Not enough length');

	var h = new MqttMessage.VariableHeaders.PUBCOMP;

	h.messageId = (buf[0] << 8) + buf[1];

	return h;
};

MqttMessage.FixedHeader = function() {
	this.type = 0;
	this.dup = false;
	this.qos = 0;
	this.retain = false;
	this.length = 0;
};

MqttMessage.FixedHeader.decode = function(buf) {
	var m = new MqttMessage.FixedHeader;

	if(buf.length < 2)
		throw new Error('Not enough length');

	/* Fixed header */
	m.type = buf[0] >> 4;
	m.dup = !!(buf[0] & 0x08); // 0b1000
	m.qos = (buf[0] & 0x06) >> 1;
	m.retain = buf[0] & 0x01;

	var lo = 0;
	var lm = 1;
	var l = 0;

	do {
		lo++;
		if(lo >= 3)
			throw new Error('Length is too long');

		if(buf.length <= lo)
			throw new Error('Not enough length');

		l += (buf[lo] & 0x7f) * lm;

		lm *= 0x80;
	} while(buf[lo] > 127);

	m.length = l;

	return m;
};

MqttMessage.FixedHeader.prototype.encode = function(buf, offset) {
	offset = offset || 0;

	var flags = 0
		| (this.type << 4)
		| (this.dup ? 1 << 3 : 0)
		| (this.qos << 1)
		| (this.retain ? 1 : 0)

	if(this.length > 127) {
		var la = [];
		var l = this.length;

		while(l) {
			la.push(l % 128);
			l >>= 7;
		}

		var buf = new Buffer(1 + la.length);

		for(var i = 0; i < la.length - 1; i++)
			buf[offset + 1 + i] = 0x80 | la[i];

		buf[offset + 1 + la.length - 1] = la[la.length - 1];
	} else {
		var buf = new Buffer(2);
		buf[offset + 0] = flags;
		buf[offset + 1] = this.length;
	}

	return buf;
};

function MqttClient() {
	this.sock = null;

	this.clientId = 'ewdwekdnxlksaoi32p209';
	this.keepAlive = 2;
	this.cleanSession = true;

	this.willTopic = null;
	this.willMessage = null;

	this.willRetain = false;
	this.willQos = 0;
};

require('util').inherits(MqttClient, require('events').EventEmitter);

MqttClient.prototype.connect = function(host, port, onConnect) {
	var self = this;
	var pingInterval = null;

	if(this.sock)
		throw new Error('Already connected');

	if(onConnect)
		this.on('connect', onConnect);

	this.sock = net.connect(port, host, function() {
		self._sendConnect();
	});

	this.sock.on('error', function(err) {
		self.emit('error', err);
	})

	this.sock.on('close', function() {
		self.emit('close');
		clearInterval(pingInterval);
		pingInterval = null;

		process.exit(1);
	})

	this.decoder = new MqttMessage.StreamDecoder(this.sock);
	this.decoder.on('CONNACK', function(mes) {
		if(mes.returnCode !== 0)
			throw new Error('Unable to handshake: ' + mes.returnCode);

		self.emit('connect');

		setInterval(function() {
			self._sendPing();
		}, self.keepAlive * 1000 / 2)
	});

	this.cachePublishObject = new MqttMessage.VariableHeaders.PUBLISH;
};

MqttClient.prototype._send = function(message, qos, retain, dup) {
	var fh = new MqttMessage.FixedHeader();
	fh.dup = !!dup;
	fh.qos = qos ? qos : 0;
	fh.retain = !!retain;
	fh.type = message.type;

	var s = message.encode();
	fh.length = s.length;

	this.sock.write(Buffer.concat([fh.encode(), s]));
};

MqttClient.prototype._sendConnect = function() {
	var h = new MqttMessage.VariableHeaders.CONNECT;
	h.clientId = this.clientId;
	h.keepAlive = this.keepAlive;
	h.cleanSession = this.cleanSession;
	h.topic = this.willTopic;
	h.message = this.willMessage;
	h.willFlag = !!this.willMessage;
	h.willQos = this.willQos;
	h.willRetain = this.willRetain;

	this._send(h, 0, 0, 0);
};

MqttClient.prototype._sendPing = function() {
	this.sock.write(new Buffer([MqttMessage.types.PINGREQ << 4, 0]));
};

MqttClient.prototype.publish = function(topic, message, qos) {
	this.cachePublishObject.topic = topic;
	this.cachePublishObject.body = message;

	this._send(this.cachePublishObject, qos, 0, 0);
};
//
//var n = 0;
//var ln = 0;
//
//var client = new MqttClient();
//client.connect('127.0.0.1', 1883, function() {
//	var f = function() {
//		n++;
//		client.publish('hello', n.toString(), 0);
//	};
//
//	for(var i = 0; i < 2000; i++)
//		setInterval(f, 1).unref();
//});
//
//setInterval(function() {
//	console.log(n - ln);
//	ln = n;
//}, 1000);
//
