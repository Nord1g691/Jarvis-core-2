/* JARVIS Assist pipeline selector + conversation bridge. */
(function () {
  const patch = () => {
    const C = customElements.get("jarvis-core-hud");
    if (!C || C.prototype.__jarvisAssistPipelineSelector) return !!C;
    C.prototype.__jarvisAssistPipelineSelector = true;

    const originalRender = C.prototype.render;
    C.prototype.render = function () {
      originalRender.call(this);
      const grid = this.shadowRoot?.querySelector(".grid");
      if (!grid || this.shadowRoot.getElementById("pipelineCard")) return;
      const card = document.createElement("section");
      card.className = "card";
      card.id = "pipelineCard";
      card.style.gridColumn = "1/-1";
      card.innerHTML = '<div class="title">🧠 ASSISTANT / PIPELINE</div><div class="row"><select id="pipelineSelect" style="flex:1;min-height:40px;border:1px solid #00cfff55;border-radius:7px;background:#031322;color:#dffaff;padding:0 10px"><option value="">AUTOMATIQUE · ASSIST</option></select></div><div id="pipelineInfo" style="font:9px monospace;color:#72ffad;margin-top:7px">Détection automatique…</div>';
      grid.insertBefore(card, grid.lastElementChild);
      const select = this.shadowRoot.getElementById("pipelineSelect");
      const saved = localStorage.getItem("jarvis_assist_pipeline") || "";
      select.value = saved;
      select.onchange = () => {
        localStorage.setItem("jarvis_assist_pipeline", select.value);
        this._log?.("✓ Pipeline JARVIS → " + (select.value || "AUTOMATIQUE"));
      };
      this._loadAssistPipelines();
    };

    C.prototype._loadAssistPipelines = async function () {
      const token = this._hass?.auth?.data?.access_token;
      const select = this.shadowRoot?.getElementById("pipelineSelect");
      const info = this.shadowRoot?.getElementById("pipelineInfo");
      if (!token || !select) return;
      try {
        const r = await fetch(location.origin + "/api/jarvis/conversation", {
          method: "POST",
          headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
          body: JSON.stringify({ text: "__jarvis_pipeline_probe__" }),
        });
        const d = await r.json();
        if (!r.ok) throw Error(d?.message || d?.error || ("HTTP " + r.status));
        const pipelines = Array.isArray(d.pipelines) ? d.pipelines : [];
        for (const p of pipelines) {
          if (!p?.id) continue;
          const o = document.createElement("option");
          o.value = p.id;
          o.textContent = `${p.name || p.id} · ${p.conversation_engine || "HA"}`;
          select.appendChild(o);
        }
        const saved = localStorage.getItem("jarvis_assist_pipeline") || "";
        select.value = [...select.options].some(o => o.value === saved) ? saved : "";
        info.textContent = pipelines.length ? `${pipelines.length} pipeline(s) Assist détecté(s)` : "Aucun pipeline supplémentaire détecté";
        this._log?.("✓ Assist · " + (d.pipeline_name || "Automatique"));
      } catch (e) {
        info.textContent = "Détection Assist indisponible";
        this._log?.("⚠️ Pipeline Assist · " + e.message);
      }
    };

    C.prototype.process = async function (text) {
      const token = this._hass?.auth?.data?.access_token;
      if (!token || !text) return;
      this.setState("JARVIS RÉFLÉCHIT", "#ffb000");
      try {
        const body = { text };
        const selected = localStorage.getItem("jarvis_assist_pipeline") || "";
        if (selected) body.pipeline = selected;
        if (this.conversationId) body.conversation_id = this.conversationId;
        const r = await fetch(location.origin + "/api/jarvis/conversation", {
          method: "POST",
          headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const d = await r.json();
        if (!r.ok) throw Error(d?.message || d?.error || ("HTTP " + r.status));
        this.conversationId = d.conversation_id || this.conversationId;
        this._log?.("✓ Assist → " + (d.agent_id || "HA") + " · " + (d.pipeline_name || "Automatique"));
        const speech = d?.response?.speech?.plain?.speech || d?.response?.speech?.ssml?.speech || "";
        if (speech) {
          this._log?.("🤖 " + speech);
          if (!this.muted) {
            this.setState("JARVIS PARLE", "#b56cff");
            const u = new SpeechSynthesisUtterance(speech);
            u.lang = "fr-FR";
            u.rate = 0.92;
            u.onend = () => this.conversationMode ? this.setState("JARVIS ÉCOUTE", "#39ff88") : this.setState("OPÉRATIONNEL", "#00eaff");
            speechSynthesis.speak(u);
          }
        } else if (this.conversationMode) this.setState("JARVIS ÉCOUTE", "#39ff88");
      } catch (e) {
        this._log?.("✗ Assistant Assist " + e.message);
        this.setState("JARVIS ERREUR", "#ff4050");
        setTimeout(() => this.conversationMode && this.setState("JARVIS ÉCOUTE", "#39ff88"), 1000);
      }
    };
    return true;
  };
  if (!patch()) {
    const timer = setInterval(() => { if (patch()) clearInterval(timer); }, 50);
    setTimeout(() => clearInterval(timer), 10000);
  }
})();
