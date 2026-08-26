"""Config flow for JARVIS Core 2."""
from __future__ import annotations

from homeassistant import config_entries
import voluptuous as vol

from .const import DOMAIN


class JarvisConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a JARVIS configuration flow."""

    VERSION = 1

    async def async_step_user(self, user_input=None):
        """Show the initial setup form."""
        if user_input is not None:
            return self.async_create_entry(title="JARVIS Core Assistant", data={})

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema({}),
        )
