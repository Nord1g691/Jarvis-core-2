"""Config flow for JARVIS Core 2."""
from __future__ import annotations

from homeassistant import config_entries
from homeassistant.components.conversation import async_get_conversation_manager
import voluptuous as vol

from .const import DOMAIN


class JarvisConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a JARVIS configuration flow."""

    VERSION = 3

    async def async_step_user(self, user_input=None):
        """Show the initial JARVIS settings."""
        if user_input is not None:
            return self.async_create_entry(
                title="JARVIS Core Assistant",
                data={
                    "voice_enabled": user_input.get("voice_enabled", True),
                    "solar_enabled": user_input.get("solar_enabled", True),
                    "satellite_enabled": user_input.get("satellite_enabled", True),
                    "assist_agent": user_input.get("assist_agent"),
                },
            )

        agent_options = await self._get_agent_options()
        schema = {
            vol.Optional("voice_enabled", default=True): bool,
            vol.Optional("solar_enabled", default=True): bool,
            vol.Optional("satellite_enabled", default=True): bool,
        }
        if agent_options:
            schema[vol.Optional("assist_agent", default=agent_options[0])] = vol.In(agent_options)

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(schema),
            description_placeholders={
                "assist_agents": ", ".join(agent_options) if agent_options else "détection automatique"
            },
        )

    async def _get_agent_options(self) -> list[str]:
        """Return configured Assist conversation agents when the HA version exposes them."""
        try:
            manager = async_get_conversation_manager(self.hass)
            agents = getattr(manager, "_conversation_entities", {})
            options: list[str] = []
            if isinstance(agents, dict):
                options.extend(str(k) for k in agents if k)
            # Keep the config flow compatible across HA releases where the manager
            # does not expose its internal entity registry.
            return sorted(set(options))
        except Exception:
            return []
