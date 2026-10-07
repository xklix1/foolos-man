/**
 * Ras ALmal Tycoon — Authoritative Client Device & IP Parser
 * Extracts precise phone model, operating system, browser, and client IP.
 */

// Extensive mapping of known model codes to commercial marketing names
const KNOWN_MODELS = [
  // Samsung Galaxy S series
  { re: /SM-S928[A-Z]?/i, name: 'Samsung Galaxy S24 Ultra' },
  { re: /SM-S926[A-Z]?/i, name: 'Samsung Galaxy S24+' },
  { re: /SM-S921[A-Z]?/i, name: 'Samsung Galaxy S24' },
  { re: /SM-S918[A-Z]?/i, name: 'Samsung Galaxy S23 Ultra' },
  { re: /SM-S916[A-Z]?/i, name: 'Samsung Galaxy S23+' },
  { re: /SM-S911[A-Z]?/i, name: 'Samsung Galaxy S23' },
  { re: /SM-S908[A-Z]?/i, name: 'Samsung Galaxy S22 Ultra' },
  { re: /SM-S906[A-Z]?/i, name: 'Samsung Galaxy S22+' },
  { re: /SM-S901[A-Z]?/i, name: 'Samsung Galaxy S22' },
  { re: /SM-G998[A-Z]?/i, name: 'Samsung Galaxy S21 Ultra' },
  { re: /SM-G996[A-Z]?/i, name: 'Samsung Galaxy S21+' },
  { re: /SM-G991[A-Z]?/i, name: 'Samsung Galaxy S21' },
  { re: /SM-G990[A-Z]?/i, name: 'Samsung Galaxy S21 FE' },
  { re: /SM-G780[A-Z]?|SM-G781[A-Z]?/i, name: 'Samsung Galaxy S20 FE' },
  { re: /SM-G988[A-Z]?/i, name: 'Samsung Galaxy S20 Ultra' },
  { re: /SM-G986[A-Z]?/i, name: 'Samsung Galaxy S20+' },
  { re: /SM-G980[A-Z]?|SM-G981[A-Z]?/i, name: 'Samsung Galaxy S20' },
  { re: /SM-G975[A-Z]?/i, name: 'Samsung Galaxy S10+' },
  { re: /SM-G973[A-Z]?/i, name: 'Samsung Galaxy S10' },

  // Samsung Galaxy Note & Foldables
  { re: /SM-N986[A-Z]?/i, name: 'Samsung Galaxy Note 20 Ultra' },
  { re: /SM-N981[A-Z]?/i, name: 'Samsung Galaxy Note 20' },
  { re: /SM-N975[A-Z]?/i, name: 'Samsung Galaxy Note 10+' },
  { re: /SM-N970[A-Z]?/i, name: 'Samsung Galaxy Note 10' },
  { re: /SM-F956[A-Z]?/i, name: 'Samsung Galaxy Z Fold 6' },
  { re: /SM-F741[A-Z]?/i, name: 'Samsung Galaxy Z Flip 6' },
  { re: /SM-F946[A-Z]?/i, name: 'Samsung Galaxy Z Fold 5' },
  { re: /SM-F731[A-Z]?/i, name: 'Samsung Galaxy Z Flip 5' },
  { re: /SM-F936[A-Z]?/i, name: 'Samsung Galaxy Z Fold 4' },
  { re: /SM-F721[A-Z]?/i, name: 'Samsung Galaxy Z Flip 4' },
  { re: /SM-F926[A-Z]?/i, name: 'Samsung Galaxy Z Fold 3' },
  { re: /SM-F711[A-Z]?/i, name: 'Samsung Galaxy Z Flip 3' },

  // Samsung Galaxy A series (Extremely common in Egypt and the Middle East)
  { re: /SM-A556[A-Z]?/i, name: 'Samsung Galaxy A55 5G' },
  { re: /SM-A546[A-Z]?/i, name: 'Samsung Galaxy A54 5G' },
  { re: /SM-A536[A-Z]?/i, name: 'Samsung Galaxy A53 5G' },
  { re: /SM-A528[A-Z]?/i, name: 'Samsung Galaxy A52s 5G' },
  { re: /SM-A525[A-Z]?|SM-A526[A-Z]?/i, name: 'Samsung Galaxy A52' },
  { re: /SM-A515[A-Z]?/i, name: 'Samsung Galaxy A51' },
  { re: /SM-A505[A-Z]?/i, name: 'Samsung Galaxy A50' },
  { re: /SM-A356[A-Z]?/i, name: 'Samsung Galaxy A35 5G' },
  { re: /SM-A346[A-Z]?/i, name: 'Samsung Galaxy A34 5G' },
  { re: /SM-A336[A-Z]?/i, name: 'Samsung Galaxy A33 5G' },
  { re: /SM-A325[A-Z]?|SM-A326[A-Z]?/i, name: 'Samsung Galaxy A32' },
  { re: /SM-A256[A-Z]?/i, name: 'Samsung Galaxy A25 5G' },
  { re: /SM-A245[A-Z]?/i, name: 'Samsung Galaxy A24' },
  { re: /SM-A235[A-Z]?|SM-A236[A-Z]?/i, name: 'Samsung Galaxy A23' },
  { re: /SM-A225[A-Z]?|SM-A226[A-Z]?/i, name: 'Samsung Galaxy A22' },
  { re: /SM-A155[A-Z]?|SM-A156[A-Z]?/i, name: 'Samsung Galaxy A15' },
  { re: /SM-A145[A-Z]?|SM-A146[A-Z]?/i, name: 'Samsung Galaxy A14' },
  { re: /SM-A135[A-Z]?|SM-A137[A-Z]?/i, name: 'Samsung Galaxy A13' },
  { re: /SM-A125[A-Z]?|SM-A127[A-Z]?/i, name: 'Samsung Galaxy A12' },
  { re: /SM-A055[A-Z]?|SM-A057[A-Z]?/i, name: 'Samsung Galaxy A05 / A05s' },
  { re: /SM-A045[A-Z]?|SM-A047[A-Z]?/i, name: 'Samsung Galaxy A04 / A04s' },
  { re: /SM-A035[A-Z]?|SM-A037[A-Z]?/i, name: 'Samsung Galaxy A03 / A03s' },
  { re: /SM-A736[A-Z]?/i, name: 'Samsung Galaxy A73 5G' },
  { re: /SM-A725[A-Z]?/i, name: 'Samsung Galaxy A72' },
  { re: /SM-A715[A-Z]?/i, name: 'Samsung Galaxy A71' },

  // Samsung Galaxy M series
  { re: /SM-M536[A-Z]?/i, name: 'Samsung Galaxy M53' },
  { re: /SM-M336[A-Z]?/i, name: 'Samsung Galaxy M33' },
  { re: /SM-M146[A-Z]?/i, name: 'Samsung Galaxy M14' },

  // Samsung Galaxy Tab
  { re: /SM-X[0-9]{3}[A-Z]?/i, name: 'Samsung Galaxy Tab S' },
  { re: /SM-T[0-9]{3}[A-Z]?/i, name: 'Samsung Galaxy Tab A' },

  // Xiaomi / Redmi / POCO
  { re: /23049PCD8G/i, name: 'Xiaomi POCO F5' },
  { re: /23122PCD1G/i, name: 'Xiaomi POCO X6 Pro' },
  { re: /22011211G/i, name: 'Xiaomi POCO X4 Pro 5G' },
  { re: /M2007J20CG/i, name: 'Xiaomi POCO X3 NFC' },
  { re: /M2102J20SG/i, name: 'Xiaomi POCO X3 Pro' },
  { re: /2201116PG|2201116SG/i, name: 'Xiaomi POCO X4 Pro' },
  { re: /2201117TY|2201117PG/i, name: 'Xiaomi Redmi Note 11 Pro' },
  { re: /2312DRA50G/i, name: 'Xiaomi Redmi Note 13 Pro' },
  { re: /23124RA7EO/i, name: 'Xiaomi Redmi Note 13' },
  { re: /22101316G/i, name: 'Xiaomi Redmi Note 12 Pro' },
  { re: /23021RAAEG/i, name: 'Xiaomi Redmi Note 12' },
  { re: /2201117TG/i, name: 'Xiaomi Redmi Note 11S' },
  { re: /2201117TL/i, name: 'Xiaomi Redmi Note 11' },
  { re: /M2101K7BNY/i, name: 'Xiaomi Redmi Note 10S' },
  { re: /M2101K6G/i, name: 'Xiaomi Redmi Note 10 Pro' },
  { re: /M2101K7AG/i, name: 'Xiaomi Redmi Note 10' }
];

/**
 * Extracts accurate client IP from request headers or socket
 */
function extractClientIp(request) {
  if (!request) return '0.0.0.0';

  // Cloudflare Connecting IP
  const cfIp = request.headers && request.headers['cf-connecting-ip'];
  if (cfIp && typeof cfIp === 'string') return cfIp.trim();

  // X-Forwarded-For (first entry is real client)
  const xff = request.headers && request.headers['x-forwarded-for'];
  if (xff && typeof xff === 'string') {
    const list = xff.split(',');
    if (list.length > 0 && list[0].trim()) {
      return list[0].trim();
    }
  }

  // X-Real-IP
  const xReal = request.headers && request.headers['x-real-ip'];
  if (xReal && typeof xReal === 'string') return xReal.trim();

  // Fastify request.ip
  const rawIp = request.ip || (request.raw && request.raw.socket && request.raw.socket.remoteAddress) || '0.0.0.0';
  return String(rawIp).replace(/^::ffff:/, '').trim();
}

/**
 * Resolves iOS Device Model from screen dimensions
 */
function resolveIPhoneModel(screenStr) {
  if (!screenStr || typeof screenStr !== 'string') return 'Apple iPhone';
  const parts = screenStr.split('x').map(n => parseInt(n, 10));
  if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return 'Apple iPhone';

  const w = Math.min(parts[0], parts[1]);
  const h = Math.max(parts[0], parts[1]);

  if ((w === 430 && h === 932) || (w === 440 && h === 956)) return 'Apple iPhone 15/16 Pro Max';
  if ((w === 393 && h === 852) || (w === 402 && h === 874)) return 'Apple iPhone 15/16 Pro';
  if (w === 428 && h === 926) return 'Apple iPhone 13/14 Pro Max / Plus';
  if (w === 390 && h === 844) return 'Apple iPhone 12 / 13 / 14';
  if (w === 414 && h === 896) return 'Apple iPhone 11 / XR / XS Max';
  if (w === 375 && h === 812) return 'Apple iPhone X / XS / 11 Pro';
  if (w === 414 && h === 736) return 'Apple iPhone 6/7/8 Plus';
  if (w === 375 && h === 667) return 'Apple iPhone SE / 7 / 8';

  return 'Apple iPhone';
}

/**
 * Comprehensive parser for Client Device & User Agent
 */
function parseDeviceDetails({ userAgent = '', headers = {}, deviceInfo = {} } = {}) {
  const ua = String(userAgent || (headers && headers['user-agent']) || '').trim();
  const screen = deviceInfo && deviceInfo.screen ? String(deviceInfo.screen) : '';
  const clientModel = (deviceInfo && deviceInfo.model) || (headers && headers['sec-ch-ua-model']) || '';

  let deviceName = '';
  let category = 'mobile'; // 'mobile' | 'tablet' | 'desktop'
  let os = 'Unknown OS';
  let browser = 'Unknown Browser';
  let brand = 'Generic';

  // 1. Detect OS
  if (/Windows NT 10\.0/i.test(ua)) {
    os = 'Windows 10/11';
    category = 'desktop';
  } else if (/Windows NT 6\.3/i.test(ua)) {
    os = 'Windows 8.1';
    category = 'desktop';
  } else if (/Windows NT 6\.1/i.test(ua)) {
    os = 'Windows 7';
    category = 'desktop';
  } else if (/Macintosh|Mac OS X/i.test(ua) && !/iPhone|iPad/i.test(ua)) {
    const macMatch = ua.match(/Mac OS X (\d+[._]\d+([._]\d+)?)/i);
    os = macMatch ? `macOS ${macMatch[1].replace(/_/g, '.')}` : 'macOS';
    category = 'desktop';
  } else if (/Android (\d+(\.\d+)?)/i.test(ua)) {
    const androidMatch = ua.match(/Android (\d+(\.\d+)?)/i);
    os = androidMatch ? `Android ${androidMatch[1]}` : 'Android';
    category = /tablet|sm-t|sm-x/i.test(ua) ? 'tablet' : 'mobile';
  } else if (/iPhone OS (\d+([._]\d+)?)/i.test(ua) || /iPhone/i.test(ua)) {
    const iosMatch = ua.match(/OS (\d+([._]\d+)?)/i);
    os = iosMatch ? `iOS ${iosMatch[1].replace(/_/g, '.')}` : 'iOS';
    category = 'mobile';
  } else if (/iPad/i.test(ua)) {
    os = 'iPadOS';
    category = 'tablet';
  } else if (/Linux/i.test(ua)) {
    os = 'Linux';
    category = 'desktop';
  }

  // 2. Detect Browser
  if (/SamsungBrowser\/(\d+(\.\d+)?)/i.test(ua)) {
    const m = ua.match(/SamsungBrowser\/(\d+(\.\d+)?)/i);
    browser = `Samsung Internet ${m ? m[1].split('.')[0] : ''}`.trim();
  } else if (/Edg\/(\d+)|EdgA\/(\d+)/i.test(ua)) {
    const m = ua.match(/Edg[A]?\/(\d+)/i);
    browser = `Edge ${m ? m[1] : ''}`.trim();
  } else if (/OPR\/(\d+)|Opera/i.test(ua)) {
    const m = ua.match(/OPR\/(\d+)/i);
    browser = `Opera ${m ? m[1] : ''}`.trim();
  } else if (/Chrome\/(\d+)/i.test(ua)) {
    const m = ua.match(/Chrome\/(\d+)/i);
    browser = `Chrome ${m ? m[1] : ''}`.trim();
  } else if (/Version\/(\d+(\.\d+)?).*Safari/i.test(ua)) {
    const m = ua.match(/Version\/(\d+)/i);
    browser = `Safari ${m ? m[1] : ''}`.trim();
  } else if (/Firefox\/(\d+)/i.test(ua)) {
    const m = ua.match(/Firefox\/(\d+)/i);
    browser = `Firefox ${m ? m[1] : ''}`.trim();
  }

  // 3. Detect Specific Phone / Device Model
  // Test explicit client hint model first if present
  let rawModelStr = '';
  if (clientModel && typeof clientModel === 'string' && clientModel.trim()) {
    rawModelStr = clientModel.replace(/"/g, '').trim();
  }

  // Fallback to extracting model token from Android UA string:
  // e.g. "Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A...) AppleWebKit/..."
  if (!rawModelStr && /Android/i.test(ua)) {
    const mMatch = ua.match(/;\s*([^;)]+?)\s*(?:Build\/|\))/i);
    if (mMatch && mMatch[1]) {
      const candidate = mMatch[1].trim();
      // Exclude generic platform tokens
      if (!/^(wv|Android|Linux|Mobile|en-US|ar-EG)$/i.test(candidate)) {
        rawModelStr = candidate;
      }
    }
  }

  // Check Known Models dictionary
  if (rawModelStr) {
    for (const km of KNOWN_MODELS) {
      if (km.re.test(rawModelStr)) {
        deviceName = `${km.name} (${rawModelStr})`;
        brand = km.name.split(' ')[0];
        break;
      }
    }
  }

  // If not in known dictionary, check brand heuristics
  if (!deviceName) {
    if (rawModelStr) {
      if (/^SM-[A-Z0-9]+/i.test(rawModelStr)) {
        deviceName = `Samsung Galaxy (${rawModelStr})`;
        brand = 'Samsung';
      } else if (/Redmi|POCO|Xiaomi|2[0-9]{3}[A-Z0-9]+/i.test(rawModelStr)) {
        deviceName = `Xiaomi ${rawModelStr}`;
        brand = 'Xiaomi';
      } else if (/Pixel\s*[0-9A-Za-z\s]*/i.test(rawModelStr)) {
        deviceName = `Google ${rawModelStr}`;
        brand = 'Google';
      } else if (/CPH[0-9]+|OPPO/i.test(rawModelStr)) {
        deviceName = `OPPO ${rawModelStr}`;
        brand = 'OPPO';
      } else if (/RMX[0-9]+|Realme/i.test(rawModelStr)) {
        deviceName = `Realme ${rawModelStr}`;
        brand = 'Realme';
      } else if (/Infinix|X6[0-9]+/i.test(rawModelStr)) {
        deviceName = `Infinix ${rawModelStr}`;
        brand = 'Infinix';
      } else if (/TECNO|CK[0-9]+/i.test(rawModelStr)) {
        deviceName = `TECNO ${rawModelStr}`;
        brand = 'Tecno';
      } else if (/HUAWEI|HONOR|HMA-|VOG-|ELE-/i.test(rawModelStr)) {
        deviceName = `Huawei/Honor ${rawModelStr}`;
        brand = 'Huawei';
      } else if (/OnePlus/i.test(rawModelStr)) {
        deviceName = `OnePlus ${rawModelStr}`;
        brand = 'OnePlus';
      } else {
        deviceName = rawModelStr;
        brand = 'Android';
      }
    } else if (/iPhone/i.test(ua)) {
      deviceName = resolveIPhoneModel(screen);
      brand = 'Apple';
      category = 'mobile';
    } else if (/iPad/i.test(ua)) {
      deviceName = 'Apple iPad';
      brand = 'Apple';
      category = 'tablet';
    } else if (category === 'desktop') {
      if (/Windows/i.test(os)) {
        deviceName = 'كمبيوتر شخصي (Windows PC)';
        brand = 'Microsoft';
      } else if (/macOS/i.test(os)) {
        deviceName = 'كمبيوتر ماك (Apple Mac)';
        brand = 'Apple';
      } else {
        deviceName = 'كمبيوتر مكتبي (Desktop PC)';
        brand = 'PC';
      }
    } else {
      deviceName = 'هاتف ذكي (Mobile Device)';
      brand = 'Generic';
    }
  }

  return {
    deviceName: deviceName.trim(),
    category,
    os,
    browser,
    brand,
    rawModel: rawModelStr || null,
    screen: screen || null
  };
}

module.exports = {
  extractClientIp,
  parseDeviceDetails,
  resolveIPhoneModel
};
