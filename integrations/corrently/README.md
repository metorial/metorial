# Corrently

Query German renewable-energy forecasts, electricity prices, CO2 intensity,
solar generation, electricity mix, and energy-account data. Create optimized
energy schedules, retrieve their recommendations, and report measured
consumption. Compare PHEV charging with fueling and create or update CO2 meters.

Connect with an API token from the [Developer Console](https://console.corrently.io/).
Anonymous access remains available for public endpoints that accept it. Tokens
can expire; replace an expired token in the connection. An optional default German
postal code can be set for tools that support it.

Solar capacity uses kWp and orientation uses compass degrees (north 0, east 90,
south 180, west 270). The integration converts these to the provider parameters.
Save the `scheduleId` returned by `create_energy_schedule` for schedule reads and
updates. Save the `meterId` returned by `update_co2_meter` for subsequent CO2 meter
reads and updates. CO2 meters expire if they are not updated before their returned
expiry timestamp.

Existing tools retain their public inputs and outputs; complete provider data is
also returned. See [the API specification](docs/SPEC.md) for endpoint coverage
and known documentation limits.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
