# Slates Specification for Azure Speech

## Overview

Azure Speech (now part of Azure AI Foundry Tools) is a cloud-based speech processing service from Microsoft. It provides speech-to-text, text-to-speech, speech translation, and other capabilities. It also offers APIs for speaker recognition.

## Authentication

Azure Speech supports three authentication methods:

### 1. Subscription Key (API Key)

Uses a subscription key for service authentication, supporting both regional and custom endpoint configurations. The resource key must be passed as the `Ocp-Apim-Subscription-Key` header. Go to the Azure portal, navigate to your resource, and find the Keys & Endpoint section under Resource Management. Copy your endpoint and access key — you can use either KEY1 or KEY2.

All API endpoints are region-specific. The base URL format is `https://<REGION>.api.cognitive.microsoft.com/` for management operations, and service-specific endpoints like `https://<REGION>.stt.speech.microsoft.com/` for speech-to-text or `https://<REGION>.tts.speech.microsoft.com/` for text-to-speech.

### 2. Key-Based Bearer Token

When using the `Authorization: Bearer` header, you need to make a request to the `issueToken` endpoint, exchanging your resource key for an access token that's valid for 10 minutes.

The token endpoint format is: `https://<REGION>.api.cognitive.microsoft.com/sts/v1.0/issueToken`

Send a POST request with the `Ocp-Apim-Subscription-Key` header set to your subscription key. The response body is the bearer token to use in subsequent requests.

### 3. Microsoft Entra ID (Azure AD) Authentication

Uses the `Authorization: Bearer` header with a token issued via Microsoft Entra ID. To configure your Speech resource for Microsoft Entra authentication, create a custom domain name and assign roles. You need to assign either the `Cognitive Services Speech Contributor` or `Cognitive Services Speech User` role.

The actual access token must be constructed in the format: `aad#YOUR_RESOURCE_ID#YOUR_MICROSOFT_ENTRA_ACCESS_TOKEN`, including the `aad#` prefix and the `#` separator between resource ID and access token.

The OAuth scope for obtaining the Entra token is `https://cognitiveservices.azure.com/.default`.

## Features

### Speech-to-Text

Supports both real-time and batch transcription, providing versatile solutions for converting audio streams into text.

- **Real-time transcription**: Instant transcription with intermediate results for live audio inputs.
- **Fast transcription**: Fastest synchronous output for situations with predictable latency. Suitable for quick file transcription, captions, and editing workflows.
- **Batch transcription**: Efficient processing for large volumes of prerecorded audio. Transcribes audio files as a batch from multiple URLs or an Azure container.
- **Diarization**: Distinguishes and separates different speakers in an audio recording, useful for transcribing conversations, meetings, or any multi-speaker content. The service can identify up to 35 different speakers.
- **Custom Speech**: Allows evaluating and improving the accuracy of speech recognition for specific applications and products. You can upload training data with custom vocabulary or domain-specific terms.
- **Language Identification**: Identifies languages spoken in audio by comparing against a list of supported languages. Can be used standalone, with speech-to-text recognition, or with speech translation.

### Text-to-Speech

Converts text into synthesized speech and provides a list of supported voices for a region.

- **Neural voices**: Large selection of pre-built neural voices across many languages and locales.
- **SSML support**: Fine-grained control over pronunciation, pauses, prosody, speaking styles (e.g., cheerful, sad, whispering), and other speech characteristics via Speech Synthesis Markup Language.
- **Custom Voice**: You can create custom voices by training a model with your own audio data.
- **Personal Voice**: Create a voice that sounds like a specific person using a short audio sample, requiring user consent. The resulting speaker profile ID can be used for synthesis.
- **Multiple output formats**: Supports 48-kHz, 24-kHz, 16-kHz, and 8-kHz audio outputs in various codecs and container formats.

### Text-to-Speech Avatar

Converts text into a digital video of a photorealistic human speaking with a natural-sounding voice. The video can be synthesized asynchronously or in real time.

- Choose from a range of standard avatars or create custom ones.
- Language support is the same as for text-to-speech.

### Speech Translation

Enables real-time, multilingual translation of speech to your applications, tools, and devices. Supports speech-to-speech and speech-to-text translation.

- Configure source and target languages.
- Available via the Speech SDK (not supported via REST API for short audio).

### Speaker Recognition

Provides algorithms that verify and identify speakers by their unique voice characteristics, answering the question "who is speaking?".

- **Speaker Verification**: Determines if a speaker is who they claim to be by comparing voice characteristics against a registered voice signature. Supports both text-dependent (passphrase) and text-independent modes.
- **Speaker Identification**: Attributes speech to individual speakers within a group of enrolled individuals. Compares against up to 50 candidate speakers per request.
- Speaker Recognition is a Limited Access service, and registration is required for access to some features.

### Pronunciation Assessment

Evaluates speech pronunciation and gives speakers feedback on the accuracy and fluency of spoken audio. Language learners can practice, get instant feedback, and improve their pronunciation.

- Both scripted and unscripted assessments are supported.
- Returns accuracy scores at multiple levels of granularity: phonemes, syllables, words, sentences, or whole articles.
- Evaluates accuracy, fluency, completeness, and prosody.
- Can detect errors such as extra, missing, or repeated words when compared to reference text.

### LLM-Enhanced Speech (LLM Speech)

Delivers improved quality, deep contextual understanding, multilingual support, and prompt-tuning capabilities. Shares the same ultra-fast inference performance as fast transcription. Use cases include generating captions, summarizing meeting notes, assisting call center agents, and transcribing voicemails.

## Events

The provider does not support events. Azure Speech does not offer webhooks or purpose-built polling mechanisms for event subscriptions. Batch transcription jobs can be monitored by checking their status, but there is no native webhook or event notification system.
