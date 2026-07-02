# Slates Specification for Google Cloud Vision

## Overview

Cloud Vision API allows developers to easily integrate vision detection features within applications, including image labeling, face and landmark detection, optical character recognition (OCR), and tagging of explicit content. It is a pre-trained machine learning service that analyzes images via a REST API, accepting images as base64-encoded data, Google Cloud Storage URIs, or publicly accessible URLs.

## Authentication

Google Cloud Vision supports three authentication methods:

### 1. API Key

You can use a Google Cloud console API key to authenticate to the Vision API. Follow the instructions to create an API key for your Google Cloud console project. When making any Vision API request, pass your key as the value of a `key` parameter.

Example: `POST https://vision.googleapis.com/v1/images:annotate?key=YOUR_API_KEY`

Note: If you're using an API key, the file must be publicly accessible when referencing images in Cloud Storage.

### 2. Service Account (OAuth 2.0)

Using a service account to authenticate is the preferred method. To use a service account to authenticate to the Vision API: Follow the instructions to create a service account. Select JSON as your key type. Once complete, your service account key is downloaded to your browser's default location.

If you're calling the Vision API directly, such as by making an HTTP request with cURL, you'll pass your authentication as a bearer token in an Authorization header.

For OAuth 2.0, the following scopes are applicable:

- `https://www.googleapis.com/auth/cloud-platform` or `https://www.googleapis.com/auth/cloud-vision`

OAuth 2.0 endpoints:

- Authorization: `https://accounts.google.com/o/oauth2/v2/auth`
- Token: `https://oauth2.googleapis.com/token`

### 3. Application Default Credentials (ADC)

To authenticate calls to Google Cloud APIs, client libraries support Application Default Credentials (ADC); the libraries look for credentials in a set of defined locations and use those credentials to authenticate requests to the API. Services using ADC look for credentials within a `GOOGLE_APPLICATION_CREDENTIALS` environment variable. Unless you specifically wish to have ADC use other credentials (for example, user credentials), we recommend you set this environment variable to point to your service account key file. `export GOOGLE_APPLICATION_CREDENTIALS=PATH_TO_KEY_FILE`.

### Prerequisites

- A Google Cloud project with the Vision API enabled.
- Billing must be enabled for your Google Cloud project. You must enable the Vision API for your project.
- To use the Vision API, the security principal usually needs the Cloud Storage > Storage object viewer (`roles/storage.objectViewer`) predefined IAM role to send requests that specify files in Cloud Storage.

## Features

### Label Detection

Identifies general objects, locations, activities, animal species, products, and more within an image. The Label Detection feature is far more broad-ranging and can identify general objects, locations, activities, animal species, products, and more, but it gives no information bounding polygon localization information as result.

- **Parameters:** `maxResults` to limit the number of labels returned.

### Object Localization

The Vision API can detect and extract multiple objects in an image with Object Localization. Object localization identifies multiple objects in an image and provides a LocalizedObjectAnnotation for each object in the image. Each LocalizedObjectAnnotation identifies information about the object, the position of the object, and rectangular bounds for the region of the image that contains the object.

- **Parameters:** `maxResults` to limit the number of objects returned.
- Object information is returned in English only.

### Face Detection

Detects faces and associated attributes like emotions and facial orientation. Returns positions of facial landmarks (eyes, nose, mouth, etc.), detection confidence scores, and likelihood ratings for emotions such as joy, sorrow, anger, and surprise.

- **Parameters:** `maxResults` to limit the number of faces returned.

### Landmark Detection

Identifies well-known natural and human-made landmarks in images. The API will also provide their known geographical locations if available.

- **Parameters:** `maxResults` to limit the number of landmarks returned.

### Logo Detection

This feature allows the API to recognize logos of popular brands within an image. This can be particularly useful for brand monitoring, market analysis, or detecting brand presence in social media images.

- **Parameters:** `maxResults` to limit the number of logos returned.

### Text Detection (OCR)

Extracts text from images using optical character recognition. Two modes are available:

- **TEXT_DETECTION:** Extracts text from photos and images of general scenes.
- **DOCUMENT_TEXT_DETECTION:** Optimized for dense text and documents. The Vision API can detect handwriting in an image. To detect handwriting in an image, specify the DOCUMENT_TEXT_DETECTION feature and include a language hint of "en-t-i0-handwrit".
- Supports PDF and TIFF files in document text detection.
- A `languageHint` can optionally be provided, though automatic language detection (languageHint is no longer required in your requests).

### Safe Search Detection

SafeSearch Detection detects explicit content such as adult content or violent content within an image. This feature uses five categories (adult, spoof, medical, violence, and racy) and returns the likelihood that each is present in a given image.

- Each category returns one of five likelihood levels: VERY_UNLIKELY, UNLIKELY, POSSIBLE, LIKELY, or VERY_LIKELY.

### Image Properties Detection

The Image Properties feature detects general attributes of the image, such as dominant color. Returns dominant color information including RGB values, pixel fraction, and score.

### Crop Hints

Suggests crop regions for an image based on detected content. `cropHintsParams.aspectRatios` - A float that corresponds to your specified ratio(s) for your images (width:height). You can supply up to 16 crop ratios. If no aspect ratio is specified, the best possible crop is returned.

### Web Detection

Web entities detection accepts geotag input as detection hint, and returns best guess labels describing the contents of the image. Returns matching web pages, visually similar images, and web entities related to the image.

- **Parameters:** `includeGeoResults` to include results derived from geo information in the image.

### Asynchronous Batch Annotation

The Vision API supports offline asynchronous batch image annotation for all features. This asynchronous request supports up to 2000 image files and returns response JSON files that are stored in your Cloud Storage bucket.

### Image Input Options

Images can be provided in three ways:

- It can be sent as a base64-encoded string, a Cloud Storage file location, or as a publicly-accessible URL.
- `features` lists the types of annotation to perform on the image. You can specify one or many types, as well as the maxResults to return for each.

## Events

The provider does not support events. Google Cloud Vision is a stateless image analysis API that processes individual requests and does not have built-in webhook or event subscription mechanisms. For event-driven workflows, users can combine Vision API with other Google Cloud services like Pub/Sub and Cloud Functions to react to events (e.g., new images uploaded to Cloud Storage), but this is outside the scope of the Vision API itself.
