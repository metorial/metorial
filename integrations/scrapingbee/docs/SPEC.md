# ScrapingBee API specification

## Authentication

Use an API key from the ScrapingBee dashboard. Requests send the key as a Bearer token in the Authorization header. No OAuth scopes or resource IDs are required.

## API operations

| Tool | Provider endpoint or feature |
| --- | --- |
| scrape_webpage | GET /api/v1/; HTML, browser rendering, proxy options, forwarded headers and cookies |
| page_content | GET /api/v1/ with return_page_text or return_page_markdown |
| extract_data | GET /api/v1/ with JSON-encoded extract_rules |
| ai_extract | GET /api/v1/ with either ai_query or JSON-encoded ai_extract_rules |
| capture_screenshot | GET /api/v1/ with screenshot=true; downloadable PNG and existing base64 result |
| run_js_scenario | GET /api/v1/ with JSON-encoded js_scenario |
| google_search | GET /api/v1/google; the existing search type maps to classic |
| amazon_search | GET /api/v1/amazon/search or /api/v1/amazon/product; product ASIN is sent as query |
| amazon_pricing | GET /api/v1/amazon/pricing/ with asin |
| walmart_search | GET /api/v1/walmart/search or /api/v1/walmart/product |
| youtube_search | GET /api/v1/youtube/search |
| youtube_video | GET /api/v1/youtube/metadata and optional /api/v1/youtube/subtitles |
| check_usage | GET /api/v1/usage; credits and concurrency |

Webpage timeout input retains seconds and is converted to the provider's milliseconds. Custom headers automatically enable header forwarding. Amazon and Walmart marketplace inputs accept full domains or top-level domains. Existing YouTube upload-date choices map to the documented provider values. Omit Amazon countryCode when it matches the selected marketplace country; that combination is rejected with guidance before requesting the provider.

Google extra URL parameters are encoded in extra_params. The provider currently documents filter, fpstate, locale, nfpr, safe, safe_search, tbm, tbs, and udm. Existing language, location, and nbResults fields remain accepted by the tool; provider support for their legacy request parameters is unverified. The optional legacy YouTube trainability operation remains available, but the current documentation does not document its endpoint.

## Sources

- [HTML, screenshots and usage](https://www.scrapingbee.com/documentation/)
- [Data extraction](https://www.scrapingbee.com/documentation/data-extraction/)
- [Google API](https://www.scrapingbee.com/documentation/google-api/)
- [Amazon API](https://www.scrapingbee.com/documentation/amazon/)
- [Walmart API](https://www.scrapingbee.com/documentation/walmart/)
- [YouTube API](https://www.scrapingbee.com/documentation/youtube/)
