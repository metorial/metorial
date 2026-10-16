# Corrently API specification

Corrently provides location-based energy forecasts and optimization APIs for
Germany. The API base is `https://api.corrently.io/v2.0`.

## Authentication and configuration

Use an API token from the [official console](https://console.corrently.io/).
The console documents bearer authentication and the `token` query parameter;
this integration sends a bearer token. Token authentication trims and rejects
blank credentials. Anonymous connections remain available for public endpoints.
Tokens expire and must be replaced when rejected. This is token authentication,
not OAuth; no refresh-token grant is documented.

Configuration contains only an optional default German postal code. Resource
identifiers belong in individual tool calls. The reviewed public API catalog has
no documented authenticated profile/self endpoint, so no identity tool is added.

## Registered tools

| Tool | Method and path | Behavior |
| --- | --- | --- |
| `get_green_power_index` | GET `/gsi/prediction` | Hourly renewable-energy and CO2 forecast; numeric price strings are converted to numbers. |
| `get_best_hour` | GET `/gsi/bestHour` | Existing best-hour query; `lookAheadHours` and `requiredHours` remain numbers, with whole-hour validation at runtime. |
| `get_market_data` | GET `/gsi/marketdata` | Wholesale and local electricity prices, location cells, and interval timestamps. |
| `get_dispatch` | GET `/gsi/dispatch` | Renewable mix and inter-location energy flows; GeoJSON coordinates map to latitude/longitude. |
| `create_energy_schedule` | PUT `/gsi/schedule` | Create a schedule, return its ID/status and nested time slots. Optional date, coverage, consecutive-hour, and load requirements are supported. |
| `get_energy_schedule` | GET `/gsi/schedule` | Retrieve a schedule by the ID from creation, including recommendations and progress. |
| `update_energy_schedule_requirements` | POST `/gsi/schedule` | Submit `requirement_update` with optimization requirements. |
| `report_energy_schedule_consumption` | POST `/gsi/schedule` | Submit `status_update` with current measurements or measured time slots. |
| `get_strommix` | GET `/gsi/strommix` | Generation mix for a predefined period or custom range. Documented periods include `lastmonth` and `last7days`; earlier `last_month` and `last_7_days` spellings remain accepted and are translated. Source arrays are exposed in the existing object output by source code, plus the full response. |
| `get_merit_order` | GET `/mol/analysis` | Merit-order analysis price buckets with generation and capacity utilization. Accepts the documented top-level array. |
| `get_solar_prediction` | GET `/solar/prediction` | Maps `lng/tilt/azimuth/kwp/technology` to `lon/deg/az/wp/tech`, converts kWp to Wp, and converts compass orientation to the provider south-zero convention. Maps `output[].timestamp/wh` to the existing forecast output. Optional system loss and existing plant ID are supported. |
| `get_co2_advice` | GET `/gsi/advisor` | Uses postal code parameter `q`; returns hourly intensity, traffic-light advice, and thresholds. |
| `compare_charge_or_fuel` | GET `/phev/chargeorfuel` | Uses postal code and vehicle electric/fuel consumption per 100 km; returns cost and emissions comparisons with local station details. |
| `get_co2_meter` | GET `/co2meter` | Retrieve by `meterId` returned from meter creation. |
| `update_co2_meter` | POST `/co2meter` | Create with postal code and cumulative Wh reading, or update by `meterId`. Returns ID, reading, CO2, and expiry. |
| `submit_meter_reading` | POST `/metering/reading` | Retained legacy metering operation, including account and secret inputs. |
| `get_stromkonto_balances` | GET `/stromkonto/balances` | Retained balance operation, preserving array/envelope support and transaction mapping. |
| `get_tariff_info` | GET `/tariff/components` | Retained tariff query with annual consumption and both legacy/corrected spelling support in component mapping. |
| `calculate_co2_offset` | GET `/tree/calculateCO2` | Retained offset calculation query. |

All existing tool keys, input types, required fields, and enum values are retained.
Provider data is preserved in `raw` for existing tools and schedule/CO2-meter
operations, or in the complete `data` object for advice/comparison reads.
Validation and provider failures return structured service errors. Requests have
a 30-second timeout. No file-download API is exposed by these tools.

## Official references

- [API catalog](https://console.corrently.io/apis.html)
- [Forecast contract](https://console.corrently.io/assets/js/GruenstromIndex.json)
- [Market-data contract](https://console.corrently.io/assets/js/Marketdata.json) and [official endpoint example](https://corrently.io/books/marktdaten-strompreis/page/offentlicher-service)
- [Dispatch contract](https://console.corrently.io/assets/js/dispatch.json)
- [Schedule contract](https://console.corrently.io/assets/js/schedule.json)
- [Solar contract](https://console.corrently.io/assets/js/pvgeneration.json)
- [Electricity-mix contract](https://console.corrently.io/assets/js/strommix.json)
- [Merit-order contract](https://console.corrently.io/assets/js/mol.json)
- [CO2 advice contract](https://console.corrently.io/assets/js/co2advisor.json)
- [PHEV contract](https://console.corrently.io/assets/js/phevChargeOrFuel.json)
- [CO2-meter contract](https://console.corrently.io/assets/js/co2meter.json)
- [Official SDK source](https://github.com/energychain/corrently-api/blob/main/corrently-client.cjs)

The market-data OpenAPI path omits `/gsi`, while its examples and the official
endpoint article include it; the integration retains the documented example path.
Current official console contracts do not describe the legacy best-hour,
`/metering/reading`, Stromkonto balances, tariff components, or tree-offset
contracts in enough detail to independently verify every field. Those public
operations are retained rather than remapped speculatively. New coverage uses the
published official contracts above. No live provider calls were made during this
refresh. No events/webhooks are registered; no event API appears in the reviewed
catalog.
