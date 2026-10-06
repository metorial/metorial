# Loom embedding integration

This integration retains three tools for anonymous video metadata reads and local embed generation. It does not record, upload, play, download, share, modify, or delete videos. Loom's browser recording SDK and the separately authenticated Atlassian Loom MCP tools are different products, outside this integration's scope.

## Authentication and access

No credentials or instance setting are required. Metadata requests use the documented embed SDK's `GET https://www.loom.com/v1/oembed` endpoint, with `url`, `maxwidth`, and `maxheight`. Requests do not forward cookies or authorization and do not follow redirects. Anonymous metadata availability does not establish ownership or grant playback access. Native video privacy and player restrictions still apply.

Complete `http` or `https` share/embed URLs on exactly `loom.com` or `www.loom.com` are accepted for compatibility. They are normalized to the HTTPS `www.loom.com` resource, with tracking query and fragment removed. Credentials, development hosts, ports, surrounding text, and extra resource paths are refused. Existing alphanumeric video IDs remain accepted; their existence is only confirmed by a successful native metadata response.

## Tools and native receipts

| Tool | Behavior | Limits |
| --- | --- | --- |
| `get_video_metadata` | Returns native title, type, HTML, nullable player dimensions, thumbnail dimensions/URL, duration in seconds and provider fields. | Positive safe integer size options; native object/type/provider/iframe video binding validated. Native `version` is optional and is not part of the legacy output. |
| `generate_embed_code` | Produces an iframe snippet and embed URL using documented `hideEmbedTopBar`, `autoplay` and `t` options. | Local generation does not verify video existence, permission or playback. Start time accepts nonnegative seconds or minutes/seconds, e.g. `20`, `20s`, `1m30s`. No dimensions selects the retained 16:9 responsive presentation, rather than a claim about the video's native aspect ratio. |
| `replace_loom_urls` | Reads each distinct valid URL once and replaces original occurrences in one pass. Native failures leave those URLs unchanged. | Local 1 MiB input, 20 distinct URL and 2 MiB result bounds; failure after reads does not undo access logs. Other input text is preserved, not sanitized. |

`urlsFound` counts valid occurrences. The retained `urlsReplaced` and `replacedUrls` count distinct successful original URL strings; additive `occurrencesReplaced` counts all replacements and `failedUrls` identifies valid URLs whose metadata could not be confirmed. Similar URL prefixes and links in inserted HTML are not recursively replaced. Native embed HTML must identify the requested HTTPS Loom iframe; this check is not a general HTML sanitizer.

Metadata reads have a 30 second timeout and a local 256 KiB response bound. HTTP failures return actionable errors without retaining raw transport parents at the local adapter. Shared pre-adapter tracing can retain upstream state internally; this integration does not claim universal trace sanitization. No media download, expiry, renewal, owner identity, or cleanup endpoint is inferred from oEmbed.

## Verification

The active private suite requires explicit authorization for an owner-controlled public fixture, acceptance of retained access logs and a pinned complete native metadata digest. Public oEmbed does not prove owner identity: the fixture authorization is an operator prerequisite, not a native ownership claim. The suite compares independent metadata observations before and after each tool. It creates no resource and offers no artificial deletion or cleanup. Live video availability and browser playback remain unverified until the controlled suite is run with authorized fixtures.

## Official sources

- [Embed SDK API](https://dev.loom.com/docs/embed-sdk/api)
- [Embed SDK setup](https://dev.loom.com/docs/embed-sdk/getting-started)
- [Current open API availability](https://support.atlassian.com/loom/docs/does-loom-have-an-open-api)
- [Native embed options](https://support.atlassian.com/loom/docs/make-embedded-videos-autoplay-or-play-at-a-specific-time/)
- [Video privacy](https://support.atlassian.com/loom/docs/use-looms-privacy-settings/)
- [Separate Loom MCP tools](https://support.atlassian.com/loom/docs/loom-mcp-tools/)
