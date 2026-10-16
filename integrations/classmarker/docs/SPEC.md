# ClassMarker API specification

## Authentication

The fixed API origin is `https://api.classmarker.com`. Each request includes `api_key`, a Unix-seconds `timestamp`, and a lowercase SHA256 hash of `api_key + api_secret + timestamp`. The documented clock tolerance is five minutes. No global configuration or OAuth refresh is required.

## Tools

| Tool | Provider operation |
| --- | --- |
| `list_groups_and_links` | GET `/v1.json`; unwrap group, link, and assigned-test records |
| `get_exam_results` | GET recent results for all authorized groups/links, or one assignment identified by container and test IDs |
| `get_questions` | GET `/v1/questions.json?page=…` or `/v1/questions/{question_id}.json` |
| `create_or_update_question` | POST `/v1/questions.json` or PUT `/v1/questions/{question_id}.json` |
| `list_categories` | GET `/v1/categories.json` |
| `manage_category` | POST parent/subcategory, or PUT an existing category |
| `manage_access_list` | POST/DELETE a JSON array at `/v1/accesslists/{access_list_id}.json` |
| `download_certificate` | Deliver the certificate PDF URL returned with an exam result |

Question and category writes accept optional `verifyOnly`, sent as `verify_only`, to validate without saving. Four question types can be written: multiple choice, multiple response, true/false, and essay. Other returned types remain readable, with complete raw records retained. Decimal point values returned as strings are normalized to numbers.

## Pagination, access, and errors

Results use `next_finished_after_timestamp` as the next request cursor and allow at most 200 records. Ordinarily the timestamp must be within three months; support can temporarily enable older history. Question listings use pages of 200. Access-list requests accept at most 100 codes of up to 255 characters; lists can hold 20,000 codes. The general limit is 30 requests per hour, with access-list writes exempt.

Provider failures can arrive with HTTP 200 and `status: error`. Both those failures and HTTP/network failures produce service errors. Full provider responses preserve unmodeled metadata. Certificate availability depends on exam settings; the download tool prepares the supplied provider URL and does not fetch the bytes during invocation.

## Scope

No account/self endpoint, exam creation/deletion, question deletion, access-list discovery beyond assigned links, or webhook registration endpoint is documented in the API reference. Question-level exam responses and category result breakdowns belong to webhook payloads and are not advertised by the results tool. No triggers are registered.

## Official references

- [API reference](https://www.classmarker.com/online-testing/docs/api/): authentication, results, access lists, categories, questions, and errors.
- [Provider client examples](https://github.com/classmarker/api-client): creation and update workflows. The API reference curl examples identify the question paths where isolated HTTP headings contain typographical errors.
- [Webhooks reference](https://www.classmarker.com/online-testing/docs/webhooks/): distinguishes the richer event data from polled results.
