# API Labz Integration Specification

API Labz provides a marketplace of API modules for document extraction, AI content generation, research, and business utilities.

## Authentication and configuration

Use an API token from your API Labz account. Module calls send `Authorization: Bearer <token>` and a JSON body to `https://hub.apilabz.com/module/<module-id>`. There are no additional setup fields, OAuth scopes, or token refresh operations in this integration.

## Tools

- `list_api_modules` discovers the current public marketplace modules and their example parameters. Hidden and account-specific custom modules are excluded.
- `call_api_module` sends an arbitrary parameter object to a module ID. Discover public IDs with `list_api_modules`; custom IDs come from your account.
- `generate_business_report` sends raw data and report instructions to Business Analyst.
- `extract_id_data` sends an identity image and its MIME type to the ID extraction module. Short image formats such as `jpg` and `png` are accepted.
- `pdf_to_json` and `image_to_json` send a file URL and a JSON structure to the PDF and image extraction modules. Supply the structure as a JSON object encoded as a string.
- `text_to_image`, `text_to_flow_diagram`, and `generate_social_media_content` send instructions to their respective marketplace modules.
- `deep_research` sends a query to Deep Research Graph; `ai_search` uses Perplexity Search.
- `convert_document` and `track_expense` retain their existing module requests for compatibility. Their legacy module IDs are absent from the current public catalog, so current provider support is unverified.
- Base64-only PDF and image extraction requests retain their legacy module requests. The current public catalog documents URL inputs only; prefer a file URL.

Provide exactly one file source when a tool accepts both a URL and base64 content. Module response bodies are returned unchanged under each tool's existing output field. File-generation tools also prepare recognized provider file links for download when a link is present. The provider does not publish a uniform response schema or URL expiration contract in its public catalog.

## API reference

The [official marketplace](https://apilabz.com/api-labs/marketplace) links to each module's playground. Its public catalog provides module IDs, endpoint URLs, and example JSON requests. It does not provide complete requiredness, response, pagination, or error schemas. No suitable current-user identity endpoint is documented there. This integration does not register triggers.
