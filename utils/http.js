const TOKEN_STORAGE_KEY = 'authToken'
const API_BASE_URL = 'https://aigo.8ms.xyz'
const AUTH_DEVICE_URL = `${API_BASE_URL}/auth/device`
const AUTH_DEVICE_ID = 'MYF-00011C00D5AD'

let pendingTokenPromise = null

function getStoredToken() {
  return wx.getStorageSync(TOKEN_STORAGE_KEY)
}

function setStoredToken(token) {
  wx.setStorageSync(TOKEN_STORAGE_KEY, token)
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
  const { forceRefresh = false } = options
  const storedToken = forceRefresh ? '' : getStoredToken()

  if (storedToken) {
    return Promise.resolve(storedToken)
  }

  if (pendingTokenPromise) {
    return pendingTokenPromise
  }

  pendingTokenPromise = new Promise((resolve, reject) => {
    wx.request({
      url: AUTH_DEVICE_URL,
      method: 'POST',
      header: {
        'Content-Type': 'application/json'
      },
      data: {
        deviceId: AUTH_DEVICE_ID
      },
      success: (response) => {
        const token = extractToken(response)

        console.log('auto auth response:', response)

        if (!token) {
          reject(new Error('未获取到token'))
          return
        }

        setStoredToken(token)
        resolve(token)
      },
      fail: (error) => {
        reject(error)
      }
    })
  })

  return pendingTokenPromise.then(
    (token) => {
      pendingTokenPromise = null
      return token
    },
    (error) => {
      pendingTokenPromise = null
      throw error
    }
  )
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
    data,
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
  TOKEN_STORAGE_KEY,
  buildApiUrl,
  getStoredToken,
  setStoredToken,
  ensureAuthToken,
  getResponseData,
  request
}