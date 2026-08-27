"""Automatic power-sensor discovery for JARVIS Core Assistant."""
from __future__ import annotations

from dataclasses import dataclass

from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import UnitOfPower
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.event import async_track_state_change_event

from .const import DOMAIN


@dataclass
class _Candidate:
    entity_id: str | None = None
    score: int = -1


TARGETS = {
    "production": ("solar", "solaire", "production", "photovolta", "pv", "produit"),
    "consumption": ("consumption", "consommation", "maison", "house", "home", "load"),
    "import": ("import", "importation", "grid import", "réseau import"),
    "export": ("export", "exportation", "grid export", "réseau export", "injection"),
}


def _score(state, keywords: tuple[str, ...]) -> int:
    attrs = state.attributes
    unit = str(attrs.get("unit_of_measurement", "")).lower()
    device_class = str(attrs.get("device_class", "")).lower()
    if device_class not in {"power", ""} and unit not in {"w", "kw"}:
        return -100
    if unit not in {"w", "kw"} and device_class != "power":
        return -100
    text = " ".join(
        str(attrs.get(k, "")) for k in ("friendly_name", "name", "device_class")
    ).lower()
    text += " " + state.entity_id.lower()
    score = 1
    if device_class == "power":
        score += 4
    if unit in {"w", "kw"}:
        score += 2
    for keyword in keywords:
        if keyword in text:
            score += 5
    return score


def _discover(hass: HomeAssistant) -> dict[str, str | None]:
    result: dict[str, str | None] = {}
    for target, keywords in TARGETS.items():
        best = _Candidate()
        for state in hass.states.async_all("sensor"):
            score = _score(state, keywords)
            if score > best.score:
                best = _Candidate(state.entity_id, score)
        result[target] = best.entity_id if best.score >= 8 else None
    return result


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    """Create four read-only JARVIS power sensors using automatic discovery."""
    entities = [JarvisPowerSensor(hass, entry.entry_id, key) for key in TARGETS]
    async_add_entities(entities)


class JarvisPowerSensor(SensorEntity):
    """Read-only proxy exposing an automatically discovered HA power sensor."""

    _attr_native_unit_of_measurement = UnitOfPower.WATT
    _attr_device_class = "power"
    _attr_should_poll = True
    _attr_has_entity_name = True

    def __init__(self, hass: HomeAssistant, entry_id: str, key: str) -> None:
        self.hass = hass
        self._key = key
        self._source: str | None = None
        self._attr_unique_id = f"{entry_id}_{key}_power"
        self._attr_name = {
            "production": "Solar production",
            "consumption": "Home consumption",
            "import": "Grid import",
            "export": "Grid export",
        }[key]
        self._attr_native_value = None

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        self._refresh_source()

        @callback
        def _changed(_event) -> None:
            self._refresh_source()
            self.async_write_ha_state()

        self.async_on_remove(
            async_track_state_change_event(
                self.hass,
                list(self.hass.states.async_entity_ids("sensor")),
                _changed,
            )
        )

    def _refresh_source(self) -> None:
        sources = _discover(self.hass)
        self._source = sources.get(self._key)
        state = self.hass.states.get(self._source) if self._source else None
        if state is None:
            self._attr_native_value = None
            return
        try:
            value = float(state.state)
        except (TypeError, ValueError):
            self._attr_native_value = None
            return
        unit = str(state.attributes.get("unit_of_measurement", "W")).lower()
        self._attr_native_value = value * 1000 if unit == "kw" else value
        self._attr_extra_state_attributes = {
            "source_entity": self._source,
            "auto_discovered": True,
        }

    async def async_update(self) -> None:
        self._refresh_source()
