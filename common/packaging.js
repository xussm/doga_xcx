var buffUtil = require('buffUtil.js')

function calcChecksum(pack) {
  var checksum = 0
  let dataView = new DataView(pack)

  for (var i = 1; i < pack.byteLength; i++) {
    checksum += (dataView.getUint8(i))
  }

  checksum = (checksum & 0xF) + (checksum >> 4)
  checksum = (checksum & 0x3) + (checksum >> 2)

  return checksum
}

function getPackage(msg, serial, offset = 0) {
  var len = msg.length - offset
  len = (len > 19) ? 19 : len

  let result = new ArrayBuffer(len + 1)
  let dataView = new DataView(result)
  for (var i = 0; i < len; i++) {
    dataView.setUint8(i + 1, msg[offset + i])
  }

  var checksum = calcChecksum(result)
  var header = (checksum << 6) | serial

  dataView.setUint8(0, header)

  return result
}

function addPackage(msg, pack) {
  let dataView = new DataView(pack)

  var packSerial = (dataView.getUint8(0) & 0x3F);

  if (packSerial == 0) {
    msg.serial = 0;
    msg.buffer = new Array();
    msg.complete = false;
  }

  if (packSerial != msg.serial) {
    console.warn("serial error", packSerial, msg.serial)
    return null;
  }

/*
  if ((calcChecksum(pack) & 0x3) != (dataView.getUint8(0) >> 6)) {
    console.warn("checksum error")
    return null;
  }*/

  for (var i = 1; i < pack.byteLength; i++) {
    msg.buffer.push(dataView.getUint8(i))
  }

  var bytesExpect = buffUtil.byteToUint16(msg.buffer, 0)
  if (bytesExpect == msg.buffer.length) {
    // Package finished
    msg.complete = true
  }
  msg.serial += 1

  return msg;
}

module.exports = {
  getPackage: getPackage,
  addPackage: addPackage
}
