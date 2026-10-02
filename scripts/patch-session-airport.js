const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../server/src/services/session-manager.js');
let content = fs.readFileSync(filePath, 'utf8');

const target = `    // Agro Farm Tycoon (Officially open to all players)
    if (clientState.farm && typeof clientState.farm === 'object') {
      s.farm = clientState.farm;
    }`;

const airportBlock = `    // Agro Farm Tycoon (Officially open to all players)
    if (clientState.farm && typeof clientState.farm === 'object') {
      s.farm = clientState.farm;
    }

    // International Airport Hub & Fleet Synchronization
    if (clientState.airport && typeof clientState.airport === 'object') {
      if (!s.airport || typeof s.airport !== 'object' || !s.airport.unlocked) {
        if (clientState.airport.unlocked) {
          s.airport = JSON.parse(JSON.stringify(clientState.airport));
        }
      } else {
        if (clientState.airport.name) s.airport.name = clientState.airport.name;
        if (clientState.airport.facilities) {
          s.airport.facilities = s.airport.facilities || { runway: 1, terminals: 1, hangar: 1, duty_free: 0 };
          ['runway', 'terminals', 'hangar', 'duty_free'].forEach(k => {
            const cLvl = Number(clientState.airport.facilities[k]) || 0;
            const sLvl = Number(s.airport.facilities[k]) || 0;
            if (cLvl > sLvl) s.airport.facilities[k] = cLvl;
          });
        }
        if (Array.isArray(clientState.airport.fleet)) {
          if (!Array.isArray(s.airport.fleet) || s.airport.fleet.length === 0) {
            s.airport.fleet = JSON.parse(JSON.stringify(clientState.airport.fleet));
          } else {
            const srvMap = new Map();
            s.airport.fleet.forEach(p => srvMap.set(p.id, p));

            clientState.airport.fleet.forEach(cPlane => {
              const sPlane = srvMap.get(cPlane.id);
              if (sPlane) {
                const cFlight = cPlane.activeFlight || cPlane.currentFlight;
                const sFlight = sPlane.activeFlight || sPlane.currentFlight;
                if (cPlane.status === 'in_flight' && cFlight && cFlight.launchTime) {
                  const sLaunch = sFlight ? Number(sFlight.launchTime || 0) : 0;
                  if (Number(cFlight.launchTime) >= sLaunch || sPlane.status === 'idle') {
                    sPlane.status = 'in_flight';
                    sPlane.activeFlight = JSON.parse(JSON.stringify(cFlight));
                    sPlane.currentFlight = JSON.parse(JSON.stringify(cFlight));
                  }
                } else if (cPlane.status === 'idle') {
                  if (sPlane.status === 'in_flight') {
                    sPlane.status = 'idle';
                    sPlane.activeFlight = null;
                    sPlane.currentFlight = null;
                  }
                }
                sPlane.totalFlights = Math.max(Number(sPlane.totalFlights) || 0, Number(cPlane.totalFlights) || 0);
                sPlane.totalRevenue = Math.max(Number(sPlane.totalRevenue) || 0, Number(cPlane.totalRevenue) || 0);
              }
            });
          }
        }
        if (clientState.airport.stats) {
          s.airport.stats = s.airport.stats || {};
          ['totalFlights', 'totalRevenue', 'totalOperatingCost', 'totalNetProfit', 'totalDutyFreeCollected', 'transitPermitsAccepted'].forEach(statK => {
            s.airport.stats[statK] = Math.max(Number(s.airport.stats[statK]) || 0, Number(clientState.airport.stats[statK]) || 0);
          });
        }
      }
    }`;

const normalized = content.replace(/\r\n/g, '\n');
if (normalized.includes(target)) {
  const updated = normalized.replace(target, airportBlock);
  fs.writeFileSync(filePath, updated, 'utf8');
  console.log('Successfully patched session-manager.js with airport sync!');
} else {
  console.error('Target not found in session-manager.js');
}
