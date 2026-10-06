# Egnyte

Manage Egnyte files, folders, sharing links, permissions, users and custom groups. Upload small files, prepare downloads, search content, read and set custom metadata, recover exact trash items, work with review/approval workflows and retrieve audit reports. Identify the connected user and discover metadata namespaces and workflows.

Connect using the Egnyte domain name and an approved OAuth application. The connection requests filesystem, links, users, groups, permissions and audit scopes. Individual operations still require the corresponding account privileges and enabled plan features.

File uploads accept a compact text/base64 object up to **4 MiB**. Egnyte documents a **100 MB** single-request API limit, but this tool intentionally uses a smaller input bound. Larger and chunked uploads require the Egnyte application. Downloads use persistent file IDs and are pinned to the observed current version or an independently verified requested version. CSV audit reports become downloadable files; JSON reports return one requested page. Report status should be checked no more frequently than every two minutes.

The legacy whole-trash tool is retained for compatibility and refuses the unsupported global purge. Restoration requires exactly one identified trash item; supply its trash ID when original paths are duplicated. Folder-scoped trash listing and upload-type link listing filters are explicitly unsupported by the documented endpoints. Group member updates replace membership using a read followed by a full update, so avoid concurrent name changes. Workflow cancellation reports pending or completed state accurately.

AI, Secure & Govern, legal holds, project folders, bookmarks, electronic signatures, chunked uploads and trigger subscriptions are outside this integration's scope.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
