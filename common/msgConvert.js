var buffUtil = require('buffUtil.js')

var cmdMap = {
  0x25: 'MSG_REPLY_AP_LIST',
  0x27: 'MSG_CONN_AP_RSP'
};

var paramMap = {
  0x4015: 'apList',
  0x1016: 'ssid',
  0x1017: 'password',
  0x2019: 'encrypt',
  0x2018: 'connResult',
  0x1020: 'deviceId'
};

function parseApList(buffer) {
  var pos = 0
  var networks = new Array()

  while (pos < buffer.length - 5) {
    var remember = (buffer[pos] == 0) ? false : true
    var status = buffer[pos + 1]
    var encrypt = buffer[pos + 2]
    var rssi = buffer[pos + 3]
    
    if (rssi >= 3) {
      rssi = 1
    } else if (rssi == 2) {
      rssi = 2
    } else if (rssi == 1) {
      rssi = 3
    } else {
      rssi = 4
    }

    var ssidLen = buffer[pos + 4]

    var ssid = buffUtil.byteToString(buffer, pos + 5, ssidLen)

    pos += (5 + ssidLen)

    var network = {
      remember: remember,
      status: status,
      encrypt: encrypt,
      rssi: rssi,
      ssid: ssid
    }

    networks.push(network)
  }

  return networks
}

function convertMsg(msg) {
  var msgId = cmdMap[msg.msgId]
  if (msgId == null) {
    return null
  }

  var appMsg = {
    msgId: msgId,
    params: {}
  };

  switch (msg.msgId) {
  case 0x25:
    msg.params.forEach(function(param) {
      if (param.type == 0x4015) {
        var apList = parseApList(param.value)
        appMsg.params.apList = apList
      }
    })
    break

  case 0x27:
    msg.params.forEach(function(param) {
      if (param.type == 0x2018) {
        console.log(param.value)
        appMsg.params.status = param.value
      }
    })
    break
  }

  return appMsg
}

module.exports = {
  convertMsg: convertMsg
}
