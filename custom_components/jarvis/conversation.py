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
            # "preferred" here is the Assist pipeline selected by the user in
            # Home Assistant. Its conversation_engine is the assistant/LLM
            # that should actually answer JARVIS, rather than the default
            # built-in home_assistant conversation agent.
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
        speech_data = response_data.get("speech", {}) if isinstance(response_data, dict) else {}
        plain = speech_data.get("plain", {}) if isinstance(speech_data, dict) else {}
        speech = plain.get("speech") if isinstance(plain, dict) else None
        new_conversation_id = response.get("conversation_id") if isinstance(response, dict) else None
        if not new_conversation_id:
            new_conversation_id = conversation_id

        return self.json(
            {
                "speech": speech,
                "conversation_id": new_conversation_id,
                "agent_id": agent_id,
                "continue_conversation": (
                    response.get("continue_conversation", False)
                    if isinstance(response, dict)
                    else False
                ),
            }
        )
