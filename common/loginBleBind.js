const login_status_ok = 0
const login_status_fail = 1
const login_status_no_gzh = 2
var token = ""
var refreshToken = ""
var tokenUpdateTime = 0
var ddmAppId = "wx5e0fc262a322c306"
//var gzh_id = "gh_d8cbc52a7cee"
var gzh_id = ""

function load_gzh_info(page, token, encryptedData, iv) {
  console.log("load_gzh_info:" + token + ":" + encryptedData + ":" + iv);
  wx.request({
    url: "https://wx.cpec-ip.com/rest/auth/uapp_request_gzh",
    method: "POST",
    header: {
      'content-type': 'application/x-www-form-urlencoded'
    },
    data: {
      encrypted_data: encryptedData,
      iv: iv,
      token: token,
      app_id: ddmAppId,
      gzh_id: gzh_id
    },
    success: function (res) {
      console.log("load_gzh_info:" + JSON.stringify(res))
      var err = res.data.err
      console.log(JSON.stringify(res))
      if (err === 0) {
        if (res.data.devices && res.data.devices.length > 0) {
          page.loginResp(login_status_ok, res.data.devices[0], res.data)
        } else {
          page.loginResp(login_status_ok, null, res.data)
        }
      } else if (err === 38602) {
        page.loginResp(login_status_ok, null, res.data)
        resetTokenAndTime(res.data.token)
        setLocalStorage(gzh_id + "_refreshToken", res.data.refreshToken)
      } else {
        page.loginResp(login_status_fail, null, null)
      }
    },
    fail: function (res) {
      page.loginResp(login_status_fail, null, null)
    }
  })
}

function get_user_info(page, token) {
  console.log("getUserINfo:111111 token" + token);
  wx.getUserInfo({
    success: function (res) {
      console.log("getUserINfo:success" + JSON.stringify(res));
      load_gzh_info(page, token, res.encryptedData, res.iv)
    },
    fail: function (res) {
      console.log("getUserINfo:fail" + JSON.stringify(res));
      let ret = {};
      ret.token = token;
      page.loginResp(login_status_fail, null, ret)
    }
  })
}

function setLocalStorage(key, value) {
  wx.setStorageSync(key, value);
  console.log("setStorage:" + key + ":" + value);
}
function getLocalStorage(key) {

  console.log(key + "getStorage:" + wx.getStorageSync(key));
  return wx.getStorageSync(key)

}
function resetTokenAndTime(token) {
  var timestamp = parseInt(new Date().getTime() / 1000);
  setLocalStorage(gzh_id + "_token", token)
  setLocalStorage(gzh_id + "_tokenUpdateTime", timestamp);
  console.log(gzh_id + "_token" + token);
  console.log(gzh_id + "_tokenUpdateTime" + timestamp);
};
function code_verify(page, code) {
  wx.showLoading({
    title: "登录中",
    mask: true,
    success: function (res) { },
    fail: function (res) { },
    complete: function (res) { },
  })
  wx.request({
    url: "https://wx.cpec-ip.com/rest/auth/uapprequest",
    method: "POST",
    header: {
      "content-type": "application/x-www-form-urlencoded"
    },
    data: {
      app_id: ddmAppId,
      code: code,
      gzh_id: gzh_id
    },
    success: function (res) {
      console.log("code_verify:" + "app_id:" + ddmAppId + "code:" + code + ":" + JSON.stringify(res))
      var err = res.data.err;
      wx.hideLoading()
      if (err === 0) {
        if (res.data.devices && res.data.devices.length > 0) {
          page.loginResp(login_status_ok, res.data.devices[0], res.data)
          resetTokenAndTime(res.data.token)
          setLocalStorage(gzh_id + "_refreshToken", res.data.refreshToken)
        } else {
          page.loginResp(login_status_ok, null, res.data)
          resetTokenAndTime(res.data.token)
          setLocalStorage(gzh_id + "_refreshToken", res.data.refreshToken)
        }
      } else if (err === 38601) {
        console.log("code_verify:38601:" + JSON.stringify(res));
        get_user_info(page, res.data.token)
      } else if (err === 38602) {
        page.loginResp(login_status_ok, null, res.data)
        resetTokenAndTime(res.data.token)
        setLocalStorage(gzh_id + "_refreshToken", res.data.refreshToken)
      } else {
        page.loginResp(login_status_fail, null, null)
      }
    },
    fail: function (res) {
      wx.hideLoading()
      console.log(res)
    }
  })
}

function token_verify(page, token) {
  var tt = parseInt(new Date().getTime() / 1000, 10);
  console.log("token_verify:" + tt)
  // wx.showLoading({
  //   title: "登录中",
  //   mask: true,
  //   success: function (res) { },
  //   fail: function (res) { },
  //   complete: function (res) { },
  // })
  wx.request({
    url: "https://wx.cpec-ip.com/rest/auth/uappverify",
    data: {
      token: token
    },
    method: "POST",
    header: {
      "content-type": "application/x-www-form-urlencoded"
    },
    success: function (res) {
      console.log("token_verify:" + JSON.stringify(res))
      var err = res.data.err
      wx.hideLoading()
      if (err === 0) {

        if (res.data.devices && res.data.devices.length > 0) {
          resetTokenAndTime(res.data.token)
          page.loginResp(login_status_ok, res.data.devices[0], res.data)

        } else {
          page.loginResp(login_status_ok, null, res.data)
          resetTokenAndTime(res.data.token)
        }
      } else {
        //refreshToken get token
        //如果存在refreshToken,则从refreshToken中获取token
        console.log("refreshToken:" + refreshToken);
        if (refreshToken != "undefined" && refreshToken != "") {
          getTokenByrefreshToken(page, refreshToken);
        } else {
          wx.login({
            success: function (res) {
              console.log(res)
              if (res.code) {
                code_verify(page, res.code)
              }
            }
          })
        }

      }
    },
    fail: function (res) {
      wx.hideLoading()
      console.log(res)
    }
  })
}
function getTokenByrefreshToken(page, refreshToken) {
  wx.request({
    url: "https://wx.cpec-ip.com/rest/auth/uapprefreshtoken",
    data: {
      refresh_token: refreshToken
    },
    method: "POST",
    header: {
      "content-type": "application/x-www-form-urlencoded"
    },
    success: function (res) {
      console.log(res.data)
      var err = res.data.err
      if (err === 0) {
        var tt = parseInt(new Date().getTime() / 1000, 10);
        console.log("get token by refreshToken " + tt)
        token_verify(page, res.data.token)
      } else {
        wx.login({
          success: function (res) {
            console.log(res)
            if (res.code) {
              code_verify(page, res.code)
            }
          }
        })
      }
    },
    fail: function (res) {
      wx.hideLoading()
      console.log(res)
    }
  })
}

function checkUserInfo(page) {
  wx.getSetting({
    success: function (res) {
      if (res.authSetting["scope.userInfo"]) {
        account_login(page)
      } else {
        wx.showModal({
          title: '提示',
          content: '必须授权用户信息才能正常使用配网小程序',
          showCancel: true,
          success: function (res) {
            if (res.confirm) {
              reQuestUserRight(page)
            } else if (res.cancel) {
              console.log('用户点击取消')
            }
          }
        })

      }
    }
  })

}

function reQuestUserRight(page) {
  wx.openSetting({
    success: function (res) {
      console.log(JSON.stringify(res))
      if (res.authSetting["scope.userInfo"]) {
        //不需要，openSetting返回后会自动调用相应页面的onShow会自动调用登录程序
        //account_login(page)
      } else {
      }

    },
    fail: function (res) {
      console.log("fail" + JSON.stringify(res))
    }
  })
}
function account_login(page) {
  console.log("ssss" + page.data.wxRequest.gzhId + ":" + page.data.wxRequest.type);
  //使用参数来设置gzh_id
  if (page.data.wxRequest.gzhId.length>0){
    gzh_id = page.data.wxRequest.gzhId;
  }
  wx.getSystemInfo({
    success: function (res) {
      console.log(res.SDKVersion)

    }
  })
  var isFunction = typeof (wx.showLoading)
  console.log("show type of wx.showLoading:" + isFunction);
  token = getLocalStorage(gzh_id + "_token")
  tokenUpdateTime = getLocalStorage(gzh_id + "_tokenUpdateTime")
  refreshToken = getLocalStorage(gzh_id + "_refreshToken")
  if (typeof (token) == "undefined") {
    wx.login({
      success: function (res) {
        console.log(res)
        if (res.code) {
          code_verify(page, res.code)
        }
      }
    })
  } else {
    var tt = parseInt(new Date().getTime() / 1000);
    //这里的时间初步判断是否超时，一般设置3600s
    if (tt - tokenUpdateTime > 3600) {
      //如果存在refreshToken,则从refreshToken中获取token
      if (refreshToken != "undefined" && refreshToken != "") {
        getTokenByrefreshToken(page, refreshToken);
      } else {
        wx.login({
          success: function (res) {
            console.log(res)
            if (res.code) {
              code_verify(page, res.code)
            }
          }
        })
      }
    } else {
      token_verify(page, token)
    }
  }


}

module.exports = {
  account_login: account_login,
  checkUserInfo: checkUserInfo,
  login_status_ok: login_status_ok,
  login_status_fail: login_status_fail,
  login_status_no_gzh: login_status_no_gzh
}
