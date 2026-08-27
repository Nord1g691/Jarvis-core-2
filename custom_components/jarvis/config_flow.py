"""Config flow for JARVIS Core 2."""
from __future__ import annotations

from homeassistant import config_entries
import voluptuous as vol

from .const import DOMAIN


class JarvisConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a JARVIS configuration flow."""

    VERSION = 2

    async def async_step_user(self, user_input=None):
        """Show the initial JARVIS settings."""
        if user_input is not None:
            return self.async_create_entry(
                title="JARVIS Core Assistant",
                data={
                    "voice_enabled": user_input.get("voice_enabled", True),
                    "solar_enabled": user_input.get("solar_enabled", True),
                    "satellite_enabled": user_input.get("satellite_enabled", True),
                },
            )

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Optional("voice_enabled", default=True): bool,
                    vol.Optional("solar_enabled", default=True): bool,
                    vol.Optional("satellite_enabled", default=True): bool,
                }
            ),
        )
