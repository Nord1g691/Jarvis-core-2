"""JARVIS Core 2 Home Assistant integration."""
from __future__ import annotations

from pathlib import Path

from homeassistant.components import panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import DOMAIN

FRONTEND_URL = "/jarvis_core"
FRONTEND_FILE = f"{FRONTEND_URL}/jarvis-core.js"
PANEL_NAME = "jarvis-core-panel"


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up JARVIS Core 2."""
    hass.data.setdefault(DOMAIN, {})

    await hass.http.async_register_static_paths(
        [
            StaticPathConfig(
                FRONTEND_URL,
                str(Path(__file__).parent / "frontend"),
                cache_headers=False,
            )
        ]
    )

    # JARVIS is a real Home Assistant sidebar panel. The HUD is loaded
    # only when the user opens the JARVIS entry in the sidebar.
    if DOMAIN not in hass.data.get("frontend_panels", {}):
        await panel_custom.async_register_panel(
            hass=hass,
            webcomponent_name=PANEL_NAME,
            frontend_url_path=DOMAIN,
            module_url=FRONTEND_FILE,
            sidebar_title="JARVIS",
            sidebar_icon="mdi:robot-outline",
            require_admin=False,
            config={},
        )

    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up JARVIS Core 2 from a config entry."""
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = entry.data
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a JARVIS Core 2 config entry."""
    hass.data.get(DOMAIN, {}).pop(entry.entry_id, None)
    return True
