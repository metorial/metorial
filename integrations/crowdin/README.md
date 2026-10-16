# Crowdin

Manage localization projects, source files, strings, translations, tasks, translation memories, and glossaries with Crowdin API v2. Discover the connected user, authorized projects, supported languages, project members, branches, and directories. Track translation progress and asynchronous pre-translation, build, and export jobs, then download completed exports.

Connect with OAuth or a personal access token. For Crowdin Enterprise personal tokens, provide the organization's subdomain during authentication; OAuth resolves it from the token. Existing connections retain their saved organization-domain configuration as a fallback.

Use `list_projects` before project-scoped tools and `list_languages` to discover language IDs. Downloads retain Crowdin's original signed URL and expiration and can be renewed while the provider resource and job remain accessible. Source uploads accept UTF-8 text; binary uploads are not supported by the current tool contract.

API permissions and differences between standard Crowdin and Crowdin Enterprise still apply. Exports and tasks depend on project settings, workflow configuration, and resource permissions.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
