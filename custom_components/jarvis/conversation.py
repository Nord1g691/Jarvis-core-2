"""Central JARVIS conversation bridge to Home Assistant Assist."""
from __future__ import annotations

from aiohttp import web
from homeassistant.components.http import HomeAssistantView
from homeassistant.core import HomeAssistant

from .const import DOMAIN


class JarvisConversationView(HomeAssistantView):
    """Route HUD conversation requests through the JARVIS Core."""

    url = "/api/jarvis/conversation"
    name = "api:jarvis:conversation"
    requires_auth = True

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    async def post(self, request: web.Request) -> web.Response:
        try:
            data = await request.json()
        except (TypeError, ValueError):
            return self.json_message("Invalid JSON", status_code=400)

        text = str(data.get("text", "")).strip()
        if not text:
            return self.json_message("Missing text", status_code=400)

        payload = {"text": text, "language": data.get("language", "fr")}
        conversation_id = data.get("conversation_id")
        if conversation_id:
            payload["conversation_id"] = conversation_id

        # No agent_id is supplied intentionally: Home Assistant Assist uses
        # the configured/default conversation agent for this installation.
        try:
            result = await self.hass.services.async_call(
                "conversation",
                "process",
                payload,
                blocking=True,
                return_response=True,
            )
        except Exception as err:  # noqa: BLE001
            return self.json_message(f"Assist error: {err}", status_code=502)

        response = result or {}
        speech = response.get("response", {}).get("speech", {}).get("plain", {}).get("speech")
        new_conversation_id = response.get("conversation_id") or conversation_id
        return self.json(
            {
                "speech": speech,
                "conversation_id": new_conversation_id,
                "continue_conversation": response.get("continue_conversation", False),
                "raw": response,
            }
        )
