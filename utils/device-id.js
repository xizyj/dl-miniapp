const DEVICE_ID_PREFIX = 'DL-'
const API_DEVICE_ID_PREFIX = 'MYF-'

function normalizeDeviceId(deviceId) {
  const rawDeviceId = typeof deviceId === 'string' ? deviceId.trim().toUpperCase() : ''

  if (!rawDeviceId) {
    return ''
  }

  if (rawDeviceId.startsWith(DEVICE_ID_PREFIX)) {
    return rawDeviceId
  }

  if (rawDeviceId.startsWith('MYF-')) {
    return `${DEVICE_ID_PREFIX}${rawDeviceId.slice(4)}`
  }

  const compactDeviceId = rawDeviceId.replace(/[^A-Z0-9]/g, '')

  if (!compactDeviceId) {
    return ''
  }

  return `${DEVICE_ID_PREFIX}${compactDeviceId}`
}

function toAuthApiDeviceId(deviceId) {
  const normalized = normalizeDeviceId(deviceId)

  if (!normalized) {
    return ''
  }

  if (normalized.startsWith(DEVICE_ID_PREFIX)) {
    return `${API_DEVICE_ID_PREFIX}${normalized.slice(DEVICE_ID_PREFIX.length)}`
  }

  return normalized
}

module.exports = {
  API_DEVICE_ID_PREFIX,
  DEVICE_ID_PREFIX,
  normalizeDeviceId,
  toAuthApiDeviceId
}
