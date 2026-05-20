
# AgentQL MCP Server

A containerized version of "AgentQL MCP Server"

> Repository: [tinyfish-io/agentql-mcp](https://github.com/tinyfish-io/agentql-mcp)

## Description

This is a Model Context Protocol (MCP) server that integrates [AgentQL](https://agentql.com)'s data extraction capabilities.


## Usage

The containers are built automatically and are available on the GitHub Container Registry.

1. Pull the Docker image:

```bash
docker pull ghcr.io/metorial/mcp-container--tinyfish-io--agentql-mcp--agentql-mcp
```

2. Run the container:

```bash
docker run -i --rm \ 
-e AGENTQL_API_KEY=agentql-api-key \
ghcr.io/metorial/mcp-container--tinyfish-io--agentql-mcp--agentql-mcp  "node dist/index.js"
```

- `--rm` removes the container after it exits, so you don't have to clean up manually.
- `-i` allows you to interact with the container in your terminal.



### Configuration

The container supports the following configuration options:




#### Environment Variables

- `AGENTQL_API_KEY`




## Usage with Claude

```json
{
  "mcpServers": {
    "agentql-mcp": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "ghcr.io/metorial/mcp-container--tinyfish-io--agentql-mcp--agentql-mcp",
        "node dist/index.js"
      ],
      "env": {
        "AGENTQL_API_KEY": "agentql-api-key"
      }
    }
  }
}
```

# License

Please refer to the license provided in [the project repository](https://github.com/tinyfish-io/agentql-mcp) for more information.

## Contributing

Contributions are welcome! If you notice any issues or have suggestions for improvements, please open an issue or submit a pull request.

<div align="center">
  <sub>Containerized with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
  