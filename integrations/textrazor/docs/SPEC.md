Now let me get more details on the specific features like custom entity dictionaries, classifiers, and the account management API.# Slates Specification for TextRazor

## Overview

TextRazor is a Natural Language Processing (NLP) API that analyzes text to extract entities, topics, categories, relations, and other linguistic structures. It offers a combined analysis endpoint that allows performing several different analyses on the same document, for example extracting both the entities mentioned in the text and relations between them. It supports the automatic detection of 142 languages and entity recognition/disambiguation for many of those.

## Authentication

TextRazor uses API key authentication. You can get a free API key from https://www.textrazor.com.

Requests should always include the `X-TextRazor-Key: YOUR_API_KEY` HTTP header to identify your account.

There is no OAuth flow, no scopes, and no additional credentials required. The single API key grants access to all API features available on your plan.

**Base URL:** `https://api.textrazor.com`

## Features

### Text Analysis

Analyze raw text or content from a URL using a configurable set of extractors. Requests should include at least a `url` or `text` parameter, as well as one or more `extractors` which control the operations that TextRazor performs on your document. You can submit either raw text or a publicly accessible URL for TextRazor to download and analyze.

Available extractors:

- **Entities** – Identifies mentions of people, organizations, locations, products, and more, linking them to knowledge bases like DBpedia and Freebase. Each entity includes confidence and relevance scores, Wikipedia/Wikidata IDs, Freebase types, and DBpedia types. Results can be filtered by DBPedia types so that all returned entities must match at least one of the specified types.
- **Topics** – Extracts broad topics relevant to the document, scored by relevance.
- **Categories** – Classifies the document against predefined or custom taxonomies (see Classification below).
- **Relations** – Extracts grammatical relations between words in the text, identifying relationships between different parts of sentences, including subjects, objects, and predicates.
- **Entailments** – Identifies words or phrases that can be logically inferred from the given text by analyzing logical implications and relationships.
- **Words** – Returns tokenized words with lemmas, part-of-speech tags, and positions.
- **Dependency Trees** – Analyzes the grammatical relationships between words in text by creating dependency trees, providing detailed syntactic analysis.
- **Senses** – Performs word sense disambiguation on the input text by identifying the most likely meanings of words in context using WordNet synsets.
- **Phrases** – Extracts meaningful phrases and multi-word expressions from input text.
- **Spelling** – Provides spelling correction suggestions.

Key options:

- Language can be auto-detected or forced via ISO-639-2 code.
- HTML cleanup mode can be configured (`raw`, `stripTags`, `cleanHTML`) for URL-based analysis.
- Entity overlap can be allowed or disallowed.

### Classification

TextRazor can classify documents according to the IPTC Media Topics, IPTC Newscode or IAB QAG taxonomies using predefined models. Built-in classifiers include:

- IAB Content Taxonomy v3.0 (2022 update).
- IAB Content Taxonomy v2 (2017 update).
- IPTC Media Topics – Latest (March 2023) version.
- IPTC Media Topics – Original (2017) version.

### Custom Classifiers

Sometimes the categories you might be interested in aren't well represented by off-the-shelf classifiers. TextRazor gives you the flexibility to create a customized model for your particular project. TextRazor uses "concept queries" to define new categories, which are similar to boolean search engine queries except they query the semantic meaning of the document. Classifiers can be created, updated, and deleted through the ClassifierManager API. Categories can be uploaded via CSV.

### Custom Entity Dictionaries

TextRazor Entity Dictionaries allow you to augment the entity extraction system with custom entities that are relevant to your application, useful for identifying domain-specific entities like product names, drug names, and specific person names. Dictionaries support configurable matching modes:

- **Stem** matching – Words are split and stemmed before matching, resulting in a more relaxed match (e.g., love/loved/loves all match).
- **Token** matching – Words are split and matched literally.
- Case-insensitive matching option.
- Language-specific dictionary filtering.
- Custom metadata (key-value pairs) can be attached to each dictionary entry.

Dictionaries are managed via the DictionaryManager API (create, update, list, delete dictionaries and entries).

### Account Management

You can retrieve comprehensive information about a TextRazor account, including the current subscription plan, concurrent request limits, and daily usage.

### Custom Rules Engine

String-based Prolog logic rules can be included in requests. All rules matching an extractor name listed in the request will be evaluated and all matching param combinations linked in the response.

## Events

The provider does not support events. TextRazor is a stateless text analysis API with no webhook or event subscription mechanism.
