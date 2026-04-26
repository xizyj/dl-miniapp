const xBlufi = require('../../utils/blufi/xBlufi.js')

function showModal(options) {
  wx.showModal({
    showCancel: false,
    ...options
  })
}

Page({
  data: {
    version: '2.2',
    name: '',
    index: 0,
    array: [],
    ssid: '',
    connectedDeviceId: '',
    connected: true,
    isInitOK: false,
    password: '',
    customData: ''
  },

  onLoad(options) {
    const { deviceId = '', name = '' } = options

    this.setData({
      name,
      connectedDeviceId: deviceId
    })

    // Register BLE listeners before triggering device initialization.
    xBlufi.listenDeviceMsgEvent(true, this.funListenDeviceMsgEvent)
    xBlufi.notifyInitBleEsp32({
      deviceId
    })

    wx.showLoading({
      title: '设备初始化中'
    })
  },

  onUnload() {
    console.log('unload')

    xBlufi.notifyConnectBle({
      isStart: false,
      deviceId: this.data.connectedDeviceId,
      name: this.data.name
    })
    xBlufi.listenDeviceMsgEvent(false, this.funListenDeviceMsgEvent)
  },

  funListenDeviceMsgEvent(options) {
    switch (options.type) {
      case xBlufi.XBLUFI_TYPE.TYPE_STATUS_CONNECTED:
        this.setData({
          connected: options.result
        })

        if (!options.result) {
          showModal({
            title: '很抱歉提醒你！',
            content: '小程序与设备异常断开',
            success: () => {
              wx.navigateBack({
                url: '../search/search'
              })
            }
          })
        }
        break

      case xBlufi.XBLUFI_TYPE.TYPE_CONNECT_ROUTER_RESULT:
        wx.hideLoading()

        if (!options.result) {
          showModal({
            title: '温馨提示',
            content: '配网失败，请重试'
          })
          break
        }

        if (options.data.progress === 100) {
          const ssid = options.data.ssid

          showModal({
            title: '温馨提示',
            content: `连接成功路由器【${ssid}】`,
            success: () => {
              wx.setStorage({
                key: ssid,
                data: this.data.password
              })

              if (this.data.customData) {
                // Custom payload can be sent immediately after provisioning completes.
                xBlufi.notifySendCustomData({
                  customData: this.data.customData
                })
              }
            }
          })
        }
        break

      case xBlufi.XBLUFI_TYPE.TYPE_RECIEVE_CUSTON_DATA:
        console.log('收到设备发来的自定义数据结果：', options.data)
        showModal({
          title: '收到自定义设备数据',
          content: `【${options.data}】`
        })
        break

      case xBlufi.XBLUFI_TYPE.TYPE_CONNECT_NEAR_ROUTER_LISTS:
        wx.hideLoading()

        if (!options.data.SSID) {
          break
        }

        this.setData({
          array: this.data.array.concat(options.data.SSID)
        })
        console.log(this.data.array)
        break

      case xBlufi.XBLUFI_TYPE.TYPE_INIT_ESP32_RESULT:
        wx.hideLoading()
        console.log('初始化结果：', JSON.stringify(options))

        if (options.result) {
          console.log('初始化成功')
          xBlufi.notifySendGetNearRouterSsid()
          wx.showLoading({
            title: '模组获取周围WiFi列表...'
          })
        } else {
          console.log('初始化失败')
          this.setData({
            connected: false
          })

          showModal({
            title: '温馨提示',
            content: '设备初始化失败',
            success: () => {
              wx.redirectTo({
                url: '../search/search'
              })
            }
          })
        }
        break
    }
  },

  OnClickStart() {
    if (!this.data.ssid) {
      wx.showToast({
        title: 'SSID不能为空',
        icon: 'none'
      })
      return
    }

    if (!this.data.password) {
      wx.showToast({
        title: '密码不能为空',
        icon: 'none'
      })
      return
    }

    wx.showLoading({
      title: '正在配网',
      mask: true
    })
    xBlufi.notifySendRouterSsidAndPassword({
      ssid: this.data.ssid,
      password: this.data.password
    })
  },

  bindPasswordInput(event) {
    this.setData({
      password: event.detail.value
    })
  },

  bindCustomDataInput(event) {
    this.setData({
      customData: event.detail.value
    })
  },

  bindPickerChange(event) {
    const index = event.detail.value
    const ssid = this.data.array[index]
    const password = wx.getStorageSync(ssid)

    console.log('picker发送选择改变，携带值为', index)
    console.log('ssid=>', ssid)
    console.log('password=>', password)

    this.setData({
      index,
      ssid,
      isInitOK: true,
      password: password || ''
    })
  }
})