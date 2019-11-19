var buffUtil = require('buffUtil.js')

function genMessage(msgId) {
  var length = 6
  var msg = new Array(6);

  buffUtil.putUint16(msg, length, 0)
  msg[2] = 1
  msg[3] = msgId
  buffUtil.putUint16(msg, 1, 4)

//  var msg = [length >> 8, length % 256, 1, msgId, 0, 0]
  return msg
}

function addParam(msg, t, v) {
  var paramType = t & 0xF000
  var length = 0

  var buffer = new ArrayBuffer(0)
  switch (paramType) {
    case 0x4000:  // Bytes array
      buffer = v
      length = v.length
      break
    case 0x1000: // String
      buffer = buffUtil.stringToByte(v)
      length = buffer.length
      break
    case 0x2000: // Uint32
      buffer = buffUtil.uint32ToByte(v)
      length = buffer.length
      break
    default:
      console.log("unknown param")
      return msg
  }

  var olen = buffUtil.byteToUint16(msg)
  olen += (4 + buffer.length)

  buffUtil.putUint16(msg, olen, 0)
  msg = msg.concat(buffUtil.uint16ToByte(t))
  msg = msg.concat(buffUtil.uint16ToByte(length))
  msg = msg.concat(buffer)

  return msg
}

function decodeMessage(buffer) {
  var msg = {
    msgId: 0,
    params: []
  }

  var len = buffUtil.byteToUint16(buffer, 0)
  msg.msgId = buffer[3]

  var pos = 6
  while (pos < len) {
    var pId = buffUtil.byteToUint16(buffer, pos)
    var pLen = buffUtil.byteToUint16(buffer, pos + 2)
    var param = {}

    switch (pId & 0xF000) {
    case 0x1000: // String
      param.type = pId
      param.value = buffUtil.byteToString(buffer, pos + 4, pLen - 1)
      break
    
    case 0x2000: // Uint32
      param.type = pId
      param.value = buffUtil.byteToUint32(buffer, pos + 4)
      break

    case 0x4000: // Bytes array
      param.type = pId
      param.value = buffer.slice(pos + 4, pos + 4 + pLen)
      break

    default:
      return null
    }

    msg.params.push(param)
    pos += (4 + pLen)
  }

  return msg
}

module.exports = {
  genMessage: genMessage,
  addParam: addParam,
  decodeMessage: decodeMessage
}
