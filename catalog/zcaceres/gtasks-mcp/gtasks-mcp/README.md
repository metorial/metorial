
# Google Tasks MCP Server

A containerized version of "Google Tasks MCP Server"

> Repository: [zcaceres/gtasks-mcp](https://github.com/zcaceres/gtasks-mcp)

## Description

This MCP server integrates with Google Tasks to allow listing, reading, searching, creating, updating, and deleting tasks.


## Usage

The containers are built automatically and are available on the GitHub Container Registry.

1. Pull the Docker image:

```bash
docker pull ghcr.io/metorial/mcp-container--zcaceres--gtasks-mcp--gtasks-mcp
```

2. Run the container:

```bash
docker run -i --rm \ 
-e GCP_OAUTH_KEYS=gcp-oauth-keys \
ghcr.io/metorial/mcp-container--zcaceres--gtasks-mcp--gtasks-mcp  "bun run start"
```

- `--rm` removes the container after it exits, so you don't have to clean up manually.
- `-i` allows you to interact with the container in your terminal.



### Configuration

The container supports the following configuration options:




#### Environment Variables

- `GCP_OAUTH_KEYS`




## Usage with Claude

```json
{
  "mcpServers": {
    "gtasks-mcp": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "ghcr.io/metorial/mcp-container--zcaceres--gtasks-mcp--gtasks-mcp",
        "bun run start"
      ],
      "env": {
        "GCP_OAUTH_KEYS": "gcp-oauth-keys"
      }
    }
  }
}
```

# License

Please refer to the license provided in [the project repository](https://github.com/zcaceres/gtasks-mcp) for more information.

## Contributing

Contributions are welcome! If you notice any issues or have suggestions for improvements, please open an issue or submit a pull request.

<div align="center">
  <sub>Containerized with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
  