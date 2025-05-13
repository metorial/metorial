
# Aave MCP Server

A containerized version of "Aave MCP Server"

> Repository: [Too-Far/aave-mcp](https://github.com/Too-Far/aave-mcp)

## Description

A containerized version of "Aave MCP Server"


## Usage

The containers are built automatically and are available on the GitHub Container Registry.

1. Pull the Docker image:

```bash
docker pull ghcr.io/metorial/mcp-container--too-far--aave-mcp--bin
```

2. Run the container:

```bash
docker run -i --rm \ 
-e ETHEREUM_RPC_URL=ethereum-rpc-url -e ARBITRUM_RPC_URL=arbitrum-rpc-url -e OPTIMISM_RPC_URL=optimism-rpc-url -e POLYGON_RPC_URL=polygon-rpc-url -e AVALANCHE_RPC_URL=avalanche-rpc-url -e BASE_RPC_URL=base-rpc-url \
ghcr.io/metorial/mcp-container--too-far--aave-mcp--bin  
```

- `--rm` removes the container after it exits, so you don't have to clean up manually.
- `-i` allows you to interact with the container in your terminal.



### Configuration

The container supports the following configuration options:




#### Environment Variables

- `ETHEREUM_RPC_URL`
- `ARBITRUM_RPC_URL`
- `OPTIMISM_RPC_URL`
- `POLYGON_RPC_URL`
- `AVALANCHE_RPC_URL`
- `BASE_RPC_URL`




## Usage with Claude

```json
{
  "mcpServers": {
    "bin": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "ghcr.io/metorial/mcp-container--too-far--aave-mcp--bin"
      ],
      "env": {
        "ETHEREUM_RPC_URL": "ethereum-rpc-url",
        "ARBITRUM_RPC_URL": "arbitrum-rpc-url",
        "OPTIMISM_RPC_URL": "optimism-rpc-url",
        "POLYGON_RPC_URL": "polygon-rpc-url",
        "AVALANCHE_RPC_URL": "avalanche-rpc-url",
        "BASE_RPC_URL": "base-rpc-url"
      }
    }
  }
}
```

# License

Please refer to the license provided in [the project repository](https://github.com/Too-Far/aave-mcp) for more information.

## Contributing

Contributions are welcome! If you notice any issues or have suggestions for improvements, please open an issue or submit a pull request.

<div align="center">
  <sub>Containerized with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
  