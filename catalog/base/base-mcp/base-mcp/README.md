
# Base MCP Server

A containerized version of "Base MCP Server"

> Repository: [base/base-mcp](https://github.com/base/base-mcp)

## Description

A Model Context Protocol (MCP) server that provides onchain tools for AI applications like Claude Desktop and Cursor, allowing them to interact with the Base Network and Coinbase API.


## Usage

The containers are built automatically and are available on the GitHub Container Registry.

1. Pull the Docker image:

```bash
docker pull ghcr.io/metorial/mcp-container--base--base-mcp--base-mcp
```

2. Run the container:

```bash
docker run -i --rm \ 
-e COINBASE_API_KEY_NAME=coinbase-api-key-name -e COINBASE_API_PRIVATE_KEY=coinbase-api-private-key -e SEED_PHRASE=seed-phrase -e COINBASE_PROJECT_ID=coinbase-project-id -e ALCHEMY_API_KEY=alchemy-api-key -e PINATA_JWT=pinata-jwt -e OPENROUTER_API_KEY=openrouter-api-key -e CHAIN_ID=chain-id \
ghcr.io/metorial/mcp-container--base--base-mcp--base-mcp  "node deprecated.js"
```

- `--rm` removes the container after it exits, so you don't have to clean up manually.
- `-i` allows you to interact with the container in your terminal.



### Configuration

The container supports the following configuration options:




#### Environment Variables

- `COINBASE_API_KEY_NAME`
- `COINBASE_API_PRIVATE_KEY`
- `SEED_PHRASE`
- `COINBASE_PROJECT_ID`
- `ALCHEMY_API_KEY`
- `PINATA_JWT`
- `OPENROUTER_API_KEY`
- `CHAIN_ID`




## Usage with Claude

```json
{
  "mcpServers": {
    "base-mcp": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "ghcr.io/metorial/mcp-container--base--base-mcp--base-mcp",
        "node deprecated.js"
      ],
      "env": {
        "COINBASE_API_KEY_NAME": "coinbase-api-key-name",
        "COINBASE_API_PRIVATE_KEY": "coinbase-api-private-key",
        "SEED_PHRASE": "seed-phrase",
        "COINBASE_PROJECT_ID": "coinbase-project-id",
        "ALCHEMY_API_KEY": "alchemy-api-key",
        "PINATA_JWT": "pinata-jwt",
        "OPENROUTER_API_KEY": "openrouter-api-key",
        "CHAIN_ID": "chain-id"
      }
    }
  }
}
```

# License

Please refer to the license provided in [the project repository](https://github.com/base/base-mcp) for more information.

## Contributing

Contributions are welcome! If you notice any issues or have suggestions for improvements, please open an issue or submit a pull request.

<div align="center">
  <sub>Containerized with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
  