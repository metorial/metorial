# <img src="logo.png" height="20"> Sensibo

Discover Sensibo devices, inspect their current AC state and supported capabilities, control compatible air conditioners, and read environmental measurements and device events. Manage timers and schedules and configure Climate React rules.

Generate an API key at [Sensibo account settings](https://home.sensibo.com/me/api). Start with `list_devices`, then use `get_device` to inspect the selected device's capabilities before changing AC settings. Supported settings depend on the paired AC model.

Use `manage_recurring_schedule` for scheduling with an explicit local time and IANA timezone. Its update action enables or disables an existing schedule. Use `get_door_sensor_history` with the Door/Window Sensor's `ds_` ID. The older `manage_schedule` and `get_door_sensor_events` tools remain available for compatibility with their original request format.

Historical availability depends on the device and account. Airbend organization administration and bulk operations are outside this integration's tool surface.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
