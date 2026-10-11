# Roboflow

Manage Roboflow computer vision projects and image datasets. Discover projects and image batches, upload and annotate images, search and tag datasets, generate and export dataset versions, start and stop model training, list trained models, run hosted object detection inference, and manage annotation jobs.

Connect with OAuth or a workspace-scoped private API key. Call `who_am_i` to verify the connected workspace and `list_projects` to discover project IDs. Tools accept project slugs or the full `workspace/project` IDs returned by discovery. Dataset exports produce downloadable ZIP files. Training runs asynchronously and can consume credits; `run_inference` uses a deployed object-detection model.

## OAuth setup

Register an app under **Workspace Settings > Developer** with the exact callback URI, token authentication set to `client_secret_post`, and **Unlisted** visibility for connections from other workspaces. Enable the scopes requested by this integration on the app. Customer workspace policy may require allowing the client ID.

OAuth uses PKCE and refresh tokens, and discovers the authorized workspace automatically. It requests workspace/project reads and project creation, image upload/read/tag/annotation, dataset version creation/read, training and annotation jobs, batches, and inference permissions. It retains API-key authentication for existing connections.

Provider documentation confirms OAuth for the REST API. The published scope list has no project/image deletion scopes; OAuth deletion support and hosted inference have not been verified live. Use a private API key when these operations are required.

Provider references: [OAuth setup and scopes](https://docs.roboflow.com/reference/authentication/authentication/sign-in-with-roboflow-getting-started), [developer reference](https://docs.roboflow.com/reference/authentication/authentication/sign-in-with-roboflow-developer-reference), [REST authentication](https://docs.roboflow.com/reference/platform/rest-api/authenticate-with-the-rest-api).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
