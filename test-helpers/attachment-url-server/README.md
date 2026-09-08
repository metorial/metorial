# Attachment URL Test Server

Small Vercel Node.js function for testing Slates URL attachments. The endpoint requires
the same token in both the `x-attachment-token` header and the `token` query parameter,
and rejects requests after the `expiresAt` query timestamp.

## Deploy

```sh
cd test-helpers/attachment-url-server
npx vercel env add ATTACHMENT_TEST_TOKEN
npx vercel deploy --prod
```

Configure the test attachment integration with the deployment's base URL and create an
`Attachment Server Token` auth config containing the same token.

## Run locally

```sh
ATTACHMENT_TEST_TOKEN=test-secret npx vercel dev
```

Then configure the integration URL as `http://localhost:3000` and its auth token as
`test-secret`.

## Endpoint

`GET /api/attachment` requires:

- Header: `x-attachment-token: <ATTACHMENT_TEST_TOKEN>`
- Query: `token=<ATTACHMENT_TEST_TOKEN>`
- Query: `expiresAt=<future ISO-8601 timestamp>`
