const TOKEN_STORAGE_KEY = 'authToken'
const AUTH_DEVICE_ID_STORAGE_KEY = 'authDeviceId'
const API_BASE_URL = 'https://aigo.8ms.xyz/api'
const AUTH_DEVICE_URL = `${API_BASE_URL}/auth/device`
const { toApiDeviceId } = require('./device-id')

let pendingTokenPromise = null
let pendingTokenDeviceId = ''

function mapApiRequestData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return data
  }

  const mapped = Object.assign({}, data)

  if (typeof mapped.deviceId === 'string' && mapped.deviceId) {
    mapped.deviceId = toApiDeviceId(mapped.deviceId)
  }

  return mapped
}

function buildDeviceApiUrl(baseUrl, deviceId) {
  if (!baseUrl || !deviceId) {
    return baseUrl
  }

  return `${baseUrl}/${encodeURIComponent(toApiDeviceId(deviceId))}`
}

function encodeApiDeviceId(deviceId) {
  return encodeURIComponent(toApiDeviceId(deviceId))
}

function getStoredToken() {
  return wx.getStorageSync(TOKEN_STORAGE_KEY)
}

function setStoredToken(token) {
  wx.setStorageSync(TOKEN_STORAGE_KEY, token)
}

function getStoredAuthDeviceId() {
  return wx.getStorageSync(AUTH_DEVICE_ID_STORAGE_KEY)
}

function setStoredAuthDeviceId(deviceId) {
  if (!deviceId) {
    wx.removeStorageSync(AUTH_DEVICE_ID_STORAGE_KEY)
    return
  }

  wx.setStorageSync(AUTH_DEVICE_ID_STORAGE_KEY, deviceId)
}

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

function ensureAuthToken(options = {}) {
  const { forceRefresh = false, deviceId = '' } = options
  const requestedDeviceId = typeof deviceId === 'string' ? deviceId.trim() : ''
  const storedDeviceId = getStoredAuthDeviceId()
  const resolvedDeviceId = requestedDeviceId || storedDeviceId
  const shouldReuseStoredToken = !forceRefresh && (!requestedDeviceId || requestedDeviceId === storedDeviceId)
  const storedToken = shouldReuseStoredToken ? getStoredToken() : ''

  if (!resolvedDeviceId) {
    return Promise.reject(new Error('未找到可用设备ID'))
  }

  if (storedToken) {
    return Promise.resolve(storedToken)
  }

  if (pendingTokenPromise && pendingTokenDeviceId === resolvedDeviceId && !forceRefresh) {
    return pendingTokenPromise
  }

  const tokenPromise = new Promise((resolve, reject) => {
    wx.request({
      url: AUTH_DEVICE_URL,
      method: 'POST',
      header: {
        'Content-Type': 'application/json'
      },
      data: {
        deviceId: toApiDeviceId(resolvedDeviceId)
      },
      success: (response) => {
        const token = extractToken(response)

        console.log('auto auth response:', response)

        if (!token) {
          reject(new Error('未获取到token'))
          return
        }

        setStoredAuthDeviceId(resolvedDeviceId)
        setStoredToken(token)
        resolve(token)
      },
      fail: (error) => {
        reject(error)
      }
    })
  })

  pendingTokenPromise = tokenPromise
  pendingTokenDeviceId = resolvedDeviceId

  return tokenPromise.then(
    (token) => {
      if (pendingTokenPromise === tokenPromise) {
        pendingTokenPromise = null
        pendingTokenDeviceId = ''
      }
      return token
    },
    (error) => {
      if (pendingTokenPromise === tokenPromise) {
        pendingTokenPromise = null
        pendingTokenDeviceId = ''
      }
      throw error
    }
  )
}

function loginDevice(deviceId) {
  return ensureAuthToken({
    forceRefresh: true,
    deviceId
  })
}

function getResponseData(response) {
  return response && response.data ? response.data : {}
}

function buildApiUrl(path) {
  if (!path) {
    return API_BASE_URL
  }

  if (/^https?:\/\//.test(path)) {
    return path
  }

  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

function sendRequest(options, resolvedToken) {
  const {
    url,
    method = 'GET',
    data,
    header = {},
    success,
    fail
  } = options

  const requestHeader = {
    ...header
  }

  if (resolvedToken) {
    requestHeader.token = resolvedToken
  }

  wx.request({
    url,
    method,
    data: mapApiRequestData(data),
    header: requestHeader,
    success: (response) => {
      if (success) {
        success(response, getResponseData(response))
      }
    },
    fail
  })
}

function request(options) {
  const {
    token,
    withAuth = false,
    fail
  } = options

  if (withAuth) {
    ensureAuthToken().then(
      (resolvedToken) => {
        sendRequest(options, token || resolvedToken)
      },
      (error) => {
        if (fail) {
          fail(error)
        }
      }
    )
    return
  }

  sendRequest(options, token)
}

module.exports = {
  API_BASE_URL,
  AUTH_DEVICE_ID_STORAGE_KEY,
  TOKEN_STORAGE_KEY,
  buildApiUrl,
  buildDeviceApiUrl,
  encodeApiDeviceId,
  getStoredAuthDeviceId,
  getStoredToken,
  loginDevice,
  setStoredAuthDeviceId,
  setStoredToken,
  ensureAuthToken,
  getResponseData,
  request
}