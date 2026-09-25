const fs = require('fs');
let js = fs.readFileSync('admin-panel.js', 'utf8');

const targetPattern = /statusBadge\.innerHTML = '<span class="w-1\.5 h-1\.5 rounded-full bg-amber-400 animate-bounce inline-block ml-1"><\/span>تحت الشبهة ⚠️ \(الشاشة مثبتة\)';[\s\S]*?statusBadge\.className = 'text-\[10px\] px-2 py-0\.5 rounded font-bold bg-rose-500\/20 text-rose-400 border border-rose-500\/30 flex items-center';/g;

const cleanBlock = `statusBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce inline-block ml-1"></span>تحت الشبهة ⚠️ (الشاشة مثبتة)';
            statusBadge.className = 'text-[10px] px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/20 flex items-center';`;

js = js.replace(targetPattern, cleanBlock);
fs.writeFileSync('admin-panel.js', js, 'utf8');
console.log('Cleaned duplicate badge from admin-panel.js');
