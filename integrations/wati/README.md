# <img src="logo.jpeg" height="20"> Wati

Send WhatsApp session and approved template messages, manage contacts, retrieve contact counts and conversation history, assign conversations, inspect campaigns and their delivery statistics, discover additional channels, and start chatbot flows.

Connect with a Wati API Bearer token and your HTTPS API host, such as `https://live-mt-server.wati.io`. V3 requests resolve the workspace from the token and do not use a tenant path. Template sends resolve the supplied template ID to its name; contact IDs are resolved to phone numbers. Those lookups require the corresponding read permissions. A successful send means Wati accepted the message; delivery remains asynchronous. Chatbot operations require the Pro plan or above.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
