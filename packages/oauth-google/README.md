# Google OAuth

Shared Google OAuth authorization, token refresh, and user-profile behavior. Scope
descriptors and consent text remain owned by each consuming integration. Authorization
requests include previously granted scopes so compatible clients can add permissions in
smaller batches without replacing the existing grant.

The CLI incremental flow requires a Google OAuth client with application type **Web
application** and the displayed loopback callback registered as an authorized redirect
URI. Google's installed-app clients do not support incremental authorization.
