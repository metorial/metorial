Now let me look at the Metatext GitHub examples repo and the Pipedream code sample more closely for API details.Now I have enough information to compile the specification. Let me also note that Metatext has two API products: a "Pre-built AI Models API" (hub-inference) and an "Inference API" for custom models. Let me also check the Pipedream actions more closely to understand what specific actions are available.

# Slates Specification for Metatextai

## Overview

Metatext AI is a no-code platform for building, training, and deploying custom NLP models. Users can classify, extract, and generate text using language models tailored with their own data and expertise. It also offers pre-built AI models for common tasks like sentiment analysis and keyword extraction, accessible via API.

## Authentication

Metatext AI uses API key authentication. Metatext.AI uses API keys for authentication.

The API key is passed as a custom header in each request:

- **Header name:** `x-api-key`
- **Header value:** Your API key

API keys can be obtained from the Metatext AI platform after signing up at `https://metatext.ai` or `https://metatext.io`.

**Base URL:** `https://api.metatext.ai`

Example request:

```
POST https://api.metatext.ai/hub-inference/sentiment-analysis
Headers:
  Content-Type: application/json
  x-api-key: YOUR_API_KEY
Body:
  { "text": "Your text here" }
```

## Features

### Text Classification

Classify text or documents into custom or pre-defined categories. Metatext supports various NLP tasks such as text classification, intent detection, sentiment analysis, topic categorization, spam detection, and more.

- Users can build custom classification models trained on their own labeled data.
- Use cases include review analysis, feedback analysis, survey response analysis, chatbot intent detection, news classification, document classification, sentiment analysis, topic analysis, and incoming email classification.
- Custom models are deployed and accessible via dedicated HTTP endpoints.

### Text Extraction (NER)

Extract structured information from unstructured text. Supports entity recognition and keyword extraction to extract, normalize, and structure key information from any text or document.

- With a text extraction AI you can analyze legal contract documents, normalize entry data, extract keywords from texts, and perform entity recognition.
- Custom extraction models can be created for domain-specific entities.

### Text Generation

Generate text content using custom or pre-built language models. Supports generative AI applications including RAG, summarization, LLM fine-tuning, question and answering, and chatbot use cases.

- Pre-built models available for blog post generation, news headline summarization, and general text generation.
- Custom models can be fine-tuned to a specific domain.

### Pre-built AI Models (Hub Inference)

Access ready-to-use AI models without training, available at the `hub-inference` endpoint. Available pre-built models include:

- Sentiment analysis: determine the sentiment of text (positive, negative, or neutral).
- Keyword extraction: identify and extract significant keywords from text.
- Blog post generation, news headline summarization, and general text generation based on prompts.

### Model Training and Management

Build and manage custom NLP models through the platform. An AutoNLP engine trains and fine-tunes the best model for each use case.

- Uses a proprietary distillation methodology that combines LLMs into an iterative process to train smaller models with less data.
- Training data can be uploaded programmatically, including from external sources like Google Sheets.
- Models are primarily deployed on the platform for real-world use cases; while direct download may not be available, models can be integrated into applications through APIs.

### Model Evaluation

Monitor and assess model performance. Metatext helps users understand how models are performing and how to improve them.

- Includes error analysis capabilities.
- Supports iterative refinement of models based on evaluation results.

## Events

The provider does not support events. There is no documented webhook or event subscription mechanism available through the Metatext AI API.
