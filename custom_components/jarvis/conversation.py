"""Central JARVIS conversation bridge to Home Assistant Assist."""
from __future__ import annotations

from aiohttp import web
from homeassistant.components import assist_pipeline
from homeassistant.components.http import HomeAssistantView
from homeassistant.core import HomeAssistant


class JarvisConversationView(HomeAssistantView):
    """Route HUD conversation requests through the preferred Assist pipeline."""

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

        conversation_id = data.get("conversation_id")
        if not isinstance(conversation_id, str) or not conversation_id.strip():
            conversation_id = None
        else:
            conversation_id = conversation_id.strip()

        try:
            # Use the Assist pipeline selected as preferred by the user.
            # Its conversation_engine is the configured AI/conversation agent.
            pipeline = assist_pipeline.async_get_pipeline(self.hass)
            agent_id = pipeline.conversation_engine
            if not agent_id:
                return self.json_message(
                    "Preferred Assist pipeline has no conversation engine",
                    status_code=502,
                )

            payload = {"text": text, "agent_id": agent_id}
            if conversation_id:
                payload["conversation_id"] = conversation_id

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
        response_data = response.get("response", {}) if isinstance(response, dict) else {}
        new_conversation_id = response.get("conversation_id") if isinstance(response, dict) else None
        if not new_conversation_id:
            new_conversation_id = conversation_id

        # Keep the same response shape as Home Assistant's official
        # /api/conversation/process endpoint so the HUD needs no special parser.
        return self.json(
            {
                "response": response_data,
                "conversation_id": new_conversation_id,
                "agent_id": agent_id,
                "continue_conversation": (
                    response.get("continue_conversation", False)
                    if isinstance(response, dict)
                    else False
                ),
            }
        )
