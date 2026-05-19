
# Tavily MCP Server

A containerized version of "Tavily MCP Server"

> Repository: [tavily-ai/tavily-mcp](https://github.com/tavily-ai/tavily-mcp)

## Description

An MCP server for Tavily search.


## Usage

The containers are built automatically and are available on the GitHub Container Registry.

1. Pull the Docker image:

```bash
docker pull ghcr.io/metorial/mcp-container--tavily-ai--tavily-mcp--tavily-mcp
```

2. Run the container:

```bash
docker run -i --rm \ 
-e TAVILY_API_KEY=tavily-api-key \
ghcr.io/metorial/mcp-container--tavily-ai--tavily-mcp--tavily-mcp  "node build/index.js"
```

- `--rm` removes the container after it exits, so you don't have to clean up manually.
- `-i` allows you to interact with the container in your terminal.



### Configuration

The container supports the following configuration options:




#### Environment Variables

- `TAVILY_API_KEY`




## Usage with Claude

```json
{
  "mcpServers": {
    "tavily-mcp": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "ghcr.io/metorial/mcp-container--tavily-ai--tavily-mcp--tavily-mcp",
        "node build/index.js"
      ],
      "env": {
        "TAVILY_API_KEY": "tavily-api-key"
      }
    }
  }
}
```

# License

Please refer to the license provided in [the project repository](https://github.com/tavily-ai/tavily-mcp) for more information.

## Contributing

Contributions are welcome! If you notice any issues or have suggestions for improvements, please open an issue or submit a pull request.

<div align="center">
  <sub>Containerized with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
  