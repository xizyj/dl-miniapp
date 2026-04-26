const TOKEN_STORAGE_KEY = 'authToken'

function getStoredToken() {
  return wx.getStorageSync(TOKEN_STORAGE_KEY)
}

function setStoredToken(token) {
  wx.setStorageSync(TOKEN_STORAGE_KEY, token)
}

function getResponseData(response) {
  return response && response.data ? response.data : {}
}

function request(options) {
  const {
    url,
    method = 'GET',
    data,
    token,
    header = {},
    success,
    fail
  } = options

  const requestHeader = {
    ...header
  }

  if (token) {
    requestHeader.token = token
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

module.exports = {
  TOKEN_STORAGE_KEY,
  getStoredToken,
  setStoredToken,
  getResponseData,
  request
}