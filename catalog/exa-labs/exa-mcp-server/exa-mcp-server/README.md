
# Exa MCP Server

A containerized version of "Exa MCP Server"

> Repository: [exa-labs/exa-mcp-server](https://github.com/exa-labs/exa-mcp-server)

## Description

A Model Context Protocol (MCP) server lets AI assistants like Claude use the Exa AI Search API for web searches. This setup allows AI models to get real-time web information in a safe and controlled way.


## Usage

The containers are built automatically and are available on the GitHub Container Registry.

1. Pull the Docker image:

```bash
docker pull ghcr.io/metorial/mcp-container--exa-labs--exa-mcp-server--exa-mcp-server
```

2. Run the container:

```bash
docker run -i --rm \ 
-e EXA_API_KEY=exa-api-key \
ghcr.io/metorial/mcp-container--exa-labs--exa-mcp-server--exa-mcp-server  "npm run start"
```

- `--rm` removes the container after it exits, so you don't have to clean up manually.
- `-i` allows you to interact with the container in your terminal.



### Configuration

The container supports the following configuration options:




#### Environment Variables

- `EXA_API_KEY`




## Usage with Claude

```json
{
  "mcpServers": {
    "exa-mcp-server": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "ghcr.io/metorial/mcp-container--exa-labs--exa-mcp-server--exa-mcp-server",
        "npm run start"
      ],
      "env": {
        "EXA_API_KEY": "exa-api-key"
      }
    }
  }
}
```

# License

Please refer to the license provided in [the project repository](https://github.com/exa-labs/exa-mcp-server) for more information.

## Contributing

Contributions are welcome! If you notice any issues or have suggestions for improvements, please open an issue or submit a pull request.

<div align="center">
  <sub>Containerized with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
  