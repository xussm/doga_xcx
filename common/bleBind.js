var buffUtil = require('buffUtil.js')
var message = require('message.js')
var packaging = require('packaging.js')
var msgConvert = require('msgConvert.js')

const ddm_service_uuid = "fa879af4-d601-420c-b2b4-07ffb528dde3"
const ddm_rx_uuid = "b02eaeaa-f6bc-4a7e-bc94-f7b7fc8ded0b"
const ddm_tx_uuid = "10e2fde2-d7fe-4845-b3f3-a32010ebb095"

var theService = null
var theTX = null
var theRX = null

var btStopped = true

var thePage = null

var theDeviceId = null
var theDeviceName = null
var theMac = null
var theManufactureData = null
var theLinkedDeviceId = null

const BLE_STATUS_NOTINIT = 0
const BLE_STATUS_INITING = 1
const BLE_STATUS_INITED = 2
const BLE_STATUS_STARTING_DISCOVER = 3
const BLE_STATUS_DISCOVERING = 4
const BLE_STATUS_CONNECTING = 5
const BLE_STATUS_CONNECTED = 6
const BLE_STATUS_SENDING = 7

var bleStatus = BLE_STATUS_NOTINIT

var sendingMsg = {
  buffer: null,
  serial: 0,
  offset: 0
}

var pendingConn = {
  ssid: null,
  password: null,
  encrypt: null
}

var recvMsg = {
  buffer: new Array(),
  complete: false,
  serial: 0
}

function bleConnChange(status) {
  thePage.onBLEStatusChange(status)
}
function bleListChange(list){
  //need to create receiveBleList
  thePage.receiveBleList(list);
}

function resetRecvMsg() {
  recvMsg = {
    buffer: new Array(),
    complete: false,
    serial: 0
  }
}
function byteToString(arr) {
  if (typeof arr === 'string') {
    return arr;
  }
  var str = '',
    _arr = arr;
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
function hextoString(hex) {
  var arr = hex.split("")
  var out = ""
  for (var i = 0; i < arr.length / 2; i++) {
    var tmp = "0x" + arr[i * 2] + arr[i * 2 + 1]
    var charValue = String.fromCharCode(tmp);
    out += charValue
  }
  return out
}
function openBle(page){
  console.log("...start openBluetoothAdapter...");
  thePage = page
  wx.openBluetoothAdapter({
    success: function (res) {
      console.log("openBT OK")
      console.log(res)
      bleStatus = BLE_STATUS_STARTING_DISCOVER
      startDiscover();
      wx.onBluetoothAdapterStateChange(function (res) {
        console.log(`adapterState changed, now is`, res)
      })
      wx.onBluetoothDeviceFound(function (devices) {
        console.log('new device list has founded')
        //console.log(devices)
        getBleDevices();
        //console.log(ab2hex(devices[0].advertisData))
      })
      wx.onBLEConnectionStateChanged(function (res) {
        // 该方法回调中可以用于处理连接意外断开等异常情况
        console.log(`device ${res.deviceId} state has changed, connected: ${res.connected}`)
      })

    },
    fail: function (res) {
      console.log("openBT failed")
      console.log(res)
      bleConnChange(-1)
    }
  })
}
function sortRssi(obj1, obj2) {
  var val1 = obj1.RSSI;
  var val2 = obj2.RSSI;
  if (val1 < val2) {
    return 1;
  } else if (val1 > val2) {
    return -1;
  } else {
    return 0;
  }
}
function getBleDevices(){

  wx.getBluetoothDevices({
    success: function (res) {
      console.log(res);
      var ret=[];
      //console.log("all ble list:"+JSON.stringify(res))
      for(var i=0;i<res.devices.length;i++){
        if(!res.devices[i].advertisData){
         continue; 
        }
        //console.log("11111buff:" + res.devices[i].advertisData.byteLength);
        var hex = buffUtil.byteToHex(res.devices[i].advertisData);
        var hexfirst6=hex.slice(0,6);
        //console.log(hexfirst6);
        //#ac  =  616323
        if (hexfirst6 ==616323){
          //console.log("hex:" + hex + "</br>")
          var rhex = hex.slice(0, 20);
          var realDeviceId = hextoString(rhex);
          realDeviceId=realDeviceId.slice(3);
          var temp={};
              temp=res.devices[i];
              temp.realDeviceId = realDeviceId;
              ret.push(temp);
          //console.log(hextoString(rhex));
        }
      }
      //console.log(ret);
      var timestamp = parseInt(new Date().getTime() / 1000);
      console.log(":bleListChange:" + timestamp)
      ret.sort(sortRssi);
      bleListChange(ret);

    }
  })

}
function stopDiscover(){
  wx.stopBluetoothDevicesDiscovery({
    success: function (res) {
      console.log(res)
    },
  })
}
function startDiscover(){
  wx.startBluetoothDevicesDiscovery({
    //services: ['#ac'],
    //true or false
    //当allowDuplicatesKey为true的时候，会按照interval的间隙不断发送至 onBluetoothDeviceFound
    allowDuplicatesKey: true,
    //毫秒制
    interval: 3000,
    success: function (res) {
      var timestamp = parseInt(new Date().getTime() / 1000);
      console.log(res + ":startBluetoothDevicesDiscovery:" + timestamp)
      bleStatus = BLE_STATUS_DISCOVERING
      bleConnChange(0)
    },
    fail: function (res) {
      var timestamp = parseInt(new Date().getTime() / 1000);
      console.log(res + ":startBluetoothDevicesDiscoveryFail:" + timestamp)
      stopBT()
      bleStatus = BLE_STATUS_NOTINIT
      bleConnChange(-1)
    }
  })

}
function getBLEService(deviceId) {
  wx.getBLEDeviceServices({
    deviceId: deviceId,
    success: function (res) {
      console.log('device services:', res.services)
      res.services.forEach(function (service) {
        console.log(service.uuid)
        if (service.uuid.toLowerCase() === ddm_service_uuid) {
          console.log();
        }
      })
    }
  })
}

function testWrite(deviceId) {
  var msg = message.genMessage(0x24)
  console.log(buffUtil.byteToHex(msg))
  var pack = packaging.getPackage(msg, 0, 0)

  console.log(buffUtil.byteToHex(pack))

  bleWrite(deviceId, pack)
}

function startBLEReceive(deviceId) {
  console.log("startBLEReceive:"+deviceId);
  wx.notifyBLECharacteristicValueChange({
    state: true, // 启用 notify 功能
    // 这里的 deviceId 需要已经通过 createBLEConnection 与对应设备建立链接  
    deviceId: deviceId,
    // 这里的 serviceId 需要在上面的 getBLEDeviceServices 接口中获取
    serviceId: theService,
    // 这里的 characteristicId 需要在上面的 getBLEDeviceCharacteristics 接口中获取
    characteristicId: theTX,
    success: function (res) {
      console.log('notifyBLECharacteristicValueChange success', res.errMsg)
      

    },
    fail: function (res) {
      console.log('notifyBLECharacteristicValueChange fail', res.errCode)
    },
    complete: function (res) {
      console.log('notifyBLECharacteristicValueChange complete', res)
    }
  })
  
  thePage.theLinkedDeviceId = theLinkedDeviceId;
  bleConnChange(2)
  wx.onBLECharacteristicValueChange(function (res) {
    console.log("ll"+`characteristic ${res.characteristicId} has changed, now is ${res.value}`)
    console.log("..."+buffUtil.byteToHex(res.value))
    if (recvMsg == null) {
      recvMsg = {
        buffer: new Array(),
        complete: false,
        serial: 0
      }
    }
    recvMsg = packaging.addPackage(recvMsg, res.value)


    if (recvMsg == null) {
      console("package error")
    } else if (recvMsg.complete) {
      var msg = message.decodeMessage(recvMsg.buffer)
      console.log(msg)
      var appMsg = msgConvert.convertMsg(msg)
      if (appMsg != null) {
        thePage.onBLEMsg(appMsg)
      }
      console.log(appMsg)
      resetRecvMsg()
    }
  })

 
}

function discoverCharacteristic(deviceId, serviceId) {
  wx.getBLEDeviceCharacteristics({
    deviceId: deviceId,
    serviceId: serviceId,
    success: function(res) {
      console.log('device getBLEDeviceCharacteristics:', res.characteristics)
      res.characteristics.forEach(function (characteristic) {
        console.log(characteristic.uuid)
        if (characteristic.uuid.toLowerCase() === ddm_rx_uuid) {
          theRX = characteristic.uuid
        } else if (characteristic.uuid.toLowerCase() == ddm_tx_uuid) {
          theTX = characteristic.uuid
        }
      })
      theDeviceId = deviceId
      startBLEReceive(deviceId)
    },
    fail: function(res) {
      console.log(res)
    }
  })
}

function discoverService(deviceId) {
  console.log("discoverService:"+deviceId)
  wx.getBLEDeviceServices({
    deviceId: deviceId,
    success: function(res) {
      console.log('device services:', res.services)
      res.services.forEach(function (service) {
        console.log(service.uuid)
        if (service.uuid.toLowerCase() === ddm_service_uuid) {
          console.log("ddm service found");
          theService = service.uuid
          discoverCharacteristic(deviceId, service.uuid)
        }
      })
    },
    fail: function(res) {
      console.log("discoverServiceFail:"+res)
    }
  })
}
function connBle(deviceId,realDeviceId){
  stopDiscover();
  connectBLE(deviceId);
  theDeviceId=deviceId;
  theLinkedDeviceId=realDeviceId;
  //更改状态 1蓝牙连接中
  bleConnChange(1);

}
function connectBLE(deviceId) {
  wx.createBLEConnection({
    deviceId: deviceId,
    success: function (res) {
      console.log("connected")
      bleStatus = BLE_STATUS_CONNECTED
      //getBLEService(deviceId)
      //startBLEReceive(deviceId)
      console.log("discoverService:____");
      discoverService(deviceId)
    },
    fail: function (res) {
      console.log("connect failed:"+JSON.stringify(res))
      doBleStartDiscover()
    }
  })
}

function doBleStartDiscover() {
  wx.getConnectedBluetoothDevices({
    success: function(res) {

      console.log(res+"dfdd")
      if (res.devices.length > 0) {
        res.devices.forEach(function(device) {
          if (device.name == theDeviceName) {
            theDeviceId = device.deviceId
            bleStatus = BLE_STATUS_CONNECTED
            //startBLEReceive(theDeviceId)
            discoverService(theDeviceId)
          }
        })
      }

      if (bleStatus != BLE_STATUS_CONNECTED) {
        // start discover
        var timestamp = parseInt(new Date().getTime() / 1000);
        console.log("HelloDiscover:"+timestamp)
        wx.startBluetoothDevicesDiscovery({
          //services: ['FEE7'],
          //true or false
          allowDuplicatesKey: true,
          //毫秒制
          interval:2000,
          success: function (res) {
            var timestamp = parseInt(new Date().getTime() / 1000);
            console.log(res +":startBluetoothDevicesDiscovery:"+timestamp)
            bleStatus = BLE_STATUS_DISCOVERING
          },
          fail: function (res) {
            var timestamp = parseInt(new Date().getTime() / 1000);
            console.log(res + ":startBluetoothDevicesDiscoveryFail:" + timestamp)
            stopBT()
            bleStatus = BLE_STATUS_NOTINIT
            bleConnChange(-1)
          }
        })
      }
    },
    fail: function(res) {
      console.log(res)

      if (res.errCode == 10001 || res.errCode == 10000) {
        stopBT()
        bleStatus = BLE_STATUS_NOTINIT
        bleConnChange(-1)
      }
    }
  })

}

function bleStartDiscover() {
  doBleStartDiscover()
/*
  if (theDeviceId != null) {
    console.log(theDeviceId)
    connectBLE(theDeviceId);
  } else {
    doBleStartDiscover()
  }*/
}

function startBT(page,deviceName,mac) {
  btStopped = false
  thePage = page
  theDeviceName = deviceName

  {
    var mData = buffUtil.stringToByte("ac#" + deviceName)
    var dataLen = mData.length

    for (var pos = dataLen; pos < 16; pos++) {
      mData[pos] = 0
    }
    console.log(mData)

    theManufactureData = buffUtil.byteToHex(mData)
    console.log(theManufactureData)
  }

  if (mac != null) {
    theMac = "1302" + mac.toLowerCase()
  }
  resetRecvMsg()

  if (bleStatus < BLE_STATUS_INITED) {
    bleStatus = BLE_STATUS_INITING

    wx.openBluetoothAdapter({
      success: function (res) {
        console.log("openBT OK")
        console.log(res)
        bleConnChange(0)

        bleStatus = BLE_STATUS_STARTING_DISCOVER
        bleStartDiscover()
      },
      fail: function (res) {
        console.log("openBT failed")
        console.log(res)
        bleConnChange(-1)
      }
    })
  } else {
    bleStatus = BLE_STATUS_STARTING_DISCOVER
    bleStartDiscover()
  }

  wx.onBluetoothDeviceFound(function (res) {
    var devices = res.devices;
    console.dir("发现新设备"+devices)
    //console.log(devices)

    if (bleStatus == BLE_STATUS_DISCOVERING) {
      devices.forEach(function (device) {
        var strData = buffUtil.byteToHex(device.advertisData);
        console.log(strData)
        if (theDeviceName == device.name
          || strData == theManufactureData /*buffUtil.byteToHex(device.advertisData)*/) {
          bleStatus = BLE_STATUS_CONNECTING
          wx.stopBluetoothDevicesDiscovery({
            success: function (res) {
              console.log(res)
            },
          })
          connectBLE(device.deviceId)
        }
      });
    }
  })

  wx.onBLEConnectionStateChange(function (res) {
    theDeviceId = res.deviceId
    console.log(`device ${res.deviceId} state has changed, connected: ${res.connected}`)
    console.log(res)
    if (!res.connected) {
      if (bleStatus >= BLE_STATUS_CONNECTED) {
        bleConnChange(0)
        if (!btStopped) {
            bleStatus = BLE_STATUS_STARTING_DISCOVER
            bleStartDiscover()
        } else {
          bleStatus = BLE_STATUS_INITED
        }
      }
    }
  })

}

function stopBT() {
  console.log(bleStatus)
  btStopped = true
  if (bleStatus >= BLE_STATUS_CONNECTED) {
    console.log("to close connection")
    wx.closeBLEConnection({
      deviceId: theDeviceId,
      success: function(res) {
        console.log(res)
      },
      fail: function(res) {
        console.log(res)
      }
    })
  }
  if (bleStatus == BLE_STATUS_DISCOVERING
      || bleStatus == BLE_STATUS_STARTING_DISCOVER) {
    wx.stopBluetoothDevicesDiscovery({
      success: function(res) {
        console.log(res)
      },
    })
  }

  bleStatus = BLE_STATUS_INITED

/*
  if (bleStatus > BLE_STATUS_NOTINIT) {
    wx.closeBluetoothAdapter({
      success: function(res) {
        console.log(res)
      },
    })
  }

  bleStatus = BLE_STATUS_NOTINIT
*/
}

function getNextPack() {
  if (sendingMsg.buffer != null) {
    var pack = packaging.getPackage(sendingMsg.buffer, sendingMsg.serial, sendingMsg.offset)
    if (sendingMsg.offset + pack.byteLength - 1 < sendingMsg.buffer.length) {
      sendingMsg.serial++
      sendingMsg.offset += (pack.byteLength - 1)
    } else {
      sendingMsg.buffer = null
      sendingMsg.serial = 0
      sendingMsg.offset = 0
    }

    return pack
  } else {
    return null
  }
}

function getConnPack(ssid, password, encrypt) {
  var msg = message.genMessage(0x26)

  msg = message.addParam(msg, 0x1016, ssid)
  if (password != null) {
    msg = message.addParam(msg, 0x1017, password)
  }
  if (encrypt != null) {
    msg = message.addParam(msg, 0x2019, encrypt)
  }

  var pack = packaging.getPackage(msg, 0, 0)
  if (pack.byteLength - 1 < msg.length) {
    sendingMsg.buffer = msg
    sendingMsg.serial = 1
    sendingMsg.offset = pack.byteLength - 1
  }

  return pack
}

function getConnPackWithCode(ssid, password, encrypt,extra) {
  console.log("getConnPackWithCode:"+extra);
  var msg = message.genMessage(0x26)

  msg = message.addParam(msg, 0x1016, ssid)
  if (password != null) {
    msg = message.addParam(msg, 0x1017, password)
  }
  if (encrypt != null) {
    msg = message.addParam(msg, 0x2019, encrypt)
  }
  if(extra != null){
    msg = message.addParam(msg, 0x101a,extra)
  }
  var pack = packaging.getPackage(msg, 0, 0)
  if (pack.byteLength - 1 < msg.length) {
    sendingMsg.buffer = msg
    sendingMsg.serial = 1
    sendingMsg.offset = pack.byteLength - 1
  }

  return pack
}

function bleWrite(deviceId, data) {
  console.log(buffUtil.byteToHex(data))
  bleStatus = BLE_STATUS_SENDING
  wx.writeBLECharacteristicValue({
    deviceId: deviceId,
    serviceId: theService,
    characteristicId: theRX,
    value: data,
    success: function (res) {
      console.log(res)
      var pack = getNextPack()
      if (pack != null) {
        console.log("11111")
        bleWrite(deviceId, pack)
      } else if (pendingConn.ssid != null) {
        console.log("222222")
        pack = getConnPack(pendingConn.ssid, pendingConn.password, pendingConn.encrypt)
        pendingConn.ssid = null
        pendingConn.password = null
        bleWrite(deviceId, pack)
      } else {
        console.log("333333")
        bleStatus = BLE_STATUS_CONNECTED
      }
    },
    fail: function (res) {
      console.log(res)
      if (res.errCode == 10001 || res.errCode == 10000) {
        stopBT()
        bleStatus = BLE_STATUS_NOTINIT
        bleConnChange(-1)
      }
    }
  })
}

function bleWriteWithCode(deviceId, data) {
  console.log(buffUtil.byteToHex(data))
  bleStatus = BLE_STATUS_SENDING
  wx.writeBLECharacteristicValue({
    deviceId: deviceId,
    serviceId: theService,
    characteristicId: theRX,
    value: data,
    success: function (res) {
      console.log(res)
      var pack = getNextPack()
      if (pack != null) {
        console.log("11111")
        bleWrite(deviceId, pack)
      } else if (pendingConn.ssid != null) {
        console.log("222222")
        pack = getConnPack(pendingConn.ssid, pendingConn.password, pendingConn.encrypt , penddingConn.extra)
        pendingConn.ssid = null
        pendingConn.password = null
        bleWrite(deviceId, pack)
      } else {
        console.log("333333")
        bleStatus = BLE_STATUS_CONNECTED
      }
    },
    fail: function (res) {
      console.log(res)
      if (res.errCode == 10001 || res.errCode == 10000) {
        stopBT()
        bleStatus = BLE_STATUS_NOTINIT
        bleConnChange(-1)
      }
    }
  })
}

function connectWifi(ssid, password = null, encrypt = null) {
  console.log("bleSetWifi:"+ssid+":pwd:"+password)
  if (bleStatus == BLE_STATUS_SENDING) {
    pendingConn.ssid = ssid
    pendingConn.password = password
    pendingConn.encrypt = encrypt
    return
  }

  var pack = getConnPack(ssid, password, encrypt)
  bleWrite(theDeviceId, pack)
}

function connectWifiWithCode(ssid, password = null, encrypt = null, extra = null) {
  console.log("bleSetWifi:" + ssid + ":pwd:" + password + ":extra"+extra)
  if (bleStatus == BLE_STATUS_SENDING) {
    pendingConn.ssid = ssid
    pendingConn.password = password
    pendingConn.encrypt = encrypt
    pendingConn.extra = extra
    return
  }

  var pack = getConnPackWithCode(ssid, password, encrypt , extra)
  bleWriteWithCode(theDeviceId, pack)
}

function searchWifi() {
  if (bleStatus != BLE_STATUS_SENDING) {
    var msg = message.genMessage(0x24)
    console.log(buffUtil.byteToHex(msg))
    var pack = packaging.getPackage(msg, 0, 0)
    console.log(buffUtil.byteToHex(pack))

    bleWrite(theDeviceId, pack)
  }
}

module.exports = {
  startBT: startBT,
  stopBT: stopBT,
  openBle:openBle,
  connectWifi: connectWifi,
  connectWifiWithCode: connectWifiWithCode,
  searchWifi: searchWifi,
  connBle:connBle
}
