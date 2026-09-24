const fs = require('fs');

let js = fs.readFileSync('admin-panel.js', 'utf8');

// Replace the duplicate and declare isUnderSuspicion at the top
const target = "selectedPlayerState = state;";
const replacement = "selectedPlayerState = state;\n        const isUnderSuspicion = Boolean(state.underSuspicion || (state.state && state.state.underSuspicion));";

if (js.includes(target)) {
  js = js.replace(target, replacement);
}

// Also remove duplicate declaration on line 585
js = js.replace("const isUnderSuspicion = Boolean(state.underSuspicion || (state.state && state.state.underSuspicion));\n        if (suspicionBtn && suspicionText) {", "if (suspicionBtn && suspicionText) {");
js = js.replace("const isUnderSuspicion = Boolean(state.underSuspicion || (state.state && state.state.underSuspicion));\r\n        if (suspicionBtn && suspicionText) {", "if (suspicionBtn && suspicionText) {");

// Clean up duplicate statusBadge.innerHTML
const duplicateBadge = `            statusBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block ml-1"></span>محظور نهائياً ⛔';
            statusBadge.className = 'text-[10px] px-2 py-0.5 rounded font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center';`;

const badgeSection = `} else if (isUnderSuspicion) {
            statusBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce inline-block ml-1"></span>تحت الشبهة ⚠️ (الشاشة مثبتة)';
            statusBadge.className = 'text-[10px] px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/20 flex items-center';
            statusBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block ml-1"></span>محظور نهائياً ⛔';
            statusBadge.className = 'text-[10px] px-2 py-0.5 rounded font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center';`;

const cleanBadgeSection = `} else if (isUnderSuspicion) {
            statusBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce inline-block ml-1"></span>تحت الشبهة ⚠️ (الشاشة مثبتة)';
            statusBadge.className = 'text-[10px] px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/20 flex items-center';`;

js = js.replace(badgeSection, cleanBadgeSection);

fs.writeFileSync('admin-panel.js', js, 'utf8');
console.log('Fixed admin-panel.js successfully');
