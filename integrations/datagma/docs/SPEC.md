# Datagma integration reference

Datagma enriches person and company profiles and finds contact details using real-time API requests.

## Authentication

Use an API key from [Datagma’s API settings](https://app.datagma.com/user-api). Each request sends it as the `apiId` query parameter to `https://gateway.datagma.net`. No global configuration is required.

## Tools

| Tool key | Provider endpoint | Behavior |
| --- | --- | --- |
| `enrich_person` | `GET /api/ingress/v2/full` | Identify a person by LinkedIn URL, professional email, or full name with company. Optional flags expand the person, company, phone, and traffic data. |
| `enrich_company` | `GET /api/ingress/v2/full` | Enrich a company name, website, or French SIREN number. Optional flags expand company data. |
| `find_email` | `GET /api/ingress/v6/findEmail` | Find an email from full name and company. Supports domain-only results, country hints, and a LinkedIn company slug or URL. |
| `find_verified_email` | `GET /api/ingress/v8/findEmail` | Use the current email endpoint with full name or first and last name, plus a company name, domain, or LinkedIn company URL. |
| `search_phone` | `GET /api/ingress/v1/search` | Search using email, social profile URL, or both. Supports match threshold and WhatsApp checking. |
| `reverse_lookup` | `GET /api/ingress/v1/reverse_phone_lookup` or `GET /api/ingress/v1/reverse_email` | Resolve a phone number or a personal email outside the EU. Phone lookup accepts a country calling code. |
| `detect_job_change` | `GET /api/ingress/v4/update` | Check a named contact’s last known company and optional title. Provider documentation describes this endpoint as beta, primarily in France, Spain, Italy, and Germany. |
| `find_people` | `GET /api/ingress/v1/find_people` | Find up to 10 employees using a company LinkedIn ID, domain, or name, with optional title, country, and fuzzy search. |
| `enrich_twitter` | `GET /api/ingress/v1/twitter/by_username` or `GET /api/ingress/v1/twitter/by_email` | Look up Twitter/X data by username, LinkedIn profile, or email. |
| `get_credit_balance` | `GET /api/ingress/v1/mine` | Read the account’s current credit balance. |

## Response details

Person and company enrichment retain the provider’s complete nested profile objects. `enrich_person.email` is the email string; `emailDetails` preserves its provider verification result. `phone` contains the combined work-phone and mobile arrays; `phoneDetails` preserves the grouped result. Credit values are normalized to numbers.

`find_people.people` comes from the provider’s `employees` array. The result also identifies invalid company inputs and resolved company LinkedIn IDs. Phone search maps the provider’s source and person counters to numeric fields. Reverse-email lookup exposes the provider’s display name, position history, and education history; the history envelopes remain available as `positionsDetails` and `schoolsDetails`.

The API supports up to 10 requests per second. Successful person enrichment is documented as costing two credits. Find People costs 10 credits when successful and one when empty. Other credit charges depend on the operation and account; use reported consumption and balance to monitor usage.

## Official documentation

- [API overview](https://datagmaapi.readme.io/reference/getting-started-with-your-api)
- [Person and company enrichment](https://datagmaapi.readme.io/reference/ingressservice_fullapiv2)
- [Current email endpoint](https://datagmaapi.readme.io/reference/ingressservice_findemailv8)
- [Email lookup with country and domain options](https://datagmaapi.readme.io/reference/find-work-email-address)
- [Phone search](https://datagmaapi.readme.io/reference/ingressservice_search)
- [Reverse phone lookup](https://datagmaapi.readme.io/reference/ingressservice_searchbyphone)
- [Reverse email lookup](https://datagmaapi.readme.io/reference/ingressservice_searchbyemail)
- [Job change detection](https://datagmaapi.readme.io/reference/ingressservice_stellaupdatev2)
- [Find People](https://datagmaapi.readme.io/reference/ingressservice_findpeople)
- [Twitter by username](https://datagmaapi.readme.io/reference/ingressservice_gettwitterbyusername)
- [Twitter by email](https://datagmaapi.readme.io/reference/ingressservice_gettwitterbyemail)
- [Credit balance](https://datagmaapi.readme.io/reference/ingressservice_getcredit)
- [Rate limits](https://help.datagma.com/en/articles/8582305-batch-rate-limit-in-api)
