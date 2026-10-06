# <img src="logo.svg" height="20"> HeyGen

Create avatar videos from text or audio, generate videos from prompts and Studio templates, translate videos, and synthesize speech. Discover avatars, voices, templates, supported translation languages, and account billing. Browse, upload, and delete assets and generated media.

Video creation and translation are asynchronous. Use `get_video_status` for videos, `get_video_agent_status` for prompt sessions, and `get_translation_status` for each translation ID. Completed media and subtitles are available as downloadable files.

Most workflows use HeyGen v3. Legacy avatar layout, dimension, free-test options, and streaming token creation retain compatibility with older APIs; HeyGen plans to retire v1/v2 after October 31, 2026. Prefer standard avatar scenes with `resolution` and the separate [LiveAvatar API](https://developers.heygen.com/live-avatar) for new streaming work.

See the [API capability guide](docs/SPEC.md) and [official HeyGen documentation](https://developers.heygen.com/).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
