# ImageKit

Manage files in the ImageKit Media Library: upload public URLs or Base64 data, search and inspect assets, update properties and tags, copy, move, rename, delete, and work with versions. Manage folders and inspect asynchronous folder jobs, technical metadata, custom metadata field definitions, and CDN purge requests. Download original published files and existing versions through short-lived signed links.

Connect with an ImageKit private API key. Restricted keys need the relevant media permissions. An optional `urlEndpoint` enables downloads through an exact custom CDN endpoint matching the provider’s file URL. No account or current-user identity is invented from the key.

Current-file download links can follow subsequent overwrites until expiry. Exact historical content requires the provider’s version-specific CDN URL. Request a new download after changing the current version or moving the file.

Bulk operations report only provider-confirmed file IDs and preserve unconfirmed outcomes. Pre-transformation uploads can be queued without a file ID; inspect the configured webhook or Media Library before retrying. Deletion is permanent and does not purge cached copies. Copy or move into an occupied destination can append versions. Purge quotas, delivery bandwidth, extensions, processing, draft assets, and custom domains can have plan limits or charges.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
