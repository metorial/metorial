# <img src="logo.jpeg" height="20"> Enigma

Search, match, and enrich U.S. business data using Enigma's comprehensive database. Look up businesses by name, address, website, or person information and retrieve unified profiles with identity, financial health, and market rank attributes. Perform Know Your Business (KYB) verification including name, address, Secretary of State, TIN, and OFAC watchlist screening. Screen businesses and persons against government sanctions and compliance watchlists. Enrich CRM and prospect databases with revenue, growth signals, industry classification, and contact information. Query business relationships, brands, and operating locations via a flexible GraphQL API.

Use `get_account` to inspect the customer and plan associated with your API key, and `count_businesses` to count operating locations and their associated brands and legal entities in an area. `search_businesses` supports business-name searches, state filters, and pagination; pass its `endCursor` back as `cursor` with the same search inputs.

The GraphQL tools use Enigma's current graph-model-1 API. `match_business`, `lookup_business`, and `verify_business` retain the documented legacy REST and KYB v1 contracts for existing customers. Enigma v1 is supported for existing customers but unavailable to new users. Custom `graphql_query` operations can include mutations; inspect the operation before running it if you intend to retrieve data only.

Official documentation: [GraphQL API](https://documentation.enigma.com/reference/graphql_api/), [legacy REST API](https://documentation.enigma.com/v1/), [KYB API](https://documentation.enigma.com/kyb/).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
