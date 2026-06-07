const DEVICE_ID_PREFIX = 'DL-'

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

module.exports = {
  DEVICE_ID_PREFIX,
  normalizeDeviceId
}
