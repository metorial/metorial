# Slates Specification for Wit.ai

## Overview

Wit.ai is a free Natural Language Processing (NLP) platform owned by Meta that enables developers to build conversational interfaces by extracting meaning from text and voice inputs. It is a Natural Language Processing (NLP) platform that enables developers to easily build chatbots and voice assistants. Wit.ai can identify 132 languages and provides intent detection, entity extraction, trait recognition, speech-to-text, text-to-speech, and conversation flow management.

## Authentication

Wit.ai uses OAuth2 as an authorization layer. Every API request must contain an Authorization HTTP header with a token.

Access tokens are app and user specific. The token can be found under Settings in the Wit console.

Authentication is performed by including a **Bearer token** in the `Authorization` header:

```
Authorization: Bearer $TOKEN
```

There are no OAuth2 authorization code flows or refresh tokens to manage. The token is a **Server Access Token** (or Client Access Token) obtained directly from the Wit.ai web console for your specific app. To access features, you need to log into Wit.ai with a Facebook login.

Every request also requires a version parameter either in the URL or in the headers. This parameter is a date that represents the "version" of the Wit API. Example: `v=20240304`.

## Features

### Natural Language Understanding (Text)

Allows sending a text message and receiving structured data including detected intents, entities, and traits with confidence scores. The GET /message API data model distinguishes intents, traits, and entities as separate concepts. Supports built-in entities (e.g., `wit/datetime`, `wit/location`, `wit/number`) powered by Duckling, as well as custom keyword and free-text entities.

- **Parameters:** Query text, optional number of N-best intent results, optional context (locale, timezone, reference time).
- Locale of the user must follow a valid ISO639-1 language followed by an underscore and a valid ISO3166 alpha2 country code.

### Speech Recognition and Understanding

Returns the meaning extracted from an audio file or stream. Supports streaming audio for reduced latency. Returns the same structured NLU output (intents, entities, traits) as the text endpoint, but from audio input.

- **Supported formats:** WAV (RIFF WAVE, linear, little-endian), MP3, OGG, ulaw, and raw audio.
- Wit.ai is only able to process mono audio.
- Supports a large number of languages for speech recognition.

### Dictation (Speech-to-Text)

The dictation API provides pure speech-to-text transcription without NLU processing. It emits partial and full transcription results, useful for real-time transcription use cases.

### Speech Synthesis (Text-to-Speech)

The POST /synthesize API generates human-like speech from a text input. Returns an audio stream of the synthesized text.

- The list of available voices and parameters is available using GET /voices.
- Currently supports English (US).
- Optimized for short inputs.

### Composer (Conversational Flows)

Composer brings end-to-end conversational support to Wit.ai. It allows authoring multi-turn conversation flows that combine NLU with dialogue management. You manage the conversation state using your own key-value store: the context map.

- Supports both voice (POST /converse) and text (POST /event) inputs.
- Enables defining server-side actions that are executed during the conversation flow.
- Runs provided actions as instructed by the API response, and calls back with the resulting updated context map.

### Entity Management

Allows programmatic creation, retrieval, update, and deletion of entities and their values. Entities can be of type keyword (with explicit value lists), free-text, or trait-based. Supports roles on entities (e.g., `flight:destination` vs `flight:origin`), sub-entities, and built-in entity types.

- Built-in entities include datetime, location, numbers, amounts of money, temperature, contacts, and more.
- Custom entities and traits (e.g., sentiment analysis trait) can be configured.

### Intent Management

Allows creating, listing, and deleting intents. Wit.ai supports built-in intents as ready-to-use high-quality intents. Custom intents are trained using annotated utterances.

### Training Data (Utterances/Samples) Management

Allows programmatic submission, retrieval, and deletion of training utterances with entity annotations to train the NLU model. Samples can be filtered by entity IDs, entity values, and can include negative examples.

- Useful for importing existing training data in bulk from external sources.
- Supports annotating intents, entities with positions, roles, and sub-entities.

### App Management

Allows creating, updating, deleting, and listing Wit.ai apps programmatically. Apps can be configured with language, timezone, and description. Supports version tagging for apps.

### Export and Import

Allows exporting a complete Wit app configuration and importing it into a new app. Useful for backup, migration, or duplication of apps.

### Language Detection

Using the GET /language API, you can detect the language of provided text and receive the n-best detected locales with confidence scores.

## Events

The provider does not support events. Wit.ai does not offer webhooks or event subscription mechanisms through its API.
