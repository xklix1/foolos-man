const fs = require('fs');

const path = 'ui.js';
let code = fs.readFileSync(path, 'utf8');

const target1 = "} else if (tabId ==='industry') {\n      renderIndustryPanel();";
const replace1 = "} else if (tabId ==='industry') {\n      renderIndustryPanel();\n    } else if (tabId ==='airport') {\n      if (window.AirportUI && typeof window.AirportUI.renderAirportPanel === 'function') {\n        window.AirportUI.renderAirportPanel();\n      }";

const target2 = "case'industry':\n        renderIndustryPanel();\n        break;";
const replace2 = "case'industry':\n        renderIndustryPanel();\n        break;\n      case'airport':\n        if (window.AirportUI && typeof window.AirportUI.renderAirportPanel === 'function') {\n          window.AirportUI.renderAirportPanel();\n        }\n        break;";

const normalized = code.replace(/\r\n/g, '\n');
if (normalized.includes(target1) && normalized.includes(target2)) {
  const updated = normalized.replace(target1, replace1).replace(target2, replace2);
  fs.writeFileSync(path, updated, 'utf8');
  console.log('ui.js updated successfully with airport integration!');
} else {
  console.error('Target blocks not matched in ui.js');
}
