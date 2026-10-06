# Prisma Postgres REST API

This integration targets the supported Prisma Postgres Management API at `https://api.prisma.io/v1`, not the local Prisma ORM client. Its public [OpenAPI specification](https://api.prisma.io/v1/doc) is linked from the [REST API documentation](https://www.prisma.io/docs/rest-api).

## Authentication

[Authentication](https://www.prisma.io/docs/rest-api/authentication) supports nonexpiring workspace service tokens from Console Settings → Service Tokens and confidential OAuth clients at `https://auth.prisma.io/authorize` and `/token`. Request `workspace:admin` for resource management and `offline_access` for refresh. Confidential clients use a client secret; PKCE is optional for them. Refresh tokens rotate, and the connection stores the latest returned token. `get_current_user` reads `/me` to identify the actual user, workspace, and credential type.

## Supported tools

- Discover workspaces, projects, and available Prisma Postgres regions.
- Create, retrieve, transfer, and delete projects. Specify workspaceId from list_workspaces; a region never overrides the selected workspace. Set createDefaultDatabase to false for an empty project.
- List, create, retrieve, and delete databases. Use project IDs from list_projects and region IDs from list_regions.
- List, create, and revoke database connections. Creation requires a provider connection name; existing callers receive the default Database connection name. Returned endpoints include direct, pooled, and Accelerate access. The provider generally returns secret connection strings only at creation.
- Read recent backup metadata with its retention and truncation indicators; this does not download or restore database contents.
- Read dated operation and storage metrics. Storage is returned both in GiB and bytes. Legacy optional query-count and egress outputs are not fabricated because the current API does not report them.

Cursor listings retrieve all pages by default, bounded at 100 pages; supply cursor or limit for a single page. Backups have a limit but no cursor. Invalid provider responses, continuation loops, HTTP failures, and missing refresh tokens are explicit errors. Mutations are never automatically retried.

No triggers or event-streaming capability are provided. Prisma ORM, Prisma Compute, object storage, application deployment, database data queries, and destructive backup restores are outside this database-management integration's scope.
