# Skyfire

The integration uses `https://api.skyfire.xyz` with the `skyfire-api-key` header. Authentication stores the supplied API key unchanged. No OAuth refresh or global account ID configuration is required.

API keys belong to one Buyer or Seller agent. Buyer keys create tokens; Seller keys charge tokens and manage seller services. Both agent types can use the generic agent and token APIs. Organization admin keys are a separate credential role and are not used for this integration's agent operations.

## Tools

- `create_token`: create `kya`, `pay`, or `kya-pay` tokens. The legacy `kya+pay` enum value remains an alias for `kya-pay`. A seller service ID targets an onboarded seller. External seller URLs support only `kya` tokens and require an organization buyer key. Expiration is an absolute Unix timestamp in seconds; omission leaves lifetime selection to Skyfire.
- `charge_token`: charge a buyer JWT after delivering a service. Omitting `chargeAmount` uses the configured service price only for `PAY_PER_USE` services. Other pricing models require an amount. A successful charge is not final settlement, and an uncertain result must not be retried automatically.
- `introspect_token`: inspect token validity, remaining balance, expiration, and the payment charge deadline. Invalid tokens are reported through `isValid` and `validationError` in a successful provider response. Do not infer current token acceptance from the charge grace period alone.
- `get_token_charges`: retrieve one page of token charges with `size` and `pageCursor`. Pass `nextPageCursor` into the next call. Decimal amounts remain strings; no floating-point monetary total is calculated. Unreported settlement timestamps and optional provider metadata are omitted from normalized fields and retained in the complete response.
- `get_wallet_balance`: read actual available, held, pending-charge, and pending-deposit amounts for the authenticated agent. This is account context; it does not infer an agent ID or name.
- `search_services`: browse services, filter by tags, look up a service or seller's services, or retrieve tags. Selection precedence remains tags-only, service ID, nonempty tags, agent ID, then all services. Results include actual service endpoint URLs, seller data, and identity requirements.
- `manage_seller_service`: list, get, create, update, activate, or deactivate services. Creation supports API, web page, remote/local MCP, and Fetch.ai service types, documented pricing models, endpoint URLs, identity requirements, and maximum token lifetime. Creation fields required by Skyfire remain optional in the input contract for compatibility; supply the documented fields or Skyfire will reject the request. Optional omissions are forwarded unchanged. The update endpoint accepts only its documented fields; service type, pricing model, endpoint URLs, identity requirements, and lifetime are creation-only inputs.
- `manage_agent`: read or replace the agent source-IP list. Legacy token-version get/set operations retain their existing requests for compatibility; they are absent from the current public documentation and were not reverified against the provider.

Service and token responses include complete provider data alongside normalized fields. Omitted accepted-token lists remain omitted; they are not replaced with guessed defaults. No wallet funding, withdrawal, refunds, organization administration, or token-listing endpoint is implemented.

There is no current documented self/profile endpoint in the agent API. Wallet balance and returned seller metadata provide authentic account context without inventing identity. These tools belong to one agent identity/payment API, so no separate product categories are declared.

## Official references

- [API authentication](https://docs.skyfire.xyz/reference/api-authentication)
- [Create token](https://docs.skyfire.xyz/reference/create-token)
- [Charge token](https://docs.skyfire.xyz/reference/charge-token)
- [Introspect token](https://docs.skyfire.xyz/reference/introspect-token)
- [Token charges and pagination](https://docs.skyfire.xyz/reference/get-token-charges)
- [Agent wallet balance](https://docs.skyfire.xyz/reference/get-agents-wallet-balance)
- [Source IP addresses](https://docs.skyfire.xyz/reference/set-agents-source-ip-addresses)
- [Create seller service](https://docs.skyfire.xyz/reference/create-agents-service)
- [Update seller service](https://docs.skyfire.xyz/reference/update-agents-service)
- [Seller service discovery](https://docs.skyfire.xyz/reference/get-agents-seller-services-all)
- [Directory services](https://docs.skyfire.xyz/reference/get-all-services)
- [Provider error contract](https://docs.skyfire.xyz/reference/http-error-status-codes)
