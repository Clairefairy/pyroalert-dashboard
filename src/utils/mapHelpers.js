export function calculateDevicesCenter(devices) {
  if (!devices || devices.length === 0) return [-8.05, -34.88];

  const sumLat = devices.reduce((sum, d) => sum + d.lat, 0);
  const sumLng = devices.reduce((sum, d) => sum + d.lng, 0);

  return [sumLat / devices.length, sumLng / devices.length];
}
