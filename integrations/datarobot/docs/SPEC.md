# Slates Specification for DataRobot

## Overview

DataRobot is an enterprise AI/ML platform that automates the end-to-end process of building, deploying, and managing predictive models. The REST API provides a programmatic alternative to the web interface for creating and managing DataRobot projects, building predictive models, and deploying them into production environments. It also supports deploying custom models written in any open-source language or library for real-time or batch predictions.

## Authentication

DataRobot uses **API key-based authentication** as the primary method for API access.

### API Key (Bearer Token)

API keys are the preferred method for authenticating web requests to the DataRobot APIs; they replace the legacy API token method. When interacting with the DataRobot API, authentication is performed using a bearer token contained in the HTTP Authorization header.

To authenticate, include the API key in the request header:

```
Authorization: Bearer <API_KEY>
```

**Obtaining an API key:**
From the DataRobot UI, click the user icon in the top right corner and select "API keys and tools." Click "Create new key," name the new key, and click "Create."

**API Endpoint:**
The base URL depends on your DataRobot instance. Common endpoints include `https://app.datarobot.com`, `https://app.eu.datarobot.com`, and `https://app.jp.datarobot.com`, or a custom URL for self-managed installations (e.g., `https://my-company.datarobot.com`).

The REST API base path is typically: `https://app.datarobot.com/api/v2`

**Required parameters for authentication:**

- **API Key**: Generated from the DataRobot UI under API keys and tools.
- **Endpoint URL**: The DataRobot instance URL (varies by region or self-managed installation).

## Features

### Project Management

The API provides a programmatic alternative to the web interface for creating and managing DataRobot projects. Users can create projects by uploading datasets, configure project settings, set target variables, and manage the overall modeling workflow.

### Automated Machine Learning (AutoML / Autopilot)

Autopilot automatically selects the best predictive models for a specified target feature and runs them at increasing sample sizes, resulting in a selection of best-suited models and identification of a recommended model. Users can configure the Autopilot mode (e.g., Quick, Full), specify target features, and set advanced options like partitioning and feature engineering.

### Model Training and Evaluation

Users can train individual models, perform advanced tuning of hyperparameters, compute feature impact scores, generate lift charts, ROC curves, confusion matrices, and partial dependence plots. The API provides access to model insights including prediction explanations and feature importance rankings.

### Data Registry (AI Catalog)

The API provides endpoints for managing data, including the Data Registry, datasets, feature lists, and blueprints. Users can upload, list, share, version, and delete datasets. Datasets can be categorized for training, prediction, batch predictions, or custom model testing.

### Model Registry

The Model Registry organizes all models used in DataRobot as registered models containing deployment-ready model packages. You can register DataRobot, custom, and external model packages. From the Model Registry, you can generate model compliance documentation from model packages and deploy, share, or archive models.

### Model Deployment

Users can deploy models to production environments through the API. Models written in any open-source language or library can be deployed and exposed as a production-quality REST API to support real-time or batch predictions. Deployments can be managed, shared, replaced with new models, and deleted.

### Predictions

- **Real-time Predictions**: The Prediction API allows making predictions on a model deployment by specifying the deployment ID. Supports both structured and unstructured model types.
- **Batch Predictions**: The Batch Prediction API provides flexible options for intake and output when scoring large datasets. Supports reading from and writing to S3 and databases.
- **Prediction Explanations**: Prediction Explanations identify why a given model makes a certain prediction, using the same endpoint as bare predictions with the `maxExplanations` parameter.

### Deployment Monitoring (MLOps)

After deploying a model, users can access advanced model management features such as data drift, accuracy, and service health statistics. This includes monitoring for target drift, data drift, and service health across all deployments.

### Custom Models

Custom inference models allow users to bring pre-trained models into DataRobot. Users can create custom models in the Custom Model Workshop, then prepare, test, register, and deploy them to a centralized deployment hub for monitoring and management. DataRobot supports custom models built in Python, R, and Java.

### Time Series Modeling

The API supports time series projects with specialized features including datetime partitioning, forecast windows, known-in-advance features, multi-series projects, and calendar integration for events and holidays.

### Credentials Management

Users can store and manage credentials for connecting to external data sources (databases, cloud storage). Supported credential types include basic authentication, OAuth, API tokens, S3, GCP, Azure, Snowflake, and Databricks credentials.

### Compliance Documentation

Users can programmatically generate compliance documentation from models, providing evidence that model components work as intended and are appropriate for their business purpose.

## Events

DataRobot supports webhooks that allow users in an organization to subscribe to certain DataRobot events. When a notification event is triggered, an HTTP POST payload is sent to the webhook's configured URL.

Secret tokens can be used to verify that notification requests are authentic and coming from DataRobot. Users create a secret key known only to DataRobot and the client-side, and add it to the notification channel configuration.

### Project Events

Events related to modeling project lifecycle:

- Project created, deleted, shared
- Autopilot completed

### Dataset Events

Events related to dataset management in the AI Catalog:

- Dataset created, deleted, shared

### Deployment Events

Events related to model deployment lifecycle and health monitoring:

- Deployment created, deleted, shared, model replaced
- Service health status changes (green to yellow, red)
- Data drift status changes (green to yellow, red)
- Accuracy health status changes (green to yellow, red)
