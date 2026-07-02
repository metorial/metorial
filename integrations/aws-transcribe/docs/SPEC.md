# Slates Specification for AWS Transcribe

## Overview

Amazon Transcribe is a fully managed automatic speech recognition (ASR) service that converts speech to text. It supports both batch transcription of media files stored in Amazon S3 and real-time streaming transcription of audio. It offers three main types of batch transcription: Standard, Medical, and Call Analytics.

## Authentication

AWS Transcribe uses standard AWS authentication mechanisms. Authentication requires signing in as the AWS account root user, an IAM user, or by assuming an IAM role. You can also sign in as a federated identity using credentials from AWS IAM Identity Center, single sign-on authentication, or external identity providers.

For programmatic API access, you need:

- **AWS Access Key ID** (`AWS_ACCESS_KEY_ID`): Identifies the IAM user or role making requests.
- **AWS Secret Access Key** (`AWS_SECRET_ACCESS_KEY`): Used to sign API requests.
- **AWS Session Token** (`AWS_SESSION_TOKEN`, optional): Required when using temporary security credentials obtained via AWS STS.
- **AWS Region**: The region where the Transcribe service is being accessed (e.g., `us-east-1`).

All requests must be signed using AWS Signature Version 4. The credential scope includes your access key, the date, the target region, the service name, and a termination string.

AWS provides managed IAM policies such as `AmazonTranscribeFullAccess` (full CRUD access plus access to S3 buckets with "transcribe" in the name) and `AmazonTranscribeReadOnlyAccess` (read-only access to get and list transcription jobs and custom vocabularies). You can also create custom IAM policies for more granular control.

## Features

### Batch Transcription

Transcribe pre-recorded audio or video files stored in Amazon S3. Supported formats include FLAC, MP3, MP4, Ogg, WebM, AMR, and WAV. Files are limited to four hours or 2 GB per API call. Output is stored in a user-specified or AWS-managed S3 bucket. Transcription output in AWS-managed buckets is automatically deleted after 90 days.

### Streaming Transcription

Process live audio for real-time transcription by sending audio over a secure connection and receiving text in response. Streaming supports Standard, Medical, Call Analytics, and HealthScribe transcription types. Streaming connections can remain open for up to four hours.

### Automatic Language Identification

Automatic language identification is supported for both batch and streaming APIs. You can use single-language identification for media containing one language, or multi-language identification for media with multiple languages. You can optionally provide a list of expected languages to improve accuracy.

### Custom Vocabularies

Add domain-specific words and phrases like product names, technical terminology, or names of individuals to improve transcription accuracy. Vocabularies can be created as tables (with fine-tuned control over display) or simple lists. Each entry cannot exceed 256 characters, and vocabularies must be created in the same region as the transcription.

### Custom Language Models

Build and train custom language models by submitting a corpus of text data to Amazon Transcribe to improve accuracy for specific domains and use cases.

### Vocabulary Filtering

Specify a list of words to remove from transcripts, such as profane or offensive words, which Amazon Transcribe removes automatically. Multiple filter lists can be maintained for different use cases.

### Speaker Diarization

Speaker changes are automatically recognized and attributed in the text to capture scenarios like telephone calls, meetings, and television shows.

### Channel Identification

Concurrently transcribe multi-channel audio and produce one final coherent transcript. Useful for call center recordings where agent and customer are on separate channels.

### Content Redaction (PII)

Amazon Transcribe can identify and redact sensitive personally identifiable information (PII) from transcripts. With the streaming API, you can selectively redact specific PII types (e.g., social security numbers and credit card information) while keeping others.

### Subtitle Generation

Produce subtitle files in WebVTT (_.vtt) and SubRip (_.srt) formats. Timestamps are provided for each word to facilitate syncing with the original recording.

### Toxicity Detection

Enables toxic speech detection in transcripts. Must include toxicity categories in the request.

### Call Analytics

Automatically extracts insights such as sentiment, call categories, call characteristics, and generative AI-powered summaries from customer calls. Designed for use with call center audio on two different channels. Can remove sensitive personal information from both transcripts and source audio.

### Medical Transcription

Amazon Transcribe Medical enables medical speech-to-text capabilities for transcribing medical dictation and conversational speech, supporting use cases such as recording physician notes or processing downstream text analytics. Medical transcriptions incorporate medical terms and are commonly used for transcribing doctor-patient dialogue in real time.

### AWS HealthScribe

HealthScribe transcriptions are designed to automatically create clinical notes from patient-clinician conversations using generative AI.

## Events

AWS Transcribe supports event-driven notifications through Amazon EventBridge.

### Transcription Job State Changes

With Amazon EventBridge, you can respond to state changes in your Amazon Transcribe jobs by initiating events in other AWS services. When a transcription job changes state, EventBridge automatically sends an event to an event stream. Events are emitted when a transcription job's status changes to COMPLETED or FAILED. You can configure rules to route these events to targets such as AWS Lambda or Amazon SNS.

### Language Identification State Changes

When automatic language identification is enabled, Amazon Transcribe generates an event when the language identification state is COMPLETED or FAILED, identifiable via the event's JobName field.

### Custom Vocabulary State Changes

When a custom vocabulary's state changes from PENDING to READY or FAILED, Amazon Transcribe generates an event, identifiable via the event's VocabularyName field.

### HealthScribe Post-Stream Analytics

Events are generated for HealthScribe streaming sessions, identified by SessionId, with a status that can be IN_PROGRESS, COMPLETED, or FAILED. The event includes output locations for clinical notes and transcripts.
