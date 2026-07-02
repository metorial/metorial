# <img src="https://provider-logos.metorial-cdn.com/huggingface.png" height="20"> Huggingface

Manage machine learning model, dataset, and Spaces repositories on Hugging Face Hub. Create, update, delete, and configure Git-based repositories with version control, branching, tagging, and pull requests. Upload and download model files and datasets. Run model inference for tasks like text generation, image generation, summarization, embeddings, and classification via serverless or dedicated endpoints. Search and discover models, datasets, and Spaces by author, task, language, or tags. Create and manage Spaces for hosting ML-powered application demos. Participate in community discussions, open pull requests, and post comments on repositories. Organize related items into collections. Manage organizations and access control. Listen for repository, discussion, and comment events via webhooks.

## Tools

### Get User Info

Get information about the authenticated user, including username, email, organizations, and account details.

### Chat Completion

Run a chat completion using a model on the Hugging Face Inference API. Follows the OpenAI-compatible chat completions format. Supports conversation history with system, user, and assistant messages.

### Get Collection

Retrieve a Hugging Face collection by its slug. Returns the collection's title, description, and all items (models, datasets, spaces) it contains.

### List Discussions

List discussions and pull requests on a Hugging Face repository. Returns summaries including title, status, and whether each item is a PR.

### List Repository Files

List files and directories in a Hugging Face repository at a given path and revision. Returns file metadata including type, size, and OID.

### Create Repository

Create a new model, dataset, or Space repository on Hugging Face Hub. Supports setting visibility, SDK type (for Spaces), and license.

### Get Space Runtime

Get runtime information for a Space, including hardware, stage, SDK, and storage details.

### Search Datasets

Search for datasets on Hugging Face Hub. Filter by keyword, author, and tags. Results include dataset metadata such as downloads and likes.

### Search Models

Search for machine learning models on Hugging Face Hub. Filter by keyword, author, library framework, pipeline task, and tags. Results include model metadata such as downloads, likes, and pipeline task.

### Search Spaces

Search for Spaces (ML application demos) on Hugging Face Hub. Filter by keyword, author, and tags. Results include Space metadata such as SDK type and likes.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
