# <img src="https://provider-logos.metorial-cdn.com/norges-bank.svg" height="20"> Norges Bank

Retrieve raw exchange-rate and generic-rate SDMX JSON from the public Norges Bank API.

Norges Bank is Norway's central bank. This integration reads public statistics from
`https://data.norges-bank.no/api/data` and does not require authentication.

## Tools

- `get_exchange_rates`: fetch raw SDMX JSON for selected base currencies against NOK
  spot exchange rates.
- `get_generic_rates`: fetch raw SDMX JSON for Norwegian treasury bill and
  government bond generic interest rates.

## Authentication

No authentication is required. The package uses `addNone()` and calls the public
Norges Bank statistics API directly.

## Exchange Rates

`get_exchange_rates` builds requests against the `EXR` dataset:

```text
EXR/{frequency}.{baseCurrencies+}.NOK.SP
```

Inputs:

- `frequency`: `B`, `M`, or `A`.
- `baseCurrencies`: one or more supported base-currency codes.
- `startPeriod` and `endPeriod`: use `YYYY-MM-DD` for business-day data,
  `YYYY-MM` for monthly data, and `YYYY` for annual data.
- `locale`: optional, defaults to `en`.

The quote currency is fixed to `NOK` and the tenor is fixed to `SP` to match the
Norges Bank exchange-rate query form.

## Generic Rates

`get_generic_rates` builds requests against the `GOVT_GENERIC_RATES` dataset:

```text
GOVT_GENERIC_RATES/{frequency}.{tenors+}.{instrumentTypes+}.
```

Inputs:

- `frequency`: `B`, `M`, or `A`.
- `tenors`: `3M`, `6M`, `12M`, `3Y`, `5Y`, `7Y`, or `10Y`.
- `instrumentTypes`: `TBIL` or `GBON`.
- `startPeriod` and `endPeriod`: use `YYYY-MM-DD` for business-day data,
  `YYYY-MM` for monthly data, and `YYYY` for annual data.
- `locale`: optional, defaults to `en`.

Supported combinations are validated before calling the API:

- `TBIL`: `3M`, `6M`, `12M`.
- `GBON`: `3Y`, `5Y`, `7Y`, `10Y`.

## Output

Both tools return the raw SDMX JSON payload from Norges Bank with its `meta` and
`data` objects unchanged. The tools do not normalize series keys, dimensions, or
observations into a custom output shape.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>