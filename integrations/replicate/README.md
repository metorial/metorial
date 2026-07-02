# <img src="https://provider-logos.metorial-cdn.com/replicate-logo.png" height="20"> Replicate

Run, fine-tune, and deploy machine learning models via API. Create predictions on public or private AI models with synchronous or streaming output. Fine-tune existing models with custom training data. Manage model versions, deployments, and scaling configurations. Upload and manage files for model inputs. Browse curated model collections, search for public models, and discover available hardware options. Configure webhooks for prediction and training lifecycle events.

## Tools

### List Collections

List curated collections of models on Replicate, grouped by use case (e.g. text-to-image, super-resolution).

### Cancel Prediction

Cancel a running prediction. Only predictions that are still in progress (starting or processing) can be canceled.

### Cancel Training

Cancel a running training job. Only trainings in progress (starting or processing) can be canceled.

### Create Training

Start a fine-tuning training job on Replicate. Takes an existing model version and your training data to create a new fine-tuned model version at the specified destination.

### Get Account

Get information about the currently authenticated Replicate account, including username, name, and account type.

### Get Model

Get details about a specific model on Replicate, including its description, latest version, run count, and input/output schema.

### Get Prediction

Retrieve the current status and results of a prediction. Use this to check if a prediction has completed and to fetch its output.

### Get Training

Retrieve the current status and results of a training job. Use this to monitor fine-tuning progress and check completion.

### List Hardware

List available hardware options on Replicate. Use these SKU values when creating models or deployments.

### List Model Versions

List all versions of a specific model. Each version represents a different iteration of the model with its own input/output schema.

### List Predictions

List recent predictions for your account. Returns predictions sorted by creation time (newest first) with pagination support.

### List Trainings

List recent training jobs for your account, sorted by creation time (newest first).

### Create Deployment

Create a new production deployment for a model on Replicate. Deployments provide dedicated infrastructure with configurable hardware and auto-scaling.

### List Files

List files that have been uploaded to Replicate. Files are used as inputs to models (images, audio, documents, etc.).

### Create Model

Create a new model on Replicate. The model acts as a container for versions that will be created through training or pushing.

### Run Prediction

Run an AI model prediction on Replicate. Provide either a **model** identifier (e.g. \

### Search Models

Search for public models, collections, and documentation on Replicate. Returns results ranked by relevance.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
