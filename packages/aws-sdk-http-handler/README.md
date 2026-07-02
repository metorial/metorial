# @slates/aws-sdk-http-handler

Axios-backed HTTP handler for AWS SDK for JavaScript v3 clients running inside Slates integrations.

```ts
import { S3Client } from '@aws-sdk/client-s3';
import { createSlatesAwsSdkHttpHandler } from '@slates/aws-sdk-http-handler';

let s3 = new S3Client({
  region,
  credentials,
  requestHandler: createSlatesAwsSdkHttpHandler()
});
```

The handler uses Slates `createAxios()` by default, so SDK requests participate in Slates request context, logging, and sanitized HTTP tracing.

Do not use Axios interceptors to mutate AWS signed request material after the SDK signs the request. That includes method, path, query string, body, `Authorization`, `Host`, `x-amz-*`, and any headers listed in the request's signed headers. Future secret injection that changes signed material should happen through AWS SDK config or middleware before signing.
