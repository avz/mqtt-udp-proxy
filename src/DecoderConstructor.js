
/**
 * Клсс для конструирования методов десериализации .read(buf, offset, length) для
 * разных типов сообщений сообщений
 * @returns {DecoderConstructor}
 */
function DecoderConstructor() {
	this.codeBlocks = [];
};

var checkBordersCode = function(needLength) {
	if(needLength !== undefined)
		return 'if(_length - _offset < ' + needLength + ') throw new RangeError("mqtt-udp-proxy:bof");\n\n';
	else
		return 'if(_length <= _offset) throw new RangeError("mqtt-udp-proxy:bof");\n\n';
};

DecoderConstructor.prototype.string = function(property, maxLength) {
	this.codeBlocks.push(this._stringBody(property, maxLength));

	return this;
};

DecoderConstructor.prototype.bufferInplace = function(property, maxLength) {
	this.codeBlocks.push(this._bufferInplaceBody(property, maxLength));

	return this;
};

DecoderConstructor.prototype.conditionalString = function(condition, property) {
	this.codeBlocks.push(this._conditionalStringBody(condition, property));

	return this;
};

DecoderConstructor.prototype.conditionalBufferInplace = function(condition, property) {
	this.codeBlocks.push(this._conditionalBufferInplaceBody(condition, property));

	return this;
};

DecoderConstructor.prototype.uint16 = function(property) {
	this.codeBlocks.push(this._uint16Body(property));

	return this;
};

DecoderConstructor.prototype.uint8 = function(property) {
	this.codeBlocks.push(this._uint8Body(property));

	return this;
};

DecoderConstructor.prototype.flags8 = function(defs) {
	this.codeBlocks.push(this._flags8Body(defs));

	return this;
};

DecoderConstructor.prototype.len = function(property) {
	this.codeBlocks.push(this._lenBody(property));

	return this;
};

DecoderConstructor.prototype.inline = function(callable) {
	var code = '/* inline(' + callable + '); */\n\n'
		+ '_offset = ' + callable + '(_buf, _offset, _length);\n';

	this.codeBlocks.push(code);

	return this;
};

DecoderConstructor.prototype.toFunction = function() {
	return new Function('_buf, _offset, _length', this._bodyWrap(this.codeBlocks.join('\n')));
};

/* ---------------- private ----------------- */

DecoderConstructor.prototype._replace = function(code, replacements) {
	for(var r in replacements) {
		code = code.replace(
			new RegExp('\\$\\{' + r + '\\}', 'g'),
			replacements[r]
		);
	}

	return code;
};

DecoderConstructor.prototype._flags8Body = function(fields) {
	var code = '/* _flags8Body(' + JSON.stringify(fields) + '); */\n\n'
		+ checkBordersCode()
		+ 'var _flags = _buf[_offset++];\n\n';

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

		if(off)
			code += property + ' = (_flags >> ' + off + ') & ' + mask + ';\n'
		else
			code += property + ' = _flags & ' + mask + ';\n'


		bitsOffset += bits;
	}

	return code;
};

DecoderConstructor.prototype._bodyWrap = function(bodyCode) {
	var code = bodyCode + '\n'
		+ 'return _offset;';

	return code.replace(/^/gm, '\t');
};

DecoderConstructor.prototype._stringBody = function(property) {
	var code = '/* _stringBody(' + property + '); */\n\n';

	code += 'var _len;\n';
	code += this._uint16Body('_len') + '\n';
	code += checkBordersCode('_len');
	code += property + ' = _buf.toString("utf-8", _offset, _offset + _len);\n';
	code += '_offset += _len;\n'

	return code;
};

DecoderConstructor.prototype._bufferInplaceBody = function(property) {
	var code = '/* _bufferBody(' + property + '); */\n\n';

	code += 'var _len;\n';
	code += this._uint16Body('_len') + '\n';
	code += checkBordersCode('_len');
	code += property + ' = _buf.slice(_offset, _len);\n';
	code += '_offset += _len;\n'

	return code;
};

DecoderConstructor.prototype._conditionalStringBody = function(condition, property) {
	var code = '/* _conditionalStringBody(' + condition + ', ' + property + '); */\n\n';

	code += 'if(' + condition + ') {\n';
	code += this._stringBody(property).replace(/^/gm, '\t') + '\n';
	code += '}\n';

	return code;
};

DecoderConstructor.prototype._conditionalBufferInplaceBody = function(condition, property) {
	var code = '/* _conditionalBufferInplaceBody(' + condition + ', ' + property + '); */\n\n';

	code += 'if(' + condition + ') {\n';
	code += this._BufferInplaceBody(property).replace(/^/gm, '\t') + '\n';
	code += '}\n';

	return code;
};

DecoderConstructor.prototype._uint16Body = function(property) {
	var code = '/* _uint16Body(' + property + '); */\n\n'
		+ checkBordersCode(2)
		+ property + ' = _buf[_offset++] << 8;\n'
		+ property + ' += _buf[_offset++] & 0xff;\n'

	return code;
};

DecoderConstructor.prototype._uint8Body = function(property) {
	var code = '/* _uint8Body(' + property + '); */\n\n'
		+ checkBordersCode()
		+ property + ' = _buf[_offset++];\n'

	return code;
};

DecoderConstructor.prototype._lenBody = function(property) {
	var code = '/* _lenBody(' + property + '); */\n\n';

	code += property + ' = 0;\n\n';

	code += 'var _m = 1;\n\n'
	code += 'do {\n';
	code += '	' + checkBordersCode()
	code += '	' + property + ' = (_buf[_offset++] & 0x7f) * _m;\n'
	code += '	_m *= 128;\n\n';
	code += '	if(_m > 0x100000000)\n';
	code += '		throw new Error("Length is too big");\n\n'
	code += '} while(_buf[_offset - 1] & 0x80);\n';

	return code;
};

exports.DecoderConstructor = DecoderConstructor;
