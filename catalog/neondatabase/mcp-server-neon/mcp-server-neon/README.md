
# Neon MCP Server

A containerized version of "Neon MCP Server"

> Repository: [neondatabase/mcp-server-neon](https://github.com/neondatabase/mcp-server-neon)

## Description

**Neon MCP Server** is an open-source tool that lets you interact with your Neon Postgres databases in **natural language**.


## Usage

The containers are built automatically and are available on the GitHub Container Registry.

1. Pull the Docker image:

```bash
docker pull ghcr.io/metorial/mcp-container--neondatabase--mcp-server-neon--mcp-server-neon
```

2. Run the container:

```bash
docker run -i --rm \ 
ghcr.io/metorial/mcp-container--neondatabase--mcp-server-neon--mcp-server-neon {{NEON_API_KEY}} "{{NEON_API_KEY}}"
```

- `--rm` removes the container after it exits, so you don't have to clean up manually.
- `-i` allows you to interact with the container in your terminal.



### Configuration

The container supports the following configuration options:


#### Arguments

- `{{NEON_API_KEY}}`






## Usage with Claude

```json
{
  "mcpServers": {
    "mcp-server-neon": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "ghcr.io/metorial/mcp-container--neondatabase--mcp-server-neon--mcp-server-neon",
        "{{NEON_API_KEY}}"
      ],
      "env": {}
    }
  }
}
```

# License

Please refer to the license provided in [the project repository](https://github.com/neondatabase/mcp-server-neon) for more information.

## Contributing

Contributions are welcome! If you notice any issues or have suggestions for improvements, please open an issue or submit a pull request.

<div align="center">
  <sub>Containerized with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
  