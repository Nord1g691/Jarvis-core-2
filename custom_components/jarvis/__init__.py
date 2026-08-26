"""JARVIS Core Assistant integration."""

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

DOMAIN = "jarvis"


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up JARVIS from YAML (no-op for now)."""
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up JARVIS from a config entry."""
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload JARVIS."""
    return True
