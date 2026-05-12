const xBlufi = require('../../utils/blufi/xBlufi.js')
const { normalizeDeviceId } = require('../../utils/device-id')
const { saveHomeDevice } = require('../../utils/device-home-data')
const { loginDevice } = require('../../utils/http')

const PROVISION_TIMEOUT_MS = 20000

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
    ssid: '',
    connectedDeviceId: '',
    connected: true,
    isInitOK: false,
    password: '',
    bindingDevice: false,
    wifiLoading: false
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

    this.loadCurrentWifi()
  },

  onShow() {
    this.loadCurrentWifi()
  },

  onUnload() {
    this.clearProvisionTimeout()
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
        this.clearProvisionTimeout()
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

              this.bindProvisionedDevice()
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
        break

      case xBlufi.XBLUFI_TYPE.TYPE_INIT_ESP32_RESULT:
        wx.hideLoading()
        console.log('初始化结果：', JSON.stringify(options))

        if (options.result) {
          console.log('初始化成功')
          this.setData({
            isInitOK: true
          })
          this.loadCurrentWifi()
        } else {
          console.log('初始化失败')
          this.setData({
            connected: false
          })

          let initErrorMessage = '设备初始化失败'
          if (options.data && options.data.errMsg === 'service with target characteristics not found') {
            const discoveredServiceIds = options.data.discoveredServiceIds || []
            const hasCustomBusinessService = discoveredServiceIds.some((serviceId) => serviceId.indexOf('0000FD5C') === 0)

            if (hasCustomBusinessService) {
              initErrorMessage = '设备当前暴露的是业务服务FD5C，未进入BLUFI配网模式，请先让设备进入配网状态后重试'
            } else {
              initErrorMessage = '当前设备未暴露BLUFI配网特征，请确认固件已开启BLUFI并进入配网模式'
            }
          } else if (options.data && options.data.errMsg === 'read characteristic not found') {
            initErrorMessage = '当前设备缺少BLUFI读特征，无法继续蓝牙配网'
          }

          showModal({
            title: '温馨提示',
            content: initErrorMessage,
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

  loadCurrentWifi() {
    if (typeof wx.startWifi !== 'function' || typeof wx.getConnectedWifi !== 'function') {
      return
    }

    this.setData({
      wifiLoading: true
    })

    wx.startWifi({
      success: () => {
        this.readCurrentWifi()
      },
      fail: (error) => {
        if (error && error.errMsg && error.errMsg.indexOf('already started') !== -1) {
          this.readCurrentWifi()
          return
        }

        console.error('start wifi failed:', error)
        this.setData({
          wifiLoading: false
        })
      }
    })
  },

  readCurrentWifi() {
    wx.getConnectedWifi({
      success: (result) => {
        const wifi = result && result.wifi ? result.wifi : {}
        const ssid = typeof wifi.SSID === 'string' ? wifi.SSID.trim() : ''
        const cachedPassword = ssid ? wx.getStorageSync(ssid) : ''

        this.setData({
          ssid,
          password: cachedPassword || this.data.password,
          wifiLoading: false
        })
      },
      fail: (error) => {
        console.error('get connected wifi failed:', error)
        this.setData({
          wifiLoading: false,
          ssid: ''
        })
      }
    })
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
    this.startProvisionTimeout()
    xBlufi.notifySendRouterSsidAndPassword({
      ssid: this.data.ssid,
      password: this.data.password
    })
  },

  startProvisionTimeout() {
    this.clearProvisionTimeout()
    this.provisionTimeoutId = setTimeout(() => {
      wx.hideLoading()
      wx.showToast({
        title: '配网超时',
        icon: 'none'
      })
    }, PROVISION_TIMEOUT_MS)
  },

  clearProvisionTimeout() {
    if (!this.provisionTimeoutId) {
      return
    }

    clearTimeout(this.provisionTimeoutId)
    this.provisionTimeoutId = null
  },

  bindPasswordInput(event) {
    this.setData({
      password: event.detail.value
    })
  },

  bindProvisionedDevice() {
    const deviceId = normalizeDeviceId(this.data.connectedDeviceId)

    if (!deviceId || this.data.bindingDevice) {
      return
    }

    this.setData({
      bindingDevice: true
    })

    wx.showLoading({
      title: '设备登录中...',
      mask: true
    })

    loginDevice(deviceId).then(
      () => {
        saveHomeDevice(deviceId)
        wx.hideLoading()
        this.setData({
          bindingDevice: false
        })
        wx.showToast({
          title: '配网成功',
          icon: 'success'
        })
        wx.navigateBack({
          delta: 2,
          fail: () => {
            wx.reLaunch({
              url: '/pages/index/index'
            })
          }
        })
      },
      (error) => {
        console.error('device login failed after provision:', error)
        wx.hideLoading()
        this.setData({
          bindingDevice: false
        })
        wx.showToast({
          title: '设备登录失败',
          icon: 'none'
        })
      }
    )
  },

  refreshCurrentWifi() {
    this.loadCurrentWifi()
  }
})