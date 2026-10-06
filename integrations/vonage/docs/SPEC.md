# Vonage integration contract

The public scope is the eleven retained tools. No triggers, Video API, Reports API, identity inventions or file-export capabilities are registered.

| Tool | Native contract |
| --- | --- |
| send_message | POST api.nexmo.com/v1/messages, Basic or JWT, 202 receipt; documented channel/type combinations |
| send_sms | POST rest.nexmo.com/sms/json, Basic, URL-encoded form; validate every message status and exact recipient |
| make_call | POST api.nexmo.com/v1/calls, JWT, 201; one phone destination and exactly one NCCO or answer URL |
| manage_call | PUT/DELETE exact calls/{uuid} and talk/stream/dtmf; modify 204, other receipts bound to exact UUID |
| list_calls | GET v1/calls or exact UUID; page_size, record_index, native count and continuation |
| verify_user | POST v2/verify, Basic or JWT, 202; 1–3 per-channel workflow recipients |
| check_verification | POST exact request to check supplied code; DELETE 204 cancellation with provider timing restrictions |
| number_insight | GET ni/{level}/json, Basic; nonzero failures rejected, advanced 43–45 remain explicit partial results |
| manage_numbers | Native search/list pages and URL-encoded buy/cancel/update; error-code 200 required; empty webhook clear preserved |
| manage_applications | Basic v2 application CRUD; exact receipts, caller-owned public key prerequisite, native configuration hydration |
| get_account_info | Basic balance and restricted subaccounts/transfers; nested _embedded primary account, nullable balances; caller-held creation secret |

No API secret is placed in a URL. Sensitive credentials and bounded decoded reflections are refused in business content. Known creation credential fields are excluded from public projections; public protocol trace behavior is verified separately. This bounded protection is not a universal decoder or a guarantee against all possible upstream encodings.

Compatibility exceptions: application keys.private_key and subaccount secret are intentionally omitted; optional publicKey and subaccountSecret remain optional in schemas but are prerequisites for creation. Unsupported channel/type combinations remain schema-valid and fail locally with remediation. Audio numeric level inputs map to documented native decimal strings. Page metadata is additive. Application updates preserve omitted current native fields but cannot prevent concurrent provider changes.

Official contracts: [Messages](https://developer.vonage.com/en/api/messages), [SMS](https://developer.vonage.com/en/api/sms), [Voice](https://developer.vonage.com/en/api/voice), [Verify](https://developer.vonage.com/en/api/verify.v2), [Numbers](https://developer.vonage.com/en/api/numbers), [Applications](https://developer.vonage.com/en/api/application.v2), [Account](https://developer.vonage.com/en/api/account), [Subaccounts](https://developer.vonage.com/en/api/subaccounts), [Number Insight](https://developer.vonage.com/en/api/number-insight), [Authentication](https://developer.vonage.com/en/getting-started/concepts/authentication).
