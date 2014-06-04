
/**
 * Клсс для конструирования методов сериализации .write(buf, offset) для
 * разных типов сообщений сообщений
 * @returns {EncoderConstructor}
 */
function EncoderConstructor() {
	this.codeBlocks = [];
};

EncoderConstructor.prototype.string = function(property, maxLength) {
	this.codeBlocks.push(this._string(property, maxLength));

	return this;
};

EncoderConstructor.prototype.optionalString = function(property, maxLength) {
	this.codeBlocks.push(this._optionalString(property, maxLength));

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

EncoderConstructor.prototype.len = function(property) {
	this.codeBlocks.push(this._lenBody(property));

	return this;
};

EncoderConstructor.prototype.inline = function(callable) {
	var code = '/* inline(' + callable + '); */\n\n'
		+ callable + '(_buf, _offset);\n';

	this.codeBlocks.push(code);

	return this;
};

EncoderConstructor.prototype.toFunction = function() {
	return new Function('_buf, _offset', this._bodyWrap(this.codeBlocks.join('\n')));
};

/* ---------------- private ----------------- */

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

EncoderConstructor.prototype._optionalString = function(property, maxLength) {
	var code = '/* _stringBody(' + property + ', ' + maxLength + '); */\n\n';

	code +=
		'if(' + property + ' !== null) {\n'
			+ this._string(property, maxLength).replace(/^/gm, '\t') + '\n'
		+ '}\n';

	return code;
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
		+ 'return _offset;';

	return code.replace(/^/gm, '\t');
};

EncoderConstructor.prototype._stringBody = function(property, maxLength) {
	var code = '/* _stringBody(' + property + ', ' + maxLength + '); */\n\n'
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
	var code = '/* _bufferBody(' + property + ', ' + maxLength + '); */\n\n'
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
	var code = '/* _uint16Body(' + property + '); */\n\n'
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

EncoderConstructor.prototype._lenBody = function(property) {
	var code = '/* _lenBody(' + property + '); */\n\n';

	code += 'if(${property} > 127) {\n';
	code += '	var _l = ${property};\n';
	code += '	while(_l) {\n';
	code += '		_buf[_offset++] = _l % 128;\n';
	code += '		_l >>= 7;\n';
	code += '	}\n';
	code += '} else {\n';
	code += '	_buf[_offset++] = ${property};\n';
	code += '}\n';

	return this._replace(code, {property: property});
};

exports.EncoderConstructor = EncoderConstructor;
