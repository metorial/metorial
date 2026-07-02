Now let me check if there's a translation endpoint and look at the Language Model Direct Access feature:# Slates Specification for Tisane

## Overview

Tisane is a natural language processing (NLP) API that analyzes text to detect abusive content (hate speech, cyberbullying, sexual harassment, criminal activity), extract sentiment, entities, and topics. It supports 30+ languages and is designed for content moderation, law enforcement, and text analytics use cases.

## Authentication

Tisane uses API key authentication. All requests must include the API key in the `Ocp-Apim-Subscription-Key` HTTP header.

- **Method:** API Key (passed as a request header)
- **Header name:** `Ocp-Apim-Subscription-Key`
- **Base URL:** `https://api.tisane.ai`
- **Obtaining a key:** Sign up at the [Tisane Labs Developer Portal](https://dev.tisane.ai/) to acquire a primary and secondary API key.

Example:

```
Ocp-Apim-Subscription-Key: your_primary_or_secondary_api_key
```

No OAuth flows, scopes, or tenant IDs are required.

## Features

### Text Analysis

The core method analyzes input text and detects problematic content, sentiment snippets, entities, topics, phrase structure, parts of speech, stopwords, and more. Requires a language code and the text content as input. Analysis behavior is highly configurable through a settings object; all settings are optional, and an empty object uses defaults.

- **Abusive content detection:** Detects cyberbullying/personal attacks, hate speech, sexual advances, obfuscated profanities, criminal activity, and more. Returns the type, severity, offending text fragment, and an explanation.
- **Sentiment analysis:** Provides advanced sentiment analysis — not just whether, but why and what aspects of a product the reviewer liked or did not like. Can output both expression-level and document-level sentiment.
- **Entity extraction:** Outputs named entities detected in the text, such as people, organizations, and locations.
- **Topic detection:** Outputs topics identified in the content. Topic statistics and optimization (removing less specific overlapping topics) can be enabled. Supports multiple topic standards including native codes and IAB.
- **Low-level NLP:** Provides tokenization, part of speech tagging, disambiguation, and morphological analysis.
- **Content format cues:** A format setting defines the type of content (e.g., review, alias), which influences how the language models process the content.
- **Long-term memory:** Tisane's long-term memory module consists of reassignments (custom meaning overrides), flags (non-textual context), and antecedents (pronoun/reference tracking). Useful for detecting hidden abuse and contextual nuances across conversations.

### Language Detection

Detects the languages used in a text fragment and returns a breakdown by offsets. Optionally accepts language code hints and a delimiter regex for segmenting the input.

### Semantic Similarity

Calculates the semantic similarity between two text fragments, either in the same language or in different languages. Returns a number between 0 and 1 representing the similarity.

### Named Entity Comparison

Compares two compound named entities and identifies differences. Supports cross-language comparison and returns specific difference types (e.g., given name, surname, title, social role). Currently only supports person entities.

### Text Translation

Translates text between supported languages. Supports auto-detection of the source language. If source and target languages are the same, paraphrasing is applied. Handles obfuscated and slang content.

### Text Clean-up

A service method to remove JavaScript, CSS tags, JSON, and other markup, returning pure decoded text. Does not process binary content.

### Language Model Direct Access

Provides direct access to inspect entries from Tisane's underlying language models, such as retrieving inflections for words.

### Supported Languages

Tens of languages are supported. A list of all supported languages (with metadata such as script direction and encoding) can be retrieved via the API.

## Events

The provider does not support events.
