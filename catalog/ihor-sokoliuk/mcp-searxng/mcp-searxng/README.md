
# SearXNG MCP Server

A containerized version of "SearXNG MCP Server"

> Repository: [ihor-sokoliuk/mcp-searxng](https://github.com/ihor-sokoliuk/mcp-searxng)

## Description

An [MCP server](https://modelcontextprotocol.io/introduction) implementation that integrates the SearxNG API, providing web search capabilities.


## Usage

The containers are built automatically and are available on the GitHub Container Registry.

1. Pull the Docker image:

```bash
docker pull ghcr.io/metorial/mcp-container--ihor-sokoliuk--mcp-searxng--mcp-searxng
```

2. Run the container:

```bash
docker run -i --rm \ 
-e SEARXNG_URL=searxng-url \
ghcr.io/metorial/mcp-container--ihor-sokoliuk--mcp-searxng--mcp-searxng  "node dist/cli.js"
```

- `--rm` removes the container after it exits, so you don't have to clean up manually.
- `-i` allows you to interact with the container in your terminal.



### Configuration

The container supports the following configuration options:




#### Environment Variables

- `SEARXNG_URL`




## Usage with Claude

```json
{
  "mcpServers": {
    "mcp-searxng": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "ghcr.io/metorial/mcp-container--ihor-sokoliuk--mcp-searxng--mcp-searxng",
        "node dist/cli.js"
      ],
      "env": {
        "SEARXNG_URL": "searxng-url"
      }
    }
  }
}
```

# License

Please refer to the license provided in [the project repository](https://github.com/ihor-sokoliuk/mcp-searxng) for more information.

## Contributing

Contributions are welcome! If you notice any issues or have suggestions for improvements, please open an issue or submit a pull request.

<div align="center">
  <sub>Containerized with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
  