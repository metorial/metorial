# <img src="logo.png" height="20"> Cloudinary

Upload and manage images, videos and raw files in a Cloudinary product environment. Search or list assets, retrieve exact IDs, update tags and metadata, rename assets, delete selected assets, manage empty folders, read usage and folder settings, and download original files by immutable asset ID.

Connect with the environment's cloud name, API key and API secret. Choose the provisioned data center; EU/AP routing requires the corresponding Cloudinary environment. Fresh connections support authenticated URL downloads. Older connections validate content against the original asset size, support downloads up to 64 MiB, and may need reconnection for larger files or when the provider omits the size.

Uploads, transformations and downloads consume usage. Overwrites, global exclusive-tag commands and bulk deletions can affect existing media; backups, CDN copies, notifications and accrued usage can remain after cleanup. Dynamic asset folders and fixed public-ID folders differ. Preserve continuation cursors and filters when paging or completing a partial deletion.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
