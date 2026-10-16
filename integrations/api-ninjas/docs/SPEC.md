# API Ninjas

This integration exposes 25 read-only tools in six selectable API areas. Requests use the API Ninjas HTTPS API and the `X-Api-Key` header. Obtain a key from your account dashboard. The connection requires no other settings and does not use OAuth.

## Supported tools

| Area | Tool | Official endpoint documentation |
| --- | --- | --- |
| Finance | `get_stock_price` | [Stock Price](https://api-ninjas.com/api/stockprice), `/v1/stockprice` |
| Finance | `get_exchange_rate` | [Exchange Rate](https://api-ninjas.com/api/exchangerate), `/v1/exchangerate` |
| Finance | `get_commodity_price` | [Commodity Price](https://api-ninjas.com/api/commodityprice), `/v1/commodityprice` |
| Finance | `get_crypto_price` | [Crypto Price](https://api-ninjas.com/api/cryptoprice), `/v1/cryptoprice` |
| Finance | `convert_currency` | [Convert Currency](https://api-ninjas.com/api/convertcurrency), `/v1/convertcurrency` |
| Places and Weather | `get_weather`, `get_weather_forecast` | [Weather](https://api-ninjas.com/api/weather), `/v1/weather`, `/v1/weatherforecast` |
| Places and Weather | `get_air_quality` | [Air Quality](https://api-ninjas.com/api/airquality), `/v1/airquality` |
| Places and Weather | `geocode_location` | [Geocoding](https://api-ninjas.com/api/geocoding), `/v1/geocoding`, `/v1/reversegeocoding` |
| Places and Weather | `search_countries` | [Country](https://api-ninjas.com/api/country), `/v1/country` |
| Places and Weather | `search_cities` | [City](https://api-ninjas.com/api/city), `/v1/city` |
| Places and Weather | `get_world_time` | [World Time](https://api-ninjas.com/api/worldtime), `/v1/worldtime` |
| Text and Language | `analyze_sentiment` | [Sentiment](https://api-ninjas.com/api/sentiment), `/v1/sentiment` |
| Text and Language | `compare_text_similarity` | [Text Similarity](https://api-ninjas.com/api/textsimilarity), `/v1/textsimilarity` |
| Text and Language | `lookup_word` | [Dictionary](https://api-ninjas.com/api/dictionary) and [Thesaurus](https://api-ninjas.com/api/thesaurus) |
| Health and Wellness | `get_nutrition` | [Nutrition](https://api-ninjas.com/api/nutrition), `/v1/nutrition` |
| Health and Wellness | `search_exercises` | [Exercises](https://api-ninjas.com/api/exercises), `/v1/exercises` |
| Entertainment and Reference | `get_quotes` | [Quotes](https://api-ninjas.com/api/quotes), `/v2/quotes` |
| Entertainment and Reference | `get_trivia` | [Trivia](https://api-ninjas.com/api/trivia), `/v1/trivia` |
| Entertainment and Reference | `get_historical_events` | [Historical Events](https://api-ninjas.com/api/historicalevents), `/v1/historicalevents` |
| Entertainment and Reference | `get_holidays` | [Holidays](https://api-ninjas.com/api/holidays), `/v2/holidays` |
| Entertainment and Reference | `lookup_animal` | [Animals](https://api-ninjas.com/api/animals), `/v1/animals` |
| Internet and Contact Validation | `lookup_ip` | [IP Lookup](https://api-ninjas.com/api/iplookup), `/v1/iplookup` |
| Internet and Contact Validation | `lookup_domain` | [WHOIS](https://api-ninjas.com/api/whois) and [DNS Lookup](https://api-ninjas.com/api/dnslookup) |
| Internet and Contact Validation | `validate_contact` | [Validate Email](https://api-ninjas.com/api/validateemail) and [Validate Phone](https://api-ninjas.com/api/validatephone) |

## Behavior and limits

- Provide both latitude and longitude, or a city, for location lookups. Weather also accepts a US ZIP code. Coordinates take precedence when multiple methods are provided. World time accepts an IANA timezone, which takes precedence over other location fields.
- Free stock prices represent the latest completed trading session; free crypto prices update hourly, exchange rates update daily, and commodity prices reflect the last completed daily settlement. Premium plans provide live prices/rates. Quotes are deterministic, and quotes, exercises, historical events, trivia, and city searches expose applicable pagination controls without adding paid parameters by default.
- Commodity quotes include their currency and unit. Some commodities use `USX` (US cents), so the numeric price should be interpreted with those fields.
- Nutrition calories and protein availability depend on the plan. Unavailable calories are not reported as zero or included in a fabricated total.
- Country populations use thousands; city populations use people. Country results retain the full statistics returned by the provider.
- Reverse geocoding results may omit matched-place latitude and longitude; these summaries are then omitted. The requested lookup point and nested airport coordinates are not substituted for place coordinates.
- WHOIS date summaries use the earliest reported timestamp as an ISO date; original date arrays remain available. DNS SOA records carry structured fields and may have no scalar `value`.
- Email and phone validation return the provider's validity status. Phone time zones are a separate array; they are never used as a line type. MX availability is omitted when the provider does not explicitly return it.
- Original provider data is retained alongside typed summaries, including unavailable values and fields added by the provider.
- Premium restrictions apply to some filters, pagination, historical holiday years, richer data, and commercial use. Provider errors retain their details; see [error codes](https://api-ninjas.com/error-codes).

The supported tools do not register webhooks, perform resource mutations, or generate downloadable files. The broader API Ninjas catalog includes other APIs that this integration does not expose.
