# Slates Specification for Replicate

## Overview

Replicate is a cloud platform for running, fine-tuning, and deploying machine learning models via API. It lets you run AI models with a cloud API, without having to understand machine learning or manage your own infrastructure. You can run models that other people have published, bring your own training data to create fine-tuned models, or deploy custom models.

## Authentication

Replicate uses API token-based authentication. API tokens are used to authenticate your requests to the Replicate API. You use API tokens to authenticate your requests to Replicate's HTTP API.

- **Token format**: Tokens are 40-character strings that always start with `r8_`.
- **How to pass**: All API requests must include a valid API token in the `Authorization` request header. The token must be prefixed by `Bearer`, followed by a space and the token value. Example: `Authorization: Bearer r8_Hw...`
- **Token management**: Replicate creates a default API token when you create your account, but you can create multiple API tokens for different purposes. To create and manage your API tokens, visit `replicate.com/account/api-tokens`.
- **Token revocation**: If you accidentally expose a token or no longer need it, you can disable it from the web interface.

There is no OAuth2 or other authentication method. The API exclusively uses Bearer token authentication.

## Features

### Running Predictions

Run any public or private AI model by providing inputs and receiving outputs. The model's input is provided as a JSON object. The input schema depends on what model you are running. To see the available inputs, click the "API" tab on the model you are running or get the model version and look at its `openapi_schema` property.

- Supports synchronous mode (holding the connection open and waiting for results) and asynchronous mode (creating a prediction and polling or using webhooks).
- A maximum lifetime can be set — the maximum time the prediction can run before it is automatically canceled, measured from when the prediction is created.
- Input and output (including any files) are automatically deleted after an hour for any predictions created through the API.

### Streaming Output

Replicate's API supports server-sent event streams (SSEs) for models. Streaming output allows you to receive real-time progressive updates while a model processes your input. Instead of waiting for the entire prediction to complete, you can access results as they are generated, making it ideal for applications like chat bots that require immediate responses.

- Primarily used with language models.

### Model Management

Create, list, search, update, and delete models on Replicate. Models on Replicate are built with Cog, an open-source tool that packages arbitrary code into a standard, production-ready container.

- Models can be public or private.
- Each model can have multiple versions, representing different iterations of the model.
- Models expose their input/output schema via OpenAPI.

### Model Training (Fine-tuning)

Fine-tuning lets you take an existing model and train it with your own data to create a new model that is better suited to a specific task. Whenever you create a new fine-tune, you must specify a destination model. This is a model that you create, and it will be updated with the results of your fine-tuning process.

- Training jobs can be created, monitored, listed, and canceled.
- When a training completes, it creates a new version of the model at the specified destination.
- Supports webhooks for notification when training completes.

### Deployments

For production use, you should create a deployment to get full control over scaling, hardware, and performance. Deployments give you production-grade control over your model's infrastructure.

- Configure hardware type (CPU, GPU-T4, GPU-A100, etc.), minimum and maximum instance counts.
- Deployments allow you to run a model with a private, fixed API endpoint. You can configure the version of the model, the hardware it runs on, and how it scales.
- Deployments can be created, updated, listed, and deleted via the API.

### Collections

Browse curated collections of models grouped by use case (e.g., super-resolution, text-to-image).

- List all collections and retrieve details of a specific collection including its models.

### File Management

Some models accept files as input, like images, audio, or video, zip files, PDFs, etc. Files can be uploaded to Replicate and referenced in predictions.

- Files uploaded to Replicate expire after 24 hours.
- The maximum size for uploaded files is 100MiB.
- Files can be listed, uploaded, retrieved, downloaded, and deleted.

### Hardware Discovery

List available hardware options (CPU, various GPU types) that can be used when creating models or deployments.

### Account Information

Retrieve information about the currently authenticated account.

### Model Search

Search for public models, collections, and docs using a text query. This feature is currently in beta.

## Events

Replicate supports webhooks for prediction and training lifecycle events. When you make an API request to Replicate to run a model, you can optionally include a "webhook URL" in the body of the request. This is the URL of a hosted public HTTP endpoint that you control. Replicate will then make an HTTP POST request to that endpoint at various points in the lifecycle of the prediction.

### Prediction Lifecycle Events

Receive webhook notifications at different stages of a prediction's lifecycle. You can change which events trigger webhook requests by specifying `webhook_events_filter` in the prediction request. The available event types are:

- **start**: Emitted immediately on prediction start.
- **output**: Emitted each time a prediction generates an output (note that predictions can generate multiple outputs).
- **logs**: Emitted each time log output is generated by a prediction.
- **completed**: Emitted when the prediction reaches a terminal state (succeeded/canceled/failed).

### Training Lifecycle Events

The same webhook mechanism applies to training jobs. You can specify a webhook URL when creating a training, and receive notifications using the same event types as predictions.

### Webhook Verification

Replicate signs every webhook and its metadata with a unique key for each user or organization. You can use this signature to verify that incoming webhooks are coming from Replicate before you process them. A dedicated API endpoint exists to retrieve your webhook signing secret.
