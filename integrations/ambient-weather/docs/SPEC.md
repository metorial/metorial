# Ambient Weather API

The integration exposes three read-only tools using the REST API at
`https://rt.ambientweather.net/v1`.

| Tool | Request and behavior |
| --- | --- |
| List Devices | `GET /devices`; discover station MAC addresses, metadata, and latest readings. |
| Get Current Weather | Uses the same device list and selects a station by MAC address. Returns its latest reported readings unchanged. |
| Get Device Data | `GET /devices/{macAddress}`; returns historical readings unchanged, newest first. Optional `limit` is a number between 1 and 288; the provider default is 288. Optional `endDate` is a date string converted to epoch milliseconds. |

Both `apiKey` and `applicationKey` are required query parameters. Create them in
[account settings](https://ambientweather.net/account). There is no OAuth refresh
flow or additional connection configuration.

Historical data is stored in 5 or 30 minute increments and can lag the latest
reported reading by up to 10 minutes. Sensor fields vary by station. Requests
are limited to one per second per API key and three per second per application
key; HTTP failures, including rate limits, are surfaced as errors.

No account-profile REST endpoint is documented. The device list provides
discovery for the connected credentials. The provider also documents a
Socket.io API; this integration does not maintain streaming subscriptions or
register triggers.

## Official references

- [API reference](https://ambientweather.docs.apiary.io/)
- [Provider-maintained REST and realtime specification](https://github.com/ambient-weather/api-docs/blob/master/apiary.apib)
- [Device fields and data timing](https://github.com/ambient-weather/api-docs/wiki/Device-Data-Specs)
