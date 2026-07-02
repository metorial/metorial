# Slates Specification for Dictionary Api

## Overview

Free Dictionary API (dictionaryapi.dev) is a free, open-source REST API that provides word definitions, phonetics, pronunciations, parts of speech, example sentences, synonyms, and antonyms. The API supports multiple languages, queried by passing the appropriate language code in the URL path. It was originally created as an alternative to the now-unavailable Google Dictionary API.

## Authentication

The Free Dictionary API is free to use and does not require authentication. No API key is required.

All requests are simple unauthenticated HTTP GET requests. The base URL is:

```
https://api.dictionaryapi.dev/api/v2/entries/{language_code}/{word}
```

No sign-up, API key, OAuth tokens, or any other credentials are needed.

## Features

### Word Definitions

Look up the definition(s) of a word. The API provides word definitions, phonetics, and example sentences. Each word may return multiple meanings grouped by part of speech (noun, verb, adjective, etc.), with each meaning containing one or more definitions.

- **Parameters:** Language code (e.g., `en` for English, `fr` for French) and the word to look up.
- The API returns all available definitions for a word across its various parts of speech.

### Phonetics and Pronunciation

Retrieve phonetic transcriptions and audio pronunciation URLs for a word. The API provides phonetics and pronunciations including IPA text representations and links to audio files where available.

- Audio URLs can be used for playback in applications.
- Not all words or languages have audio pronunciation available.

### Synonyms and Antonyms

Retrieve synonyms and antonyms associated with a word's definitions. These are returned at both the individual definition level and the meaning (part of speech) level.

- Synonym and antonym availability varies by word; many entries may have empty lists.

### Multi-Language Support

The API supports multiple languages; you can query any language supported by sending its language code. For example, use `fr` for French or `en` for English.

- The word, definitions, and part of speech labels are returned in the requested language.
- Coverage and data quality vary across languages; English has the most comprehensive data.

### Example Sentences

Where available, the API returns example sentences demonstrating the usage of a word within each definition.

- Not all definitions include example sentences.

## Events

The provider does not support events.
