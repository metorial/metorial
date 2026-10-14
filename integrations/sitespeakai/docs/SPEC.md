# SiteSpeakAI API Integration

SiteSpeakAI trains AI chatbots on business content for customer support and lead capture. This integration queries those chatbots and retrieves account, chatbot, conversation, lead, training-source, suggested-message, updated-answer, and analytics data.

## Authentication and discovery

Requests use an API token in the `Authorization: Bearer` header. Generate a token on the [API Tokens page](https://sitespeak.ai/user/api-tokens). The API base URL is `https://api.sitespeak.ai/v1`. `get_account` verifies the connected account using `GET /me`; `list_chatbots` discovers the chatbot IDs accepted by the other tools.

## Tools

| Tool | API operation | Behavior |
| --- | --- | --- |
| `get_account` | `GET /me` | Retrieve the connected account's identity. |
| `list_chatbots` | `GET /me/chatbots` | Discover chatbot IDs, names, owner teams, icons, and conversation counts. |
| `get_chatbot_settings` | `GET /{chatbot_id}` | Inspect appearance, behavior, model, language, and escalation settings. |
| `query_chatbot` | `POST /{chatbot_id}/query` | Send a prompt with optional conversation grouping and HTML or markdown response format. |
| `get_conversations` | `GET /{chatbot_id}/conversations` | Retrieve messages with optional visitor filter, sources, deleted messages, limit, and order. |
| `get_leads` | `GET /{chatbot_id}/leads` | Retrieve captured contact details. |
| `list_updated_answers` | `GET /{chatbot_id}/finetunes` | Retrieve custom question-answer pairs. |
| `create_updated_answer` | `POST /{chatbot_id}/finetunes` | Create or update an answer using `question` and `suggested_answer`. |
| `delete_updated_answer` | `DELETE /{chatbot_id}/finetunes/{finetune_id}` | Remove an updated answer. |
| `get_suggested_messages` | `GET /{chatbot_id}/prompts` | Retrieve visitor-facing suggested questions. |
| `get_sources` | `GET /{chatbot_id}/sources` | Retrieve training-source status and timestamps. |
| `get_analytics` | `GET /{chatbot_id}/analytics` | Retrieve metrics and question insights for optional ISO 8601 `from` and `to` dates. |

Analytics defaults to the past 30 days through today. The API caps the date range at 366 days. It includes a preceding period of the same length for comparison. Lead totals can be null when the connected user cannot view contacts; individual answered/unanswered insight entries can be null when no insights exist yet.

## References and availability

See the [official API reference](https://sitespeak.ai/docs/api-reference/introduction) and [analytics reference](https://sitespeak.ai/docs/api-reference/analytics/get-analytics) for current contracts. The provider also documents [agency APIs and signed outbound webhooks](https://sitespeak.ai/docs/agency/webhooks); this integration has no event subscriptions or agency-management tools.
