# Slates Specification for Norges Bank

## Overview

Norges Bank is Norway's central bank. Its public statistics API exposes economic
and financial datasets, including exchange rates and Norwegian government
interest-rate data. The API returns SDMX JSON for structured time-series data,
with metadata, series dimensions, observation indexes, and period values in the
provider's native response format.

This integration focuses on two read-only public datasets:

- `EXR`: exchange rates for selected base currencies against Norwegian krone.
- `GOVT_GENERIC_RATES`: generic interest rates for Norwegian treasury bills and
  government bonds.

## Authentication

The Norges Bank statistics API does not require authentication for these public
datasets. No API key, OAuth flow, token, or account-specific credential is
needed.

The base URL used by this integration is:

```text
https://data.norges-bank.no/api/data
```

Requests include `format=sdmx-json`, `apisrc=qb`, a locale, and a start/end
period range. The integration uses the no-auth Slate authentication method.

## Features

### Exchange Rates

Retrieve raw SDMX JSON from the `EXR` dataset for selected base currencies
against Norwegian krone spot rates.

The request path has this shape:

```text
EXR/{frequency}.{baseCurrencies+}.NOK.SP
```

- `frequency` supports business-day, monthly, and annual data: `B`, `M`, `A`.
- `baseCurrencies` supports the currency and krone-index codes exposed by the
  Norges Bank query form.
- The quote currency is fixed to `NOK`.
- The tenor is fixed to `SP` for spot rates.
- Period formats are validated by frequency: `YYYY-MM-DD` for `B`, `YYYY-MM`
  for `M`, and `YYYY` for `A`.

The tool returns the provider's raw SDMX JSON response unchanged, including
`meta`, `data.dataSets`, `data.structure`, dimensions, series keys, and
observation indexes.

### Generic Interest Rates

Retrieve raw SDMX JSON from the `GOVT_GENERIC_RATES` dataset for Norwegian
treasury bill and government bond generic rates.

The request path has this shape:

```text
GOVT_GENERIC_RATES/{frequency}.{tenors+}.{instrumentTypes+}.
```

- `frequency` supports business-day, monthly, and annual data: `B`, `M`, `A`.
- `tenors` supports `3M`, `6M`, `12M`, `3Y`, `5Y`, `7Y`, and `10Y`.
- `instrumentTypes` supports `TBIL` and `GBON`.
- Period formats are validated by frequency: `YYYY-MM-DD` for `B`, `YYYY-MM`
  for `M`, and `YYYY` for `A`.

Static form-derived combinations are validated before calling the API:

- `TBIL` supports `3M`, `6M`, and `12M`.
- `GBON` supports `3Y`, `5Y`, `7Y`, and `10Y`.

The tool returns the provider's raw SDMX JSON response unchanged, including
`meta`, `data.dataSets`, `data.structure`, dimensions, series keys, and
observation indexes.

### Static Options

The integration keeps frequency, currency, tenor, and instrument options as
static enums derived from Norges Bank query-form metadata. This keeps the tool
schema deterministic and lets invalid requests fail locally before an upstream
API call is made.

If Norges Bank changes the query-form option set, the static maps in
`src/lib/options.ts` should be refreshed from the metadata endpoints.

## Events

The provider does not support webhooks or event subscriptions for these public
statistics endpoints. This integration is read-only and tool-only.
