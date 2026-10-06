# Sanity integration scope

This integration exposes nine tools for native Content Lake document, dataset, webhook, and asset workflows. It preserves seven existing public keys and fields while adding personal-user profile reads and exact original dataset asset downloads.

Authentication uses the existing `api_token` bearer method. Robot tokens cannot use `/users/me`; a limited connection profile requires verified native project discovery and makes no user identity claim. Personal identity uses native profile IDs. Project/dataset identifiers are discovered through tools; validated older stored config remains a fallback. API version defaults remain `2024-01-01`.

Native paths and state follow the current [HTTP reference](https://www.sanity.io/docs/http-reference), [official client](https://github.com/sanity-io/client), and [token guide](https://www.sanity.io/docs/content-lake/http-auth). Historical content uses the documented `/data/history/{dataset}/documents/{id}` route with exclusive selectors and current access control. Dataset exact reads select one native discovery row. GROQ results preserve their arbitrary JSON shape and require caller-defined pagination. Mutation receipts accept native `id` and documented `documentId` without inventing identifiers; conflicting aliases are refused.

Uploads preserve native `assetId` hash and expose explicit document IDs. Assets are deduplicated and can remain cached after deletion. Only native Content Lake originals at `cdn.sanity.io` are downloaded; no undocumented expiry, renewal, or deletion-erases-history promise is exposed.

Controlled verification requires private-read acknowledgment, isolated resource ownership, no concurrent writes, and explicit retained history/cache/delivery/automation consent. Dataset, webhook, and asset lifecycle scenarios have separate consent gates. No real provider operations were performed during implementation; current API acceptance and deployed file delivery remain unverified.
