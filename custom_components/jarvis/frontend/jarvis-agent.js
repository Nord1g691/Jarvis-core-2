/* JARVIS preferred Assist pipeline bridge. Loaded after jarvis-core.js. */
(function () {
  const patch = () => {
    const C = customElements.get("jarvis-core-hud");
    if (!C || C.prototype.__jarvisPreferredAssist) return !!C;
    C.prototype.__jarvisPreferredAssist = true;

    C.prototype.process = async function (text) {
      const token = this._hass?.auth?.data?.access_token;
      if (!token || !text) return;

      this.setState("JARVIS RÉFLÉCHIT", "#ffb000");
      try {
        const body = { text };
        if (this.conversationId) body.conversation_id = this.conversationId;

        // The backend bridge resolves the Assist pipeline marked as
        // preferred by Home Assistant and uses its conversation_engine.
        const r = await fetch(location.origin + "/api/jarvis/conversation", {
          method: "POST",
          headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        const d = await r.json();
        if (!r.ok) throw Error(d?.message || d?.error || ("HTTP " + r.status));

        this.conversationId = d.conversation_id || this.conversationId;
        if (d.agent_id) this._log?.("✓ Assistant Assist → " + d.agent_id);

        const speech =
          d?.response?.speech?.plain?.speech ||
          d?.response?.speech?.ssml?.speech ||
          "";

        if (speech) {
          this._log?.("🤖 " + speech);
          if (!this.muted) {
            this.setState("JARVIS PARLE", "#b56cff");
            const u = new SpeechSynthesisUtterance(speech);
            u.lang = "fr-FR";
            u.rate = 0.92;
            u.onend = () => {
              if (this.conversationMode) this.setState("JARVIS ÉCOUTE", "#39ff88");
              else this.setState("OPÉRATIONNEL", "#00eaff");
            };
            speechSynthesis.speak(u);
          } else if (this.conversationMode) {
            this.setState("JARVIS ÉCOUTE", "#39ff88");
          }
        } else {
          this._log?.("⚠️ Assist n’a renvoyé aucun texte vocal");
          if (this.conversationMode) this.setState("JARVIS ÉCOUTE", "#39ff88");
        }
      } catch (e) {
        this._log?.("✗ Assistant Assist " + e.message);
        this.setState("JARVIS ERREUR", "#ff4050");
        setTimeout(() => {
          if (this.conversationMode) this.setState("JARVIS ÉCOUTE", "#39ff88");
          else this.setState("OPÉRATIONNEL", "#00eaff");
        }, 1000);
      }
    };

    return true;
  };

  if (!patch()) {
    const timer = setInterval(() => {
      if (patch()) clearInterval(timer);
    }, 50);
    setTimeout(() => clearInterval(timer), 10000);
  }
})();
