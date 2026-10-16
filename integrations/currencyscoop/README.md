# Currency Scoop

Retrieve exchange rates, historical rates, conversions, daily time-series data, and supported currency metadata through the CurrencyBeacon API.

Connect with your dashboard API key. The connection's default base currency is USD; rate tools accept a per-request override. Rates express quoted-currency units per one base-currency unit. Conversion timestamps use Unix seconds. Freshness, endpoint access, and date-range limits depend on the provider plan.

All five tools retain their existing inputs and outputs and include an optional complete `raw` provider response. Missing required provider fields produce a clear error instead of invented values.

See [API documentation](https://www.currencybeacon.com/api-documentation) and [tool details](./docs/SPEC.md).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
