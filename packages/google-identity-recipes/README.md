# Google Identity recipes

Shared Google OAuth userinfo lookup with typed output and provider error mapping.
Consumers own the tool key, consent list, and OAuth-only auth-method restriction.
`getCurrentUserRecipe` requires both `userinfo.email` and `userinfo.profile`.
Use `createGoogleIdentityClient` as the `createClient` dependency in `includeTool`.
The empty input and account lookup need no Cloud project configuration.

Provider reference: [Google OAuth scopes](https://developers.google.com/identity/protocols/oauth2/scopes#oauth2).
