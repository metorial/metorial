# Sensibo integration specification

The integration uses the [Sensibo HTTP API](https://support.sensibo.com/api/) with a query API key created in account settings. Requests enable gzip compression. API keys are owned only by authentication; no device ID or account ID is required in connection configuration. API-key rotation is managed in Sensibo account settings; commercial OAuth is not implemented because its endpoints and scopes are not public.

`list_devices` discovers authorized devices. `get_device` returns the current state, measurements, supported modes, current-mode capabilities, and complete device data with credentials redacted. The temperature range uses the device's actual current temperature unit. `get_ac_states` reads up to 20 recent state records. `set_ac_state` validates requested values against the device's reported capabilities and includes the current state for single-property updates.

`get_measurements` reads historical temperature and humidity. `get_device_events` maps the documented event identifiers, kind, description, and timestamp. The existing history inputs accept 1–7 whole days; the provider controls actual history availability. No seven-day retention guarantee is made.

Timers and the current schedule tool use the [official OpenAPI's API v1 server overrides](https://raw.githubusercontent.com/Sensibo/sensibo.github.io2/master/sensibo.openapi.yaml). `manage_recurring_schedule` supports list, get, create, set_enabled, and delete. Creation requires `targetTimeLocal`, an explicit IANA `timezone`, `acState`, and lowercase weekdays in `recurOnDaysOfWeek`. An empty weekday list means no recurrence. The documented schedule PUT operation only accepts `isEnabled`; modifying other settings requires creating a replacement and deleting the original after review.

`manage_schedule` is deprecated because its creation input cannot express the required timezone and uses a different time field. Its original handler, schemas, v2 paths, and payloads are preserved. This does not claim Sensibo retired those paths. The legacy broader update payload is retained; provider acceptance has not been verified.

Climate React uses `/pods/{device_id}/smartmode` for get, toggle, and configuration. Existing trigger values and optional rule fields remain available. Threshold states are checked against actual device capabilities. Required enabled state must come from the response rather than an assumed value.

`get_door_sensor_history` uses the documented `/doorSensors/{sensor_id}/events` endpoint with an actual `ds_` sensor ID and returns `opened`/`closed` states. The public API does not document a dedicated sensor discovery endpoint. The deprecated `get_door_sensor_events` retains its original device-ID input, device-based route, handler, and schemas; these cannot faithfully represent the documented sensor-ID operation.

No public account/self identity endpoint suitable for API-key authentication is documented. `/users/me/pods` discovers devices; it is not an account profile endpoint. Airbend organization and administrative operations, commercial OAuth, and webhook registrations are not included. Current documentation exposes historical event reads rather than a documented webhook registration lifecycle.

No tools produce files. Provider errors are normalized to service errors with upstream response details, known credentials removed, and no raw request/error parent retained. Model-specific response shapes and mutation acceptance still require live verification.
