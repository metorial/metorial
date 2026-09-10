# Attachment URL Test Server

Small Vercel Node.js function for testing Slates URL attachments. The endpoint requires
the fixed debug token `secret123` in both the `x-attachment-token` header and the `token`
query parameter, and rejects requests after the `expiresAt` query timestamp.

## Deploy

```sh
cd test-helpers/attachment-url-server
npx vercel deploy --prod
```

Create an `Attachment Server Token` auth config containing `secret123`. The test
integration uses `https://attachment-url-server.vercel.app` directly.

## Run locally

```sh
npx vercel dev
```

The integration is hard-coded to the deployed Vercel URL, so local server testing requires
temporarily changing `ATTACHMENT_SERVER_URL` in the integration. Its auth token must be
`secret123`.

## Endpoint

`GET /api/attachment` requires:

- Header: `x-attachment-token: secret123`
- Query: `token=secret123`
- Query: `expiresAt=<future ISO-8601 timestamp>`
