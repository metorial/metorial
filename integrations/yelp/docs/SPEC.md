# Yelp integration specification

This integration uses the Yelp Places API at `https://api.yelp.com/v3` and Yelp AI at `https://api.yelp.com/ai/chat/v2` with a private API key sent as a Bearer token. Create and rotate keys in the Yelp developer dashboard. No OAuth scopes, token exchange, automatic refresh, or global resource configuration are required.

## Tools

- `search_businesses`: search by location or coordinates, term, category aliases, price, open time, and attributes, with limit and offset. Yelp exposes up to 240 businesses per query even when the reported total is higher. `devicePlatform` requests mobile links.
- `get_business_details`: look up a business by ID or alias, with optional locale and device platform. Returns provider metadata, photo URLs, hours, messaging information, and available attributes.
- `get_reviews`: retrieve review excerpts, with the existing locale, sort, limit, and offset inputs. Yelp documents up to three excerpts and requires Enhanced or Premium endpoint access. The returned total describes excerpts returned, not lifetime business reviews.
- `autocomplete`: suggest search terms, businesses, and categories.
- `match_business`: match known business details. The public `zipCode` input maps to Yelp's `postal_code` parameter. Supports the documented strict threshold and optional known business ID hint.
- `search_by_phone`: find businesses using an international phone number.
- `search_transactions`: find delivery businesses by location or coordinates, optionally filtering term, category aliases, and price.
- `ai_chat`: converse about local businesses and continue using the returned chat ID. AI access and optional reservation functions depend on the account's plan and Yelp approval. Partial structured responses and provider nulls are preserved.
- `list_categories`: discover aliases, localized names, parent aliases, and country restrictions.
- `get_category`: inspect one category discovered with `list_categories`.

Business, photo, and review URLs are provider metadata; these tools do not download files. Yelp API-key authentication has no suitable current-user endpoint, so an identity tool is unavailable. There are no triggers.

Events, partner listing management, review responses, leads, advertising, analytics, and reservation-specific tools are outside this integration's implemented scope. Partner APIs require separately granted access and may require different credentials.

## Sources

- [Places overview](https://docs.developer.yelp.com/docs/places-intro)
- [API-key authentication](https://docs.developer.yelp.com/docs/places-authentication)
- [Business search](https://docs.developer.yelp.com/reference/v3_business_search)
- [Business details](https://docs.developer.yelp.com/reference/v3_business_info)
- [Reviews](https://docs.developer.yelp.com/reference/v3_business_reviews)
- [Business matching](https://docs.developer.yelp.com/reference/v3_business_match)
- [Phone search](https://docs.developer.yelp.com/reference/v3_business_phone_search)
- [Delivery search](https://docs.developer.yelp.com/reference/v3_transaction_search)
- [Autocomplete](https://docs.developer.yelp.com/reference/v3_autocomplete)
- [AI API](https://docs.developer.yelp.com/reference/v2_ai_chat)
- [All categories](https://docs.developer.yelp.com/reference/v3_all_categories)
- [Category details](https://docs.developer.yelp.com/reference/v3_categories)
