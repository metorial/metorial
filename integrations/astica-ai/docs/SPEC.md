# Astica AI Integration Specification

## Overview

Astica AI is a cognitive intelligence platform that provides AI APIs for computer vision (image analysis), text-to-speech, speech-to-text, natural language processing (GPT-S), and AI image generation. It offers a suite of cognitive intelligence APIs, including computer vision, natural language processing, and voice synthesis, enabling developers to integrate advanced AI capabilities into their applications. The platform also supports custom model training for vision AI.

## Authentication

Astica AI uses API keys for authentication. To use the Astica API, you need to sign up and obtain an API key from the Astica website. The API key will be used to authenticate your requests to the API.

- **API Key**: Generated from the Astica dashboard at `https://astica.ai/api-keys/`.
- **Usage in requests**: The API key is passed in the JSON request body as the `tkn` parameter. For example, in a REST API call: `"tkn": "YOUR API KEY"`.
- **JavaScript SDK**: When using the JavaScript SDK, authentication is done by calling `asticaAPI_start('API KEY HERE')` once before making any API calls.

There is no OAuth2 or other authentication method; all API access is authenticated solely via the API key included in each request payload.

## Features

### Computer Vision (asticaVision)

asticaVision is a general-purpose computer vision model that allows you to incorporate computer vision capabilities into applications using a REST API or JavaScript API. It analyzes images provided via HTTPS URL or Base64-encoded string.

- **Image Description & Captioning**: Returns captions describing the image, including multiple auxiliary captions.
- **Object Detection**: Identifies and detects a wide range of objects within images. Supports custom object detection via user-supplied keyword lists.
- **Face Detection**: Detects faces and estimates age and gender of individuals.
- **OCR / Text Reading**: Returns the results of OCR with positional coordinates.
- **Image Moderation**: Detects adult or inappropriate content for content moderation.
- **Tagging & Categorization**: Automatically generates descriptive tags and assigns categories to images based on visual content.
- **GPT-powered Descriptions**: Uses vision results to create detailed descriptions of images. Custom prompts and output length use `gpt_prompt` and `prompt_length`.
- **Additional parameters**: color analysis, brand detection, celebrity recognition, landmark detection.
- **Model versions**: Supports multiple model versions (1.0_full, 2.0_full, 2.1_full, 2.5_full).
- PNG and JPG are supported; model 2.5 additionally supports BMP and JIFF.
- The integration maps auxiliary caption `conf` to `captionList[].confidence`, face bounding boxes to `faces[].rectangle`, and object colors to `objectColors`.

### AI Image Generation (asticaDesign)

The asticaDesign image generation API provides the ability to generate realistic photographs and creative images. It generates images according to a provided prompt describing the style, colors, and subject matter.

- **Parameters**: prompt, negative prompt, quality setting (standard/high), lossless output, seed for reproducibility.
- **Low priority mode**: Supports a low priority mode for generating larger batches of images (non-realtime).
- Synchronous generated images are provided as downloadable files and URLs. Low-priority calls retain the provider's result URL; the public reference does not specify its polling response contract.

### Text-to-Speech (asticaVoice)

The asticaVoice API allows developers to integrate natural-sounding voice outputs into their applications, offering a wide selection of voices and multilanguage support.

- **Voice selection**: Choose from expressive voices, programmable voices shaped with natural-language prompts, neural voices for narration, or instant voice clones. Offers 500+ voices across multiple speaker types, plus multi-language support.
- **Private clones**: `list_voices` optionally includes existing private voice clones. Clone creation is not exposed by this integration.
- **Parameters**: voice identifier, timestamps for expressive voices, persona prompt for programmable voices, and low-priority queueing for expressive voices or clones.
- **Audio**: This integration uses non-streaming REST responses and provides downloadable WAV audio. The existing `audioBase64` output continues to contain the original audio value.
- **Queued speech**: `text_to_speech` returns an optional `taskId`; `get_speech_task` calls `POST /api/tts/task` with `tkn` and `task_id`. Pending responses expose task state, and completed responses deliver audio from the nested `result` object. Failed or cancelled tasks raise a provider error.

### Speech-to-Text (asticaListen)

The asticaListen hearing AI enables real-time voice transcription with high transcription accuracy, multilingual support, and versatile input formats.

- **Input formats**: Accepts .wav and .mp3 audio files via URL, Base64, or direct file upload.
- **Streaming**: Supports a streaming mode via the `doStream` parameter.
- Can transcribe from microphone input (in browser via JavaScript SDK) or from audio files.

### Natural Language Processing (asticaGPT / GPT-S)

The developer API provides access to astica GPT-S, a powerful natural language processing engine that can generate text in a human-like manner, respond to questions, and create stories based on a given prompt or scenario.

- GPT-S is developed without a restrictive content filter, enabling diverse content generation across various topics.
- **Parameters**: temperature, top_p, max tokens, stop sequence, instruction, think_pass, and stream_output.
- **Low priority mode**: Offers a low priority API, allowing users to save on usage costs by sending a request and receiving the output when it becomes available at a later time.

## Events

This integration exposes no triggers. Low-priority speech task polling is an explicit tool operation.

## Official API References

- [Vision](https://astica.ai/vision/documentation/)
- [Image generation](https://astica.ai/design/documentation/)
- [Voice, private clones, speech tasks, and errors](https://astica.ai/voice/documentation/)
- [Hearing](https://astica.ai/hearing/documentation/)
- [Text generation](https://astica.ai/nlp/documentation/)

No public account identity endpoint was found in these API references. Image and text low-priority polling contracts are incomplete in the public documentation, so this integration does not invent additional polling endpoints.
