const { addDeviceActions, getHomeDevices, saveHomeDevice } = require('../../utils/device-home-data')
const { normalizeDeviceId } = require('../../utils/device-id')
const { buildApiUrl, ensureAuthToken, loginDevice, request } = require('../../utils/http')

const BIND_DEVICE_URL = buildApiUrl('/appuser/bindDevice')

function showToast(title, icon = 'none') {
  wx.showToast({ title, icon })
}

function extractDeviceIdFromScanResult(scanResult) {
  const rawResult = typeof scanResult === 'string' ? scanResult.trim() : ''

  if (!rawResult) {
    return ''
  }

  try {
    const parsed = JSON.parse(rawResult)

    if (parsed && typeof parsed.deviceId === 'string') {
      return normalizeDeviceId(parsed.deviceId)
    }
  } catch (error) {
    // Ignore non-JSON payloads and continue with URL/plain-text parsing.
  }

  const queryMatch = rawResult.match(/(?:^|[?&])deviceId=([^&#]+)/i)
  if (queryMatch && queryMatch[1]) {
    return normalizeDeviceId(decodeURIComponent(queryMatch[1]))
  }

  return normalizeDeviceId(rawResult)
}

Page({
  data: {
    title: '我的设备',
    devices: [],
    bindModalVisible: false,
    bindDeviceId: '',
    bindingDevice: false,
    drawerVisible: false,
    addDeviceActions
  },

  onLoad() {
    this.refreshDevices()
  },

  onShow() {
    this.refreshDevices()
  },

  refreshDevices() {
    this.setData({
      devices: getHomeDevices()
    })
  },

  setDrawerVisible(drawerVisible) {
    this.setData({
      drawerVisible
    })
  },

  setBindModalVisible(bindModalVisible) {
    this.setData({
      bindModalVisible,
      bindDeviceId: bindModalVisible ? this.data.bindDeviceId : ''
    })
  },

  openAddDrawer() {
    this.setDrawerVisible(true)
  },

  closeAddDrawer() {
    this.setDrawerVisible(false)
  },

  openBindModal() {
    this.closeAddDrawer()
    this.setData({
      bindModalVisible: true,
      bindDeviceId: ''
    })
  },

  closeBindModal() {
    if (this.data.bindingDevice) {
      return
    }

    this.setBindModalVisible(false)
  },

  handleBindDeviceIdInput(event) {
    this.setData({
      bindDeviceId: event.detail.value
    })
  },

  bindDevice(deviceId) {
    const normalizedDeviceId = normalizeDeviceId(deviceId)

    if (!normalizedDeviceId) {
      showToast('请输入设备ID')
      return
    }

    if (this.data.bindingDevice) {
      return
    }

    this.setData({
      bindingDevice: true
    })

    loginDevice(normalizedDeviceId).then(
      (token) => {
        request({
          url: BIND_DEVICE_URL,
          method: 'POST',
          token,
          header: {
            'Content-Type': 'application/json'
          },
          data: {
            deviceId: normalizedDeviceId
          },
          success: (response, responseData) => {
            console.log('bind device response:', response)

            if (responseData.resultCode !== 0) {
              this.setData({ bindingDevice: false })
              showToast(responseData.resultMsg || '绑定失败')
              return
            }

            saveHomeDevice(normalizedDeviceId)

            loginDevice(normalizedDeviceId).then(
              () => {
                this.refreshDevices()
                this.setData({
                  bindingDevice: false,
                  bindModalVisible: false,
                  bindDeviceId: '',
                  drawerVisible: false
                })
                showToast('绑定成功', 'success')
              },
              (refreshError) => {
                console.error('refresh token after bind failed:', refreshError)
                this.refreshDevices()
                this.setData({
                  bindingDevice: false,
                  bindModalVisible: false,
                  bindDeviceId: '',
                  drawerVisible: false
                })
                showToast('绑定成功，token刷新失败')
              }
            )
          },
          fail: (error) => {
            console.error('bind device failed:', error)
            this.setData({ bindingDevice: false })
            showToast('绑定失败')
          }
        })
      },
      (error) => {
        console.error('auth device failed before bind:', error)
        this.setData({ bindingDevice: false })
        showToast('设备登录失败')
      }
    )
  },

  confirmBindDevice() {
    this.bindDevice(this.data.bindDeviceId)
  },

  startScanBind() {
    if (this.data.bindingDevice) {
      return
    }

    this.closeAddDrawer()

    wx.scanCode({
      success: (result) => {
        const deviceId = extractDeviceIdFromScanResult(result.result)

        if (!deviceId) {
          showToast('未识别到设备ID')
          return
        }

        this.bindDevice(deviceId)
      },
      fail: (error) => {
        if (error && error.errMsg && error.errMsg.indexOf('cancel') !== -1) {
          return
        }

        console.error('scan device failed:', error)
        showToast('扫码失败')
      }
    })
  },

  noop() {},

  openDeviceDetail(event) {
    const { deviceId } = event.currentTarget.dataset

    if (!deviceId) {
      return
    }

    wx.navigateTo({
      url: `/pages/device-detail/device-detail?deviceId=${encodeURIComponent(deviceId)}`
    })
  },

  handleActionTap(event) {
    const { action } = event.currentTarget.dataset

    if (action === 'cancel') {
      this.closeAddDrawer()
      return
    }

    if (action === 'bluetooth') {
      this.closeAddDrawer()
      wx.navigateTo({
        url: '/pages/search/search?autoSearch=1'
      })
      return
    }

    if (action === 'scan') {
      this.startScanBind()
      return
    }

    if (action === 'bind') {
      this.openBindModal()
      return
    }

    showToast('功能暂未开放')
    this.closeAddDrawer()
  }
})