# RedCircle API integration specification

RedCircle API retrieves public Target product data and runs scheduled collections of requests.

## Authentication and configuration

Connect with a RedCircle API key from https://app.redcircleapi.com/signup. Requests use `api_key` on `https://api.redcircleapi.com`. The account endpoint supplies the connection profile and account usage; the profile uses the account email as its identifier. The optional `customerZipcode` configuration supplies the default localization postcode. Configure that postcode with `manage_zipcodes` and wait until it is available. Store-stock postcode searches do not require registration.

## Tools

| Key | Behavior |
| --- | --- |
| `search_products` | Search by term or Target URL with sorting, facets, fulfillment filters and pagination. |
| `get_product_details` | Retrieve a product by TCIN, DPCI, GTIN or Target URL. |
| `get_reviews` | Retrieve reviews with star, reviewer and media filters and pagination. |
| `browse_categories` | Browse or search the category hierarchy, or retrieve category products. |
| `check_store_stock` | Find up to 20 stores within 50 miles of a postcode and inspect product stock. |
| `manage_zipcodes` | List, add or delete registered localization postcodes; list accepts pagination and search. |
| `manage_collections` | List, get, create, update, start or delete bulk request collections. |
| `manage_collection_requests` | List request IDs, add up to 1,000 requests, update request parameters or delete a request. |
| `get_collection_results` | List completed result sets, prepare JSON/JSON Lines/CSV downloads or resend an existing webhook. |
| `manage_destinations` | List, create, update or delete cloud export destinations. S3-compatible storage accepts endpoint and region settings. |
| `get_account` | Read identity, plan, credits, quotas, usage history and provider status without consuming request credits. |

## Collection workflow

Create a collection with `manage_collections`, then use `manage_collection_requests` with action `add`. Each request uses provider parameter names, for example `{"type":"product","tcin":"78025470","custom_id":"catalog-item-001"}`. Start the collection, poll its status, list result sets, and get a completed result set. Request mutation calls must be sequential and the collection must not be running.

Collections hold up to 15,000 requests, or 100 when HTML is included. Result sets remain available for 14 days. Download retrieval returns the original result metadata and provider download URLs alongside downloadable files. Existing raw file responses remain available without transformation. Storage destinations support Amazon S3, Google Cloud Storage, Azure, Alibaba OSS, and S3-compatible storage. The public `s3_compatible` value maps to the provider's `s3compatible` wire value.

## Compatibility and errors

Existing tool keys, field types, enum values and schema requiredness are retained. Invalid branch-specific input is reported with a clear validation message. HTTP failures and provider `request_info.success=false` responses retain provider error details. Product URL and GTIN precedence follows the provider API. No OAuth scopes or token refresh are required.

The integration registers no triggers. Collection notification URLs can be configured through the collection tool; callback delivery is not verified by static builds.

## Official documentation

- [API overview](https://docs.trajectdata.com/redcircleapi)
- [Product parameters](https://docs.trajectdata.com/redcircleapi/target-product-data-api/parameters/product)
- [Search parameters](https://docs.trajectdata.com/redcircleapi/target-product-data-api/parameters/search)
- [Review parameters](https://docs.trajectdata.com/redcircleapi/target-product-data-api/parameters/reviews)
- [Store stock](https://docs.trajectdata.com/redcircleapi/target-product-data-api/parameters/store-stock)
- [Category hierarchy](https://docs.trajectdata.com/redcircleapi/categories-api/list-and-search)
- [Create collection requests](https://docs.trajectdata.com/redcircleapi/collections-api/requests/create)
- [Get result sets](https://docs.trajectdata.com/redcircleapi/collections-api/results/get)
- [Create destinations](https://docs.trajectdata.com/redcircleapi/destinations-api/create)
- [Account](https://docs.trajectdata.com/redcircleapi/account-api)
- [Response codes](https://docs.trajectdata.com/redcircleapi/response-codes)
