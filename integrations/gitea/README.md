# Gitea

Manage repositories, branches, files, and commit history on your Gitea instance. Create, review, and merge pull requests; track issues with comments, labels, milestones, assignees, and due dates. Manage draft or published releases, wiki pages, organizations, teams, and collaborators. Download repository files for viewing or editing.

Connect with a personal access token or an OAuth2 application registered on your instance. Supply the instance URL, including any installation subpath. OAuth granular permissions require Gitea 1.23 or later. Permissions, enabled features, pagination limits, and merge methods depend on your instance configuration and version; consult its `/swagger.v1.json` API description.

Use `get_current_user` to identify your account and `search_repos` to discover repository names. Use `download_file` for repository file downloads; the legacy `get_file_content` tool remains available for existing workflows.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
