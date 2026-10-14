# Grafbase specification

The integration uses the Grafbase Management GraphQL API to discover accounts and graphs, manage graph and branch lifecycles, publish subgraph schemas, run schema checks, retrieve schemas, and execute custom GraphQL operations.

## Authentication

Use a personal access token from account settings. Organization tokens are documented for Gateway telemetry and the Graph Delivery Network. The default endpoint is `https://api.grafbase.com/graphql`; provide a custom GraphQL API URL during authentication for a self-hosted deployment. Older saved endpoint configuration remains supported.

## Workflows

- Discover organization slugs with `get_viewer`, resolve an account ID with `get_account`, and discover graph IDs with `list_graphs`.
- Create, retrieve, and delete graphs. Branch creation requires a self-hosted graph.
- Publish or check subgraph SDL using a graph ID. The integration resolves the graph's account and slug for the API request.
- Check results include the recorded check ID, error count, and diagnostics. Composition failures during publication return `published: false`.
- List subgraphs and retrieve composed or individual SDL. These tools retain the default branch name `main`.
- Follow pagination cursors for organization, graph, and branch lists.

The provider warns that its API can introduce breaking changes. Custom GraphQL operations can access capabilities outside the dedicated tools; the caller is responsible for using the deployed schema.

## Official references

- [Management API](https://grafbase.com/docs/platform/api)
- [GraphQL schema reference](https://grafbase.com/api-documentation.html)
- [Access tokens](https://grafbase.com/docs/gateway/security/access-tokens)
