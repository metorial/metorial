# Cults Integration Specification

Cults3D is a marketplace for 3D printing designs. This integration uses the provider's GraphQL API at `https://cults3d.com/graphql`, sending POST requests with a query and variables.

## Authentication

Connect with your Cults3D username and a secret API key generated at <https://cults3d.com/en/api/keys>. The documented method is HTTP Basic authentication, with the username and API key as the credentials. The connection is verified through `myself.user`; a missing profile or GraphQL error fails authentication. There is no OAuth refresh flow or additional connection configuration.

## Tools

- Catalog: `search_creations`, `browse_creations`, `get_creation`.
- Identity and account reads: `get_my_profile`, `get_user`, `get_my_creations`, `get_my_liked_creations`, `get_my_sales`, `get_my_orders`.
- Discovery: `get_categories`, `get_licenses`. Use category IDs and license codes returned by these tools when publishing designs.
- Publishing: `create_creation`, `update_creation`. Hosted image/model URLs are supplied when creating a design; updating a creation changes its exposed metadata fields.
- Collections: `get_my_printlists`, `create_printlist`, `update_printlist`, `delete_printlist`, `add_to_printlist`, `remove_from_printlist`.
- Promotion and updates: `create_discount`, `notify_downloaders`.

Pagination uses limit and offset. Catalog names and URLs use English, and the existing monetary outputs use USD except sales income, where USD and EUR are selectable. The liked-design list returns names and creation page URLs without an invented total count. The license catalog includes applicability to free and paid designs.

Creation details and orders retain their provider file/download links. These are metadata reads; they do not transfer file bytes. Cults3D restricts access to other users' 3D model files, and links remain subject to provider authorization.

No triggers are registered by this integration.

## Provider References

- [API overview](https://cults3d.com/en/api)
- [GraphQL API details and authentication](https://cults3d.com/en/pages/graphql)
- [Provider-linked GraphQL examples](https://gist.github.com/sunny/07db54478ac030bd277c19cfe734648b)
- [Provider feature log](https://cults3d.com/en/pages/logbook-updates-new-features-cults)
