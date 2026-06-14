const web = require('../web.js');

const pageShell = ({ active, title, subtitle, body, boot = {} }) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} | VOID MD</title>
  <style>
    :root { --bg: #07111d; --panel: rgba(12, 19, 32, 0.9); --text: #eff5ff; --accent: #77e0c1; }
    body { margin: 0; background: var(--bg); color: var(--text); font-family: sans-serif; }
    .app { display: grid; grid-template-columns: 260px 1fr; min-height: 100vh; }
    .sidebar { padding: 20px; border-right: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); }
    .main { padding: 40px; }
    .nav-link { display: block; padding: 10px; color: #9fb0cf; text-decoration: none; border-radius: 8px; margin-bottom: 5px; }
    .nav-link.active { background: var(--accent); color: #000; font-weight: bold; }
    .cmd-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 15px; margin-top: 20px; }
    .cmd-card { padding: 15px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; cursor: pointer; text-align: center; }
    .cmd-card:hover { background: rgba(255,255,255,0.1); border-color: var(--accent); }
    .modal { position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: none; place-items: center; z-index: 100; }
    .modal-content { background: var(--panel); padding: 30px; border-radius: 20px; border: 1px solid var(--accent); width: min(450px, 90%); }
    .field { margin-bottom: 15px; }
    input, select, textarea { width: 100%; padding: 10px; background: #000; border: 1px solid #444; color: #fff; border-radius: 8px; box-sizing: border-box; }
    .btn { background: var(--accent); color: #000; padding: 10px 20px; border: 0; border-radius: 8px; font-weight: bold; cursor: pointer; width: 100%; }
    h2.cat { color: var(--accent); border-bottom: 1px solid #333; padding-bottom: 10px; margin-top: 40px; }
  </style>
</head>
<body>
  <div class="app">
    <aside class="sidebar"><h3>VOID MD</h3><nav>${web.NAV.map(n => `<a class="nav-link ${n.href === active ? 'active' : ''}" href="${n.href}">${n.label}</a>`).join('')}</nav></aside>
    <main class="main"><h1>${title}</h1><p>${subtitle}</p>${body}</main>
  </div>
  <div class="modal" id="modal"><div class="modal-content" id="mContent"></div></div>
  <script>
    window.__BOOT = ${JSON.stringify(boot)};
    const modal = document.getElementById('modal');
    const mContent = document.getElementById('mContent');

    async function openCmd(slug) {
      const res = await fetch('/api/command/info?slug=' + slug);
      const cmd = await res.json();
      let html = '<h3>Execute .' + cmd.name + '</h3>';
      if (cmd.fields.length) {
        cmd.fields.forEach(f => {
          html += '<div class="field"><label>' + f.label + '</label>';
          if (f.type === 'select') {
            html += '<select data-f="' + f.name + '">' + f.options.map(o => '<option value="' + o + '">' + o + '</option>').join('') + '</select>';
          } else if (f.type === 'textarea') {
            html += '<textarea data-f="' + f.name + '" rows="3"></textarea>';
          } else {
            html += '<input type="' + f.type + '" data-f="' + f.name + '" />';
          }
          html += '</div>';
        });
      } else { html += '<p>No extra inputs needed for this command.</p>'; }
      html += '<button class="btn" onclick="runCmd(\\'' + slug + '\\')">Send Command</button>';
      html += '<button style="background:transparent;color:#fff;margin-top:10px;border:0;cursor:pointer" onclick="closeM()">Cancel</button>';
      mContent.innerHTML = html; modal.style.display = 'grid';
    }

    function closeM() { modal.style.display = 'none'; }
    window.onclick = e => { if(e.target == modal) closeM(); }

    async function runCmd(slug) {
      const inputs = {};
      mContent.querySelectorAll("[data-f]").forEach(i => { inputs[i.dataset.f] = i.value; });
      const res = await fetch('/api/command/execute', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, target: window.__BOOT.target, inputs })
      });
      const d = await res.json();
      if (d.ok) { alert('Success!'); closeM(); } else { alert('Error: ' + d.error); }
    }
  </script>
</body></html>`;

const commandPage = (target, categories) => {
  const body = categories.map(cat => `
    <h2 class="cat">${cat.title}</h2>
    <div class="cmd-grid">
      ${cat.commands.map(c => `<div class="cmd-card" onclick="openCmd('${c.slug}')"><strong>.${c.name}</strong></div>`).join('')}
    </div>
  `).join('');
  return pageShell({ active: '/commands', title: 'Command Center', subtitle: 'Managing: ' + target, boot: { target }, body });
};

const homePage = () => pageShell({ active: '/', title: 'Overview', body: '<h3>Select a module from the sidebar to begin.</h3>' });

module.exports = { commandPage, homePage };