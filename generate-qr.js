const fs = require('fs');
const path = require('path');
const os = require('os');
const QRCode = require('qrcode');

// Discover local network IPv4 address, prioritizing physical adapters and ignoring virtual interfaces
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  
  // 1. Search for a physical Wi-Fi/WLAN adapter first
  for (const name of Object.keys(interfaces)) {
    const isWifi = name.toLowerCase().includes('wi-fi') || 
                   name.toLowerCase().includes('wlan') || 
                   name.toLowerCase().includes('wireless');
    if (isWifi) {
      for (const net of interfaces[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          return net.address;
        }
      }
    }
  }

  // 2. Fallback to physical interfaces, skipping VMware / VirtualBox / WSL
  for (const name of Object.keys(interfaces)) {
    const isVirtual = name.toLowerCase().includes('vmware') || 
                      name.toLowerCase().includes('virtual') || 
                      name.toLowerCase().includes('vbox') || 
                      name.toLowerCase().includes('host-only') ||
                      name.toLowerCase().includes('wsl');
    if (isVirtual) continue;

    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }

  // 3. Ultimate fallback to any active IPv4
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

async function generateQRCodes() {
  const localIp = getLocalIpAddress();
  const localhostUrl = 'http://localhost:3001';
  const mobileUrl = `http://${localIp}:3001`;

  console.log('--- QR Code Generator ---');
  console.log(`Local IP discovered: ${localIp}`);
  console.log(`Generating localhost QR for: ${localhostUrl}`);
  console.log(`Generating mobile QR for: ${mobileUrl}`);

  const outputPathLocal = path.join(__dirname, 'qrcode-localhost.png');
  const outputPathMobile = path.join(__dirname, 'qrcode-mobile.png');

  // Styling options for a premium brand appearance
  const qrOptions = {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    margin: 2,
    color: {
      dark: '#1e1b18',  // Deep dark warm charcoal brown
      light: '#f59e0b'  // Bright premium amber gold background!
    }
  };

  const qrOptionsWhiteBg = {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    margin: 2,
    color: {
      dark: '#0f0f0e',  // Dark charcoal
      light: '#ffffff'  // High-contrast clean white (best for all phone cameras)
    }
  };

  try {
    // Write high-contrast scannable QR codes
    await QRCode.toFile(outputPathLocal, localhostUrl, qrOptionsWhiteBg);
    await QRCode.toFile(outputPathMobile, mobileUrl, qrOptionsWhiteBg);

    console.log('\nSUCCESS!');
    console.log(`- Created localhost QR: ${outputPathLocal}`);
    console.log(`- Created mobile network QR: ${outputPathMobile}`);
    console.log('\nTIP: Scan the "qrcode-mobile.png" with your phone to open the app live on your Wi-Fi!');
  } catch (err) {
    console.error('Error generating QR codes:', err);
  }
}

generateQRCodes();
