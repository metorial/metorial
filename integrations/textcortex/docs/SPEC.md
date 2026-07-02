# Slates Specification for Textcortex

## Overview

TextCortex is an AI-powered text generation and content creation platform. It is an enterprise-ready business software designed for companies aiming to integrate AI with their own data and knowledge, providing features for content creation, data analysis, and knowledge management. It supports more than 25 languages and offers access to multiple AI models through its API (known as HemingwAI).

## Authentication

TextCortex uses **API Key** authentication.

- To generate an API key, log in to TextCortex and go to the API Key page at `https://app.textcortex.com/user/dashboard/settings/api-key`.
- Provide your bearer token in the `Authorization` header when making requests to protected resources.
- The API key is passed as a Bearer token in the `Authorization` header: `Authorization: Bearer <YOUR_API_KEY>`
- The base URL for the API is `https://api.textcortex.com/v1/`
- The API isn't included in any subscription plans; users receive initial API credits upon sign-up and need to top up credits when those are exhausted.

## Features

### Text Generation & Autocomplete

Expands, continues, and completes instructed sentences. Useful for general-purpose text generation from a given prompt. Configurable parameters include `prompt`, `temperature` (creativity, 0–1, default 0.7), `word_count`, `source_language`, and `n_gen` (number of generations).

### Blog Article Generation

Generates blog articles on selected blog titles and keywords. Accepts parameters such as topic, title, blog categories, and target tone.

### Product Description Generation

Generates product descriptions given product name, category, brand, and features. Supports 72 languages via source language codes, with an `auto` option for automatic language detection.

### Ad Copy Generation

Generates ads based on the product being sold. The model is instructed with a product and a target segment for generating texts.

### Email Generation

Generates email bodies based on the email subject, and generates email subjects based on given keywords.

### Social Media Content Generation

Creates social media posts for various platforms with given keywords. Includes Instagram captions and other platform-specific content. Target audience can be specified as a parameter.

### Text Rewriting / Paraphrasing

Rewrites given text without changing its meaning. Supports different rewriting modes (e.g., `voice_passive`). Available at the `/v1/texts/rewritings` endpoint.

### Text Summarization

Summarizes given text, which can be provided as a string or as a file ID.

### Translation

Translates given text into another language. Supports a wide range of languages.

### Code & SQL Generation

Generates code for a given programming language and generates SQL queries given table descriptions.

### Text Classification & Entity Extraction

Extracts core information out of text and classifies data on a large scale. Allows labeling text to specific instructions.

### Text Similarity

Captures text similarities between texts, useful for finding similar entities within text data.

### Knowledge Bases

A knowledge base lets you work with multiple files simultaneously, retrieving information and gaining insights across all your documents at once. The AI agent provides relevant answers with sources from your centralized data. Knowledge bases can be integrated with platforms such as Google Drive, SharePoint, Microsoft OneDrive, and Notion.

### Model Selection

Within the NeoCortex system there are 4 model categories: Velox (fastest), Alta (most powerful), and Sophos (fine-tuned expert models for specialized workflows).

## Events

The provider does not support events. TextCortex's API is request-response based and does not offer webhooks, event subscriptions, or purpose-built polling mechanisms.
