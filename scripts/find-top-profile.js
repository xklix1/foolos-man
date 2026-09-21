const fs = require('fs');

const ui = fs.readFileSync('ui.js', 'utf8');
const uiLines = ui.split('\n');

console.log('=== SEARCHING UI.JS ===');
uiLines.forEach((l, i) => {
  const line = l.toLowerCase();
  if (line.includes('leaderboard') || line.includes('openprofile') || line.includes('inspectplayer') || line.includes('showprofile') || line.includes('modal-player-profile') || line.includes('player-card') || line.includes('top-players') || line.includes('view-top') || line.includes('renderleaderboard') || line.includes('rendertop') || line.includes('top 10') || line.includes('المتصدرين') || line.includes('قائمة الأثرياء') || line.includes('قائمة التوب')) {
    console.log(`ui.js Line ${i+1}: ${l.trim().substring(0, 120)}`);
  }
});

const html = fs.readFileSync('index.html', 'utf8');
const htmlLines = html.split('\n');
console.log('\n=== SEARCHING INDEX.HTML ===');
htmlLines.forEach((l, i) => {
  const line = l.toLowerCase();
  if (line.includes('leaderboard') || line.includes('top-players') || line.includes('view-top') || line.includes('المتصدرين') || line.includes('الأثرياء') || line.includes('التوب') || line.includes('player-profile') || line.includes('user-profile')) {
    console.log(`index.html Line ${i+1}: ${l.trim().substring(0, 120)}`);
  }
});
