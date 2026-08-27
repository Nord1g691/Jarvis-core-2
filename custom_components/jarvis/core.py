"""Central JARVIS conversation core."""
from __future__ import annotations

from typing import Any

from homeassistant.components import conversation
from homeassistant.core import Context, HomeAssistant

from .const import DOMAIN


async def async_process(
    hass: HomeAssistant,
    text: str,
    language: str = "fr",
    context: Context | None = None,
) -> dict[str, Any]:
    """Send text through Home Assistant's configured Assist conversation agent.

    JARVIS deliberately does not hard-code Google, OpenAI, or another provider.
    The Assist conversation API chooses the installation's default agent when
    ``agent_id`` is omitted.
    """
    data = hass.data.setdefault(DOMAIN, {})
    try:
        result = await conversation.async_converse(
            hass,
            text=text,
            context=context,
            conversation_id=data.get("conversation_id"),
            device_id=None,
            language=language,
            agent_id=None,
        )
    except Exception as err:  # noqa: BLE001
        return {"success": False, "error": str(err), "speech": None}

    data["conversation_id"] = result.conversation_id
    speech = None
    if result.response.speech:
        plain = result.response.speech.get("plain")
        if plain:
            speech = plain.get("speech")

    return {
        "success": True,
        "conversation_id": result.conversation_id,
        "continue_conversation": result.continue_conversation,
        "speech": speech,
    }
