# Stack AI

Run published Stack AI workflows, upload files to workflow Files Nodes and knowledge bases, and retrieve project and organization run analytics. Existing tools also manage knowledge bases, connections, conversations, folders, feedback, storage usage, and configured external actions.

Connect with a bearer API key from **Settings > API Keys**. Optionally supply the deployed workflow API URL copied from **Export View > API** to identify the organization and default workflow. `run_flow` also accepts that URL per invocation. Existing saved organization configuration remains supported.

Workflow input keys depend on the deployed workflow. A Files Node must exist before uploading workflow documents. Knowledge-base uploads return a resource ID and an accepted status; indexing may continue afterward. List tools expose their pagination controls and return the provider's available continuation metadata.

The current public API reference confirms workflow execution, analytics, knowledge-base resource listing/upload, and workflow file upload. Other established management routes remain available in this integration, but their current account permissions and API contracts could not be independently verified from public documentation. They require provider acceptance testing with a suitable account. No download, workflow-creation, knowledge-base search, connection OAuth setup, or notification tools are exposed.

See [the capability and API specification](docs/SPEC.md) for official sources and setup requirements.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
