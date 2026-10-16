# Dictionary API specification

## Provider and endpoint

The [Free Dictionary API](https://dictionaryapi.dev/) exposes an unauthenticated word lookup:

```text
GET https://api.dictionaryapi.dev/api/v2/entries/{languageCode}/{word}
```

No account, API key, or OAuth connection is needed. The configured default language code is `en`; every tool keeps an optional override. Current public examples demonstrate English. The provider's [language list](https://github.com/meetDeveloper/freeDictionaryAPI/blob/master/modules/utils.js) includes other codes, but its source and hosted documentation do not establish current coverage for each language. The integration passes through nonblank language codes without a hardcoded allowlist or a guarantee of multilingual results.

The [official v2 example](https://github.com/meetDeveloper/freeDictionaryAPI#usage) shows an array of entries, each with a word, optional primary phonetic and origin, phonetics, and meanings. A meaning contains a part of speech and definitions; definitions contain definition text, synonyms, antonyms, and optional examples. Meaning-level synonyms/antonyms and source URLs are absent from that example. Existing structured output arrays remain present and empty when the corresponding optional lists are absent; original entries preserve actual omissions and any additional provider metadata.

## Registered tools

| Tool key | Behavior |
| --- | --- |
| `look_up_word` | Returns all entries, grouped meanings and definitions, examples, phonetics, and available word origins. Optional `rawEntries` contains the original provider objects, including any source and license metadata. Available audio recordings are also prepared for download. |
| `get_phonetics` | Combines phonetic entries across the response, deduplicating by transcription, audio URL, and source URL. Returns the first primary phonetic, or the first available transcription if no primary is provided. Available audio recordings are also prepared for download. |
| `get_synonyms_antonyms` | Combines meaning-level and definition-level synonyms/antonyms, deduplicating each relationship within its part-of-speech group. |

All tools accept a required string `word` and optional string `languageCode`. Blank inputs fail with a clear validation error. Requests trim surrounding whitespace and encode path segments. The original tool keys, inputs, and output field types and requiredness remain compatible; `look_up_word` adds optional `entries[].origin` and `rawEntries`.

## Pronunciation data

The official example includes protocol-relative audio URLs. These become absolute HTTPS URLs in existing `audioUrl` fields. Blank or absent audio values do not produce a recording. Other supplied audio URLs must use HTTP or HTTPS. Existing structured pronunciation URLs remain available alongside the downloadable recordings, and the original provider strings remain in `look_up_word.rawEntries`.

## Errors and validation

The shared HTTP client uses a 30-second timeout and requests JSON. Responses must contain the documented entry, phonetic, meaning, and definition shapes. Missing or malformed required fields fail with a ServiceError rather than receiving fabricated words, parts of speech, definitions, or timestamps. Present relationship lists must be arrays of strings; optional meaning-level lists may be absent.

The [provider error handler](https://github.com/meetDeveloper/freeDictionaryAPI/blob/master/app.js) returns an object with title, message, and resolution for missing definitions and server errors. Shared body-aware error handling preserves those details and upstream HTTP status, including not-found and rate-limit responses. The [provider source](https://github.com/meetDeveloper/freeDictionaryAPI/blob/master/modules/errors.js) describes these failure categories. Existing ServiceErrors are preserved.

## Capability boundaries

All three tools use the same documented lookup endpoint. The provider does not document pagination, account/profile discovery, writes, or events, so no identity tool, mutation tool, trigger, or tool category is needed. Definitions, examples, origins, synonyms, antonyms, and recordings depend on the available word data.

Provider acceptance, hosted language coverage, and audio downloads require live verification and were not exercised in this refresh.
