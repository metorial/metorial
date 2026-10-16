# Minerstat

Monitor cryptocurrency mining workers, inspect real-time and historical mining data, and read worker configuration. Create, update, and delete workers; manage group membership, pool and wallet tags, customer sub-accounts, and GPU overclocking profiles. Send remote worker commands and query coin profitability data, hardware benchmarks, and mining pools.

## Authentication

Use API Credentials with a management bearer token and monitoring access key, or Monitoring Only with an access key. A separate optional developer API key enables coin, hardware, and pool tools. Choose Developer Data Only to use those three tools without monitoring credentials. Obtain credentials from the Minerstat dashboard and developer portal. Management operations require the appropriate account access.

## Tools

- Reference data: `get_coins`, `get_hardware`, `get_pools`.
- Monitoring: `list_workers`, `get_worker_history`, `get_mining_statistics`.
- Configuration and control: `get_worker_configuration`, `manage_worker`, `execute_worker_command`.
- Administration: `manage_tags`, `manage_customers`, `manage_clocktune`.

Historical results include the original provider response. Array-valued history rows are available under each entry's `values` field. Worker telemetry must match the required output fields; missing or incompatible metrics return a response-validation error instead of fabricated readings.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
