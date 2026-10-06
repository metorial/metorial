# <img src="logo.svg" height="20"> Storyblok

Discover accessible spaces and authenticated identity, then manage stories, components, existing asset metadata, datasources and entries, collaborators, and releases. Read workflows, roles, tags, and activities through the regional Management API.

Use a Management Personal Access Token for account-wide permitted space discovery, or the existing regional plugin OAuth methods for their authorized space. Content Delivery API tokens do not authenticate these tools. Supply a numeric `spaceId` from List Spaces when discovery is ambiguous; saved legacy space settings remain a fallback. OAuth may expose only its authorized space and content permissions, so some management operations require a Personal Access Token or additional provider permissions.

The five credential regions are Europe, United States, Canada, Asia-Pacific, and China. New OAuth connections use PKCE, verify the callback space, and retain refresh state. Older stored credentials keep their original raw authorization behavior. Reconnect old OAuth credentials to enable bearer authorization and token renewal; existing saved Personal Access Tokens remain usable.

Paged tools return native page information and any available total or next page, including the provider's effective page size. Collaborator removal requires a complete stable inventory. Custom collaborator role names or IDs are resolved to the documented numeric selector before invitation. Components, releases, and space discovery use their documented unpaged responses. Asset tools manage existing metadata; they do not upload, replace, transform, or download media. Private asset delivery requires a separate Content Delivery API workflow. Premium multiple-space scoped OAuth grants and additional administration APIs are outside this integration.

Publication, release deployment, collaborator invitation, and deletion can cause retained history, delivery, email, seat, webhook, or content-reference effects. Exact readbacks verify supported state changes but do not erase provider history or reverse downstream effects. Deleting an asset may retain provider trash and references.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
