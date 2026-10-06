# Bolna Integration Specification

Bolna provides conversational Voice AI agents with speech recognition, language models, and text-to-speech. Authenticate with an API key from Developers → API Keys in https://platform.bolna.ai. Requests use Bearer authentication at https://api.bolna.ai; no global configuration or OAuth is needed.

## Supported capabilities

- Agent create, read, list, partial update, and deletion through the current `/v2/agent` APIs.
- Outbound calls with scheduling, prompt variables, calling guardrail overrides, and retry configuration. Cancellation applies to queued or scheduled calls, or all queued calls for an agent.
- CSV batch creation, scheduling, reading, listing, stopping, and deletion. CSV files use a `contact_number` header and E.164 numbers. Batch schedules accept numeric UTC offsets, must be within 30 days, and dispatch immediately when less than ten minutes ahead.
- Execution details, raw logs, transcripts, costs, and optional downloadable recordings. Agent history defaults to the previous seven days. Explicit UTC date bounds must be paired and no more than seven days apart. Batch history uses the paginated v2 endpoint.
- Knowledge base creation from public URLs, reading, listing, and deletion. Agent creation accepts processed knowledge base IDs from `manage_knowledge_base` and resolves their vector IDs before binding them.
- Read-only account identity, wallet balance, and concurrency.
- Owned phone number discovery and available number search, plus inbound agent linking and unlinking.
- TTS provider/model discovery by language and paginated voice lists. Omit provider/model IDs to discover a page across supported models for English, or supply both IDs from `list_voice_providers`.

Agent creation supplies a complete English conversation pipeline when optional component settings are omitted: GPT-5.4-mini, the documented ElevenLabs Angelica voice, Deepgram Nova-3, and Plivo audio input/output. Use `telephonyProvider` to select another supported telephony provider and `synthesizer` to choose a voice from the current catalogue.

Agent webhook URLs can still be configured as provider settings. This integration exposes no event triggers.

## Scope

Phone number purchase, voice cloning, provider credential management, enterprise sub-accounts, SIP trunk administration, extraction templates, and beta workflows are not exposed. Agent creation exposes the common single-task conversation configuration; advanced graph or multi-task authoring remains in the provider dashboard/API.

## API references

- [Authentication](https://www.bolna.ai/docs/api-reference/authentication)
- [Agent APIs](https://www.bolna.ai/docs/api-reference/agent/v2/overview)
- [Calls](https://www.bolna.ai/docs/api-reference/calls/make)
- [Execution history](https://www.bolna.ai/docs/api-reference/executions/get_executions)
- [Batch APIs](https://www.bolna.ai/docs/api-reference/batches/overview)
- [Knowledge bases](https://www.bolna.ai/docs/api-reference/knowledgebase/overview)
- [Voice providers](https://www.bolna.ai/docs/api-reference/voice/get_providers)
- [Voices](https://www.bolna.ai/docs/api-reference/voice/get_all)
