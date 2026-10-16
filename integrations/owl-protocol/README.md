# <img src="logo.png" height="20"> Owl Protocol

Deploy ERC721 collections, mint NFTs, and manage project users and metadata on supported EVM-compatible blockchains. Discover the connected project, deployed contracts, and tokens held by project users.

## Connect

Create a project in the Owl Protocol dashboard and provide its project API key. Requests authenticate using `x-api-key`. An optional default chain ID can be configured; `get_user` can also discover the current project's default chain when no chain ID is provided.

## Tools

- **Project and contract discovery:** `get_project`, `list_project_contracts`, `get_contract`.
- **Collections and tokens:** `deploy_collection`, `mint_tokens`, `get_token`, `update_token`, `list_user_tokens`.
- **Token templates:** `create_token_template`, `get_token_template`, `list_token_templates`, `update_token_template`.
- **Project users:** `create_user`, `get_user`, `list_users`.
- **Contract metadata:** `get_contract_metadata`, `update_contract_metadata`, `list_contracts`.

Call `list_project_contracts` to find contract addresses and chain IDs. `list_contracts` lists contract metadata records, which may omit deployment identifiers. The user, template, contract, and contract-metadata list tools accept optional `limit`, `skip`, `orderBy`, and `order` inputs for paging and sorting. Call `get_user` for a chain-specific Safe wallet address.

Minting accepts email addresses, project user IDs, or EVM addresses. Supply at most one of inline metadata or a template ID. Set `wait` when token details are needed after execution; an accepted user operation alone does not establish final blockchain confirmation.

Mint requests with `wait: true`, or with `wait` omitted, allow 330 seconds for the provider's documented five-minute receipt wait plus request overhead. An omitted `wait` still uses the provider's default; this timeout does not select that default. Explicit `wait: false` and ordinary requests retain a 120-second HTTP timeout. A timed-out mint may continue executing: check the project and recipient token records, using any available `userOpHash`, before retrying. Blind retries can mint duplicate tokens.

Each tool includes the original provider response data alongside its typed summary. This retains custom metadata and additional provider fields.

## Documentation

- [Owl Protocol guides](https://docs.owl.build)
- [Provider documentation source](https://github.com/owlprotocol/workspace-public/tree/main/docs)
- [Published TypeScript API](https://www.npmjs.com/package/@owlprotocol/core-trpc)

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
