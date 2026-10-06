# ShipEngine integration

The current ShipStation API documentation retains the ShipEngine API hosts and paths. This integration exposes 24 tools: address validation/recognition; rates/estimates; label purchase/void/list/tracking; shipment create/update/cancel/list; carrier/service/package discovery; warehouse create/update/delete/list; service-point search; pickup scheduling/cancellation; manifest creation; exact shipping-resource lookup; pickup/manifest listing; and existing-document downloads.

API keys use the API-Key header. Choose the supported US or EU host during connection setup. Saved legacy host configuration remains readable. Connections are validated through account/settings, which provides label-layout settings rather than native account identity. The profile identifies the API-key connection and sandbox/production mode; it does not claim to identify a person or provider account.

Production labels can charge the account, and carrier pickups can incur fees. Shipments are cancelled through PUT /v1/shipments/{id}/cancel and remain in history. Pickup cancellation also retains history. Label void approval is distinct from observed void state and completed refunds. Warehouse updates return 204 and are read back; deletion requires independent 404 after an accepted exact delete.

Labels/manifests can produce multiple files. Document delivery validates PDF, PNG or ZPL content. Label URLs expire after 90 days, with no documented renewal operation; the integration stores usable document content instead of inventing renewal. Existing URL output fields remain available where the provider supplies them. No inline file data is exposed in structured output.

Purchases by rate verify the documented rate lookup and its shipment before submitting; purchases by shipment and tracking responses verify the requested resource relationship. Explicit manifest labels cannot be combined with carrier, warehouse or date criteria. Safe existing label, shipment, pickup, manifest and request IDs remain available in error metadata after an uncertain or incomplete change, including document preparation failures. Do not automatically retry these operations.

Shipment updates preserve other documented writable fields and shipping-address instructions from the existing record. A response containing reflected connection credentials is not reused for updates. Monetary JSON keys are interpreted after JSON unescaping, so alternative key spelling cannot bypass the accuracy check; original numeric public field types and provider currencies remain unchanged.

Native exact string IDs, money amounts/currencies and paging counts are preserved. Omitted/null metadata remains absent; no zero amount or USD currency is invented. Monetary JSON values that would lose semantic precision fail safely; exponent/trailing-zero equivalents remain accepted. Old label sort ship_date and service-point radiusUnit mi remain recognized inputs with truthful runtime refusal because current endpoints do not support them.

Carrier-account administration, LTL freight, sales-order imports and event subscriptions are not exposed. Legacy event handlers and trigger-only helpers have been removed without replacement.

Sources: [current official API reference](https://docs.shipstation.com/apis/shipengine/openapi), [authentication](https://docs.shipstation.com/apis/shipengine/docs/guides/auth), [sandbox](https://docs.shipstation.com/apis/shipengine/docs/getting-started/sandbox), [label download](https://docs.shipstation.com/apis/shipengine/docs/labels/downloading), [manifest creation](https://docs.shipstation.com/apis/shipengine/docs/reference/create-manifest), [pickups](https://docs.shipstation.com/apis/shipengine/docs/shipping/pickups).
