# Loops API integration

## Scope

Eleven tools cover contact create/update/find/delete, mailing-list subscriptions, property and published-template discovery, event submission, transactional sends, connected-team verification and read-only contact suppression. Campaign/content/workflow authoring, suppression removal and property-definition creation are outside this scope. No incoming trigger or webhook registration is provided.

## Authentication

An API key from Settings → API is sent as `Authorization: Bearer <key>` to the fixed `https://app.loops.so/api/v1` host. `get_current_team` uses `/api-key` to verify the key and return its team name; this endpoint does not expose a team ID. Keys are team-specific and feature access can vary; no OAuth scope catalog or extra setup identifiers are invented. [API introduction](https://loops.so/docs/api-reference/intro), [API key](https://loops.so/docs/api-reference/api-key).

## Contacts and subscriptions

`create_contact` requires email and fails when that email exists. `update_contact` is an upsert; email and userId may both identify/update a record. `find_contact` and `delete_contact` require exactly one selector. Lookup returns standard nullable fields, mailing-list status and custom properties; no match is an empty array. Writes require explicit successful provider responses and expose the provider ID. [Create](https://loops.so/docs/api-reference/create-contact), [update](https://loops.so/docs/api-reference/update-contact), [find](https://loops.so/docs/api-reference/find-contact), [delete](https://loops.so/docs/api-reference/delete-contact).

Property dictionaries cannot replace reserved identifiers, event/subscription fields or explicitly supplied inputs. Values must be strings, finite numbers, booleans or null; null reset behavior is retained. Definitions must exist before use. `list_contact_properties` supports all/custom, and `list_mailing_lists` discovers list IDs. Mailing-list subscription values are explicit booleans. Unsubscribed contacts can still receive transactional emails and critical-notice campaigns. [Properties](https://loops.so/docs/contacts/properties), [property discovery](https://loops.so/docs/api-reference/list-contact-properties), [mailing lists](https://loops.so/docs/api-reference/list-mailing-lists).

`check_contact_suppression` returns the identified contact, observed suppression flag and quota. It never removes suppression or grants permission to email a contact. [Suppression lookup](https://loops.so/docs/api-reference/check-contact-suppression).

## Events and transactional sends

`send_event` can create/update a contact, alter list membership and trigger workflow emails. `send_transactional_email` sends a real email, including to unsubscribed recipients, using a published template. Template variables retain the original string/number contract. Optional `idempotencyKey` is sent through the documented `Idempotency-Key` header on both operations, limited to 100 characters and the provider's 24-hour window. A successful response confirms submission/acceptance; delivery and workflow completion need independent observation. No uncertain operation is retried automatically. [Events](https://loops.so/docs/api-reference/send-event), [transactional sends](https://loops.so/docs/api-reference/send-transactional-email).

The published-template tool retains the documented deprecated `/transactional` GET route rather than silently including draft/content resources from `/transactional-emails`. It returns one page, with integer page size 10–50, nextCursor and hasMore derived from continuation. Follow-up calls preserve page size and cursor. Template IDs, names and variable names retain their original output fields. [Supported legacy listing](https://loops.so/docs/api-reference/list-transactional-emails-v1), [distinct current content listing](https://loops.so/docs/api-reference/list-transactional-emails).

Optional email file inputs retain filename/contentType/base64 content and map content to the provider's `data` field. Attachments require account enablement. The whole JSON request, including encoded bytes, must be smaller than 4 MB. No file bytes, credential headers or download URLs are returned. [Email attachments](https://loops.so/docs/transactional/attachments).

## Errors and verification

Errors expose safe status-specific guidance without upstream bodies, transport parents or configured credentials. Responses are validated before success is reported. Requests have finite timeouts, redirects disabled and no automatic retries. Baseline limits are 10 requests/second for ordinary API operations and 60/minute for content APIs; feature/rate-limit acceptance remains provider-dependent. [Current API reference and OpenAPI](https://loops.so/agents/api).

Private verification uses isolated synthetic contacts, independent team/record readbacks and preregistered identity-checked deletion. Contact writes require dedicated-team, controlled-domain, possible workflow-effect and retained-history authorization. Email/event scenarios additionally require suitable controlled templates/events and a nonce-bound independent observer; attachment acceptance requires observed decoded-byte hashes. Deleting a contact does not retract emails or erase provider history. Missing local credentials leave the suite active but live acceptance unverified.
