"""Central JARVIS conversation core."""
from __future__ import annotations

from homeassistant.components import conversation
from homeassistant.core import HomeAssistant

from .const import DOMAIN


def _pick_agent(hass: HomeAssistant) -> str | None:
    """Pick the first configured conversation agent, preferring a JARVIS-named one."""
    candidates: list[str] = []
    for state in hass.states.async_all("conversation"):
        candidates.append(state.entity_id)
    candidates.sort(key=lambda x: ("jarvis" not in x.lower(), x))
    return candidates[0] if candidates else None


async def async_process(hass: HomeAssistant, text: str, language: str = "fr") -> dict:
    """Send text through the configured Home Assistant Assist conversation agent."""
    agent_id = _pick_agent(hass)
    if not agent_id:
        return {"success": False, "error": "no_conversation_agent", "speech": None}

    try:
        result = await conversation.async_converse(
            hass,
            text=text,
            context=None,
            conversation_id=hass.data.setdefault(DOMAIN, {}).get("conversation_id"),
            device_id=None,
            language=language,
            agent_id=agent_id,
        )
    except Exception as err:  # noqa: BLE001
        return {"success": False, "error": str(err), "agent_id": agent_id, "speech": None}

    hass.data.setdefault(DOMAIN, {})["conversation_id"] = result.conversation_id
    speech = result.response.speech.get("plain", {}).get("speech") if result.response.speech else None
    return {
        "success": True,
        "agent_id": agent_id,
        "conversation_id": result.conversation_id,
        "speech": speech,
    }
