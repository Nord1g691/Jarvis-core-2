/* JARVIS voice bridge: UI helper for Home Assistant Assist. */
window.JarvisVoice = {
  async start(hass, entityId) {
    if (!hass || !entityId) throw new Error("Satellite Assist non configuré");
    return hass.callService("assist_satellite", "start_conversation", { entity_id: entityId });
  },
};
