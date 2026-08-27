/* JARVIS Core 2 — Entity & HUD card manager */
(() => {
  const KEY = 'jarvis-core2-hud-layout-v1';
  const CATEGORIES = [
    ['Éclairage', ['light.']], ['Climat', ['climate.', 'humidifier.', 'fan.']],
    ['Prises & interrupteurs', ['switch.']], ['Portes & fenêtres', ['binary_sensor.']],
    ['Volets & stores', ['cover.']], ['Multimédia', ['media_player.']],
    ['Musique', ['music_assistant.']], ['Caméras', ['camera.']],
    ['Énergie', ['sensor.', 'number.', 'input_number.']], ['Eau', ['water_heater.']],
    ['Jardin', ['lawn_mower.', 'valve.']], ['Piscine', ['pool.']],
    ['Véhicules', ['device_tracker.', 'car.']], ['Maison', ['input_boolean.', 'input_select.', 'input_text.']],
    ['Sécurité', ['alarm_control_panel.', 'lock.']], ['Assistants', ['conversation.', 'assist_satellite.']],
    ['Autres', []]
  ];

  const category = id => {
    const c = CATEGORIES.find(([name, prefixes]) => prefixes.length && prefixes.some(p => id.startsWith(p)));
    return c ? c[0] : 'Autres';
  };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function mount(host) {
    if (!host?.shadowRoot || host.shadowRoot.getElementById('jarvis-entity-manager')) return;
    const root = host.shadowRoot;
    const grid = root.querySelector('.grid');
    if (!grid) return;

    const panel = document.createElement('section');
    panel.className = 'card';
    panel.id = 'jarvis-entity-manager';
    panel.style.gridColumn = '1/-1';
    panel.innerHTML = `
      <div class="title">🧩 ENTITÉS & CARTES JARVIS</div>
      <div class="jem-tabs"><button id="jemEntities">ENTITÉS</button><button id="jemCards">CARTES</button></div>
      <div id="jemEntityView">
        <input id="jemSearch" class="jemInput" placeholder="🔎 Rechercher une entité..." autocomplete="off">
        <select id="jemEntitySelect" class="jemSelect"><option>Chargement des entités…</option></select>
        <div id="jemEntityInfo" class="jemInfo">Sélectionne une entité.</div>
        <button id="jemRefresh">↻ ACTUALISER LES ENTITÉS</button>
      </div>
      <div id="jemCardView" hidden>
        <div id="jemCardsList"></div>
        <div class="jemInfo">Active/désactive une carte et utilise ↑ ↓ pour choisir son ordre.</div>
      </div>`;
    grid.appendChild(panel);

    const style = document.createElement('style');
    style.textContent = `
      #jarvis-entity-manager{position:relative}
      .jem-tabs{display:flex;gap:7px;margin-bottom:9px}.jem-tabs button{margin:0;min-height:36px}
      .jemInput,.jemSelect{width:100%;min-height:40px;margin-top:7px;padding:8px;border:1px solid #00cfff55;border-radius:7px;background:#0009;color:#dffaff;font-size:11px;outline:none}
      .jemSelect optgroup{background:#031322;color:#79bfd8}.jemSelect option{background:#031322;color:#dffaff}
      .jemInfo{margin-top:8px;padding:9px;background:#0008;border-radius:7px;color:#8bd6ea;font:10px monospace;text-align:left;min-height:18px}
      .jemCardRow{display:flex;align-items:center;gap:6px;padding:7px;margin-top:5px;background:#0008;border-radius:7px;border:1px solid #00bfff22}
      .jemCardRow label{flex:1;text-align:left;font-size:10px;color:#dffaff}.jemCardRow input{accent-color:#00eaff}
      .jemMove{width:38px!important;min-height:32px!important;margin:0!important;padding:0!important}.jemHidden{opacity:.4}
    `;
    root.appendChild(style);

    const q = id => root.getElementById(id);
    let states = [];

    function loadLayout() {
      try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
    }
    function saveLayout(layout) { localStorage.setItem(KEY, JSON.stringify(layout)); }

    function renderCards() {
      const list = q('jemCardsList');
      const cards = [...grid.querySelectorAll(':scope > .card')].filter(c => c.id !== 'jarvis-entity-manager');
      const current = loadLayout();
      const byId = new Map(cards.map((c,i) => [c.dataset.jarvisCardId || `card-${i}`, c]));
      cards.forEach((c,i) => { if (!c.dataset.jarvisCardId) c.dataset.jarvisCardId = `card-${i}`; });
      const ids = cards.map(c => c.dataset.jarvisCardId);
      const order = [...(current.order || [])].filter(id => byId.has(id));
      ids.forEach(id => { if (!order.includes(id)) order.push(id); });
      order.forEach(id => grid.appendChild(byId.get(id)));
      const hidden = new Set(current.hidden || []);
      list.innerHTML = '';
      order.forEach((id, idx) => {
        const card = byId.get(id), title = card.querySelector('.title')?.textContent?.trim() || `Carte ${idx+1}`;
        const row = document.createElement('div'); row.className='jemCardRow' + (hidden.has(id)?' jemHidden':'');
        row.innerHTML = `<input type="checkbox" ${hidden.has(id)?'':'checked'}><label>${esc(title)}</label><button class="jemMove" data-dir="up">↑</button><button class="jemMove" data-dir="down">↓</button>`;
        const cb = row.querySelector('input'); cb.onchange=()=>{hidden.has(id)?hidden.delete(id):hidden.add(id); card.hidden=hidden.has(id); row.classList.toggle('jemHidden',hidden.has(id)); saveLayout({order,hidden:[...hidden]});};
        row.querySelectorAll('.jemMove').forEach(b=>b.onclick=()=>{const d=b.dataset.dir, pos=order.indexOf(id), to=d==='up'?pos-1:pos+1;if(to<0||to>=order.length)return;[order[pos],order[to]]=[order[to],order[pos]];order.forEach(x=>grid.appendChild(byId.get(x)));saveLayout({order,hidden:[...hidden]});renderCards();});
        list.appendChild(row); card.hidden=hidden.has(id);
      });
    }

    function fillEntities(filter='') {
      const select=q('jemEntitySelect');
      const needle=filter.toLowerCase().trim();
      const groups=new Map(CATEGORIES.map(([n])=>[n,[]]));
      states.filter(s=>{const name=s.attributes?.friendly_name || s.entity_id;return !needle || `${s.entity_id} ${name}`.toLowerCase().includes(needle);})
        .forEach(s=>groups.get(category(s.entity_id)).push(s));
      select.innerHTML='';
      let count=0;
      for(const [name,items] of groups){if(!items.length)continue;items.sort((a,b)=>(a.attributes?.friendly_name||a.entity_id).localeCompare(b.attributes?.friendly_name||b.entity_id,'fr'));const og=document.createElement('optgroup');og.label=name;items.forEach(s=>{const o=document.createElement('option');o.value=s.entity_id;o.textContent=`${s.attributes?.friendly_name||s.entity_id} — ${s.entity_id}`;og.appendChild(o);count++;});select.appendChild(og)}
      if(!count){select.innerHTML='<option>Aucune entité trouvée</option>';q('jemEntityInfo').textContent='Aucune entité ne correspond à la recherche.';return;}
      showEntity(select.value);
    }
    function showEntity(id){const s=states.find(x=>x.entity_id===id);if(!s)return;const a=s.attributes||{};q('jemEntityInfo').innerHTML=`<b>${esc(a.friendly_name||id)}</b><br>${esc(id)}<br>État : <b>${esc(s.state)}</b>${a.unit_of_measurement?` · ${esc(a.unit_of_measurement)}`:''}`;}
    async function refreshEntities(){
      try{const token=host._token?.();if(!token)throw Error('auth');const r=await fetch(location.origin+'/api/states',{headers:{Authorization:'Bearer '+token}});if(!r.ok)throw Error(r.status);states=await r.json();fillEntities(q('jemSearch').value);host._log?.(`✓ ${states.length} entités HA disponibles`);}catch(e){q('jemEntityInfo').textContent=`Erreur : ${e.message}`;host._log?.(`✗ Entités HA ${e.message}`)}
    }
    q('jemSearch').oninput=e=>fillEntities(e.target.value); q('jemEntitySelect').onchange=e=>showEntity(e.target.value); q('jemRefresh').onclick=refreshEntities;
    q('jemEntities').onclick=()=>{q('jemEntityView').hidden=false;q('jemCardView').hidden=true}; q('jemCards').onclick=()=>{q('jemEntityView').hidden=true;q('jemCardView').hidden=false;renderCards()};
    renderCards(); refreshEntities();
  }

  const observer = new MutationObserver(() => {
    const host = document.querySelector('jarvis-core-hud');
    if (host?.shadowRoot) mount(host);
  });
  observer.observe(document.documentElement, {childList:true,subtree:true});
  setTimeout(() => { const host=document.querySelector('jarvis-core-hud'); if(host) mount(host); }, 300);
})();
