"""JARVIS Core 2 Home Assistant integration."""
from __future__ import annotations

from pathlib import Path

from homeassistant.components.frontend import (
    add_extra_js_url,
    async_register_built_in_panel,
)
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import DOMAIN

FRONTEND_URL = "/jarvis_core"
FRONTEND_FILE = f"{FRONTEND_URL}/jarvis-core.js"
PANEL_URL = "jarvis"


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up JARVIS Core 2 and register its sidebar panel."""
    hass.data.setdefault(DOMAIN, {})
    frontend_dir = Path(__file__).parent / "frontend"

    await hass.http.async_register_static_paths(
        [
            StaticPathConfig(
                FRONTEND_URL,
                str(frontend_dir),
                cache_headers=False,
            )
        ]
    )

    add_extra_js_url(hass, FRONTEND_FILE)

    async_register_built_in_panel(
        hass,
        component_name="custom",
        sidebar_title="JARVIS",
        sidebar_icon="mdi:robot-outline",
        frontend_url_path=PANEL_URL,
        config={
            "_panel_custom": {
                "name": "jarvis-core-hud",
                "module_url": FRONTEND_FILE,
                "embed_iframe": False,
                "trust_external": False,
            }
        },
        require_admin=False,
        update=True,
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
