# <img src="logo.png" height="20"> v0

Generate and refine applications with v0, import existing source files, discover chats, inspect message completion and credit usage, and download source archives.

Use the `*_current_*` tools for the current v0 API v2: `create_current_chat`, `import_current_chat`, `list_current_chats`, `get_current_chat`, `update_current_chat`, `delete_current_chat`, `send_current_message`, `list_current_messages`, `get_current_message`, and `download_current_files`. Generation defaults to asynchronous responses; poll the returned message ID until `finishReason` is non-null. New chats default to private, and generation consumes v0 credits. Connected MCP servers are disabled for generation requests. New generated chats also disable shared npm, GitHub, and Vercel credentials; continuation retains the existing chat's credential access configuration.

The established tools continue to use API v1 for existing chats, projects, environment variables, hooks, and deployments. v2 cannot operate on v1 chat IDs. To migrate code, choose a version with `list_chat_versions` and `get_chat_version`, download it with `download_chat_version`, unpack its archive, then import source files into a new v2 chat. Imports accept up to 100 files. Store the old identifiers in the new chat's metadata if needed.

v0 deprecates projects and deployment inspection in favor of chat metadata and the Vercel API. The existing v1 tools remain available for compatibility. This integration does not silently move or publish existing applications. Deployment creation publishes an application and should be used only when that outcome is intended.

Create an API key in [v0 settings](https://v0.app/settings). Your account must have API access and enough credits for generation. See the [API migration guide](https://v0.app/docs/api/v2/guides/migrating-from-v1-to-v2) and [integration specification](docs/SPEC.md).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
