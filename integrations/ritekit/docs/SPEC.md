# RiteKit API

RiteKit exposes a REST API for hashtag analytics, content enhancement, company branding, email insights, and Rite.ly links. The Rite.ly category groups Link Ad discovery and short-link creation because Rite.ly is a separately subscribed product whose Link Ads are created and managed in Rite.ly. All requests use `https://api.ritekit.com` with the connection's Client ID in the `client_id` query parameter. OAuth is no longer supported. Create a Client ID in the [API Console](https://ritekit.com/developer/dashboard/).

## Supported workflows

| Tools | Provider operations |
| --- | --- |
| `auto_hashtag`, `hashtag_stats`, `hashtag_suggestions` | Auto-hashtag text, analyze up to 100 hashtags, suggest hashtags from text, an image, or a page URL |
| `trending_hashtags`, `hashtag_history`, `banned_instagram_hashtags` | Discover trends, request the legacy history operation, remove banned Instagram hashtags |
| `email_insights`, `check_email` | Retrieve full insights or select one free-provider, disposable-provider, typo, or name check |
| `company_insights` | Resolve a name to a domain; retrieve logos and brand colors; request square logo sizing, background treatment, and fallback generation |
| `emoji_suggestions` | Suggest emoji characters or add emojis to text |
| `generate_image`, `animate_image` | Create a quote image or animate an image; retain the provider URL and prepare a downloadable copy |
| `extract_content` | Extract article text, link-preview metadata, or the featured image |
| `list_link_ctas`, `shorten_link` | Discover the connection's available Rite.ly Link Ads and create a short link using a CTA ID |

Current operations are unpaginated. The history endpoint remains available through its existing tool contract, but is absent from the current published collection. No account/profile/self endpoint is documented, so this integration does not infer an identity from a credential or enrichment result. Link Ads remain account dependent and may require provider-side account access beyond a Client ID.

## Response and file behavior

Tools preserve the complete provider responses in `raw` (or the existing `fullInsights` field). Provider-reported email checks do not prove that a mailbox exists. Emoji suggestions may omit relevance scores; an actual returned numeric score is preserved.

The current API uses `image` for image hashtag requests, returns page suggestions in `hashtags`, returns brand colors in `data`, and returns an extracted image in `top_image`. Trending results use `photos`; the existing `images` output exposes the same metric. Short-link numeric-string CTA IDs retain their numeric output representation and the original value in `raw`.

Quote images map the existing text, font, color, and logo inputs to the current parameter names. Width, height, and normal/bold font weights are optional. Legacy rendering options remain forwarded; the current collection documents only glint animation and does not document the legacy quote animation, font-size, gradient-direction, or quote-mark controls.

RiteKit's logo example returns a signed temporary URL and a separate permanent URL. Each permanent-URL view consumes a credit. Generated images and logos are downloaded from supported RiteKit-owned hosts once, without regenerating the image or requesting another logo. Downloads reject redirects, verify image MIME types and PNG/JPEG/GIF/WebP/SVG signatures, and stop after 30 seconds or 20 MiB. If preparing the downloadable copy fails, the successful provider response and original URL remain available with `downloadError`. Featured images extracted from external pages use the returned image URL directly. Download and upload behavior has not been verified against a live provider connection.

## Official references

- [Current API collection](https://documenter.getpostman.com/view/2010712/SzS7Qku5?version=latest): methods, query fields, and response samples.
- [Rite.ly product and subscription](https://help.ritekit.com/en/article/affiliate-marketing-and-selling-anything-with-ritekit-1ae8n3q/): separate Rite.ly subscription and Link Ad creation establish the product boundary for the two link tools.
- [API demos](https://ritekit.com/api-demo): published capability areas and the official collection link.
- [Company logo](https://ritekit.com/api-demo/company-logo): original and square formats, background options, and permanent URLs.
- [Quote image](https://ritekit.com/api-demo/create-quote-image): current quote fields and dimensions.
- [API FAQ](https://help.ritekit.com/en/article/general-ritekit-api-faq-legality-changing-tiers-using-multiple-endpoints-etc-1lvapvk/): query authentication, unsupported OAuth, rate limits, and permanent-URL charging.
