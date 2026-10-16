# Ninox integration

The integration supports Personal Access Tokens for Public Cloud, Private Cloud, and On-Premises. New connections store their instance URL with authentication. Existing connections continue using their saved base URL when authentication has no instance URL. Public Cloud defaults to `https://api.ninox.com`; custom domains, IP addresses, ports, and reverse-proxy paths remain supported.

Available workflows:

- Discover teams, databases, tables, fields, and views.
- Create, retrieve, filter, update, upsert by ID, and delete records.
- Execute read-only Ninox queries or writable scripts.
- Retrieve database or table changes after a sequence number.
- List, download, and delete record files.

Use `list_teams`, then `list_databases`, then `get_table_schema` to discover identifiers before accessing records. Upserts use field IDs; ordinary record creation and updates use field names. The change response preserves Ninox's complete payload, including the `seq` cursor for subsequent requests. File downloads use the authenticated file endpoint and provide provider metadata.

Ninox documents conventional HTTP failures. Private Cloud roles may restrict database/schema access. This integration has no native webhook registration or current-user endpoint because the reviewed REST documentation provides neither. File uploads and shared view exports are not implemented.

Sources: [Authentication and errors](https://forum.ninox.com/t/83yzlg7/introduction-to-ninox-api), [Public Cloud API](https://forum.ninox.com/t/35yzp89/api-endpoints-for-public-cloud), [Private Cloud and On-Premises API](https://forum.ninox.com/t/x2yzfmf/api-endpoints-for-private-cloudon-premises).
