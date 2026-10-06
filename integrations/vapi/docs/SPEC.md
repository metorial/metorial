# Vapi integration

Connect with a private API key from the Vapi dashboard. Choose the organization region when connecting: US uses `https://api.vapi.ai`, and existing EU organizations use `https://api.eu.vapi.ai`. The default region is US. API keys belong to their region.

## Supported workflows

- Create, retrieve, update, delete, and list voice assistants. Configure system prompts, models, voices, transcribers, response timing, interruption plans, denoising, and timeouts. Partial model, voice, and transcriber updates preserve the saved provider configuration.
- Create, retrieve, delete, and list web or outbound voice calls. Retrieve transcripts, messages, analysis, duration, and recording links. Download available audio, video, logs, and packet captures.
- Create, retrieve, update, delete, and list squads with assistant members and overrides.
- Create, retrieve, update, delete, and list reusable conversation tools. Function and API-request tools have dedicated fields; other current Vapi tool types accept provider-specific writable configuration.
- Provision or import phone numbers, configure inbound assistant or squad routing, and retrieve, update, delete, and list numbers. Vapi SIP numbers are for inbound calls; outbound calling requires a supported imported number or SIP trunk. Twilio import needs its account credentials; Vonage, Telnyx, and BYO require a preconfigured telephony credential ID.
- Upload a text knowledge-source file, read its metadata, rename it, delete it, and list files by purpose.
- Create, retrieve, update, cancel, delete, and list outbound campaigns. Campaign creation requires an assistant or squad, source phone number, and customer numbers. List campaigns with page metadata.

Timestamp-filtered lists accept exclusive creation and update bounds where exposed. Their maximum limit is 1,000. Files use a purpose filter rather than unsupported pagination parameters. Campaigns use page-based pagination and report the next page.

## Retired workflows

Vapi retired Workflows on August 18, 2026. `manage_workflow` retains its input fields and actions for compatibility, advertises deprecation, and returns a clear retirement error. Use `manage_assistant` or `manage_squad` for current conversations. Workflow IDs retained on existing tools also report the retirement when used to create or update resources.

## Sources

- [Official OpenAPI document](https://api.vapi.ai/api-json)
- [API key authentication](https://docs.vapi.ai/security-and-privacy/api-keys)
- [Workflow retirement and migration](https://docs.vapi.ai/workflows/legacy-migration)
- [Call timeout settings](https://docs.vapi.ai/documentation/assistants/conversation-behavior/call-timeout-settings)
- [Voice pipeline configuration](https://docs.vapi.ai/customization/voice-pipeline-configuration)
- [Call artifact retrieval](https://docs.vapi.ai/assistants/retrieve-call-artifacts)
- [SIP and regional API hosts](https://docs.vapi.ai/advanced/sip/)
