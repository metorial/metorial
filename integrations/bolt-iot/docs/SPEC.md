# Bolt IoT API specification

## Authentication and device selection

Generate and enable an API key in [Bolt Cloud](https://cloud.boltiot.com/).
Requests use HTTPS with the key in `/remote/{api_key}/{command}` and a
`deviceName` query parameter for device commands. There is no OAuth token
refresh flow. The connection keeps its existing required default Device ID;
device tools also accept an optional `deviceName` override. Omission uses the
saved default, while an explicitly supplied value is forwarded unchanged.
`list_devices` retains its account-level request without a Device ID.

## Capabilities

- `list_devices`: preserves the existing `getDevices` request and device-list
  decoding, including the legacy success fallback for responses without a
  success field. The complete original response is also returned as `raw`.
- `get_device_status`: calls `isAlive` and, only for an alive device, attempts
  `version`. Firmware and hardware lookup is best effort; failure of that
  additional query does not discard an obtained status. Both original response
  envelopes are available in `raw` when received. Hardware names from both
  the API reference (`Bolt Version`) and official SDK (`Bolt Hardware Version`)
  are recognized.
- `get_device_online_status`: calls the official SDK's `isOnline` command and
  exposes the provider status and status-change time without converting the
  timestamp or substituting missing values. An actual offline/false status is
  data, not a command failure.
- `get_device_version`: queries `version` directly without a prior status call
  and preserves the original JSON-encoded version string.
- `restart_device`: issues the existing `restart` command.
- `digital_read` / `digital_write`: retain the existing single-pin versus
  multi-pin routing and comma-separated `pins` / `states` parameters.
- `analog_read` / `analog_write`: retain the existing analog input and PWM
  parameters, including the default `A0` read pin and original numeric ranges.
- `servo_control`: retains `servoWrite` with `pin` and `value`. The provider's
  servo article documents Bolt Cloud Pro and firmware 1.4.1 or later.
- `uart_communicate`: retains `serialBegin`, `serialWrite`, `serialRead`, and
  `serialWR`. Omitted `till` remains omitted; an explicit zero remains zero.
  Nonempty serial strings are forwarded unchanged. The legacy `baudRate`
  index is forwarded unchanged, including zero. An optional `baudRateBps`
  supplies an actual baud value for initialization and takes precedence when
  both fields are present. Only that new field has positive-integer validation.

All existing tool schemas and required output fields are retained. Device
responses are not reduced to numeric sensor values; original string values
and complete provider response metadata are available. Explicit provider
failure indicators and HTTP errors produce service errors. No file transfer,
OAuth scopes, pagination, or account identity operation is documented by the
reviewed primary API sources. This is one Bolt Cloud API product, so separate
tool categories are unnecessary.

## Documentation evidence and limits

Reviewed 2026-10-15:

- [Bolt Cloud API reference](https://cloud.boltiot.com/apiDoc): API-key path,
  device query parameter, GET requests, GPIO, analog, serial, version, restart,
  and alive/dead envelopes. This legacy reference has hardware and baud-rate
  differences from the SDK and current product specifications.
- [Official Inventrom SDK](https://github.com/Inventrom/bolt-api-python/blob/master/boltiot/bolt.py):
  `isOnline`, status-change time, alternate hardware-version key, and literal
  baud-rate arguments.
- [Official SDK URL templates](https://github.com/Inventrom/bolt-api-python/blob/master/boltiot/urls.py)
  and [request construction](https://github.com/Inventrom/bolt-api-python/blob/master/boltiot/requesting.py):
  `isOnline` path and unchanged baud argument substitution into `baud=`.
- [Servo motor control](https://www.boltiot.com/projects/posts/servo-motor-control-with-bolt-iot):
  servo endpoint, angle range, plan and firmware requirements.
- [Current hardware specifications](https://www.boltiot.com/techspecs): five
  digital pins with 3.3 V logic and one 10-bit ADC. GPIO voltage and analog
  input limits must follow the connected board's hardware documentation.
- [Official serial project](https://www.boltiot.com/projects/posts/iot-enabled-serial-lcd-display):
  `serialWR` and literal `baud=9600` examples.

The accessible official reference does not document `getDevices`,
`digitalMultiRead`, or `digitalMultiWrite`. These pre-existing operations and
request shapes remain intact; their current provider behavior was not verified.
The legacy Cloud reference uses baud index 2 for 9600, while the official SDK
and project send 9600 directly. Both forms are available without changing the
meaning of the original input. No provider or device calls were made during
this static refresh.
