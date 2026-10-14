# Benchmark Email Classic

This integration connects to Benchmark Email Classic REST API v3 at `https://clientapi.benchmarkemail.com` using an Admin API token in the `AuthToken` header. It does not connect to the separate newer Benchmark Email API at `api.benchmarkemail.io`.

## Available capabilities

- Discover campaigns, retrieve their content, create and update campaigns, delete campaigns to Trash, schedule delivery, and duplicate existing campaigns.
- Read aggregate campaign metrics and contact-level opens, clicks, bounces, and unsubscribes.
- Discover, create, update, and delete contact lists; retrieve list descriptions, active contact counts, and custom-field labels.
- List, add, update, and remove contacts within a list. Optional contact searches accept a field and match type. Active contacts exclude unsubscribes and hard bounces.
- Retrieve the connected account's client ID, contact email, name, login, company, status, and plan name.

Campaign writes use a `Detail` envelope. Contact and list writes use a `Data` envelope. Successful operation statuses can be the string `"1"`; errors are surfaced with provider details. Created campaign, list, and contact IDs come from `Response.Data.ID`. Account profile fields are returned directly under `Response`.

The existing `send_campaign` actions `draft` and `resend` remain available for compatibility, but their endpoints are absent from the official REST API v3 collection and require provider verification. Named campaign status-code filters also require verification; the official collection does not document a complete status-code map. Contact custom-field values are returned only when included by the provider's contact-list response.

## Official references

- [REST API v3 documentation](https://developer.benchmarkemail.com/)
- [Official REST API v3 Postman collection](https://github.com/BenchmarkEmail/RESTful-API-v3/blob/master/Postman%20Collections/Benchmark_Email_API_-_Public_V3.0.0.json)
- [API data models](https://ui.benchmarkemail.com/models.htm)
- [Benchmark platform API overview](https://www.benchmarkemail.com/features/api/)
