# API.Bible

API.Bible provides licensed scripture and audio through the American Bible
Society. An app API key is sent in the `api-key` header to
`https://rest.api.bible/v1`. Existing key/auth settings are retained.

## Capabilities

- Discover available text and audio editions, filter metadata, and request full details.
- Retrieve text edition metadata, related audio editions and publisher information.
- List books and optionally their chapters, then navigate chapter and verse content.
- Retrieve passages across chapters and books, up to the provider's 200-verse limit.
- List and read thematic sections where the edition supports them.
- Search keywords or references with pagination, sort, range and fuzzy matching; retain both verse and passage results.
- Read licensed audio edition metadata, list audio books and chapters, and download chapter MP3 files.

Content tools accept the existing HTML, JSON and text format choices. The
`content` output remains a string: structured JSON blocks are serialized
losslessly rather than changing the public field type. Optional parallel
edition IDs are forwarded to the provider. Verse and passage tools can match
original versification IDs with `useOrgId`.

Content metadata is retained, including current `fumsToken` and legacy `fumsId`
when supplied. Web applications must implement the provider's engagement
reporting; tools do not submit it automatically. Original audio URLs and numeric
expiry values remain available. Download renewal requests a fresh URL each time
rather than assuming undocumented expiry units.

## Boundaries

Access depends on the app's licensed editions; audio needs special licensing.
The documented API exposes read operations and no current-user/profile route,
write API, or webhook/event capability.

## Official sources

- [API reference and OpenAPI 1.6.3](https://api.scripture.api.bible/v1/swagger.json)
- [Bible editions](https://docs.api.bible/guides/bibles/)
- [Books](https://docs.api.bible/guides/books/)
- [Chapters](https://docs.api.bible/guides/chapters/)
- [Verses](https://docs.api.bible/guides/verses/)
- [Passages](https://docs.api.bible/guides/passages/)
- [Sections](https://docs.api.bible/guides/sections/)
- [Search](https://docs.api.bible/guides/search/)
- [Audio Bibles](https://docs.api.bible/guides/audio-bibles/)
- [Content formats](https://docs.api.bible/resources/content-output-formats/)
- [Fair use](https://docs.api.bible/resources/fair-use/)
- [Migration compatibility](https://docs.api.bible/resources/legacy-users-faq/)
