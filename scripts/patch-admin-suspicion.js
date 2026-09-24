const fs = require('fs');

// 1. Patch hq-vault-982-x3k8m7q.html
let html = fs.readFileSync('hq-vault-982-x3k8m7q.html', 'utf8');
const fbBtnStr = 'id="btn-admin-toggle-facebook"';
if (html.includes(fbBtnStr) && !html.includes('btn-admin-toggle-suspicion-lock')) {
  const replacement = `id="btn-admin-toggle-suspicion-lock" class="w-full py-2 bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-lg text-xs font-black transition flex items-center justify-center gap-1.5 shadow-lg shadow-orange-500/20 cursor-pointer">
                    <i class="fa-solid fa-triangle-exclamation text-xs animate-bounce"></i>
                    <span id="admin-toggle-suspicion-text">تثبيت شاشة (حسابك تحت الشبهة) ⚠️</span>
                  </button>
                  <button ${fbBtnStr}`;
  html = html.replace(`<button ${fbBtnStr}`, `<button ${replacement}`);
  fs.writeFileSync('hq-vault-982-x3k8m7q.html', html, 'utf8');
  console.log('1. Patched hq-vault-982-x3k8m7q.html successfully.');
} else {
  console.log('1. hq-vault already has button or target not found.');
}
