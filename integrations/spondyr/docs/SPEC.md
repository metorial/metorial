# Spondyr API

Spondyr generates template-driven correspondence and delivers it through configured channels. Its [official API reference](https://client.spondyr.io/Public/Public/Documentation) describes the REST API at `https://client.spondyr.io/api/v1.0.0`.

## Authentication

The subscription API key and application token are required for every request. Read requests send `APIKey` and `ApplicationToken` as query parameters. Generation and delivery requests send both credentials in the JSON body. Credentials are available in the Spondyr dashboard.

## Supported workflows

- `list_transaction_types`: `GET /TransactionTypes` returns transaction type names and sample JSON/CSV models from the response's `Data` array. Supplying a transaction type uses `GET /EventTypes` to discover its event names.
- `create_correspondence`: verifies that the event belongs to the selected transaction type, then uses `POST /Spondyr` with `EventType`, `IsGenerateOnly`, and `Data`. Spondyr resolves the transaction type from the event type. Generate-only requests defer delivery.
- `get_correspondence_status`: `GET /Spondyr` with `ReferenceID` and optional `IncludeData` returns API status, request reference, creation date, processing status, and optional original transaction data.
- `deliver_correspondence`: `PUT /Spondyr` with `ReferenceID` resumes delivery to the original recipients using the provider's default template and recipient selection.
- `create_correspondence_batch`: `POST /Batch` submits transaction objects for one event type. Optional `SharedData` is merged with every item. Returns a batch reference ID.
- `get_batch_status`: `GET /Batch` with `ReferenceID` returns batch progress and item errors. An item's error reference ID can be inspected with `get_correspondence_status`.
- `list_templates`: `GET /Templates` with `TransactionType` returns template names, event types, content types, recipients, conditions, and search filters.

The API can return `APIStatus: ERROR` and `ErrorMessage` within a successful HTTP response. These responses are treated as provider errors. `APIStatus: OK` means the API request succeeded; processing and delivery progress are represented separately by `StatusCode` and `StatusName`.

The documented API does not expose a suitable current-account identity endpoint. Generated-file downloads and callback registration are outside this integration's current tool surface.
