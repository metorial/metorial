# <img src="logo.png" height="20"> Stack Exchange

Search and read questions, answers, tags, user profiles, reputation changes, and post revisions across the Stack Exchange network. Create questions and answers, edit posts, accept answers, manage comments, and read your inbox and notifications with OAuth. Discover available communities with `list_sites` and select a site in connection configuration.

API key connections can read public content. User operations require OAuth; inbox and notifications require `read_inbox`, and writes require `write_access`, the appropriate user permissions, and a registered Stack Apps application post. `get_user` with `userId: "me"` identifies the connected user on the selected site.

List results return one page and `hasMore`. `get_question` accepts separate answer/comment page inputs and returns their `answersHasMore` and `commentsHasMore` flags. Stack Exchange may require a temporary backoff before another call to the same method.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
