# Slates Specification for Supabase

## Overview

Supabase is an open-source backend-as-a-service platform built on PostgreSQL. It provides a managed Postgres database with auto-generated REST and GraphQL APIs, authentication, file storage, edge functions, and realtime subscriptions. A Management API allows programmatic control over Supabase organizations and projects.

## Authentication

Supabase exposes two distinct API surfaces, each with its own authentication approach:

### 1. Management API (managing Supabase projects and organizations)

The Management API at `https://api.supabase.com/v1/` supports two authentication methods:

**Personal Access Token (PAT):**

- PATs are long-lived tokens that you manually generate to access the Management API. They are useful for automating workflows or developing against the Management API. PATs carry the same privileges as your user account.
- To generate or manage your personal access tokens, visit your account page.
- Pass the token in the `Authorization` header: `Authorization: Bearer sbp_xxxx...`

**OAuth2 (Authorization Code Flow with PKCE):**

- OAuth2 allows your application to generate tokens on behalf of a Supabase user, providing secure and limited access to their account without requiring their credentials. Use this if you're building a third-party app that needs to create or manage Supabase projects on behalf of your users. Tokens generated via OAuth2 are short-lived and tied to specific scopes.
- Register an OAuth App in your organization's settings under the OAuth Apps tab.
- Authorization endpoint: `https://api.supabase.com/v1/oauth/authorize`
- Token endpoint: `POST /v1/oauth/token` (using client_id and client_secret as Basic Auth)
- Scopes restrict access to the specific Supabase Management API endpoints for OAuth tokens. All scopes can be specified as read and/or write. Scopes are set when you create an OAuth app in the Supabase Dashboard.
- Refresh tokens are supported via the same token endpoint.

### 2. Project Data API (accessing a specific project's database, auth, storage, etc.)

Each Supabase project exposes APIs at `https://<project_ref>.supabase.co/`. There are 4 types of API keys: anon and service*role keys are based on the project's JWT secret. Supabase is transitioning to new `publishable` and `secret` key types (prefixed `sb_publishable*`and`sb*secret*`).

- **Anon / Publishable key**: Safe to use client-side, subject to Row Level Security (RLS) policies.
- **Service Role / Secret key**: Bypasses RLS, must be kept server-side only.
- Keys are passed via the `apikey` header, and user JWTs (from Supabase Auth) are passed via the `Authorization: Bearer <jwt>` header.

## Features

### Database (Auto-generated REST & GraphQL API)

Supabase auto-generates an API directly from your database schema allowing you to connect to your database through a RESTful interface. This supports full CRUD operations (insert, select, update, delete, upsert) with filtering, ordering, and pagination. Fast GraphQL APIs are also available using a custom Postgres GraphQL extension. Data access is governed by Row Level Security policies tied to the authenticated user.

### Authentication & User Management

Users can authenticate via password, magic link, one-time password (OTP), social login, and single sign-on (SSO). Supabase Auth works with many popular Auth methods, including Social and Phone Auth using third-party providers. Features include user signup/signin, session management, MFA (TOTP and phone), and password recovery. Supabase Auth can also act as an OAuth 2.1/OIDC identity provider for third-party apps.

### File Storage

Store, organize, transform, and serve large files—fully integrated with your Postgres database with Row Level Security access policies. Storage also supports interaction via the S3 protocol. Files are organized in buckets and can be managed (upload, download, list, delete) via the Storage API.

### Realtime

Listen to database changes, store and sync user states across clients, broadcast data to clients subscribed to a channel, and more. Realtime provides three capabilities:

- **Postgres Changes**: Receive database changes through WebSockets.
- **Broadcast**: Send messages between connected users through WebSockets.
- **Presence**: Synchronize shared state across users, including online status and typing indicators.

Realtime must be explicitly enabled per table via replication settings. To receive previous row data on updates/deletes, the table's `REPLICA IDENTITY` must be set to `FULL`.

### Edge Functions

Edge Functions are server-side TypeScript functions, distributed globally at the edge—close to your users. They can be used for listening to webhooks or integrating your Supabase project with third-parties. They run on a Deno-compatible runtime with TypeScript-first support. Edge Functions can be deployed and managed via the Management API or CLI.

### Project & Organization Management (Management API)

The Management API allows you to manage your Supabase organizations and projects programmatically. This includes creating and deleting projects, managing project configuration (auth settings, custom domains, network restrictions), retrieving API keys, querying project logs, and managing organization members. It also supports managing database configuration, secrets for Edge Functions, and custom SMTP settings.

## Events

Supabase supports **Database Webhooks**, which send HTTP POST requests to external URLs when specific table events occur.

### Database Webhooks

You can hook into three table events: INSERT, UPDATE, and DELETE, with all events fired after a database row is changed. This feature provides a convenient way to integrate your Supabase database with external applications and services.

- Webhooks are configured per table, and you select which event types (INSERT, UPDATE, DELETE) to trigger on.
- Since webhooks are just database triggers, you can also create one from SQL statement directly.
- The webhook payload includes the event type, table name, schema, the new record, and (for updates/deletes) the old record.
- Webhooks can target any HTTP URL, including Supabase Edge Functions.
- Custom HTTP headers can be configured on the webhook for authentication purposes.
