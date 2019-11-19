//index.js

//获取应用实例
const app = getApp()





Page({
  onReady: function (e) {
    // 使用 wx.createAudioContext 获取 audio 上下文 context
    this.audioCtx = wx.createAudioContext('myAudio')
    wx.navigateBack({ delta: 1 })
  },
  data: {
      token:'',
  },
  onLoad:function(){
    wx.navigateBack({delta:1})
  },
  goSoundBindPage:function(){
    wx.redirectTo({
      url: '/pages/guide_pen/guide_pen'
      
    })
  },
  goBlePage:function(){
    wx.redirectTo({
      url: '/pages/guide_story/guide_story'
    })
  },
  goSoundPage: function () {
    wx.redirectTo({
      url: '/pages/sound/sound'
    })
  },
  backToWx:function(){
    wx.navigateBack()

  },
  scanQrcode:function(){
    let that=this;
    wx.scanCode({
      onlyFromCamera: true,
      success: (res) => {
        console.log(res)
        that.devBind(res.result,that.data.token);
      }
    })

  },
  devBind:function(qrcode,token){
    let postCode = encodeURIComponent(qrcode);
    let paraItem = "token=" + token + "&qrcode=" + postCode;
    wx.request({
      url: "https://wx.cpec-ip.com/wx/device/bind/qrcode"+paraItem,
      method: "POST",
      header: {
        'content-type': 'application/x-www-form-urlencoded'
      },
      data: {

      },
      success: function (res) {
        console.log("bindInfo"+JSON.stringify(res))
      },
      fail: function (res) {
        //page.loginResp(login_status_fail, null, null)
      }
    })

  }
 
  
})
