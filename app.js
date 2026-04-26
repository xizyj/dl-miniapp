//app.js
function getSystemInfoSnapshot() {
  if (
    typeof wx.getSystemSetting !== 'function' ||
    typeof wx.getAppAuthorizeSetting !== 'function' ||
    typeof wx.getDeviceInfo !== 'function' ||
    typeof wx.getWindowInfo !== 'function' ||
    typeof wx.getAppBaseInfo !== 'function'
  ) {
    return wx.getSystemInfoSync()
  }

  return {
    ...wx.getAppBaseInfo(),
    ...wx.getDeviceInfo(),
    ...wx.getWindowInfo(),
    systemSetting: wx.getSystemSetting(),
    appAuthorizeSetting: wx.getAppAuthorizeSetting()
  }
}

App({
  buf2hex: function (buffer) {
    return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('')
  },
  buf2string: function (buffer) {
    var arr = Array.prototype.map.call(new Uint8Array(buffer), x => x)
    var str = ''
    for (var i = 0; i < arr.length; i++) {
      str += String.fromCharCode(arr[i])
    }
    return str
  },
  onLaunch: function () {
    // Cache a single environment snapshot for pages that still read SystemInfo.
    this.globalData.SystemInfo = getSystemInfoSnapshot()
    //console.log(this.globalData.SystemInfo)
  },
  globalData: {
    SystemInfo: {}
  }
})