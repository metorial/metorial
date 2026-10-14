# <img src="logo.png" height="20"> Botsonic

Build and manage custom AI chatbots trained on your own data. Generate AI-powered responses from bots, create and delete bots, and upload training data in PDF, DOC, DOCX, URL, sitemap, or text formats. Manage FAQs for precise answers to common questions, configure starter questions to guide user interactions, and retrieve conversation history for analytics and quality assurance. Responses are returned synchronously. Retrieve starter presets to inspect the welcome message and initial questions.

## Connection and bot selection

Use an account API Secret Key for bot management. Call `list_bots` to discover bot IDs, then supply `botId` on response, training-data, FAQ, starter-question, and conversation tools. These tools resolve the selected bot's API token automatically. Supply `workspaceId` from the bot listing when needed.

A Bot API Token connection targets the bot that owns the token and supports bot-scoped tools. Account-wide bot management requires an account API Secret Key. For file and text uploads, keep supplying the target `botId` and a unique `uploadId`; accepted uploads process asynchronously and can be checked with `list_training_data`.

API access must be enabled for the Botsonic account. See the official [REST API guide](https://docs.botsonic.com/docs/rest-api) and [API keys guide](https://docs.botsonic.com/docs/your-api-keys).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
