# Dictionary API

Look up definitions, parts of speech, phonetic transcriptions, pronunciation recordings, synonyms, antonyms, example sentences, and available word origins through the [Free Dictionary API](https://dictionaryapi.dev/). No account or API key is required.

## Tools

- **Look Up Word** returns all dictionary entries, grouped meanings, examples, and available origins. Original provider entries retain additional source and license metadata.
- **Get Phonetics** returns transcriptions and pronunciation URLs, with available recordings prepared for download.
- **Get Synonyms & Antonyms** combines meaning-level and definition-level relationships into deduplicated groups by part of speech.

Set the default language code to `en` for English. Each tool accepts an optional language-code override. Current public documentation demonstrates English; other codes depend on provider availability and are not guaranteed. Words without definitions produce a provider error. Examples, pronunciations, origins, synonyms, and antonyms may be absent.

The [provider's v2 documentation](https://github.com/meetDeveloper/freeDictionaryAPI#usage) describes the single word-entry endpoint used by all three tools. No account-management, search, or event API is documented.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
