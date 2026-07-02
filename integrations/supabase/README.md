# <img src="https://provider-logos.metorial-cdn.com/supabase.jpeg" height="20"> Supabase

Manage PostgreSQL databases, authenticate users, store files, and run Edge Functions on Supabase. Perform CRUD operations on database tables via auto-generated REST APIs with row-level security. Create and manage user accounts with password, magic link, OTP, social login, and SSO authentication. Upload, download, list, and delete files organized in storage buckets. Deploy and invoke server-side TypeScript Edge Functions. Listen to realtime database changes and configure database webhooks for INSERT, UPDATE, and DELETE events. Programmatically manage Supabase organizations and projects, including project lifecycle, API keys, auth settings, health checks, logs, database schema exports, and Edge Function secrets.

## Tools

### Get Auth Config

Retrieve or update the authentication configuration for a Supabase project. This includes settings for email auth, phone auth, external OAuth providers, JWT configuration, and MFA policies.

### Get Project

Retrieve detailed information about a specific Supabase project, including its configuration, status, database host, and API keys.

### Get Database Schema

Generate database schema artifacts for a Supabase project. Returns the PostgREST OpenAPI document or generated TypeScript database types as a Slate attachment.

### Get Project Health

Check health for Supabase project services such as Auth, Postgres, REST, Realtime, Storage, and Pooler.

### Get Project Logs

Query Supabase project logs through the Management API using a custom logs SQL query or the default recent Edge Logs window.

### Invoke Database Function

Call a PostgreSQL function (RPC) through the Supabase REST API. This allows you to execute custom database functions with typed arguments and receive results.

### List Organizations

List all Supabase organizations accessible to the authenticated user. Returns organization details including name, slug, and billing plan.

### List Projects

List all Supabase projects accessible to the authenticated user. Returns project details including name, reference ID, region, status, and creation date.

### Manage Auth Users

List, get, create, update, or delete authentication users in a Supabase project. Uses the admin Auth API with the service_role key to manage user accounts.

### Manage Edge Functions

List, get, deploy, update, or delete Supabase Edge Functions. Edge Functions are server-side TypeScript functions distributed globally at the edge. Function source can be returned as a Slate attachment.

### Manage Project

Create, pause, restore, or delete a Supabase project. Use **create** to provision a new project with a database, **pause** to temporarily suspend it, **restore** to reactivate it, or **delete** to permanently remove it.

### Manage Secrets

List, create, or delete secrets (environment variables) for a Supabase project. Secrets are typically used by Edge Functions and other server-side code.

### Manage Storage Buckets

List, get, create, update, empty, or delete storage buckets in a Supabase project. Buckets organize files and control access policies.

### Manage Storage Objects

List, inspect, upload, update, download, move, copy, or delete files in Supabase Storage buckets. Downloads return file contents as Slate attachments. Also generate public URLs or signed URLs for file access.

### Manage Table Rows

Insert, update, upsert, or delete rows in a Supabase table using the auto-generated REST API. Supports bulk operations and conflict resolution for upserts.

### Query Table

Query rows from a Supabase table using the auto-generated REST API (PostgREST). Supports column selection, filtering with PostgREST operators (eq, neq, gt, lt, gte, lte, like, ilike, in, is), ordering, and pagination.

### Run SQL Query

Execute a raw SQL query against a Supabase project's PostgreSQL database via the Management API. Returns the query result rows. Use for schema inspection, data manipulation, or any custom SQL operations.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
