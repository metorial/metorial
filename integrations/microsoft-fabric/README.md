# <img src="https://provider-logos.metorial-cdn.com/microsoft-fabric.svg" height="20"> Microsoft Fabric

Use Microsoft Fabric REST APIs, OneLake data-plane APIs, and compact vendored Fabric documentation resources from integration tools.

This native integration mirrors the official Microsoft Fabric local MCP tool areas:

- Docs: Fabric workloads, API specs, item definitions, best practices, and examples.
- OneLake: workspace/item discovery, file transfer, directory operations, and table metadata.
- Core: Fabric item creation.
- Data Factory: Data Pipeline and Dataflow listing, creation, execution, and query tools.

Authentication uses Microsoft Entra delegated OAuth. The integration stores both a Fabric API token and a Storage-audience token for OneLake calls. The connected app needs delegated Fabric permissions and Azure Storage delegated consent.

## Notes

- File downloads and query streams are returned as attachments.
- Production Fabric endpoints are used by default.
- Non-production Fabric environments are configuration-gated for development and are not advertised in marketplace copy.
