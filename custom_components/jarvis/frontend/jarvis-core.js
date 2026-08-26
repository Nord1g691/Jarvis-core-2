/* JARVIS Core Assistant — HUD test build */
class JarvisCoreHud extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); }
  set hass(value) { this._hass = value; if (this.isConnected) this.update(); }
  connectedCallback() { this.render(); }
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host{display:block;min-height:100vh;background:#020711;color:#dffaff;font-family:Arial,sans-serif}
        .app{min-height:100vh;padding:20px;box-sizing:border-box;background:radial-gradient(circle at 50% 35%,#06304d 0,transparent 42%),#020711}
        header{text-align:center}.logo{font-size:42px;letter-spacing:12px;text-shadow:0 0 12px #00eaff}.sub{font-size:10px;letter-spacing:4px;color:#79bfd8;margin:8px}
        .status{display:inline-block;padding:5px 14px;border:1px solid #00eaff55;border-radius:20px;font-size:10px;letter-spacing:2px;color:#39ff88}
        .core{width:min(75vw,460px);height:min(75vw,460px);margin:20px auto;position:relative;border-radius:50%;display:grid;place-items:center}
        .ring{position:absolute;border:1px solid #00eaff55;border-radius:50%;animation:spin 18s linear infinite}.r1{inset:3%}.r2{inset:12%;border-style:dashed;animation-direction:reverse}.r3{inset:23%}.r4{inset:34%;border:2px solid #00eaff44}
        .orbit{position:absolute;width:88%;height:30%;border:1px solid #00eaff55;border-radius:50%;transform:rotate(28deg);animation:spin 12s linear infinite}
        .glow{width:28%;height:28%;border-radius:50%;background:radial-gradient(circle,#fff 0,#00eaff 8%,#007cff55 35%,transparent 72%);box-shadow:0 0 25px #00eaff,0 0 80px #008cff99;animation:pulse 2s ease-in-out infinite}
        .label{position:absolute;bottom:10%;left:0;right:0;text-align:center;letter-spacing:4px;font-size:12px}
        .grid{max-width:900px;margin:auto;display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.card{padding:14px;border:1px solid #00bfff33;border-radius:10px;background:#031322dd}.title{font-size:10px;letter-spacing:2px;color:#8bd6ea;margin-bottom:10px}.values{display:grid;grid-template-columns:1fr 1fr;gap:8px}.value{padding:10px;text-align:center;background:#0008;border-radius:7px}.num{font-size:19px;font-weight:bold}.unit{font-size:9px;color:#73aac0}.green{color:#39ff88}.blue{color:#00eaff}.orange{color:#ffb000}.cyan{color:#00ffc8}
        button{width:100%;min-height:42px;margin-top:7px;border:1px solid #00cfff55;border-radius:7px;background:#006b941c;color:#dffaff}.buttons{display:grid;grid-template-columns:1fr 1fr;gap:7px}.console{height:90px;overflow:auto;background:#0009;border-radius:6px;padding:8px;font:9px monospace;color:#72ffad}
        @keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{50%{transform:scale(1.12);opacity:.8}}
        @media(max-width:650px){.grid{grid-template-columns:1fr}.logo{font-size:30px}.core{width:88vw;height:88vw}}
      </style>
      <div class="app">
        <header><div class="logo">JARVIS</div><div class="sub">CORE ASSISTANT · HOME ASSISTANT</div><div class="status" id="status">INITIALISATION</div></header>
        <div class="core"><div class="ring r1"></div><div class="ring r2"></div><div class="ring r3"></div><div class="ring r4"></div><div class="orbit"></div><div class="glow"></div><div class="label" id="state">OPÉRATIONNEL</div></div>
        <div class="grid">
          <section class="card"><div class="title">⚡ ÉNERGIE SOLAIRE</div><div class="values"><div class="value"><div class="num green" id="prod">--</div><div class="unit">PRODUCTION W</div></div><div class="value"><div class="num blue" id="cons">--</div><div class="unit">CONSOMMATION W</div></div><div class="value"><div class="num orange" id="imp">--</div><div class="unit">IMPORT W</div></div><div class="value"><div class="num cyan" id="exp">--</div><div class="unit">EXPORT W</div></div></div></section>
          <section class="card"><div class="title">🎙️ COMMANDES JARVIS</div><div class="buttons"><button id="listen">🎤 ÉCOUTER</button><button id="test">📡 TEST HA</button></div><button id="sat">🎙️ JARVIS IPHONE</button></section>
          <section class="card"><div class="title">🧠 ÉTAT</div><div class="buttons"><button data-state="OPÉRATIONNEL">AUTO</button><button data-state="JARVIS ÉCOUTE">ÉCOUTE</button><button data-state="JARVIS RÉFLÉCHIT">RÉFLEXION</button><button data-state="JARVIS PARLE">RÉPONSE</button></div></section>
          <section class="card"><div class="title">CONSOLE</div><div class="console" id="log">[SYSTEM] JARVIS Core initialisé...</div></section>
        </div>
      </div>`;
    const q=id=>this.shadowRoot.getElementById(id);
    const log=t=>{q('log').insertAdjacentHTML('beforeend','<br>'+new Date().toLocaleTimeString()+' '+t);q('log').scrollTop=q('log').scrollHeight;};
    q('test').onclick=()=>this.update(true);
    q('listen').onclick=()=>this.listen();
    q('sat').onclick=()=>this.satellite();
    this.shadowRoot.querySelectorAll('[data-state]').forEach(b=>b.onclick=()=>q('state').textContent=b.dataset.state);
    this._log=log; this.update();
  }
  async update(manual=false){
    const token=this._hass?.auth?.data?.access_token;
    if(!token){this.shadowRoot?.getElementById('status')?.replaceChildren(document.createTextNode('HA AUTH EN ATTENTE'));return;}
    try{
      const base=location.origin,headers={Authorization:'Bearer '+token};
      const api=await fetch(base+'/api/',{headers});
      if(!api.ok)throw new Error(api.status);
      this.shadowRoot.getElementById('status').textContent='EN LIGNE';
      const ids={prod:'sensor.envoy_122323101280_production_solaire_instantanee',cons:'sensor.envoy_122323101280_consommation_electrique_actuelle',imp:'sensor.puissance_import_reseau',exp:'sensor.puissance_export_reseau'};
      await Promise.all(Object.entries(ids).map(async([key,id])=>{const r=await fetch(base+'/api/states/'+id,{headers});if(r.ok){const d=await r.json();const el=this.shadowRoot.getElementById(key);if(el)el.textContent=d.state+' '+(d.attributes?.unit_of_measurement||'W');}}));
      if(manual)this._log('✓ Connexion HA OK');
    }catch(e){this.shadowRoot.getElementById('status').textContent='HORS LIGNE';if(manual)this._log('✗ HA '+e.message);}
  }
  listen(){
    const R=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!R){this._log('✗ Reconnaissance vocale non disponible');return;}
    const r=new R();r.lang='fr-FR';r.onstart=()=>this.shadowRoot.getElementById('state').textContent='JARVIS ÉCOUTE';r.onresult=e=>this._log('🎤 '+e.results[0][0].transcript);r.onend=()=>this.shadowRoot.getElementById('state').textContent='OPÉRATIONNEL';r.start();
  }
  satellite(){
    const token=this._hass?.auth?.data?.access_token;if(!token){this._log('✗ Auth HA indisponible');return;}
    const ws=new WebSocket(location.origin.replace(/^http/,'ws')+'/api/websocket');
    ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.type==='auth_required')ws.send(JSON.stringify({type:'auth',access_token:token}));else if(m.type==='auth_ok'){ws.send(JSON.stringify({id:Date.now(),type:'call_service',domain:'assist_satellite',service:'start_conversation',target:{entity_id:'assist_satellite.jarvis_iphone'}}));}else if(m.type==='result'){this._log(m.success?'✓ JARVIS iPhone lancé':'✗ JARVIS iPhone refusé');ws.close();}};
  }
}
if(!customElements.get('jarvis-core-hud'))customElements.define('jarvis-core-hud',JarvisCoreHud);