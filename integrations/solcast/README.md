# Solcast

Retrieve solar irradiance, weather, and PV power forecasts, live estimates, historical time series, and Typical Meteorological Year datasets. Manage Advanced PV Power sites, discover site identifiers, submit measured power records, inspect terrain horizons, and retrieve configured grid aggregations.

Connect using an API key from the Solcast Toolkit. Tools return structured JSON data; access depends on the products enabled on your Solcast account.

Site-management capacity and export-limit inputs use kW and are converted to the API's MW units. Advanced PV operational caps and submitted measurement power values use MW. Raw site responses retain the provider's units.

See [the tool guide](docs/SPEC.md) and [Solcast's API reference](https://docs.solcast.com.au/).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
