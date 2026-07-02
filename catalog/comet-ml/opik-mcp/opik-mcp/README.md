
# Opik MCP Server

A containerized version of "Opik MCP Server"

> Repository: [comet-ml/opik-mcp](https://github.com/comet-ml/opik-mcp)

## Description

Opik MCP Server is an open-source implementation of the Model Context Protocol for the Opik platform. It provides a unified interface for interacting with Opik's capabilities, supporting multiple transport mechanisms for flexible integration into various environments.


## Usage

The containers are built automatically and are available on the GitHub Container Registry.

1. Pull the Docker image:

```bash
docker pull ghcr.io/metorial/mcp-container--comet-ml--opik-mcp--opik-mcp
```

2. Run the container:

```bash
docker run -i --rm \ 
-e OPIK_API_BASE_URL=opik-api-base-url -e OPIK_API_KEY=opik-api-key -e OPIK_WORKSPACE_NAME=opik-workspace-name \
ghcr.io/metorial/mcp-container--comet-ml--opik-mcp--opik-mcp  "opik-mcp"
```

- `--rm` removes the container after it exits, so you don't have to clean up manually.
- `-i` allows you to interact with the container in your terminal.



### Configuration

The container supports the following configuration options:




#### Environment Variables

- `OPIK_API_BASE_URL`
- `OPIK_API_KEY`
- `OPIK_WORKSPACE_NAME`




## Usage with Claude

```json
{
  "mcpServers": {
    "opik-mcp": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "ghcr.io/metorial/mcp-container--comet-ml--opik-mcp--opik-mcp",
        "opik-mcp"
      ],
      "env": {
        "OPIK_API_BASE_URL": "opik-api-base-url",
        "OPIK_API_KEY": "opik-api-key",
        "OPIK_WORKSPACE_NAME": "opik-workspace-name"
      }
    }
  }
}
```

# License

Please refer to the license provided in [the project repository](https://github.com/comet-ml/opik-mcp) for more information.

## Contributing

Contributions are welcome! If you notice any issues or have suggestions for improvements, please open an issue or submit a pull request.

<div align="center">
  <sub>Containerized with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
  