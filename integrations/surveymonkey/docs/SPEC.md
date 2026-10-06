# SurveyMonkey API coverage

This package implements 23 public tools against the current official [v3 API reference](https://api.surveymonkey.com/v3/docs). It retains the 19 existing action keys and removes obsolete webhook helpers and unused permission requests. There are no trigger replacements.

| Workflow | Native API |
| --- | --- |
| Current identity | GET /v3/users/me |
| Surveys | GET/POST /v3/surveys; GET/PATCH/DELETE /v3/surveys/{id}; GET /v3/surveys/{id}/details |
| Collectors | GET/POST /v3/surveys/{id}/collectors; GET/PATCH/DELETE /v3/collectors/{id} |
| Responses | GET /v3/surveys/{id}/responses/bulk; GET /v3/surveys/{id}/responses/{id}/details |
| Contact lists | GET/POST /v3/contact_lists; GET/DELETE /v3/contact_lists/{id} |
| Contacts | GET /v3/contact_lists/{id}/contacts/bulk; POST /v3/contact_lists/{id}/contacts and /bulk; GET/PATCH/DELETE /v3/contacts/{id} |
| Invitation lifecycle | POST /v3/collectors/{id}/messages; GET/DELETE /v3/collectors/{id}/messages/{id}; POST .../recipients/bulk; GET .../recipients; POST .../send |
| References | GET /v3/survey_templates, /v3/survey_categories, /v3/survey_folders |
| Downloadable results | Bounded locally generated JSON/CSV from response details; optional signed uploaded-response file URLs |

OAuth authorization and token URLs are https://api.surveymonkey.com/oauth/authorize and /oauth/token. The token exchange is form encoded and persists access_url. Only documented HTTPS US/EU/Canada origins receive a Bearer token. The reference states tokens currently do not expire and documents no refresh grant. Profile discovery uses the genuine current-user endpoint. No opaque resource ID or duplicate auth property is required by connection config.

Existing fields remain available. Collector name is still optional in the input shape for compatibility but is required before a write because the native request requires it. firstName/lastName become optional for contacts where native absence is legitimate. False, zero, and explicitly empty editable values are preserved. Empty patches, invalid resource IDs, inappropriate email-collector settings, and invalid branch combinations fail before mutation. Survey folder patching is documented in the current PATCH request table. The legacy thankYouMessage field remains accepted as the provider’s documented older form.

Every list exposes native paging metadata. Unsafe numeric resource IDs are refused rather than rounded; numeric nested IDs that are safe integers become exact strings. Native counts remain numbers. Numeric recipient-ID arrays receive the same precision checks before JSON parsing. Contradictory totals, page sizes, duplicate IDs, or continuation links fail rather than implying a complete result. Reflected connection credentials, including encoded values and response keys, are refused before public output or file generation. get_response uses /details to retrieve actual answers. list_contacts uses /bulk to obtain expanded contact fields. Contact creation handles the provider’s documented single-list receipt envelope as well as a direct object.

Invitation prepare/resume/get/delete makes partial effects recoverable by exact message ID. A valid ID in a received creation response is preserved in safe error details before the remaining receipt is validated; an incomplete or queued receipt never causes recipient changes or an automatic send. Recipient acceptance is checked before sending, and no send result is fabricated as delivered. Reminder/thank_you messages do not accept new contact-list recipients. Existing OAuth grants remain usable; removed unused scopes do not revoke existing connections. Needed grants require app configuration and reconnection if absent.

Response-file links carry the native Expires timestamp, approximately 12 hours according to the reference. Renewal re-reads the same authorized response and rejects account, region, survey, answer, file path, MIME, or content identity drift. It uses only the native signed download_url without a Bearer header; the human_download_url requires interactive login and is not used. URLs are not returned as inline file output fields. Local exports have no provider export endpoint or URL renewal, are limited to 100 pages/10000 rows/32 MiB, and truthfully identify incomplete traversal and continuation. Native paging does not guarantee a snapshot.

[Survey deletion](https://help.surveymonkey.com/en/surveymonkey/manage/survey-deletion/) removes the entire survey and responses. [Contact organization and retention](https://help.surveymonkey.com/en/surveymonkey/send/organizing-contacts/) explains that list deletion leaves global contacts and contact deletion can leave invitation/response personal data. Collector and message deletion prove only the exact native resource is unavailable, not erasure or recall. Required plan, scope, app approval, API/contact/sending limits still apply.
