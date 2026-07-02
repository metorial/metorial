# Slates Specification for Roboflow

## Overview

Roboflow is a computer vision platform that enables users to upload and annotate image datasets, train object detection and classification models, and deploy them via hosted or self-hosted inference APIs. It provides tools for the full computer vision lifecycle including dataset management, model training, inference, and monitoring.

## Authentication

Most Roboflow API endpoints require an API key. You can authenticate your request through the `api_key` parameter in the body or query string, via a bearer authentication header, or with a query parameter.

**API Key Types:**

- **Private API Key**: Used by the Roboflow API and Roboflow Inference.
- **Public / Publishable API Key**: Used by `inference.js`, the JavaScript inference SDK.

**Key Scoping:**

API keys are scoped to a Workspace, which means you must use the API key associated with a workspace to access that workspace's private projects. Workspaces on Enterprise plans can create multiple API keys, allowing them to isolate environments and instantly revoke access for specific deployments or personnel. Scoped API Keys are also available as an add-on for Enterprise customers.

**Authentication Methods:**

1. **Query parameter**: Append `?api_key=YOUR_KEY` to the request URL. Due to security implications, using a query parameter may not be the best practice; for production use cases, sending the API key via the header is recommended.
2. **Bearer header**: Send your API key as a bearer authentication header.
3. **JSON body**: Send your API key as a parameter within a JSON request body of POST endpoints.

**Base URL:** `https://api.roboflow.com` for the management REST API; `https://detect.roboflow.com` for the hosted inference API.

**API Key Retrieval:** Go to the Roboflow dashboard, click on "Settings" in the left navigation bar, then "API Keys."

## Features

### Workspace & Project Management

Manage workspaces and projects that organize your computer vision data and models. The data structure is hierarchical: Workspaces contain Projects, which contain Versions, which have trained models and are exported in various formats. You can create projects, list projects and versions, and organize projects into folders. Projects can be created with various types including object detection, classification, instance segmentation, and semantic segmentation.

### Image & Dataset Management

Upload, manage, and search images and annotations in your projects. You can upload and export JSON, XML, CSV, and TXT annotation formats, as well as JPG, PNG, and BMP image files. Features include uploading individual images or full datasets, adding/removing image tags, deleting images, uploading annotations, and searching images using visual similarity. You can also upload video files (mov, mp4, avi), and Roboflow will extract frames based on a specified sample rate.

### Dataset Versioning & Preprocessing

Create versioned snapshots of your dataset with configurable preprocessing and augmentation settings. Preprocessing options include auto-orient, resize, grayscale, auto-contrast, static crop, tile, and class modification. Augmentation options include random flip, rotate, crop, shear, brightness, exposure, blur, noise, cutout, and mosaic. Datasets can be exported in 15+ different formats.

### Annotation Jobs

Use the jobs endpoint to get info about annotation jobs, their current status, or assign images for labeling by creating a new annotation job with images from one of your batches. Each job requires a labeler and reviewer (workspace members) and is associated with an image batch.

### Annotation Insights

Roboflow provides statistics on annotations associated with your workspace and projects. Metrics include images labeled, annotations created/updated/removed, approval rates, model-assisted labeling counts, and per-labeler breakdowns.

### Model Training

Train models with one click using Roboflow Train. Within 24 hours, you'll get results including mAP, precision, and recall, as well as a hosted API for inference. You can view training results, evaluate models, cancel or stop training jobs early. Supported tasks include object detection, classification, instance segmentation, semantic segmentation, and keypoint detection.

### Model Inference

Run predictions on trained models or foundation models via the hosted serverless API or self-hosted inference servers. The Inference SDK supports running inference across a wide range of model types, with local and hosted backends, including versionless models and foundation models. Foundation models available include CLIP, OCR, and YOLO-World, as well as pre-trained APIs for tasks like blur people, barcode detection, license plate detection, and more. Configurable parameters include confidence threshold, IoU threshold, and class filters.

### Workflows

A workflow is made up of blocks that perform specific tasks, such as running model inference, performing logic, or interfacing with external services. Choose from 40+ pre-built blocks including models from OpenAI or Meta AI, applications like Google Sheets or PagerDuty, and logic like filtering or cropping. Workflows can be deployed as API endpoints, on-prem, or at the edge.

### Model Monitoring

Track statistics about deployed models in a workspace, including inference result stats and custom metadata. This enables active learning loops where production inferences are fed back into training datasets.

### Roboflow Universe

Browse, explore, fork, and download public datasets and models on Roboflow Universe. You can find datasets, explore images, fork datasets into your workspace, and find pre-trained models.

## Events

Roboflow does not provide a general-purpose webhook or event subscription system for platform events (e.g., project updates, training completion, annotation changes).

Batch processing jobs support webhook notifications. Once a batch job is completed, your system will be notified via a configured webhook URL. Notifications are delivered via HTTP POST requests to the specified webhook endpoint, with an Authorization header containing the Roboflow Publishable Key. The ingest-status category provides updates about the overall status of data ingestion.

These webhooks are limited to the batch processing context:

### Batch Data Ingestion Status

Notifications about the progress or completion of data ingestion into a batch. Includes details about successfully ingested files and any failures.

- Configurable via `--notifications-url` and `--notification-category` parameters.

### Batch Job Completion

Notifications sent when a batch processing job finishes (success or failure). In response to this event, you can automatically trigger pulling of results and initiate further processing, enabling end-to-end automation.

- Configurable via `--notifications-url` when launching a batch processing job.
