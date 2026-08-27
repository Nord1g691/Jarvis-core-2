"""Automatic power-sensor discovery for JARVIS Core Assistant."""
from __future__ import annotations

from dataclasses import dataclass
import re

from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import UnitOfPower
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.event import async_track_state_change_event

@dataclass
class _Candidate:
    entity_id: str | None = None
    score: int = -1

TARGETS = {
    "production": ("solar", "solaire", "production", "photovolta", "pv", "produit", "produced"),
    "consumption": ("consumption", "consommation", "maison", "house", "home", "load", "total", "usage", "consumed"),
    "import": ("import", "importation", "grid import", "réseau import", "from grid", "net import"),
    "export": ("export", "exportation", "grid export", "réseau export", "injection", "to grid", "net export"),
}

def _norm(value: object) -> str:
    return re.sub(r"[^a-z0-9]+", " ", str(value).lower()).strip()

def _score(state, keywords: tuple[str, ...]) -> int:
    if state.entity_id.startswith("sensor.jarvis_"):
        return -100
    attrs = state.attributes
    unit = _norm(attrs.get("unit_of_measurement", ""))
    dc = _norm(attrs.get("device_class", ""))
    if dc not in {"power", ""} and unit not in {"w", "kw"}:
        return -100
    if unit not in {"w", "kw"} and dc != "power":
        return -100
    text = " ".join(_norm(attrs.get(k, "")) for k in ("friendly_name", "name", "device_class", "state_class"))
    text += " " + _norm(state.entity_id)
    score = 1 + (10 if dc == "power" else 0) + (4 if unit in {"w", "kw"} else 0)
    for keyword in keywords:
        kw = _norm(keyword)
        if kw and kw in text:
            score += 8
    if "envoy" in text or "enphase" in text:
        score += 4
    if any(x in text for x in ("energy", "kwh", "voltage", "current", "frequency")):
        score -= 20
    return score

def _discover(hass: HomeAssistant) -> dict[str, str | None]:
    states = [s for s in hass.states.async_all("sensor") if not s.entity_id.startswith("sensor.jarvis_")]
    result: dict[str, str | None] = {}
    used: set[str] = set()
    for target in ("production", "import", "export", "consumption"):
        best = _Candidate()
        for state in states:
            if state.entity_id in used:
                continue
            score = _score(state, TARGETS[target])
            if score > best.score:
                best = _Candidate(state.entity_id, score)
        result[target] = best.entity_id if best.score >= 12 else None
        if result[target]:
            used.add(result[target])
    return result

async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback) -> None:
    async_add_entities([JarvisPowerSensor(hass, entry.entry_id, key) for key in TARGETS], update_before_add=True)

class JarvisPowerSensor(SensorEntity):
    _attr_native_unit_of_measurement = UnitOfPower.WATT
    _attr_device_class = "power"
    _attr_should_poll = True
    _attr_has_entity_name = True

    def __init__(self, hass: HomeAssistant, entry_id: str, key: str) -> None:
        self.hass = hass
        self._key = key
        self._source: str | None = None
        self._attr_unique_id = f"{entry_id}_{key}_power"
        self._attr_name = {"production":"Solar production","consumption":"Home consumption","import":"Grid import","export":"Grid export"}[key]
        self._attr_native_value = None

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        self._refresh_source()
        @callback
        def _changed(_event) -> None:
            old_source = self._source
            self._refresh_source()
            if old_source != self._source or self._attr_native_value is not None:
                self.async_write_ha_state()
        self.async_on_remove(async_track_state_change_event(self.hass, [s.entity_id for s in self.hass.states.async_all("sensor")], _changed))

    def _refresh_source(self) -> None:
        self._source = _discover(self.hass).get(self._key)
        state = self.hass.states.get(self._source) if self._source else None
        if state is None:
            self._attr_native_value = None
            self._attr_extra_state_attributes = {"auto_discovered": False}
            return
        try:
            value = float(state.state)
        except (TypeError, ValueError):
            self._attr_native_value = None
            self._attr_extra_state_attributes = {"source_entity": self._source, "auto_discovered": True}
            return
        unit = _norm(state.attributes.get("unit_of_measurement", "W"))
        self._attr_native_value = value * 1000 if unit == "kw" else value
        self._attr_extra_state_attributes = {"source_entity": self._source, "auto_discovered": True}

    async def async_update(self) -> None:
        self._refresh_source()
