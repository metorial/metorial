# DreamStudio API specification

DreamStudio uses Stability AI's hosted API at `https://api.stability.ai`. Connect with a bearer API key from [the API Keys page](https://platform.stability.ai/account/keys). No OAuth scopes or connection-level resource identifiers are required. Account identity and credit balance use the documented `/v1/user/account` and `/v1/user/balance` endpoints.

## Current tools

| Tool | Provider API and result |
| --- | --- |
| `generate_image_file` | Text-to-image with Ultra, Core, or SD 3.5 Large, Large Turbo, Medium, or Flash; Ultra and SD 3.5 support a starting image with strength. Returns a downloadable PNG, JPEG, or WebP file. |
| `transform_image` | Inpaint, erase, outpaint, search-and-replace, recolor, remove background, replace background and relight, fast/conservative/creative upscale, and sketch/structure/style guidance. Returns an image file or an asynchronous job ID. |
| `generate_3d_file` | Stable Fast 3D: one image produces a textured GLB model. |
| `get_generation_result` | Read `/v2beta/results/{id}` for creative upscale or background replacement. HTTP 202 means processing; HTTP 200 provides the image. Use the same API key as submission. Results expire after 24 hours. |
| `get_account` | Account identity, organization memberships, and current credit balance. |

Image and mask inputs are base64-encoded PNG, JPEG, or WebP, optionally with a matching data-URL prefix. The client sends decoded binary multipart files. Input dimension and pixel limits vary by endpoint and are enforced by the provider; requests must fit the provider's 10 MiB limit. Masked editing accepts an explicit mask or the source image's alpha channel. White mask pixels are edited and black pixels preserved.

Core supports text-to-image only. Ultra and SD 3.5 require both `image` and `strength` for image-to-image; SD 3.5 sets `mode=image-to-image` and does not accept `aspect_ratio` in that mode. SD 3.5 supports `cfg_scale` from 1 to 10. Style presets are supported by current generation APIs. Style guidance uses `fidelity`; sketch and structure use `control_strength`.

Outpaint requires a positive direction and accepts creativity from 0 to 1. Search editing requires its identifying text and desired output prompt. Conservative upscale creativity is 0.2–0.5; creative upscale is 0.1–0.5. Background replacement requires a prompt or reference image; lighting strength requires a direction or reference. PNG and WebP preserve transparency after background removal.

Transform controls apply only to the operations described in their field help; incompatible controls are rejected before generation. Fast upscale and background removal do not accept a randomness seed. Inpaint mask expansion supports 0–100 pixels.

Creative upscaling and background replacement may wait up to five minutes, then return a job ID for recovery. `waitForResult=false` submits immediately. Poll result tools no more than once every 10 seconds. Hosted generation consumes credits; inspect the account balance before paid work. Current pricing is available from [Stability AI](https://platform.stability.ai/pricing).

## Compatibility and service retirement

`generate_image`, `edit_image`, `replace_background`, `upscale_image`, `control_image`, and `generate_3d` retain their original input and inline result contracts and are deprecated in favor of the file tools above.

`generate_video` retains its key and schemas but returns a clear service-retirement error. [Stability AI discontinued the hosted Stable Video Diffusion API on July 24, 2025](https://stability.ai/api-pricing-update-25). Video model self-hosting is outside this API integration.

No webhook or event subscription API is exposed here. Legacy trigger definitions have been removed.

## Official sources

- [REST API reference](https://platform.stability.ai/docs/api-reference)
- [Official OpenAPI schema served to the reference](https://api.stability.ai/v2alpha/openapi)
- [Stable Image getting started](https://platform.stability.ai/docs/getting-started/stable-image)
- [Service retirement and pricing update](https://stability.ai/api-pricing-update-25)
- [Stable Video self-hosting guidance](https://kb.stability.ai/knowledge-base/how-to-access-stable-video-diffusion)

The OpenAPI model enum omits Flash while its operation description, current developer platform, and pricing table explicitly document `sd3.5-flash`. Flash is exposed on the new generation tool using that documented model name. Point Aware 3D, audio generation, legacy SDXL engines, and two-image style transfer are deliberately outside this focused image/3D refresh.
