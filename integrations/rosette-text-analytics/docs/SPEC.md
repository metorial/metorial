# Rosette Text Analytics Specification

## Overview

Rosette Text Analytics (now part of Babel Street) is a cloud-hosted RESTful web service that provides text analysis capabilities, from pure linguistics to entity, name, and sentiment centric analysis in Asian, European, and Middle Eastern languages. It uses natural language processing, statistical modeling, and machine learning to analyze unstructured and semi-structured text, providing endpoints for extracting entities and relationships, translating and comparing the similarity of names, categorizing and adding linguistic tags to text, and more.

## Authentication

Rosette Text Analytics uses **API Key** authentication.

- Log in to your Developer Portal using the credentials you used upon signing up and go to the API Key section of the site to see your running apps and their keys.
- Paste your desired App's key into the value of the header `X-RosetteAPI-Key` in your RESTful calls.
- The base URL for the cloud API is `https://analytics.babelstreet.com/rest/v1/`.
- When Rosette is installed on-premise, no authentication is required.

Example request header:

```
X-RosetteAPI-Key: your_api_key_here
```

## Features

### API and Language Discovery

- `get_api_info` retrieves the service name, version, and build information from `GET /info`.
- `list_supported_languages` retrieves supported language/script combinations or source/target language pairs, including transliteration schemes and license status, for selected text analysis and name matching endpoints.
- The API does not document an account or current-user endpoint; API information identifies the connected installation rather than the authenticated account.

### Language Identification

Given a text field, Rosette detects the language it is most likely to be. Call `list_supported_languages` with the `language` endpoint to discover supported languages for the connected installation. Multilingual detection mode can identify language regions within the same document.

### Entity Extraction and Linking

Extracts entities, identifying 18 entity types in 20 languages from a body of text and stores them along with their QID (Wikidata ID) and entity type. Rosette supports linking to other knowledge bases including DBpedia ontology and Refinitiv PermID, with DBpedia including over 700 entity types spanning seven layers of granularity.

- Can be optimized for short-form social media text.
- Entity types include PERSON, LOCATION, ORGANIZATION, PRODUCT, and others.

### Sentiment Analysis

Sentiment analysis determines sentiment in a document or at an entity-specific level. Rosette detects the overall sentiment of a body of text as negative (neg), neutral (neu), or positive (pos).

- Returns sentiment labels with confidence scores between 0 and 1.
- Applies entity extraction to identify entities and determines the sentiment for each one, providing entity-level analysis for 18 entity types out of the box.

### Name Similarity (Matching)

Names are compared via the Name Indexer, which breaks a name into tokens and compares matching tokens. It can identify variations including typographical errors, phonetic spelling variations, transliteration differences, initials, and nicknames.

- Returns a similarity score between 0 and 1.
- Entity type can be specified: PERSON (default), LOCATION, or ORGANIZATION.
- Supports cross-language name matching.

### Name Translation

Rosette translates names using its knowledge of language-specific naming conventions, recognizing when to transliterate a name based on spelling or translate meaning such as a title. It can process names in 13 languages to produce English translations.

- Also supports name translation between Chinese, Japanese, and Korean.
- Parameters include entity type, source/target language, source/target script, and transliteration scheme.

### Name Deduplication

Identifies and groups duplicate names from a list, accounting for linguistic variations across languages and scripts. Useful for cleaning up databases with duplicate records.

### Address Similarity

Compares structured or unstructured addresses and determines whether they refer to the same location.

### Record Similarity

Compares records with multiple fields (up to 5 fields per comparison) to determine similarity between structured data records.

### Relationship Extraction

Relationships are the grammatical and semantic connections between two entities in a piece of text. Rosette uses a combination of deep learning and semantic rules to recognize and extract the action that connects entities.

### Categorization

Categorization classifies content sources such as documents and web pages under a list of topics. Rosette automates this process for your content. Labels are drawn from the Tier 1 contextual categories defined by the IAB Quality Assurance Guidelines Taxonomy.

- Currently focused on English-language text.

### Topic Extraction

Topic extraction discovers central keywords in documents or databases. Unlike categorization or entity extraction, it is not constrained by a finite list of recognized entity types or categories. It identifies "keyphrases" and "concepts" based on frequency and linguistic patterns, ranking them by relative importance.

### Morphological Analysis

The morphological analysis endpoint provides language-specific tools for returning part of speech, lemmas (dictionary form), compound components, and Han readings for each token in the input.

- Can request individual features or all features at once.
- Language can be specified or auto-detected.

### Tokenization

The tokenization function identifies and separates each word in an input text into one or more tokens through advanced statistical modeling. A token is an atomic element such as a word, number, possessive affix, or punctuation mark.

### Sentence Detection

Splits text into individual sentences, useful for preprocessing text before further analysis.

### Semantic Similarity (Text Embedding)

Semantic similarity transforms words into a numerical representation (vectors) that approximates the conceptual distance of word meaning. Useful for expanding search beyond keywords to semantically related terms.

### Syntax Dependencies

Provides syntactic dependency parse trees showing grammatical relationships between tokens in a sentence.

### Transliteration

Transliterates Arabizi or Romanized Arabic chat text into native Arabic script. This tool exposes the default direction only; reverse transliteration is not exposed. The provider ignores the language input because only Arabic is supported. For name translation across other supported languages and scripts, use `translate_name`.

### Event Extraction

The provider documents event extraction with installed models and schemas. This integration does not expose event extraction tools; configuring or discovering custom models is outside this refresh.

## Events

The provider does not support events. Rosette Text Analytics is a stateless text processing API that analyzes content on demand and does not offer webhooks, event subscriptions, or purpose-built polling mechanisms.
