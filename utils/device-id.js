function normalizeDeviceId(deviceId) {
  const rawDeviceId = typeof deviceId === 'string' ? deviceId.trim().toUpperCase() : ''

  if (!rawDeviceId) {
    return ''
  }

  if (rawDeviceId.startsWith('MYF-')) {
    return rawDeviceId
  }

  const compactDeviceId = rawDeviceId.replace(/[^A-Z0-9]/g, '')

  if (!compactDeviceId) {
    return ''
  }

  return `MYF-${compactDeviceId}`
}

module.exports = {
  normalizeDeviceId
}