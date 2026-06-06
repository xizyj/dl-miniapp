const xBlufi = require('../../utils/blufi/xBlufi.js')
const { normalizeDeviceId } = require('../../utils/device-id')
const { saveHomeDevice } = require('../../utils/device-home-data')
const { loginDevice } = require('../../utils/http')

const PROVISION_TIMEOUT_MS = 20000
const WIFI_LIST_LOADING_TIMEOUT_MS = 15000

function showModal(options) {
  wx.showModal({
    showCancel: false,
    ...options
  })
}

function getCachedPassword(ssid) {
  if (!ssid) {
    return ''
  }

  try {
    return wx.getStorageSync(ssid) || ''
  } catch (error) {
    return ''
  }
}

function normalizeWifiList(rawList, connectedSsid) {
  const map = new Map()

  ;(rawList || []).forEach((wifi) => {
    const SSID = typeof wifi.SSID === 'string' ? wifi.SSID.trim() : ''
    if (!SSID) {
      return
    }

    const signalStrength = typeof wifi.signalStrength === 'number' ? wifi.signalStrength : 0
    const existing = map.get(SSID)

    if (!existing || signalStrength > existing.signalStrength) {
      map.set(SSID, {
        SSID,
        signalStrength,
        secure: !!wifi.secure,
        connected: SSID === connectedSsid
      })
    } else if (SSID === connectedSsid) {
      existing.connected = true
    }
  })

  return Array.from(map.values()).sort((left, right) => {
    if (left.connected !== right.connected) {
      return left.connected ? -1 : 1
    }

    return right.signalStrength - left.signalStrength
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
    wifiLoading: false,
    wifiList: [],
    connectedWifiSsid: ''
  },

  onLoad(options) {
    const { deviceId = '', name = '' } = options

    this.setData({
      name,
      connectedDeviceId: deviceId
    })

    this.bindWifiListListener()

    // Register BLE listeners before triggering device initialization.
    xBlufi.listenDeviceMsgEvent(true, this.funListenDeviceMsgEvent)
    xBlufi.notifyInitBleEsp32({
      deviceId
    })

    wx.showLoading({
      title: '设备初始化中'
    })

    this.loadWifiList()
  },

  onShow() {
    if (this.hasShownOnce) {
      this.loadWifiList()
    }
    this.hasShownOnce = true
  },

  onUnload() {
    this.clearProvisionTimeout()
    this.clearWifiListLoadingTimeout()
    this.unbindWifiListListener()
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

      case xBlufi.XBLUFI_TYPE.TYPE_INIT_ESP32_RESULT:
        wx.hideLoading()
        console.log('初始化结果：', JSON.stringify(options))

        if (options.result) {
          console.log('初始化成功')
          this.setData({
            isInitOK: true
          })
          this.loadWifiList()
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

  bindWifiListListener() {
    if (this.wifiListListenerBound) {
      return
    }

    this.wifiListListenerBound = true
    this.wifiListListener = (result) => {
      this.clearWifiListLoadingTimeout()

      const connectedSsid = this.data.connectedWifiSsid
      const wifiList = normalizeWifiList(result.wifiList, connectedSsid)
      let nextSsid = this.data.ssid

      if (!nextSsid || !wifiList.some((item) => item.SSID === nextSsid)) {
        const connectedItem = wifiList.find((item) => item.connected)
        nextSsid = connectedItem ? connectedItem.SSID : (wifiList[0] ? wifiList[0].SSID : '')
      }

      this.setData({
        wifiList,
        wifiLoading: false,
        ssid: nextSsid,
        password: nextSsid ? getCachedPassword(nextSsid) : this.data.password
      })
    }

    wx.onGetWifiList(this.wifiListListener)
  },

  unbindWifiListListener() {
    if (!this.wifiListListenerBound || !this.wifiListListener) {
      return
    }

    wx.offGetWifiList(this.wifiListListener)
    this.wifiListListenerBound = false
    this.wifiListListener = null
  },

  loadWifiList() {
    if (typeof wx.startWifi !== 'function') {
      return
    }

    this.setData({
      wifiLoading: true
    })
    this.startWifiListLoadingTimeout()

    wx.startWifi({
      success: () => {
        this.ensureLocationPermission()
          .finally(() => {
            this.readConnectedWifiThenScan()
          })
      },
      fail: (error) => {
        if (error && error.errMsg && error.errMsg.indexOf('already started') !== -1) {
          this.ensureLocationPermission()
            .finally(() => {
              this.readConnectedWifiThenScan()
            })
          return
        }

        console.error('start wifi failed:', error)
        this.clearWifiListLoadingTimeout()
        this.setData({
          wifiLoading: false
        })
      }
    })
  },

  ensureLocationPermission() {
    return new Promise((resolve) => {
      if (typeof wx.getSetting !== 'function' || typeof wx.authorize !== 'function') {
        resolve()
        return
      }

      wx.getSetting({
        success: (result) => {
          if (result.authSetting['scope.userLocation']) {
            resolve()
            return
          }

          wx.authorize({
            scope: 'scope.userLocation',
            complete: resolve
          })
        },
        fail: () => {
          resolve()
        }
      })
    })
  },

  readConnectedWifiThenScan() {
    if (typeof wx.getConnectedWifi !== 'function') {
      this.requestWifiList()
      return
    }

    wx.getConnectedWifi({
      success: (result) => {
        const wifi = result && result.wifi ? result.wifi : {}
        const connectedSsid = typeof wifi.SSID === 'string' ? wifi.SSID.trim() : ''

        this.setData({
          connectedWifiSsid: connectedSsid
        })

        if (connectedSsid && !this.data.ssid) {
          this.setData({
            ssid: connectedSsid,
            password: getCachedPassword(connectedSsid)
          })
        }

        this.requestWifiList()
      },
      fail: (error) => {
        console.error('get connected wifi failed:', error)
        this.requestWifiList()
      }
    })
  },

  requestWifiList() {
    if (typeof wx.getWifiList !== 'function') {
      this.clearWifiListLoadingTimeout()
      this.setData({
        wifiLoading: false
      })
      return
    }

    wx.getWifiList({
      success: () => {},
      fail: (error) => {
        console.error('get wifi list failed:', error)
        this.clearWifiListLoadingTimeout()
        this.setData({
          wifiLoading: false
        })

        const errMsg = error && error.errMsg ? error.errMsg : ''
        if (errMsg.indexOf('iOS') !== -1 || errMsg.indexOf('ios') !== -1) {
          wx.showModal({
            title: '提示',
            content: '请在系统设置中进入 Wi-Fi 页面后再返回小程序，以便获取可用 Wi-Fi 列表',
            showCancel: false
          })
        }
      }
    })
  },

  selectWifi(event) {
    const ssid = event.currentTarget.dataset.ssid
    if (!ssid || ssid === this.data.ssid) {
      return
    }

    this.setData({
      ssid,
      password: getCachedPassword(ssid)
    })
  },

  refreshWifiList() {
    this.loadWifiList()
  },

  startWifiListLoadingTimeout() {
    this.clearWifiListLoadingTimeout()
    this.wifiListLoadingTimeoutId = setTimeout(() => {
      if (this.data.wifiLoading) {
        this.setData({
          wifiLoading: false
        })
      }
    }, WIFI_LIST_LOADING_TIMEOUT_MS)
  },

  clearWifiListLoadingTimeout() {
    if (!this.wifiListLoadingTimeoutId) {
      return
    }

    clearTimeout(this.wifiListLoadingTimeoutId)
    this.wifiListLoadingTimeoutId = null
  },

  OnClickStart() {
    if (!this.data.ssid) {
      wx.showToast({
        title: '请选择 Wi-Fi',
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
  }
})
