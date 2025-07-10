const { execSync } = require('child_process');
const fs = require('fs');

function getSerial() {
  try {
    const cpuinfo = fs.readFileSync('/proc/cpuinfo', 'utf8');
    const line = cpuinfo.split('\n').find(l => l.startsWith('Serial'));
    if (line) {
      const serial = line.split(':')[1].trim();
      return serial;
    }
  } catch (err) {
    console.error('Unable to read CPU serial:', err);
  }
  return '00000';
}

function generateSSID() {
  const serial = getSerial();
  const id = serial.slice(-5).toUpperCase();
  return `AirAstro-${id}`;
}

function startHotspot() {
  const ssid = generateSSID();
  const password = '123456789';
  try {
    execSync(`nmcli device wifi hotspot ifname wlan0 ssid ${ssid} password ${password}`, { stdio: 'inherit' });
  } catch (err) {
    console.error('Failed to start hotspot:', err);
    process.exit(1);
  }
}

startHotspot();
