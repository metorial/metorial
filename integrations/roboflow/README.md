# Roboflow

Manage Roboflow computer vision projects and image datasets. Discover projects and image batches, upload and annotate images, search and tag datasets, generate and export dataset versions, start model training, run hosted object detection inference, and manage annotation jobs.

Use a workspace-scoped private API key. Call `who_am_i` to verify the connected workspace and `list_projects` to discover project IDs. Tools accept project slugs or the full `workspace/project` IDs returned by discovery. Dataset exports produce downloadable ZIP files. Training runs asynchronously and can consume credits; `run_inference` uses a deployed object-detection model.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
