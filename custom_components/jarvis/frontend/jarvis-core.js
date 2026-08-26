/* JARVIS Core 2 — visual HUD + dashboard strategy. */

class JarvisCoreHud extends HTMLElement {
  setConfig(config) {
    this._config = config || {};
    this._render();
  }

  set hass(value) {
    this._hass = value;
    if (this._status) {
      this._status.textContent = value ? "HOME ASSISTANT CONNECTÉ" : "INITIALISATION";
      this._status.className = `status ${value ? "online" : ""}`;
    }
  }

  connectedCallback() {
    this._render();
  }

  _render() {
    if (!this.isConnected) return;
    const leds = Array.from({ length: 72 }, (_, i) => {
      const angle = i * 5;
      const r = i % 2 ? 47 : 43;
      const x = 50 + r * Math.cos((angle - 90) * Math.PI / 180);
      const y = 50 + r * Math.sin((angle - 90) * Math.PI / 180);
      return `<i class="led" style="left:${x}%;top:${y}%;transform:translate(-50%,-50%) rotate(${angle}deg);animation-delay:${(i * 0.035).toFixed(3)}s"></i>`;
    }).join("");

    this.shadowRoot?.innerHTML && (this.shadowRoot.innerHTML = "");
    const root = this.attachShadow({ mode: "open" });
    root.innerHTML = `
      <style>
        :host{display:block;width:100%;height:100%;min-height:78vh;background:#01050c;color:#d9faff;font-family:Rajdhani,Arial,sans-serif;overflow:hidden}
        *{box-sizing:border-box}
        .hud{width:100%;height:100%;min-height:78vh;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;position:relative;background:radial-gradient(circle at 50% 43%,rgba(0,180,255,.13),transparent 45%),#01050c}
        .hud:before{content:"";position:absolute;inset:0;background:linear-gradient(rgba(0,220,255,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(0,220,255,.018) 1px,transparent 1px);background-size:32px 32px;pointer-events:none}
        .title{position:relative;z-index:2;margin:18px 0 0;font-family:Orbitron,Arial,sans-serif;font-size:clamp(25px,5vw,42px);letter-spacing:12px;color:#e8fcff;text-shadow:0 0 8px #00eaff,0 0 25px rgba(0,234,255,.65)}
        .subtitle{position:relative;z-index:2;margin-top:4px;font-size:10px;letter-spacing:4px;color:rgba(140,220,255,.7);text-transform:uppercase}
        .status{position:relative;z-index:2;margin-top:8px;padding:4px 12px;border:1px solid rgba(0,234,255,.28);border-radius:20px;background:rgba(0,20,35,.45);font-size:10px;letter-spacing:2px;color:#00eaff}
        .status.online{color:#39ff88;border-color:rgba(57,255,136,.35)}
        .coreZone{position:relative;width:min(88vw,650px);aspect-ratio:1;margin-top:8px;display:grid;place-items:center}
        .ring{position:absolute;border:1px solid rgba(0,234,255,.26);border-radius:50%;box-shadow:0 0 14px rgba(0,234,255,.07),inset 0 0 14px rgba(0,234,255,.04)}
        .r1{width:34%;height:34%;animation:spin 10s linear infinite}.r2{width:47%;height:47%;animation:spinReverse 15s linear infinite}.r3{width:61%;height:61%;animation:spin 21s linear infinite}.r4{width:76%;height:76%;animation:spinReverse 28s linear infinite}.r5{width:91%;height:91%;animation:spin 38s linear infinite}
        .ring:after{content:"";position:absolute;left:50%;top:-3px;width:7px;height:7px;border-radius:50%;background:#00eaff;box-shadow:0 0 12px #00eaff;transform:translateX(-50%)}
        .core{position:relative;width:25%;height:25%;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle,#031b29 0 22%,rgba(0,234,255,.2) 23%,rgba(0,234,255,.04) 56%,transparent 70%);box-shadow:0 0 25px rgba(0,234,255,.35),0 0 70px rgba(0,140,255,.16);z-index:3}
        .core:before{content:"";position:absolute;inset:18%;border-radius:50%;border:1px solid rgba(0,234,255,.75);box-shadow:0 0 20px #00eaff,inset 0 0 18px rgba(0,234,255,.5);animation:pulse 2.2s ease-in-out infinite}
        .core:after{content:"J";font-family:Orbitron,Arial,sans-serif;font-size:clamp(22px,5vw,42px);font-weight:900;color:#e8fcff;text-shadow:0 0 10px #00eaff,0 0 28px #008cff;z-index:2}
        .led{position:absolute;width:3px;height:14px;border-radius:3px;background:#00eaff;box-shadow:0 0 7px #00eaff,0 0 16px rgba(0,234,255,.65);transform-origin:center;animation:led 1.9s ease-in-out infinite;z-index:4}
        .sweep{position:absolute;inset:4.5%;border-radius:50%;background:conic-gradient(from 0deg,transparent 0 72%,rgba(0,234,255,.18) 80%,transparent 88%);animation:spin 5.5s linear infinite;z-index:2;pointer-events:none}
        .footer{position:relative;z-index:2;font-size:9px;letter-spacing:3px;color:rgba(140,220,255,.48);text-transform:uppercase;margin-top:-8px}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes spinReverse{to{transform:rotate(-360deg)}}
        @keyframes pulse{50%{transform:scale(1.14);opacity:.72}}
        @keyframes led{0%,100%{opacity:.28;transform:translate(-50%,-50%) scaleY(.55)}50%{opacity:1;transform:translate(-50%,-50%) scaleY(1.15)}}
        @media(max-width:600px){.coreZone{width:96vw}.title{letter-spacing:7px}.led{width:2px;height:10px}.footer{margin-top:-2px}}
      </style>
      <main class="hud">
        <div class="title">JARVIS</div>
        <div class="subtitle">CORE ASSISTANT · NEURAL INTERFACE</div>
        <div class="status" id="status">INITIALISATION</div>
        <section class="coreZone" aria-label="JARVIS HUD">
          <div class="ring r5"></div><div class="ring r4"></div><div class="ring r3"></div><div class="ring r2"></div><div class="ring r1"></div>
          <div class="sweep"></div>
          ${leds}
          <div class="core"></div>
        </section>
        <div class="footer">72 LED · HOME ASSISTANT LINK · CORE 2</div>
      </main>`;
    this._status = root.querySelector("#status");
    if (this._hass) this._status.className = "status online";
  }
}

customElements.define("jarvis-core-hud", JarvisCoreHud);

class JarvisCoreStrategy {
  static async generate() {
    return {
      views: [{
        title: "JARVIS",
        path: "jarvis",
        icon: "mdi:robot-outline",
        type: "sections",
        max_columns: 1,
        cards: [{
          type: "custom:jarvis-core-hud",
          grid_options: { columns: 12, rows: 12 },
        }],
      }],
    };
  }

  static getCreateSuggestions() {
    return { title: "JARVIS Core", icon: "mdi:robot-outline" };
  }
}

customElements.define("ll-strategy-dashboard-jarvis-core", JarvisCoreStrategy);
window.customStrategies = window.customStrategies || [];
window.customStrategies.push({
  type: "jarvis-core",
  strategyType: "dashboard",
  name: "JARVIS Core",
  description: "HUD JARVIS avec cœur, anneaux et 72 LED animées.",
});
