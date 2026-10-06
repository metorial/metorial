# Wolfram Alpha API Specification

This integration computes mathematical and factual results using Wolfram Alpha's request-response APIs. It does not provide webhooks or event subscriptions.

## Authentication and configuration

Register an application in the [Developer Portal](https://developer.wolframalpha.com/) and connect its AppID. Each request uses the `appid` query parameter. There is no OAuth refresh flow. An AppID must be enabled for the API products used by the selected tools; provider licensing and topic restrictions may apply. No account identity endpoint is documented for these APIs.

The optional `unitSystem` configuration defaults to `metric`. Individual tools can override it with `metric` or `imperial`. Full Results and LLM requests translate `imperial` into the provider's `nonmetric` value; the other API products use `imperial` directly.

## Tools

| Key | Provider endpoint | Result |
| --- | --- | --- |
| `full_results_query` | `https://api.wolframalpha.com/v2/query` | JSON result pods with IDs, text, images, assumptions, and available state tokens. Image and sound files are available for download. |
| `short_answer` | `https://api.wolframalpha.com/v1/result` | One concise plaintext answer. |
| `spoken_result` | `https://api.wolframalpha.com/v1/spoken` | A text sentence suitable for speech synthesis; it does not generate audio. |
| `simple_image` | `https://api.wolframalpha.com/v1/simple` | A downloadable rendered image. The retained `imageUrl` field identifies the provider endpoint without credentials and requires an AppID when called directly. |
| `llm_query` | `https://www.wolframalpha.com/api/v1/llm-api` | Computed text for language-model workflows. Supports a character limit, assumption tokens, units, and location context. |
| `validate_query` | `https://api.wolframalpha.com/v2/validatequery` and `https://www.wolframalpha.com/queryrecognizer/query.jsp` | Parsing status, recognition status, domain, and the provider result significance score. `confidence` is that score divided by 100, not a probability. |

All existing tool keys and field types are retained. Additional pod-ID and pod-state arrays extend their corresponding single-value fields. Multiple assumptions and states use repeated query parameters. Location, IP address, and latitude/longitude context are mutually exclusive.

`significantDigits` remains present for compatibility but cannot be used: the provider's `sig` parameter is a request signature, not a precision setting. To request more digits, pass a `More digits` state token returned by a previous query to `podState` or `podStates`.

## Result behavior

Full queries can return `success: false` with suggestions when an input cannot be understood. Provider errors, HTTP failures, unsupported combinations, and empty inputs produce actionable errors. Query validation does not guarantee that a complete computation will succeed. Short and spoken APIs may return HTTP 501 when no sufficiently short answer exists.

The full-results tool returns JSON structure and supports the provider's pod-content formats, including plaintext, images, MathML, and sound where available. Formula computation is possible through assumption tokens; this integration does not generate interactive calculator interfaces. Step-by-step results are available only when returned pod states and account entitlements permit them. Asynchronous delivery and recalculation are outside the current tool surface.

## Official references

- [Full Results API](https://products.wolframalpha.com/api/documentation/)
- [Short Answers API](https://products.wolframalpha.com/short-answers-api/documentation/)
- [Spoken Results API](https://products.wolframalpha.com/spoken-results-api/documentation/)
- [Simple API](https://products.wolframalpha.com/simple-api/documentation/)
- [LLM API](https://products.wolframalpha.com/llm-api/documentation/)
- [Fast Query Recognizer](https://products.wolframalpha.com/query-recognizer/documentation/)
- [Instant Calculators](https://products.wolframalpha.com/instant-calculators-api/documentation/)
