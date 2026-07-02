# Slates Specification for Google Cloud Speech

## Overview

Google Cloud Speech encompasses two APIs: Speech-to-Text (STT), which converts audio to text transcriptions using Google's neural network models, and Text-to-Speech (TTS), which synthesizes natural-sounding speech from text. The STT API accurately converts voice to text in over 85+ languages and variants, while the TTS API provides speech synthesis in 220+ voices and 40+ languages.

## Authentication

Google Cloud Speech APIs support multiple authentication methods:

1. **API Keys**: In the Google Cloud Console, navigate to APIs & services > Credentials, click on Create credentials and select API key. The API key is passed as a query parameter (e.g., `?key=YOUR_API_KEY`) in REST requests. API keys are suitable for simple use cases but provide limited access control.

2. **Service Account (recommended for server-to-server)**: Create a service account, which is a special type of account used by applications and Virtual Machines to authenticate and interact with GCP services and APIs. Generate a JSON key file for the service account and reference it via the `GOOGLE_APPLICATION_CREDENTIALS` environment variable. The service account JSON key file is used to obtain OAuth 2.0 access tokens automatically.

3. **OAuth 2.0**: Authentication to Google Cloud services, including the Speech APIs, can be done using API keys, OAuth 2.0, or service accounts. OAuth 2.0 is used when accessing the API on behalf of end users.

4. **Application Default Credentials (ADC)**: Client libraries support Application Default Credentials (ADC); the libraries look for credentials in a set of defined locations and use those credentials to authenticate requests to the API.

**Required OAuth Scope**: `https://www.googleapis.com/auth/cloud-platform`

**Prerequisites**:

- A Google Cloud project with the Speech-to-Text API and/or Text-to-Speech API enabled.
- A billing account linked to the project.

**REST Base URLs**:

- Speech-to-Text: `https://speech.googleapis.com/v2/` (v2) or `https://speech.googleapis.com/v1/` (v1)
- Text-to-Speech: `https://texttospeech.googleapis.com/v1/`

## Features

### Speech-to-Text Transcription

Convert audio to text using three recognition methods: synchronous recognition for audio of 1 minute or less, asynchronous (batch) recognition for longer audio via long-running operations, and streaming recognition for real-time audio input. Audio can be provided inline or referenced from Google Cloud Storage.

- **Models**: Multiple recognition models are available, each tuned to different audio types, including telephony_short and telephony models optimized for phone audio. Advanced models include Chirp (2B-parameter large speech model) and Chirp 2/3.
- **Language support**: 125+ languages with configurable language codes per request.
- **Audio auto-detection**: The V2 API can automatically detect the sample rate, channel count, and format of audio files without needing to provide that information in the request configuration.

### Recognizer Management (V2)

A user-defined named configuration (Recognizer) combines a model identifier, the language-locale of the audio, and the cloud region for the transcription model. Once created, the recognizer can be referenced in every subsequent transcription request, eliminating the need to repeatedly define the same configuration parameters.

### Model Adaptation & Speech Hints

Speech-to-Text uses model adaptation to improve the accuracy of frequently used words, expand vocabulary, and improve transcription from noisy audio. Model adaptation lets users customize recognition to recognize specific words or phrases more frequently. For example, you could bias it towards transcribing "weather" over "whether."

- **Phrase Sets**: Define sets of words or phrases to bias recognition results.
- **Custom Classes**: Define a set of words or phrases that represents a common concept or theme likely to appear in your audio, for example a list of passenger ship names.
- **Boost values**: Control how strongly the model is influenced toward specific terms.

### Speaker Diarization

Under the Chirp 3 model, capabilities include speaker diarization to identify different speakers and automatic language detection for multilingual audio. Configurable with minimum and maximum speaker count parameters.

### Multi-Channel Recognition

Speech-to-Text can recognize distinct channels in multichannel situations (for example, video conference) and annotate the transcripts to preserve the order.

### Automatic Punctuation & Word-Level Confidence

The API has additional recognition features such as automatic punctuation and word-level confidence, enabled in the recognition configuration in requests.

### Text-to-Speech Synthesis

Convert text input into audio data using Google's AI voices. Supports plain text and SSML (Speech Synthesis Markup Language) input.

- **Voice types**: Standard, WaveNet, Neural2, Studio, and Chirp 3: HD voice tiers with varying quality levels.
- **Configuration**: Customizable pitch, speaking rate, volume gain, and audio encoding (MP3, LINEAR16, OGG_OPUS).
- **Voice selection**: Specify language code, voice name, and gender.
- **Long audio synthesis**: Generate long-form audio content asynchronously.

### Data Residency & Regional Deployment

The Speech-to-Text v2 API supports full regionalization, allowing customers to invoke transcription models in the Google Cloud Platform region of their choice.

- Enterprise-grade encryption with customer-managed encryption keys for all resources as well as batch transcription.
- In practice, recognizer-based v2 flows may still require `locations/global` for some projects or accounts. Google’s recognizer examples consistently use `global`, so integrations should treat `global` as the safest default and only rely on regional locations when the target project explicitly supports them.

### Subtitle/Caption Output

The V2 API supports output in SubRip Text (SRT) subtitle format for batch transcription results, useful for video captioning workflows.

## Events

The provider does not support events. Google Cloud Speech APIs are request-response based (synchronous, asynchronous, and streaming) and do not offer webhooks or purpose-built polling mechanisms for event subscriptions.
