const app = getApp()
var xBlufi = require("../../utils/blufi/xBlufi.js");
var util = require("../../utils/blufi/util.js");
let _this = null;

const IOS_SCAN_RETRY_MS = 10000
const IOS_SCAN_RETRY_MAX = 2

function isIOS() {
  try {
    return wx.getSystemInfoSync().platform === 'ios'
  } catch (error) {
    return false
  }
}

function normalizeDiscoveredDevice(device) {
  if (!device || !device.deviceId) {
    return null
  }

  const displayName = util.getDeviceDisplayName(device)

  return Object.assign({}, device, {
    name: displayName,
    localName: displayName || device.localName || ''
  })
}

function mergeDeviceLists(existing, incoming) {
  const map = new Map()

  ;(existing || []).forEach((device) => {
    const normalized = normalizeDiscoveredDevice(device)
    if (normalized) {
      map.set(normalized.deviceId, normalized)
    }
  })

  ;(incoming || []).forEach((device) => {
    const normalized = normalizeDiscoveredDevice(device)
    if (!normalized) {
      return
    }

    const previous = map.get(normalized.deviceId)

    if (!previous || (normalized.RSSI || -999) > (previous.RSSI || -999)) {
      map.set(normalized.deviceId, normalized)
    }
  })

  return Array.from(map.values()).sort((left, right) => (right.RSSI || 0) - (left.RSSI || 0))
}

Page({
  data: {
    devicesList: [],
    searching: false,
    hasSearched: false,
    isIOS: false
  },
  onLoad: function(options) {
    _this = this;
    this.setData({
      isIOS: isIOS()
    })
    xBlufi.initXBlufi(1);
    console.log("xBlufi", xBlufi.XMQTT_SYSTEM)
    xBlufi.listenDeviceMsgEvent(true, this.funListenDeviceMsgEvent);

    if (options.autoSearch !== '0') {
      this.startSearch()
    }
  },
  funListenDeviceMsgEvent: function(options) {

    switch (options.type) {

     
      case xBlufi.XBLUFI_TYPE.TYPE_GET_DEVICE_LISTS:
        if (options.result) {
          // const nextList = util.filterDevice(options.data, 'DL-')
          const nextList = options.data || []
          const devicesList = mergeDeviceLists(_this.data.devicesList, nextList)

          _this.clearIOSScanRetryTimer()
          _this.setData({
            devicesList
          })

          if (devicesList.length) {
            _this.iosScanRetryCount = 0
          } else if (_this.data.searching && _this.data.isIOS) {
            _this.scheduleIOSScanRetry()
          }
        }
        break;

      case xBlufi.XBLUFI_TYPE.TYPE_CONNECTED:
        console.log("连接回调：" + JSON.stringify(options))
        if (options.result) {
          _this.clearIOSScanRetryTimer()
          wx.hideLoading()
          wx.showToast({
            title: '连接成功',
            icon: 'none'
          })
          wx.navigateTo({
            url: '../device/device?deviceId=' + options.data.deviceId + '&name=' + options.data.name,
          });

        } else {
          // wx.hideLoading()
          // wx.showModal({
          //   title: '提示',
          //   content: '连接失败',
          //   showCancel: false
          // });
        }
        break;

      case xBlufi.XBLUFI_TYPE.TYPE_GET_DEVICE_LISTS_START:
        if (!options.result) {
          console.log("蓝牙未开启 fail =》", options)
          _this.clearIOSScanRetryTimer()
          wx.showToast({
            title: '蓝牙未开启',
            icon: 'none'
          })
        } else {
          _this.setData({
            searching: true,
            hasSearched: true
          });

          if (_this.data.isIOS && !_this.data.devicesList.length) {
            _this.scheduleIOSScanRetry()
          }
        }
        break;

      case xBlufi.XBLUFI_TYPE.TYPE_GET_DEVICE_LISTS_STOP:
        if (options.result) {
          console.log('蓝牙停止搜索ok')
        } else {
          console.log('蓝牙停止搜索失败')
        }
        _this.clearIOSScanRetryTimer()
        _this.setData({
          searching: false
        });
        break;

    }
  },
  scheduleIOSScanRetry() {
    if (!this.data.isIOS || !this.data.searching) {
      return
    }

    this.clearIOSScanRetryTimer()

    if (typeof this.iosScanRetryCount !== 'number') {
      this.iosScanRetryCount = 0
    }

    if (this.iosScanRetryCount >= IOS_SCAN_RETRY_MAX) {
      return
    }

    this.iosScanRetryTimer = setTimeout(() => {
      if (!this.data.isIOS || this.data.devicesList.length) {
        return
      }

      this.iosScanRetryCount += 1
      console.log('iOS bluetooth scan retry:', this.iosScanRetryCount)

      xBlufi.notifyStartDiscoverBle({
        isStart: false
      })

      setTimeout(() => {
        if (this.data.devicesList.length) {
          return
        }

        xBlufi.notifyStartDiscoverBle({
          isStart: true
        })
      }, 400)
    }, IOS_SCAN_RETRY_MS)
  },
  clearIOSScanRetryTimer() {
    if (!this.iosScanRetryTimer) {
      return
    }

    clearTimeout(this.iosScanRetryTimer)
    this.iosScanRetryTimer = null
  },
  startSearch: function() {
    if (this.data.searching) {
      return
    }

    this.iosScanRetryCount = 0
    this.clearIOSScanRetryTimer()
    this.setData({
      devicesList: []
    })

    xBlufi.notifyStartDiscoverBle({
      'isStart': true
    })
  },
  Search: function() {
    if (this.data.searching) {
      this.clearIOSScanRetryTimer()
      xBlufi.notifyStartDiscoverBle({
        'isStart': false
      })
    } else {
      this.startSearch()
    }
  },
  Connect: function(e) {
    this.clearIOSScanRetryTimer()
    xBlufi.notifyStartDiscoverBle({
      'isStart': false
    })
    for (var i = 0; i < _this.data.devicesList.length; i++) {
      if (e.currentTarget.id === _this.data.devicesList[i].deviceId) {
        let name = _this.data.devicesList[i].name
        console.log('点击了，蓝牙准备连接的deviceId:' + e.currentTarget.id)
        xBlufi.notifyConnectBle({
          isStart: true,
          deviceId: e.currentTarget.id,
          name
        });
        wx.showLoading({
          title: '连接蓝牙设备中...',
        })
      }
    }
  },
  onUnload: function() {
    this.clearIOSScanRetryTimer()
    if (this.data.searching) {
      xBlufi.notifyStartDiscoverBle({
        'isStart': false
      })
    }
    xBlufi.notifyTeardownBluetooth()
    xBlufi.listenDeviceMsgEvent(false, this.funListenDeviceMsgEvent);
  }
});
