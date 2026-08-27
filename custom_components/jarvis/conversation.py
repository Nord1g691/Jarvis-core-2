"""Central JARVIS conversation bridge to Home Assistant Assist."""
from __future__ import annotations

from aiohttp import web
from homeassistant.components import assist_pipeline, conversation
from homeassistant.components.http import HomeAssistantView
from homeassistant.core import HomeAssistant


class JarvisConversationView(HomeAssistantView):
    """Route HUD conversation requests through the best configured Assist agent."""

    url = "/api/jarvis/conversation"
    name = "api:jarvis:conversation"
    requires_auth = True

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    def _select_agent(self):
        """Select the configured AI agent without hard-coding a provider."""
        preferred = assist_pipeline.async_get_pipeline(self.hass)
        preferred_agent = preferred.conversation_engine
        if preferred_agent and preferred_agent != conversation.HOME_ASSISTANT_AGENT:
            return preferred_agent, preferred.name

        pipelines = assist_pipeline.async_get_pipelines(self.hass)
        for pipeline in pipelines:
            agent_id = pipeline.conversation_engine
            if agent_id and agent_id != conversation.HOME_ASSISTANT_AGENT:
                return agent_id, pipeline.name

        return preferred_agent, preferred.name

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
            agent_id, pipeline_name = self._select_agent()
            if not agent_id:
                return self.json_message(
                    "No Assist conversation engine is configured",
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

        return self.json(
            {
                "response": response_data,
                "conversation_id": new_conversation_id,
                "agent_id": agent_id,
                "pipeline_name": pipeline_name,
                "continue_conversation": (
                    response.get("continue_conversation", False)
                    if isinstance(response, dict)
                    else False
                ),
            }
        )
