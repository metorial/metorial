# SatisMeter API integration

The twelve tools cover exact project and survey metadata, survey listings, cursor-paged responses, survey statistics, user lookup/upsert/deletion, event acceptance, response insertion and whole-list email unsubscribe management. Survey and project creation, question discovery, human account identity and project listing are not documented API capabilities. Get Project verifies access to a project, not the identity of a human account owner.

Provide the exact Project ID from dashboard Settings > Integrations > API on each tool. Existing connections retain their saved project as a fallback; an explicitly supplied project takes precedence. Use List Surveys for survey IDs. Question IDs and response-targeting prerequisites must come from the dashboard.

The API key is sent as a Bearer token to the documented v3 project/campaign routes, legacy `/api/users` routes and v2 unsubscribe routes. An optional Write Key is required only for `/api/responses` insertion and is sent in that request body without the API key. A separate campaign read confirms API-key access; Write Key/project association still requires independently matching the dashboard credentials.

Responses use the native data/page envelope and a page size from 1 through 100. Missing dates use the provider's documented last-30-days/current-time defaults. Cursor consistency is checked, but the API does not provide a snapshot across pages. Statistics preserve the native statistics/questions data. User listings use the documented users envelope, including exact internal IDs needed for deletion.

Upsert sends the project, external user ID and optional traits using Bearer auth. Optional surveyDate can defer the next eligible survey. Event success means the provider accepted the event; it does not establish survey delivery or expose an event-history receipt. Response insertion requires exactly one external user or anonymous ID and distinct question IDs; targeting or duplicate rules can reject it. No automatic retry or force-survey behavior is added.

Deleting a user removes personal data and anonymizes existing responses; it does not erase response history. Unsubscribe updates replace the whole list and independently read the resulting list. There is no atomic concurrency guarantee. Inspect an uncertain write before retrying.

No downloadable export endpoint is exposed: native response data is returned as structured records. Legacy trigger handlers remain removed without replacement.

Official references: [REST API](https://support.satismeter.com/hc/en-us/articles/48846544018323-REST-API-for-SatisMeter), [current v3 reference](https://app.satismeter.com/apidoc), [upsert](https://support.satismeter.com/hc/en-us/articles/6980457910163-Insert-Update-user-API), [list users](https://support.satismeter.com/hc/en-us/articles/6980473872531-List-users-API), [delete user](https://support.satismeter.com/hc/en-us/articles/6980450524179-Delete-user-API), [event](https://support.satismeter.com/hc/en-us/articles/6980481518227-Track-event-API), [insert response](https://support.satismeter.com/hc/en-us/articles/6980464243475-Insert-response-API), [unsubscribe list](https://support.satismeter.com/hc/en-us/articles/6980458958995-Unsubscribe-email-API).
