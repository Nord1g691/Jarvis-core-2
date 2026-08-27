/* JARVIS preferred Assist pipeline bridge. Loaded after jarvis-core.js. */
(function () {
  const patch = () => {
    const C = customElements.get("jarvis-core-hud");
    if (!C || C.prototype.__jarvisPreferredAssist) return !!C;
    const original = C.prototype.process;
    C.prototype.__jarvisPreferredAssist = true;

    C.prototype._jarvisPreferredPipeline = async function () {
      try {
        if (this._hass?.connection?.sendMessagePromise) {
          const data = await this._hass.connection.sendMessagePromise({
            type: "assist_pipeline/pipeline/list",
          });
          const id = data?.preferred_pipeline;
          const pipeline = (data?.pipelines || []).find((p) => p.id === id);
          if (pipeline?.conversation_engine) {
            this._jarvisPreferredAgent = pipeline.conversation_engine;
            this._jarvisPreferredLanguage = pipeline.conversation_language || pipeline.language || undefined;
            this._jarvisPreferredName = pipeline.name || id;
            this._log?.(`✓ Assist préféré → ${this._jarvisPreferredName} · ${this._jarvisPreferredAgent}`);
            return this._jarvisPreferredAgent;
          }
        }
      } catch (e) {
        this._log?.(`⚠️ Assist préféré indisponible · ${e.message}`);
      }
      return undefined;
    };

    C.prototype.process = async function (text) {
      const token = this._hass?.auth?.data?.access_token;
      if (!token || !text) return;
      this.setState("JARVIS RÉFLÉCHIT", "#ffb000");
      try {
        const agentId = await this._jarvisPreferredPipeline();
        const body = { text };
        if (agentId) body.agent_id = agentId;
        if (this._jarvisPreferredLanguage && this._jarvisPreferredLanguage !== "*") body.language = this._jarvisPreferredLanguage;
        if (this.conversationId) body.conversation_id = this.conversationId;

        const r = await fetch(location.origin + "/api/conversation/process", {
          method: "POST",
          headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const d = await r.json();
        if (!r.ok) throw Error(d?.message || d?.error || ("HTTP " + r.status));
        this.conversationId = d.conversation_id || this.conversationId;
        const speech = d?.response?.speech?.plain?.speech || d?.response?.speech?.ssml?.speech || "";
        if (speech) {
          this._log?.("🤖 " + speech);
          if (!this.muted) {
            this.setState("JARVIS PARLE", "#b56cff");
            const u = new SpeechSynthesisUtterance(speech);
            u.lang = this._jarvisPreferredLanguage && this._jarvisPreferredLanguage !== "*" ? this._jarvisPreferredLanguage : "fr-FR";
            u.rate = .92;
            u.onend = () => this.conversationMode ? this.setState("JARVIS ÉCOUTE", "#39ff88") : this.setState("OPÉRATIONNEL", "#00eaff");
            speechSynthesis.speak(u);
          } else if (this.conversationMode) this.setState("JARVIS ÉCOUTE", "#39ff88");
        } else {
          this._log?.("⚠️ Assist n’a renvoyé aucun texte vocal");
          if (this.conversationMode) this.setState("JARVIS ÉCOUTE", "#39ff88");
        }
      } catch (e) {
        this._log?.("✗ Assist " + e.message);
        this.setState("JARVIS ERREUR", "#ff4050");
        setTimeout(() => this.conversationMode ? this.setState("JARVIS ÉCOUTE", "#39ff88") : this.setState("OPÉRATIONNEL", "#00eaff"), 1000);
      }
    };
    return true;
  };

  if (!patch()) {
    const timer = setInterval(() => { if (patch()) clearInterval(timer); }, 50);
    setTimeout(() => clearInterval(timer), 10000);
  }
})();