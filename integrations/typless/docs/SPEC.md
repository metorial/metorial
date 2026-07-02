Now I have enough information to write the specification. Let me also quickly check the API reference for the specific endpoints available.Based on all the research gathered, here is the specification:

# Slates Specification for Typless

## Overview

Typless is an AI-powered intelligent document processing (IDP) platform that automates data extraction from documents such as invoices, receipts, purchase orders, and other business documents. It uses OCR combined with machine learning and incremental learning to extract structured data fields from uploaded files (PDF, JPG, BMP, PNG, TIFF), improving accuracy over time through human validation feedback.

## Authentication

Typless uses **API Key** authentication. To use the Typless API you need to authorize your requests with an API key. The API key is passed via the `Authorization` header.

- **Obtaining the API key:** The API key can be found in your profile view on the Settings page of the Typless hub/dashboard.
- **Usage:** Include the API key in the `Authorization` header of every request:
  ```
  Authorization: Token <your_api_key>
  ```
- **Base URL:** `https://developers.typless.com/api/`

No OAuth or additional scopes are required. A single API key provides access to all API features associated with your account.

## Features

### Document Type Management

A document type is your configuration for data extraction of a single type of document. A single document type covers all of your suppliers providing you the same type of document. For example, you would use one document type for all incoming invoices. You define which fields (metadata and line items) should be extracted for each document type. A document type is not limited to a single language or charset — it can extract data from more than 170+ languages and character sets. Pre-built templates (e.g., simple invoice, VAT invoice, line-item invoice) are available as starting points.

### Data Extraction

Extract all types of documents with just one API call — whether you have invoices, financial, freight, or packing lists, and more. You submit a document file along with a document type slug, and Typless returns structured extracted data. For each of the defined fields, you get an object inside `extracted_fields`. Every field has up to 5 best-predicted value blocks with coordinates, recognized value, and confidence score. The values are always in a string format.

- **Supported formats:** PDF, JPG, BMP, PNG, TIFF (with various compression options).
- Maximum file size is 30 MB. Documents must be portrait oriented.
- Dates are normalized to `YYYY-MM-DD` format; numbers are normalized to decimal format.

### Dataset Building and Training

Typless is a tool for automation — you need to fill the data set and train it first. You add documents with their correct field values to a dataset using the add-document endpoint. For simple layouts, one document in the dataset is enough, but for more complex ones you may need around 5 from the same supplier. Training can be triggered from the dashboard.

### Continuous Learning via Feedback

Typless embraces the fact that the world is changing all the time. You can improve models on the fly by providing correct data after extraction. To send feedback, use the add-document-feedback endpoint with the `object_id` returned from extraction. This enables incremental learning where Typless takes full advantage of every human validation, and as a result, the need for human involvement declines over time.

### Model Management

Typless provides detailed information and management of supplier models in your document types. You can check details for every separate document type. This includes viewing confidence scores for metadata and line item extraction, triggering model training, and deleting models.

### User Profile

You can retrieve and update user profile details, keeping account information current. The profile includes information such as the API key and email address.

## Events

The provider does not support events. Typless does not offer webhooks, event subscriptions, or built-in polling mechanisms through its API. Interaction is strictly request-response based: you submit documents for extraction and receive results synchronously.
