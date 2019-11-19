function stringToByte(str) {
  var bytes = new Array();
  var len, c;
  len = str.length;
  for (var i = 0; i < len; i++) {
    c = str.charCodeAt(i);
    if (c >= 0x010000 && c <= 0x10FFFF) {
      bytes.push(((c >> 18) & 0x07) | 0xF0);
      bytes.push(((c >> 12) & 0x3F) | 0x80);
      bytes.push(((c >> 6) & 0x3F) | 0x80);
      bytes.push((c & 0x3F) | 0x80);
    } else if (c >= 0x000800 && c <= 0x00FFFF) {
      bytes.push(((c >> 12) & 0x0F) | 0xE0);
      bytes.push(((c >> 6) & 0x3F) | 0x80);
      bytes.push((c & 0x3F) | 0x80);
    } else if (c >= 0x000080 && c <= 0x0007FF) {
      bytes.push(((c >> 6) & 0x1F) | 0xC0);
      bytes.push((c & 0x3F) | 0x80);
    } else {
      bytes.push(c & 0xFF);
    }
  }
  bytes.push(0);

  return bytes;
}

function byteToString(arr, offset = 0, len = 0) {
  //console.log("arrrr:"+JSON.stringify(arr));
  if (typeof arr === 'string') {
    return arr;
  }
  var str = ''
  var _arr = null

  if (len != 0) {
    _arr = arr.slice(offset, offset + len)
  } else {
    _arr = arr.slice(offset, arr.length)
  }

  for (var i = 0; i < _arr.length; i++) {
    var one = _arr[i].toString(2),
      v = one.match(/^1+?(?=0)/);
    if (v && one.length == 8) {
      var bytesLength = v[0].length;
      var store = _arr[i].toString(2).slice(7 - bytesLength);
      for (var st = 1; st < bytesLength; st++) {
        store += _arr[st + i].toString(2).slice(2);
      }
      str += String.fromCharCode(parseInt(store, 2));
      i += bytesLength - 1;
    } else {
      str += String.fromCharCode(_arr[i]);
    }
  }
  return str;
}

function byteToHex(buffer) {
  var hexArr = Array.prototype.map.call(
    new Uint8Array(buffer),
    function (bit) {
      return ('00' + bit.toString(16)).slice(-2)
    }
  )
  return hexArr.join('');
}

function uint32ToByte(value) {
  var bytes = new Array();

  bytes.push(value & 0xFF)
  bytes.push((value & 0xFF00) >> 8)
  bytes.push((value & 0xFF0000) >> 16)
  bytes.push(value >> 24)

  return bytes;
}

function byteToUint32(arr, offset = 0) {
  return ((arr[offset + 3] << 24) | (arr[offset + 2] << 16) | (arr[offset + 1] << 8) | arr[offset]);
}

function uint16ToByte(value) {
  var bytes = new Array();

  bytes.push(value & 0xFF)
  bytes.push((value & 0xFF00) >> 8)

  return bytes;
}

function putUint16(arr, value, offset = 0) {
  arr[offset] = (value & 0xFF)
  arr[offset + 1] = ((value & 0xFF00) >> 8)
}

function byteToUint16(arr, offset = 0) {
  return ((arr[offset + 1] << 8) | arr[offset]);
}

module.exports = {
  stringToByte: stringToByte,
  byteToString: byteToString,
  byteToHex: byteToHex,
  uint32ToByte: uint32ToByte,
  byteToUint32: byteToUint32,
  uint16ToByte: uint16ToByte,
  putUint16: putUint16,
  byteToUint16: byteToUint16
}
