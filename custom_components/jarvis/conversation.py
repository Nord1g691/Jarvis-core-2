"""Central JARVIS conversation bridge to Home Assistant Assist."""
from __future__ import annotations

from aiohttp import web
from homeassistant.components import assist_pipeline, conversation
from homeassistant.components.conversation.agent_manager import get_agent_manager
from homeassistant.components.http import HomeAssistantView
from homeassistant.core import HomeAssistant


class JarvisConversationView(HomeAssistantView):
    """Route HUD conversation requests through a selectable Assist pipeline."""

    url = "/api/jarvis/conversation"
    name = "api:jarvis:conversation"
    requires_auth = True

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    def _pipelines(self):
        return assist_pipeline.async_get_pipelines(self.hass)

    def _select_agent(self, requested_pipeline: str | None = None):
        pipelines = self._pipelines()
        preferred = assist_pipeline.async_get_pipeline(self.hass)

        if requested_pipeline:
            for pipeline in pipelines:
                if pipeline.id == requested_pipeline or pipeline.name == requested_pipeline:
                    return pipeline.conversation_engine, pipeline.name

        preferred_agent = preferred.conversation_engine
        if preferred_agent:
            return preferred_agent, preferred.name

        return conversation.HOME_ASSISTANT_AGENT, preferred.name

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

        requested_pipeline = data.get("pipeline")
        if requested_pipeline is not None:
            requested_pipeline = str(requested_pipeline).strip() or None

        try:
            agent_id, pipeline_name = self._select_agent(requested_pipeline)
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
                "pipelines": [
                    {"id": p.id, "name": p.name, "conversation_engine": p.conversation_engine}
                    for p in self._pipelines()
                ],
                "continue_conversation": (
                    response.get("continue_conversation", False)
                    if isinstance(response, dict)
                    else False
                ),
            }
        )
