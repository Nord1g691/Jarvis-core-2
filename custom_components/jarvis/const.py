"""Constants for JARVIS Core 2."""

DOMAIN = "jarvis"
PANEL_URL = "jarvis"
FRONTEND_URL = "/jarvis_core"
FRONTEND_FILE = f"{FRONTEND_URL}/jarvis-core.js"

# Existing Home Assistant entities used by the HUD.
ENERGY_ENTITIES = {
    "production": "sensor.envoy_122323101280_production_solaire_instantanee",
    "consumption": "sensor.envoy_122323101280_consommation_electrique_actuelle",
    "import": "sensor.puissance_import_reseau",
    "export": "sensor.puissance_export_reseau",
}

SATELLITE_ENTITY = "assist_satellite.jarvis_iphone"
