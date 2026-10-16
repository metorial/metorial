# Yandex Cloud integration

This integration exposes 43 tools for 10 Yandex Cloud products, plus a shared operation-status tool. Product categories group the implemented APIs so connections can select relevant services.

## Authentication and discovery

The `iam_token_oauth` method exchanges a Yandex ID OAuth token for an IAM token at `POST https://iam.api.cloud.yandex.net/iam/v1/tokens`. It persists the provider's RFC 3339 `expiresAt` and renews the IAM token by exchanging the saved OAuth token again. The `api_key` method preserves the supplied service-account API key. API keys have service, scope, and optional validity limits; use IAM authentication for infrastructure management.

Existing optional `cloudId` and `folderId` defaults remain supported. Tools accept explicit resource IDs. Use `list_clouds`, then `list_folders`, to discover the authorized resource scope. No credential-independent current-user endpoint was verified for both authentication methods.

## Implemented capabilities

| Product | Tools |
| --- | --- |
| Compute Cloud | List/get/create/update/control instances; list/create/delete disks; list compute images |
| Object Storage | Legacy raw S3 bucket/object listings; create/get/update/delete bucket settings; list folder buckets through the IAM management API |
| Cloud Functions | List/get/create/delete/invoke functions; list deployed versions |
| Translate | Translate text, detect language, list supported languages |
| IAM | List/get/create/delete service accounts; list/create/delete API keys, including pagination and optional expiration |
| VPC | List/create/delete networks and subnets |
| Cloud DNS | List/create/delete zones; list and merge resource record sets |
| Resource Manager | List clouds and folders; create/update/delete folders |
| Container Registry | List/create/delete registries; list Docker images |
| Cloud Logging | List log groups; preserve legacy read/write requests |
| Operations | Read asynchronous operation status and provider result |

Mutating methods commonly return an operation ID. Call `get_operation` to check completion. Failed operation envelopes are reported as errors even when the HTTP status is 200. Submitted changes are not evidence that a resource is ready.

## Compatibility and limits

Existing tool keys, field types, defaults, optionalness, enum choices, and raw S3 results remain available. IAM renewal is additive; saved token/API-key connections and optional scope defaults retain their existing fields. No event triggers are registered.

Current Cloud Logging read/write documentation describes gRPC services rather than the legacy `/logging/v1/read` and `/logging/v1/write` HTTP requests. Those requests remain unchanged pending a verified transport migration. Likewise, legacy S3 listings preserve their raw responses and request/auth contracts; use `list_folder_buckets` for documented IAM-authenticated bucket discovery. No static-access-key signing or new arbitrary-URL download transport is implemented.

Function creation creates a function resource; it does not deploy code. Function version deployment, managed databases, Kubernetes, SpeechKit, Vision, Message Queue, Data Streams, Monitoring, API Gateway, Search, Disk, Direct, and event-trigger provisioning are outside the implemented surface.

No file download/export tool is registered. Existing structured/raw responses are preserved. No live provider calls, E2E, or eval execution was performed during this refresh.

## Official references

- [IAM token creation](https://yandex.cloud/en/docs/iam/api-ref/IamToken/create) and [API key limits](https://yandex.cloud/en/docs/iam/concepts/authorization/api-key).
- [Compute instance API](https://yandex.cloud/en/docs/compute/api-ref/Instance/) and [image discovery](https://yandex.cloud/en/docs/compute/api-ref/Image/list).
- [Object Storage bucket management](https://yandex.cloud/en/docs/storage/api-ref/Bucket/list) and [S3 bucket listings](https://yandex.cloud/en/docs/storage/s3/api-ref/bucket/list).
- [Function versions](https://yandex.cloud/en/docs/functions/functions/api-ref/Function/listVersions), [log groups](https://yandex.cloud/en/docs/logging/api-ref/LogGroup/list), and [operation status](https://yandex.cloud/en/docs/api-design-guide/concepts/operation).
