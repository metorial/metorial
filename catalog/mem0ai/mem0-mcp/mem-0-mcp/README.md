
# MCP Server with Mem0 for Managing Coding Preferences

A containerized version of "MCP Server with Mem0 for Managing Coding Preferences"

> Repository: [mem0ai/mem0-mcp](https://github.com/mem0ai/mem0-mcp)

## Description

This demonstrates a structured approach for using an [MCP](https://modelcontextprotocol.io/introduction) server with [mem0](https://mem0.ai) to manage coding preferences efficiently. The server can be used with Cursor and provides essential tools for storing, retrieving, and searching coding preferences.


## Usage

The containers are built automatically and are available on the GitHub Container Registry.

1. Pull the Docker image:

```bash
docker pull ghcr.io/metorial/mcp-container--mem0ai--mem0-mcp--mem-0-mcp
```

2. Run the container:

```bash
docker run -i --rm \ 
-e MEM0_API_KEY=mem-0-api-key \
ghcr.io/metorial/mcp-container--mem0ai--mem0-mcp--mem-0-mcp  "mem0-mcp-server"
```

- `--rm` removes the container after it exits, so you don't have to clean up manually.
- `-i` allows you to interact with the container in your terminal.



### Configuration

The container supports the following configuration options:




#### Environment Variables

- `MEM0_API_KEY`




## Usage with Claude

```json
{
  "mcpServers": {
    "mem-0-mcp": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "ghcr.io/metorial/mcp-container--mem0ai--mem0-mcp--mem-0-mcp",
        "mem0-mcp-server"
      ],
      "env": {
        "MEM0_API_KEY": "mem-0-api-key"
      }
    }
  }
}
```

# License

Please refer to the license provided in [the project repository](https://github.com/mem0ai/mem0-mcp) for more information.

## Contributing

Contributions are welcome! If you notice any issues or have suggestions for improvements, please open an issue or submit a pull request.

<div align="center">
  <sub>Containerized with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
  