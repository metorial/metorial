# Payhip integration

## Supported operations

The integration covers Payhip's current coupon and software license APIs:

- Create, list, and retrieve coupons.
- Verify, enable, and disable license keys.
- Increase and decrease license usage counters.

The public API does not document an account/profile endpoint, coupon update or deletion, product discovery, or order management. No identity tool or webhook triggers are exposed.

## Authentication

Coupon tools use the account API key from **Settings > Developer**, sent in the `payhip-api-key` header. License tools additionally require the optional product secret key in the connection's authentication settings, sent in `product-secret-key`. Find it on the product edit page where software licenses are enabled. It must correspond to the product that issued the license.

## Coupons

Provide exactly one discount: a percentage greater than zero and at most 100, or a positive whole amount in cents. Single-product and collection coupons require their corresponding product key or collection ID. Dates use RFC 3339 timestamps with a timezone. Whole-number amounts, redemption limits, and pagination values are validated before requests.

Coupon IDs are returned as strings for compatibility, including Payhip's numeric IDs. Listing follows Payhip's `data.coupons` response. The `total` field uses a provider total if available, otherwise the current page count; it does not promise an account-wide count. Use limit and offset for pagination.

Nullable coupon fields retain their required scalar-or-null output schemas and return null when Payhip leaves the value unset. Each coupon's `raw` also retains its original provider fields, including null values. List output also retains the full response in `raw`.

## Licenses

License output includes purchase and product details, enabled state, usage count, and optional variant name/ID. The original response object remains available in `raw`. An empty verification or usage response produces an actionable error instead of a fabricated disabled license.

## API boundaries

Requests use the current v2 routes and form-encoded mutation bodies. Coupons for recurring subscription prices remain unsupported by Payhip. Tools preserve existing input keys, number types, enum values, and requiredness. No downloadable-file operation is documented.

## Official references

- [Payhip API reference](https://payhip.com/api-reference)
- [Public API overview](https://help.payhip.com/article/347-public-api)
- [Software license keys](https://help.payhip.com/article/317-software-license-keys-new)
