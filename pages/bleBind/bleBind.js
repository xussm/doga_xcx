//index.js
//获取应用实例
const app = getApp()

var buffUtil = require('../../common/buffUtil.js')
var ble = require('../../common/bleBind.js')
var message = require('../../common/message.js')
var packaging = require('../../common/packaging.js')
var login = require('../../common/loginBleBind.js')

const WIFI_STATUS_DISCONNECT = 0
const WIFI_STATUS_CONNECTED = 1
const WIFI_STATUS_CONNECTING = 2

var WiFiListScanTimer = null
var WifiConnectTimer = null
var CheckOnlineTimer = null

const APP_STATUS_NOTLOGIN = 0
const APP_STATUS_LOGIN_FAILED = 1
const APP_STATUS_NO_DEVICE = 2
const APP_STATUS_LOGGED = 3
const APP_STATUS_BT_INIT_FAIL = 4
const APP_STATUS_BT_INIT = 5
const APP_STATUS_BT_SEARCHING = 6
const APP_STATUS_BT_CONNECTING = 7
const APP_STATUS_BT_CONNECTED = 8
const APP_STATUS_WIFI_SEARCHING = 9
const APP_STATUS_WIFI_CONNECTING = 10
const APP_STATUS_WIFI_CONNECTED = 11
function setLocalStorage(key, value) {
  wx.setStorageSync(key, value);
  console.log("setStorage:" + key + ":" + value);
}
function getLocalStorage(key) {
  console.log(key + "getStorage:" + wx.getStorageSync(key));
  return wx.getStorageSync(key)
}

Page({
  input: {
    ssid: null,
    password: null,
    encrypt: null
  },
  voiceLinkSuc: function (ssid, pwd) {
    var localList = getLocalStorage("wifiList");
    if (localList == "undefined" || localList == "") {
      localList = {}
      localList[ssid] = pwd
      var wifiList = JSON.stringify(localList)
      setLocalStorage("wifiList", wifiList)

    } else {
      localList = JSON.parse(localList)
      //localList = {}
      localList[ssid] = pwd
      var wifiList = JSON.stringify(localList)
      setLocalStorage("wifiList", wifiList)
    }
  },
  getPwdFromSsid: function (ssid) {
    var aaaa = getLocalStorage("wifiList")
    var retpwd = ""
    if (!aaaa) {
      console.log("!a");
    } else {
      aaaa = JSON.parse(aaaa)
      retpwd = aaaa[ssid]
      if (!retpwd) {
        retpwd = ""
      }
      console.log("aaaa" + retpwd);
    }
    console.log("getLocalStorage:pwdfromssid" + ssid + ":" + retpwd)
    return retpwd
  },
  nextPlay: function () {
    var soundIndex = this.data.audio.audioIndex + 1;
    if (soundIndex >= this.data.audio.audioList.length) {
      soundIndex = 0;
    }
    this.data.audio.audioIndex = soundIndex
    this.data.audio.src = this.data.audio.audioList[soundIndex]
    var nowTime = parseInt(new Date().getTime() / 1000);
    console.log(nowTime + ":" + soundIndex);
    this.audioPlay();
  },
  data: {
    appStatus: APP_STATUS_NOTLOGIN,
    isNotSupportVersion: typeof (wx.showLoading) == "undefined" ? true : false,
    modal: {
      showModal: false,
      ssid: null,
      password: null
    },
    isWaitingToType: false,
    testReturn: {
      "err": 0, "ttl": -2, "wavs": ["http://media.dandanman.com/wav_conn/w4SMgjuIQG-7ShtduAZfRA_1.mp3"]
    },
    audio: {
      poster: 'http://y.gtimg.cn/music/photo_new/T002R300x300M000003rsKF44GyaSk.jpg?max_age=2592000',
      name: '此时此刻',
      author: '许巍',
      src: '',
      audioList: [],
      audioIndex: 0,
      controls: ''
    },
    wxRequest: {
      gzhId: '',
      type: '',
      productId: '',
    },
    isAuthorized: true,//是否已经获取用户授权
    theLinkedDeviceId: null,
    ssidType: "password",
    ssidTipsWord: "显",
    showPasswordTip: false,
    deviceId: null,
    loginTtl: "",
    ssid: null,
    wifiStatus: WIFI_STATUS_DISCONNECT,
    searching: false,
    nextFocus: false,
    blueConn: 1,
    soundConn: 0,
    blueSoundConn: 0,
    showBluePage: 1,
    otherWayShow: false,
    showSoundPage: 0,
    bleList: [],
    bindCode: '',
    logoImg: "../../image/app.png",
    list: [
      {
        "ssid": "111",
        "encrypt": 1,
        "rssi": 3
      },
      {
        "ssid": "222",
        "encrypt": 0,
        "rssi": 1
      }
    ],
    getDataByDeviceId: {
    }
  },
  bleConnAgain: function () {
    console.log("bleConnAgain")
    //ble.startBT(this, this.data.deviceId)
    this.onShow();
  },
  nextInputFocus: function () {
    this.setData({
      nextFocus: true
    })
  },
  nextInputBlur: function () {
    this.setData({
      nextFocus: false
    })
  },
  hideModal: function () {
    this.setData({
      modal: {
        showModal: false,
        ssid: null
      }
    })
  },
  showLoading: function (tips) {
    wx.showLoading({
      title: tips,
      mask: true,
      success: function (res) { },
      fail: function (res) { },
      complete: function (res) { },
    })
  },
  cancelLoading: function () {

    wx.hideLoading()
  },
  connectTimeout: function () {
    this.cancelLoading()
    this.setData({
      ssid: null,
      wifiStatus: WIFI_STATUS_DISCONNECT
    })
    wx.showModal({
      content: "配置网络失败，请检查WiFi信息是否正确",
      showCancel: false,
      confirmText: "确定"
    })

  },
  connectBLE: function (event) {
    //修改流程，先要ble连接设备
    console.log("need to connect ble");
    var realDeviceId = event.currentTarget.dataset.realdeviceid;
    this.setData({
      theLinkedDeviceId: realDeviceId,
      deviceId: realDeviceId
    })
    var deviceId = event.currentTarget.dataset.deviceid;
    console.log("realDeviceId:" + realDeviceId + "&deviceId:" + deviceId);
    ble.connBle(deviceId, realDeviceId);
  },
  doWiFiConnect: function (ssid, password, encrypt) {
    this.getBindCode(ssid, password, encrypt);
  },
  doWiFiConnecting: function (ssid, password, encrypt, code) {
    //ble.connectWifi(ssid, password, encrypt)
    ble.connectWifiWithCode(ssid, password, encrypt, code)
    this.setData({
      ssid: ssid,
      wifiStatus: WIFI_STATUS_CONNECTING
    })
    if (WifiConnectTimer != null) {
      clearTimeout(WifiConnectTimer)
      WifiConnectTimer = null
    }
    //暂时改为200秒
    WifiConnectTimer = setTimeout(this.connectTimeout, 35*1000)
    //连接的时候开启checkonline
    if (CheckOnlineTimer != null) {
      clearTimeout(CheckOnlineTimer)
      CheckOnlineTimer = null
    }
    CheckOnlineTimer = setTimeout(this.checkOnline, 1000)
  },
  connectSSID: function (event) {
    //先把encrypt===0改为10000所有的都要能够输入密码
    if (event.currentTarget.dataset.encrypt === 10000) {
      this.doWiFiConnect(event.currentTarget.dataset.ssid, null, null, event.currentTarget.dataset.extra)
    } else {
      //输入密码的时候，不再轮循wifilist
      //this.pauseBleWifiScan();
      this.data.isWaitingToType = true;

      this.input.ssid = event.currentTarget.dataset.ssid
      this.input.encrypt = event.currentTarget.dataset.encrypt
      var ssid = event.currentTarget.dataset.ssid
      //console.log("currentssid:"+ssid)
      var password = this.getPwdFromSsid(ssid)
      this.input.password = password
      this.setData({
        modal: {
          showModal: true,
          ssid: event.currentTarget.dataset.ssid,
          password: password
        },
        input: {
          ssid: ssid,
          password: password
        },
        nextFocus: true
      })
    }
  },
  connectOthers: function (event) {
    this.input.ssid = null
    this.input.password = null
    this.input.encrypt = null

    this.setData({
      modal: {
        showModal: true,
        ssid: null
      }
    })
  },
  preventTouchMove: function () {
  },
  inputSSIDChange: function (event) {
    this.input.ssid = event.detail.value
    console.log(this.input.ssid)
  },
  inputPasswordChange: function (event) {
    this.input.password = event.detail.value
    this.setData({
      input: {
        password: event.detail.value,
        ssid: this.input.ssid
      }
    })
    console.log(this.input.password)
  },
  onCancel: function (event) {
    console.log(event)
    this.data.isWaitingToType = false;
    //取消后，重新搜索wifiList由于设备15秒没数据会自动断掉，所以要一直保持连接
    //this.startBleWifiScan();
    this.hideModal()
  },
  onConfirm: function (event) {
    if (this.input.ssid == null || this.input.ssid == "") {
      wx.showModal({
        content: "未输入WiFi名称",
        showCancel: false,
        confirmText: "确定"
      })
    } else {

      this.hideModal()
      //取消第二个输入框的焦点事件
      this.nextInputBlur()
      if (this.input.password == "") {
        this.input.password = null
      }
      this.doWiFiConnect(this.input.ssid, this.input.password, this.input.encrypt, this.data.bindCode)
      console.log("ssid:" + this.input.ssid + ":pwd:" + this.input.password + ":bindCode:" + this.data.bindCode)
      //如果需要在调试模式中使用，可以把下面一行注掉，以便能点击调试按钮
      //this.showLoading("连接中")
    }
  },
  timedScan: function () {
    console.log("bleSearchWifiList.....");
    ble.searchWifi()
    WiFiListScanTimer = setTimeout(this.timedScan, 6000)
    this.setData({
      appStatus: APP_STATUS_WIFI_SEARCHING
    })
  },
  startBleWifiScan: function () {
    this.timedScan();
  },
  pauseBleWifiScan: function () {
    //当用户在输入密码的时候要暂停searhing
    if (WiFiListScanTimer != null) {
      clearTimeout(WiFiListScanTimer)
      WiFiListScanTimer = null
      console.log("pause scan timer")
    }

  },
  initSsid: function () {

    var aaaa = getLocalStorage("wifiList")
    console.log("typeof:" + typeof (aaaa))
    if (!aaaa) {

    } else {
      aaaa = JSON.parse(aaaa)
      var lista = []
      for (var key in aaaa) {
        var temp = {};
        temp.ssid = key
        temp.pwd = aaaa[key]
        lista.push(temp)
      }
      lista = lista.reverse()
      console.log("ssid:" + lista[0].ssid);
      console.log("pwd:" + lista[0].pwd)
      this.setData({
        input: {
          ssid: lista[0].ssid,
          password: lista[0].pwd
        }

      })
      this.input.ssid = lista[0].ssid
      this.input.password = lista[0].pwd
    }

  },
  onHide: function () {
    console.log("。。。。。。关闭蓝牙。。。。。")
    ble.stopBT()
    if (WiFiListScanTimer != null) {
      clearTimeout(WiFiListScanTimer)
      WiFiListScanTimer = null
      console.log("clear scan timer")
    }
    if (WifiConnectTimer != null) {
      clearTimeout(WifiConnectTimer)
      WifiConnectTimer = null
    }
    this.setData({
      wifiStatus: WIFI_STATUS_DISCONNECT,
      appStatus: APP_STATUS_BT_INIT
    })
  },
  onReady: function () {
    // Do something when page ready.
    console.log("show appStatus:" + this.data.appStatus);
    if (this.data.appStatus == 3 || this.data.appStatus == 2) {
      console.log("页面加载完毕，若还未开启蓝牙搜索，则需要开启");
      setTimeout(function () { this.showOtherWay; }, 20 * 1000);
      ble.openBle(this);
    }
  },
  onShow: function () {
    console.log("。。。。。。onshow。。。。。")
    this.setData({
      wifiStatus: WIFI_STATUS_DISCONNECT,
      ssid: null,
      list: []
    })
    login.account_login(this)

  },
  showOtherWay: function () {
    console.log("showOtherWay");
    this.setData({
      otherWayShow: true,
    })
  },
  loginAgain: function () {
    this.setData({
      wifiStatus: WIFI_STATUS_DISCONNECT,
      ssid: null,
      list: []
    })
    login.checkUserInfo(this)
  },
  loginResp: function (status, deviceId, data) {
    if (status === login.login_status_ok) {

      if (deviceId) {
        this.setData({
          appStatus: APP_STATUS_LOGGED,
          //deviceId: deviceId,
          deviceId: null,
          logoImg: data.logo.logo,
          token: data.token
        })
        console.log("000start ble open ble:");
        ble.openBle(this)
        setTimeout(this.showOtherWay, 20 * 1000);
      } else {
        this.setData({
          appStatus: APP_STATUS_NO_DEVICE,
          deviceId: null,
          token: data.token
        })
        console.log("111start ble open ble:");
        ble.openBle(this)
        setTimeout(this.showOtherWay, 20 * 1000);
      }
    } else {
      wx.showToast({
        title: '登录失败',
      })
      this.setData({
        appStatus: APP_STATUS_LOGIN_FAILED,
        deviceId: null,

      })
    }
  },
  onLoad: function (options) {
    if (options.gzhId) {
      console.log("werequest:" + JSON.stringify(options));
      this.setData({
        wxRequest: options
      })
    } else {
      console.log("no options");
    }
    let that = this;
    wx.getSetting({
      success: function (res) {
        if (res.authSetting['scope.userInfo']) {
          console.log(" scope.userInfo true");
          that.setData({
            isAuthorized: true
          })
        } else {
          console.log(" scope.userInfo false");
          that.setData({
            isAuthorized: false
          })

        }
      }
    })
  },
  onUnload: function () {
  },
  startWifi: function () {
    var that = this
    wx.startWifi({
      success: function (res) {
        console.log("wxStartWifi:" + JSON.stringify(res))
        if (res.errMsg == "startWifi:ok") {
          wx.getConnectedWifi({
            success: function (res) {
              if (res.wifi) {
                var ssid = res.wifi.SSID
                that.setData({
                  input: { ssid: ssid }
                })
              }
              that.input.ssid = ssid
              console.log("wxGetConnectedWifi:" + JSON.stringify(res))
            }

          })
        }
      }
    })
  },
  sortRssi :function (obj1, obj2) {
    var val1 = obj1.RSSI;
    var val2 = obj2.RSSI;
    if (val1 < val2) {
      return 1;
    } else if (val1 > val2) {
      return -1;
    } else {
      return 0;
    }
  },
  receiveBleList: function (bleList) {
    console.log("receive:blelist");
    //bleList.sort(this.sortRssi);
    //console.log(JSON.stringify(this.data.getDataByDeviceId));
    var AAA=50;
    for (let i = 0; i < bleList.length; i++) {

      var did = bleList[i].realDeviceId;
      
      let rssi = bleList[i].RSSI;
          rssi=Math.abs(rssi);
      var distance = Math.pow(10, (rssi - AAA) / (10 * 3));
      console.log(rssi + ":rssi show:" + i);
      let distanceTips="";
      if(rssi <= 35 ){
         distanceTips="<0.2米";
      }
      if((35 < rssi) && (rssi< 50)){
         distanceTips = "<1米";
      }
      if(rssi >= 50){
         distanceTips = ">1米";   
      }
      bleList[i].distanceTips = distanceTips;
      
      //bleList[i].distance = distance.toFixed(2);
      var didInfo = this.data.getDataByDeviceId[did];
      if (didInfo) {
        bleList[i].deviceInfo = didInfo.deviceInfo;
      } else {
        this.data.getDataByDeviceId[did] = {};
        this.data.getDataByDeviceId[did].deviceInfo = { "name": "", "url": "" };
        bleList[i].deviceInfo = { "name": "", "url": "" };
        this.getInfoByDeviceId(did);
      }

    }
    
    this.setData({
      bleList: bleList,
    })
    console.log(JSON.stringify(this.data.bleList));


  },
  onBLEMsg: function (msg) {
    console.log(JSON.stringify(msg))
    switch (msg.msgId) {
      case "MSG_REPLY_AP_LIST":
        {
          var connectingSSID = null
          var status = 0

          if (msg.params.apList.length > 0 && this.data.wifiStatus != WIFI_STATUS_CONNECTING && msg.params.apList[0].status != WIFI_STATUS_DISCONNECT) {
            connectingSSID = msg.params.apList[0].ssid
            status = msg.params.apList[0].status
          }
          //如果用户正在输入密码，则后面的wifilist暂时不更新
          if (this.data.isWaitingToType) {
            console.log("isWaitimgTotype true");
          } else {
            console.log("isWaitimgTotype false");
            this.setData({
              list: msg.params.apList,
              ssid: connectingSSID,
              wifiStatus: status
            })

          }

          break
        }

      case "MSG_CONN_AP_RSP":
        {
          console.log(msg.params.status)
          if (msg.params.status == 1) {
            this.cancelLoading()
            // wx.showToast({
            //   title: '网络连接成功',
            // })
            this.setData({
              //暂时更改连接状态，等到checkonline后再更改
              //wifiStatus: msg.params.status
            })
            this.data.isWaitingToType = false;
          } else if (msg.params.status == 0) {
            this.setData({
              wifiStatus: msg.params.status
            })
            wx.showToast({
              title: '配置网络不成功',
            })
            this.data.isWaitingToType = false;
          }
          if (WifiConnectTimer != null) {
            console.log("ClearTimeout")
            clearTimeout(WifiConnectTimer)
            WifiConnectTimer = null
          }
          break

        }
    }
  },
  changeSsidType: function () {
    var nowType = this.data.showPasswordTip
    if (!nowType) {
      this.setData({
        showPasswordTip: true,
        nextFocus: true
      })
    } else {
      this.setData({
        showPasswordTip: false,
        nextFocus: true
      })

    }

  },
  showBlueConn: function () {
  },
  showSoundConn: function () {
  },
  getBindCode: function (ssid, password, encrypt) {
    var that = this
    var preCode = this.data.bindCode
    var postdata = {}
    if (preCode.length > 0) {
      postdata.token = this.data.token;
      postdata.preCode = preCode;

    } else {
      postdata.token = this.data.token;
    }
    console.log("postdata:" + JSON.stringify(postdata))
    wx.request({
      url: "https://wx.cpec-ip.com/wx/group/getWavBindCode",
      // header: {
      //   "content-type": "application/x-www-form-urlencoded"
      // },
      data: postdata,
      success: function (res) {
        var err = res.data.err
        console.log("bindCode res" + JSON.stringify(res))
        if (err === 0) {
          that.setData({
            bindCode: res.data.code
          })
          that.doWiFiConnecting(ssid, password, encrypt, res.data.code)
        } else {
          wx.showToast({
            title: res.data.msg
          })
        }
      },
      fail: function (res) {
        console.log("fail:" + JSON.stringify(res))

      }
    })
  },
  getInfoByDeviceId: function (deviceId) {
    var that = this
    var postdata = {}
    postdata.token = this.data.token;
    postdata.deviceId = deviceId;
    console.log("................+:"+JSON.stringify(postdata));
    wx.request({
      url: "https://wx.cpec-ip.com/wx/device/simpleInfo",
      //url: "https://wx.cpec-ip.com/wx/device/simpleInfo",
      // header: {
      //   "content-type": "application/x-www-form-urlencoded"
      // },
      data: postdata,
      success: function (res) {
        console.log("................+:" + JSON.stringify(postdata));
        console.log("gggget:" + JSON.stringify(res));
        if (res.data.err == 0) {
          //that.data.getDataByDeviceId[deviceId]={};
          that.data.getDataByDeviceId[deviceId].deviceInfo = res.data.info;
          that.setLogoByDeviceId(deviceId, res.data.info);
        }
      },
      fail: function (res) {
        console.log("fail:" + JSON.stringify(res))

      }
    })
  },
  setLogoByDeviceId: function (deviceId, info) {
    var arr = this.data.bleList;
    for (var i = 0; i < arr.length; i++) {
      if (arr[i].realDeviceId == deviceId) {
        arr[i].deviceInfo = info;
        console.log("....:" + deviceId + "show:" + JSON.stringify(this.data.bleList[i]));
        this.setData({
          bleList: arr
        })
      }

    }

  },
  checkOnline: function () {
    console.log("online:check:" + this.input.ssid)
    console.log(this.data.bindCode + ":" + this.data.token)
    var checkSsid = this.input.ssid
    var checkPwd = this.input.password
    var that = this
    wx.request({
      url: "https://wx.cpec-ip.com/wx/group/pollWavBindCode",
      header: {
        "content-type": "application/x-www-form-urlencoded"
      },
      data: {
        token: this.data.token,
        code: this.data.bindCode
      },
      success: function (res) {
        console.log("success_checkonline_getdata:" + JSON.stringify(res))
        //var ret = res.data.online;
        var ret = res.data.online
        if (ret === 'on') {
          wx.hideLoading()
          wx.showToast({
            title: '配置网络成功',
          })
          that.voiceLinkSuc(that.input.ssid, that.input.password)
          that.setData({
            deviceConned: true,
            wifiStatus: 1
          })
          that.data.deviceConned = true
          //that.historyBack()
          //that.onHide()
          if (CheckOnlineTimer != null) {
            clearTimeout(CheckOnlineTimer)
            CheckOnlineTimer = null
          }
          if (WifiConnectTimer != null) {
            clearTimeout(WifiConnectTimer)
            WifiConnectTimer = null
          }
        } else if (ret === 'off') {
          that.checkOnline()
        }
      },
      fail: function (res) {
        //wx.hideLoading()
        console.log("check_online_fail:" + JSON.stringify(res))
        that.checkOnline()

      }
    })
  },
  onBLEStatusChange: function (status) {
    //0:searching, 1: connecting, 2: connected
    console.log("bleStatusChange:" + status)
    if (status == 2) {
      if (WiFiListScanTimer != null) {
        clearTimeout(WiFiListScanTimer)
      }
      WiFiListScanTimer = setTimeout(this.timedScan, 500)
      this.setData({
        appStatus: APP_STATUS_BT_CONNECTED,
        deviceId: this.theLinkedDeviceId,
      })
      //this.timedScan()
    } else if (status == 1) {
      clearTimeout(WiFiListScanTimer)
      WiFiListScanTimer = null
      this.setData({
        appStatus: APP_STATUS_BT_CONNECTING
      })
    } else if (status == 0) {
      WiFiListScanTimer = null
      this.setData({
        appStatus: APP_STATUS_BT_SEARCHING
      })
      console.log("appStatus:" + this.data.appStatus);

    } else {
      this.setData({
        appStatus: APP_STATUS_BT_INIT_FAIL,
        ssid: null,
        wifiStatus: WIFI_STATUS_DISCONNECT
      })
    }
  },
  getUserInfo: function (e) {
    console.log(e)
    app.globalData.userInfo = e.detail.userInfo
    this.setData({
      isAuthorized: true,
      userInfo: e.detail.userInfo,
      hasUserInfo: true,
    })
    this.onShow();
  }
})
