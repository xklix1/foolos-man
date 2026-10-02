const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../db.js');
let content = fs.readFileSync(filePath, 'utf8');

const target = `                    // If either side shows idle or completed/claimed, prefer idle to prevent infinite loop
                    if (srvStatus === 'idle' || locStatus === 'idle' || srvTotal > locTotal || locTotal > srvTotal) {
                      if (srvPlane.status === 'in_flight' && (locStatus === 'idle' || locTotal > srvTotal)) {
                        srvPlane.status = 'idle';
                        srvPlane.currentFlight = null;
                        srvPlane.activeFlight = null;
                        shouldSyncCloud = true;
                      } else if (srvPlane.status === 'idle') {
                        // Server is already idle, keep it idle
                        srvPlane.currentFlight = null;
                        srvPlane.activeFlight = null;
                      }
                    }
                    srvPlane.totalFlights = Math.max(srvTotal, locTotal);
                    srvPlane.totalRevenue = Math.max(Number(srvPlane.totalRevenue) || 0, Number(locPlane.totalRevenue) || 0);`;

const replacement = `                    const locFlight = locPlane.activeFlight || locPlane.currentFlight;
                    const srvFlight = srvPlane.activeFlight || srvPlane.currentFlight;

                    // 1. If local plane was actively launched on a new flight (e.g. Tokyo), preserve active flight details
                    if (locStatus === 'in_flight' && locFlight && locFlight.launchTime) {
                      const srvLaunch = srvFlight ? Number(srvFlight.launchTime || 0) : 0;
                      if (Number(locFlight.launchTime) >= srvLaunch || srvStatus === 'idle') {
                        srvPlane.status = 'in_flight';
                        srvPlane.activeFlight = JSON.parse(JSON.stringify(locFlight));
                        srvPlane.currentFlight = JSON.parse(JSON.stringify(locFlight));
                        shouldSyncCloud = true;
                      }
                    }
                    // 2. If claimed/idle on either side, keep idle
                    else if (srvStatus === 'idle' || locStatus === 'idle' || srvTotal > locTotal || locTotal > srvTotal) {
                      if (srvPlane.status === 'in_flight' && (locStatus === 'idle' || locTotal > srvTotal)) {
                        srvPlane.status = 'idle';
                        srvPlane.currentFlight = null;
                        srvPlane.activeFlight = null;
                        shouldSyncCloud = true;
                      } else if (srvPlane.status === 'idle') {
                        srvPlane.currentFlight = null;
                        srvPlane.activeFlight = null;
                      }
                    }
                    srvPlane.totalFlights = Math.max(srvTotal, locTotal);
                    srvPlane.totalRevenue = Math.max(Number(srvPlane.totalRevenue) || 0, Number(locPlane.totalRevenue) || 0);`;

const normalized = content.replace(/\r\n/g, '\n');
if (normalized.includes(target)) {
  const updated = normalized.replace(target, replacement);
  fs.writeFileSync(filePath, updated, 'utf8');
  console.log('Successfully patched db.js with flight preservation logic!');
} else {
  console.error('Target block not found in db.js');
}
