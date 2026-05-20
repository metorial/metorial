
# MCP XMind Server

A containerized version of "MCP XMind Server"

> Repository: [apeyroux/mcp-xmind](https://github.com/apeyroux/mcp-xmind)

## Description

A Model Context Protocol server for analyzing and querying XMind mind maps. This tool provides powerful capabilities for searching, extracting, and analyzing content from XMind files.


## Usage

The containers are built automatically and are available on the GitHub Container Registry.

1. Pull the Docker image:

```bash
docker pull ghcr.io/metorial/mcp-container--apeyroux--mcp-xmind--mcp-xmind
```

2. Run the container:

```bash
docker run -i --rm \ 
ghcr.io/metorial/mcp-container--apeyroux--mcp-xmind--mcp-xmind  
```

- `--rm` removes the container after it exits, so you don't have to clean up manually.
- `-i` allows you to interact with the container in your terminal.




## Usage with Claude

```json
{
  "mcpServers": {
    "mcp-xmind": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "ghcr.io/metorial/mcp-container--apeyroux--mcp-xmind--mcp-xmind"
      ],
      "env": {}
    }
  }
}
```

# License

Please refer to the license provided in [the project repository](https://github.com/apeyroux/mcp-xmind) for more information.

## Contributing

Contributions are welcome! If you notice any issues or have suggestions for improvements, please open an issue or submit a pull request.

<div align="center">
  <sub>Containerized with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
  