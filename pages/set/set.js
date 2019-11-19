//index.js
//获取应用实例
const app = getApp()

Page({
  data: { // 参与页面渲染的数据
    logs: [],
    wxRequest: {
      gzhId: '',
      type: '',
      productId:''
    },
    gzhInfoKey:'app_wx5e0fc262a322c306_gzh_info_key',
  },
  onLoad: function (options) {
    
    let key = this.data.gzhInfoKey;
    console.log("localStoragegzhInfo:"+wx.getStorageSync(key));
    if(options.gzhId){
      this.setData({
        wxRequest: options
      })
      wx.setStorageSync(key, JSON.stringify(options));
    }else{
      let temp = wx.getStorageSync(key);
          if(temp){
            temp = JSON.parse(temp);
            this.setData({
              wxRequest: temp
            })
          }

    }
    
   
    let gzhId = this.data.wxRequest.gzhId;
    var type = this.data.wxRequest.type;
    var pid = this.data.wxRequest.productId;
    if(gzhId && gzhId!=null && gzhId!=""){

      if (type == "bleBind") {
        wx.redirectTo({
          url: '/pages/bleBind/bleBind?gzhId=' + gzhId + "&type=" + type + "&productId=" + pid
        })

      } else if (type == "soundBind") {
        wx.redirectTo({
          //url: '/pages/guide_pen/guide_pen?gzhId=' + gzhId + "&type=" + type + "&productId=" + pid
          url: '/pages/soundBind/soundBind?gzhId=' + gzhId + "&type=" + type + "&productId=" + pid
        })

      } else {
        wx.redirectTo({
          url: '/pages/guide/guide'
        })
      }

    }else{
      wx.redirectTo({
        url: '/pages/guide/guide'
      })

    }

  }
})