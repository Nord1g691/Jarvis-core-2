"""JARVIS Core 2 Home Assistant integration."""
from __future__ import annotations

from pathlib import Path

from homeassistant.components.frontend import add_extra_js_url, async_register_built_in_panel
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import DOMAIN, FRONTEND_FILE, FRONTEND_URL, PANEL_URL
from .conversation import JarvisConversationView

PLATFORMS = ["sensor"]


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up JARVIS Core 2 and register its sidebar panel."""
    hass.data.setdefault(DOMAIN, {})
    hass.http.register_view(JarvisConversationView(hass))
    frontend_dir = Path(__file__).parent / "frontend"
    await hass.http.async_register_static_paths(
        [StaticPathConfig(FRONTEND_URL, str(frontend_dir), cache_headers=False)]
    )
    add_extra_js_url(hass, FRONTEND_FILE)
    add_extra_js_url(hass, f"{FRONTEND_URL}/jarvis-agent.js")
    add_extra_js_url(hass, f"{FRONTEND_URL}/jarvis-preferred-assist.js")
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
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload JARVIS Core 2 from a config entry."""
    unloaded = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    hass.data.get(DOMAIN, {}).pop(entry.entry_id, None)
    return unloaded
