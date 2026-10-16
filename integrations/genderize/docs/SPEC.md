# Genderize capabilities

Genderize predicts the gender statistically associated with a name. Its responses contain
the echoed name, a male/female/null prediction, probability, and supporting data count.
These are population statistics; binary results do not establish individual identities or
represent non-binary identities.

## Access and tools

An API key from the account dashboard is passed as `apikey`. The existing API-key and
no-authentication connection methods are retained. The provider controls whether requests
without a key are accepted. There are no configuration fields or OAuth tokens.

| Tool | Purpose |
| --- | --- |
| `predict_gender` | Predict for 1–10 names, retaining the existing input contract. |
| `predict_gender_batch` | Predict for 1–100 names in one request. |

Both tools support an optional ISO 3166-1 alpha-2 `countryId`, applied to the entire request.
Names are sent unchanged; full names, accents, and non-Latin names are supported. Batch
requests use repeated `name[]` query parameters and retain result order. Each name consumes
quota. There is no documented language filter or separate account/quota API endpoint.

## Results

`predictions` retains the provider's probability and count, including genuine null and zero
values. A null gender is a successful unknown prediction. No confidence or count defaults
are created. An optional `countryId` summary is emitted only from a returned string; the
complete provider object remains in `raw`, including a null `country_id` and additional
fields. Malformed required prediction data produces an error rather than fabricated data.

Available successful-response headers appear as optional `rateLimit.limit`,
`rateLimit.remaining`, and `rateLimit.resetSeconds`. Reset is a duration in seconds, not a
timestamp. Missing or malformed header values are omitted. API errors preserve the returned
HTTP status and error message. Quota headers on failed requests are not exposed separately.

## References

- [API reference](https://genderize.io/documentation/api/reference)
- [Official client SDK](https://github.com/DemografixGenderize/demografix-node)
- [Service FAQ and inference limitations](https://genderize.io/faq)
