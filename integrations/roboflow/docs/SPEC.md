# Roboflow Integration Specification

## Authentication

Use OAuth or a workspace-scoped private API key from the Roboflow dashboard. OAuth uses the documented authorization-code flow with S256 PKCE, client-secret-post authentication, expiring access tokens, and refresh-token preservation. Register an Unlisted app for cross-workspace connections; customer workspace policies may require allowing its client ID. Management and hosted inference requests use `Authorization: Bearer`. Connection setup verifies the credential with the root endpoint and persists its workspace slug. The optional workspace URL slug setting remains available for public workspace browsing and existing connections; it is not required.

`who_am_i` reports the credential's authenticated workspace. `list_projects` exposes stable project IDs and names. Every project tool accepts either a slug or a `workspace/project` ID returned by discovery; full IDs must match the selected workspace on workspace-scoped operations.

## Tools

| Capability | Tools |
| --- | --- |
| Workspace identity and project discovery | `who_am_i`, `list_projects`, `get_project` |
| Project lifecycle | `create_project`, `delete_project` (moves to Trash for 30 days) |
| Images and annotations | `upload_image`, `get_image`, `search_images`, `manage_image_tags`, `delete_images`, `upload_annotation` |
| Dataset versions and exports | `create_version`, `get_version`, `export_dataset` |
| Training, models, and object detection | `train_model`, `stop_training`, `list_models`, `run_inference` |
| Annotation jobs and batches | `list_batches`, `list_annotation_jobs`, `create_annotation_job` |

Uploads require exactly one image URL or base64 source and expose the returned image ID for downstream operations. Duplicate uploads expose the provider's duplicate status. Annotation uploads use JSON containing the annotation text and an optional numeric class ID-to-name label map, and require Roboflow's success confirmation. Supply the annotation filename for format detection.

Image search returns image IDs and original-image URLs, and exposes offset/limit pagination, semantic and visual similarity search, tag/class filters, dataset membership, and batch filtering. Visual similarity resolves the supplied image ID to the filename required by Roboflow's `like_image` filter. A batch filter enables batch search. Responses expose image IDs for get, tagging, annotation, and deletion.

Annotation job reads expose job names, labeler and reviewer emails, progress counts, and creation times converted from Roboflow's timestamp objects to Unix seconds.

Version generation always sends both preprocessing and augmentation objects, using empty objects when omitted. `get_project` parses version numbers from the stable version ID rather than the display name. `get_version` converts string metrics to numbers, converts numeric training timestamps to ISO strings, and preserves export format arrays.

Exports may be asynchronous (HTTP 202); call `export_dataset` again until its status is `ready`. Progress is normalized to a finite number when available. A ready result supplies a downloadable ZIP file. The existing optional `downloadUrl` schema field is retained for compatibility but is no longer populated. The documented dataset link does not specify an expiry, so no unsupported expiry policy is imposed.

Training requires an already generated dataset version, is asynchronous, and can consume credits; `train_model` accepts an optional credit cap. `get_version` bypasses the server cache and provides generation progress, the latest training status, and model metadata. `stop_training` either stops early and keeps the weights (idempotent) or cancels and discards them (fails once the job is no longer running). `list_models` lists every trained model in a project with its source version, architecture, training status, and percentage metrics, optionally filtered to one Neural Architecture Search run. Hosted inference uses `serverless.roboflow.com`, disables active-learning ingestion, converts the existing percentage confidence/overlap inputs to fractions for this host, and applies the requested class filter to returned detections. This tool exposes object-detection boxes; other prediction types are not included.

## Limitations

The integration does not expose workflow execution, foundation model inference, dedicated deployment administration, billing/API-key administration, Universe search, or monitoring. No event triggers are included.

## Official References

- [REST API and authenticated workspace](https://docs.roboflow.com/reference/platform/rest-api)
- [Platform API reference](https://docs.roboflow.com/reference/platform/rest-api/platform-api-openapi)
- [Workspace and project responses](https://docs.roboflow.com/platform/workspaces/list-workspaces-and-projects)
- [Create a project](https://docs.roboflow.com/datasets/create-and-upload/create-a-project)
- [Image upload, annotations, retrieval, tags, and deletion](https://docs.roboflow.com/datasets/manage/manage-images)
- [Annotation workflow and batch discovery](https://docs.roboflow.com/datasets/annotate/annotate/manage-annotation-workflow)
- [Dataset exports](https://docs.roboflow.com/datasets/versions/dataset-versions/exporting-data)
- [Training, credit caps, and stopping training](https://docs.roboflow.com/models/train/cancel-a-training-job)
- [Project models](https://docs.roboflow.com/platform/workspaces/list-workspaces-and-projects#list-project-models)
- [Serverless inference](https://docs.roboflow.com/deployment/roboflow-cloud/serverless-api)
- [Official SDK request implementations](https://github.com/roboflow/roboflow-python/blob/main/roboflow/adapters/rfapi.py)

OAuth REST support is documented in [Sign In With Roboflow](https://docs.roboflow.com/reference/authentication/authentication/sign-in-with-roboflow-getting-started). The published scopes omit dedicated project/image deletion permissions; deletion and hosted inference compatibility with OAuth remain unverified live. Existing tools remain available, with provider permissions enforced upstream.
