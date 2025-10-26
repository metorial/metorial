# Olostep MCP Server

A containerized version of "Olostep MCP Server"

> Repository: [olostep/olostep-mcp-server](https://github.com/olostep/olostep-mcp-server)

## Description

Professional service to search the web, extract data from websites as markdown and discover URLs for site structure analysis.

## Usage

The containers are built automatically and are available on the GitHub Container Registry.

1. Pull the Docker image:

```bash
docker pull ghcr.io/metorial/mcp-container--olostep--olostep-mcp-server--olostep-mcp-server
```

2. Run the container:

```bash
docker run -i --rm \
  -e OLOSTEP_API_KEY="your-api-key" \
  ghcr.io/metorial/mcp-container--olostep--olostep-mcp-server--olostep-mcp-server
```

- `--rm` removes the container after it exits, so you don't have to clean up manually.
- `-i` allows you to interact with the container in your terminal.
- `-e OLOSTEP_API_KEY="your-api-key"` sets the Olostep API key environment variable inside the container.

### Configuration

The container supports the following configuration options:

#### Environment Variables

- `OLOSTEP_API_KEY`: Your Olostep API key (required)

## Usage with Claude

```json
{
  "mcpServers": {
    "olostep-mcp-server": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "OLOSTEP_API_KEY=YOUR_API_KEY_HERE",
        "ghcr.io/metorial/mcp-container--olostep--olostep-mcp-server--olostep-mcp-server"
      ],
      "env": {}
    }
  }
}
```

# License

Please refer to the license provided in [the project repository](https://github.com/olostep/olostep-mcp-server) for more information.

## Contributing

Contributions are welcome! If you notice any issues or have suggestions for improvements, please open an issue or submit a pull request.

<div align="center">
  <sub>Containerized with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
