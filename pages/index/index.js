const { addDeviceActions, devices } = require('../../utils/device-home-data')
const { getStoredToken, request, setStoredToken } = require('../../utils/http')

const LOGIN_URL = 'http://penholderoneos.llm.aiha.cloud:8099/auth/device'
const BIND_DEVICE_URL = 'http://penholderoneos.llm.aiha.cloud:8099/appuser/bindDevice'
const DEVICE_ID = 'MYF-00011C00D5AD'

function showToast(title, icon = 'none') {
  wx.showToast({ title, icon })
}

// Accept token fields from both body payloads and auth headers.
function extractToken(response) {
  const responseData = response && response.data ? response.data : {}
  const nestedData = responseData && responseData.data ? responseData.data : {}
  const authorization = response && response.header ? response.header.Authorization || response.header.authorization : ''

  if (responseData.token) {
    return responseData.token
  }

  if (responseData.accessToken) {
    return responseData.accessToken
  }

  if (nestedData.token) {
    return nestedData.token
  }

  if (nestedData.accessToken) {
    return nestedData.accessToken
  }

  if (typeof authorization === 'string' && authorization) {
    return authorization.replace(/^Bearer\s+/i, '')
  }

  return ''
}

Page({
  data: {
    title: '我的设备',
    devices,
    isLoggedIn: false,
    loggingIn: false,
    bindModalVisible: false,
    bindDeviceId: '',
    bindingDevice: false,
    drawerVisible: false,
    addDeviceActions
  },

  onLoad() {
    this.restoreLoginState()
  },

  restoreLoginState() {
    this.setData({
      isLoggedIn: !!getStoredToken()
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

  requireLogin() {
    return this.data.isLoggedIn
  },

  handleLogin() {
    if (this.data.loggingIn) {
      return
    }

    this.setData({
      loggingIn: true
    })

    request({
      url: LOGIN_URL,
      method: 'POST',
      header: {
        'Content-Type': 'application/json'
      },
      data: {
        deviceId: DEVICE_ID
      },
      success: (response) => {
        const token = extractToken(response)

        console.log('miniapp enter response:', response)

        if (!token) {
          this.setData({ loggingIn: false })
          showToast('未获取到token')
          return
        }

        setStoredToken(token)
        this.setData({
          isLoggedIn: true,
          loggingIn: false,
          drawerVisible: false
        })
      },
      fail: (error) => {
        console.error('miniapp enter failed:', error)
        this.setData({ loggingIn: false })
        showToast('登录失败')
      }
    })
  },

  openAddDrawer() {
    if (!this.requireLogin()) {
      return
    }

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

  confirmBindDevice() {
    const token = getStoredToken()
    const deviceId = (this.data.bindDeviceId || '').trim()

    if (!token) {
      showToast('缺少登录token')
      return
    }

    if (!deviceId) {
      showToast('请输入设备ID')
      return
    }

    if (this.data.bindingDevice) {
      return
    }

    this.setData({
      bindingDevice: true
    })

    // The bind API reuses the login token already cached on the device.
    request({
      url: BIND_DEVICE_URL,
      method: 'POST',
      token,
      header: {
        'Content-Type': 'application/json'
      },
      data: {
        deviceId
      },
      success: (response, responseData) => {
        console.log('bind device response:', response)

        if (responseData.resultCode !== 0) {
          this.setData({ bindingDevice: false })
          showToast(responseData.resultMsg || '绑定失败')
          return
        }

        this.setData({
          bindingDevice: false,
          bindModalVisible: false,
          bindDeviceId: ''
        })

        showToast('绑定成功', 'success')
      },
      fail: (error) => {
        console.error('bind device failed:', error)
        this.setData({ bindingDevice: false })
        showToast('绑定失败')
      }
    })
  },

  noop() {},

  openDeviceDetail(event) {
    if (!this.requireLogin()) {
      return
    }

    const { deviceId } = event.currentTarget.dataset

    if (!deviceId) {
      return
    }

    wx.navigateTo({
      url: `/pages/device-detail/device-detail?deviceId=${encodeURIComponent(deviceId)}`
    })
  },

  handleActionTap(event) {
    if (!this.requireLogin()) {
      return
    }

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

    if (action === 'bind') {
      this.openBindModal()
      return
    }

    showToast('功能暂未开放')
    this.closeAddDrawer()
  }
})