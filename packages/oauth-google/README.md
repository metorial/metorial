# Google OAuth

Shared Google OAuth authorization, token refresh, and user-profile behavior. Scope
descriptors and consent text remain owned by each consuming integration. Authorization
requests include previously granted scopes so compatible clients can add permissions in
smaller batches without replacing the existing grant.

The CLI incremental flow requires a Google OAuth client with application type **Web
application** and the displayed loopback callback registered as an authorized redirect
URI. Google's installed-app clients do not support incremental authorization.

## Google Workspace admin setup

`createGoogleWorkspaceAdminSetup({ productName, notes?, required? })` returns an `adminSetup` for an
OAuth method whose users belong to Google Workspace organizations that restrict third-party
apps. The admin signs in with `openid email` only (no offline access, no forced consent);
the callback discards the authorization code and returns markdown steps for marking the
OAuth client as **Trusted** in the Google Admin console. `notes` are appended as extra
paragraphs. Set `required: true` only when users cannot connect until an admin has acted
(for example, Admin SDK slates); by default the setup is optional and only needed when the
Workspace restricts third-party access.

```ts
import { createGoogleWorkspaceAdminSetup } from '@slates/oauth-google';

adminSetup: createGoogleWorkspaceAdminSetup({ productName: 'Google Drive' })
```

Methods built with `createGoogleOAuth` can pass `adminSetup: { productName }` instead.
