# IFTTT API specification

This integration implements documented Connect v2 and Realtime v1 operations for a provisioned Platform service. It retains eight original keys and adds the read-only current service context tool.

| Capability | Native contract |
| --- | --- |
| Service context | `GET https://connect.ifttt.com/v2/me`, bare `type: me`; `IFTTT-Service-Key` and optional `user_id`. Setup persists the observed `service_id`. |
| Connection | `GET /v2/connections/{id}`, bare `type: connection`; public definition or service-authenticated `user_id`. Map `user_status` to optional legacy `status`; native null remains in `connection`. |
| Full configuration replacement | `PUT /v2/connections/{id}/user_connection?user_id=...`, native `{user_features:[...]}`. Omitted fields/features are removed. Exact GET readback supplies the result. |
| Field options | `GET /v2/connections/{id}/{triggers,actions,queries,features}/{typeId}/field_options?user_id=...`; select `options[fieldSlug]` locally. No slug path suffix. |
| Action / test trigger | `POST .../actions/{id}/run` or `.../triggers/{id}/test`; body `user_id`, optional `fields` and `user_feature_id`; native empty 204 means accepted. |
| Query | `POST .../queries/{id}/perform`; body `user_id`, optional `fields`, `limit`, `cursor`, `user_feature_id`. Preserve list `data`, native `next.cursor`/`next.fields` or compatible top-level continuation. Conflicting/nonadvancing cursors and continuation objects without usable cursors fail. Native `type: query` is an ingredient, not a list. |
| Realtime | `POST https://realtime.ifttt.com/v1/notifications`, `{data:[{user_id?,trigger_identity?}]}`; 1–1000 nonempty targets. Accepted status indicates a polling notification only. |
| Maker Webhooks | Documented standard/JSON paths require a key in the URL. Execution currently refuses locally before dispatch; all original input/output fields remain. No credential-in-header substitute is documented. |

No file endpoint or generated file tool is implemented, and no legacy trigger registration exists. User-invoked test and webhook actions are distinct from event subscriptions. There is no invented identity, OAuth token issuance, generic discovery, Applet management or administrative capability.

Legacy keys, required fields and types remain. Additions are optional query `userFeatureId`, continuation/type fields, `features` field-option type, observed service binding, and current-context discovery. Previously accepted but invalid empty notification targets, fractional/nonpositive limits, incomplete replacement objects, and missing native field-option users now fail with an actionable validation error. An empty simple webhook value retains its input meaning although execution is blocked. JSON payload takes precedence over simple values.

All HTTP operations have bounded response/body size, a 30-second timeout and no redirect following. Native data and inputs are checked for configured credential reflection before projection or dispatch; public errors preserve only safe status metadata. A failed write can have retained effects: there is no automatic retry or invented undo.

## Primary references

- [Connect API](https://ifttt.com/docs/connect_api): native routes, bare envelopes, user IDs, field maps, replacement and query continuation.
- [Service and Realtime API](https://ifttt.com/docs/api_reference): polling notifications and target bounds.
- [Webhooks FAQ](https://help.ifttt.com/hc/en-us/articles/115010230347-Webhooks-service-FAQ): standard and JSON key-in-path authentication, values, plan prerequisites and direct invocation.
- [Service rate limits](https://help.ifttt.com/hc/en-us/articles/1260803229749-IFTTT-Service-Rate-Limits): Webhooks 240 requests/minute on Pro/Pro+; no Free access.
- [Connections](https://ifttt.com/docs/connections): Platform connection prerequisites.
