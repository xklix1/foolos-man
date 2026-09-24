const fs = require('fs');
let js = fs.readFileSync('admin-panel.js', 'utf8');

const oldStr = `          } else if (isUnderSuspicion) {
            statusBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce inline-block ml-1"></span>تحت الشبهة ⚠️ (الشاشة مثبتة)';
            statusBadge.className = 'text-[10px] px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/20 flex items-center';
            statusBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block ml-1"></span>محظور نهائياً ⛔';
            statusBadge.className = 'text-[10px] px-2 py-0.5 rounded font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center';
          } else if (state.jailTimer > 0) {`;

const newStr = `          } else if (isUnderSuspicion) {
            statusBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce inline-block ml-1"></span>تحت الشبهة ⚠️ (الشاشة مثبتة)';
            statusBadge.className = 'text-[10px] px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/20 flex items-center';
          } else if (state.jailTimer > 0) {`;

js = js.replace(oldStr, newStr);
fs.writeFileSync('admin-panel.js', js, 'utf8');
console.log('Successfully cleaned badge section in admin-panel.js');
