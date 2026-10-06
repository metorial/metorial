# LMNT integration specification

## Status

LMNT has shut down its speech generation service. On 2026-10-04, the
[official website](https://www.lmnt.com/) and
[official API documentation](https://docs.lmnt.com/) both displayed the shutdown
notice. The notice does not give a shutdown date.

This integration is retired. Provider operations and new connections are
unavailable. Choose another speech provider.

## Compatibility

The existing API-key method (`api_key`), stored auth output (`token`), and six
tool keys retain their input and output schemas. Every tool, authentication
attempt, and profile lookup reports the provider shutdown without contacting
LMNT. All tools are marked deprecated.

| Tool | Historical endpoint |
| --- | --- |
| `generate_speech` | `POST /v1/ai/speech/bytes` |
| `list_voices` | `GET /v1/ai/voice/list` |
| `get_voice` | `GET /v1/ai/voice/{id}` |
| `update_voice` | `PUT /v1/ai/voice/{id}` |
| `delete_voice` | `DELETE /v1/ai/voice/{id}` |
| `get_account` | `GET /v1/account` |

The [official SDK API index](https://github.com/lmnt-com/lmnt-node/blob/master/api.md)
records these historical operations. The
[speech resource](https://github.com/lmnt-com/lmnt-node/blob/master/src/resources/speech.ts)
also records the binary synthesis endpoint. The SDK's presence does not establish a currently
operating service. No new voice-cloning, streaming, conversion, or identity
tools are added to this retired integration.

## Events and files

There are no triggers or event subscriptions. The unsupported generic inbound
webhook was removed; no replacement was introduced.

The historical speech output schema is retained for compatibility. Speech
generation stops with the shutdown error before producing audio or files.
