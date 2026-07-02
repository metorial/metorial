
# investor-agent: A Financial Analysis MCP Server

A containerized version of "investor-agent: A Financial Analysis MCP Server"

> Repository: [ferdousbhai/investor-agent](https://github.com/ferdousbhai/investor-agent)

## Description

A Model Context Protocol server for building an investor agent


## Usage

The containers are built automatically and are available on the GitHub Container Registry.

1. Pull the Docker image:

```bash
docker pull ghcr.io/metorial/mcp-container--ferdousbhai--investor-agent--investor-agent
```

2. Run the container:

```bash
docker run -i --rm \ 
ghcr.io/metorial/mcp-container--ferdousbhai--investor-agent--investor-agent  "node dist/index.js"
```

- `--rm` removes the container after it exits, so you don't have to clean up manually.
- `-i` allows you to interact with the container in your terminal.




## Usage with Claude

```json
{
  "mcpServers": {
    "investor-agent": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "ghcr.io/metorial/mcp-container--ferdousbhai--investor-agent--investor-agent",
        "node dist/index.js"
      ],
      "env": {}
    }
  }
}
```

# License

Please refer to the license provided in [the project repository](https://github.com/ferdousbhai/investor-agent) for more information.

## Contributing

Contributions are welcome! If you notice any issues or have suggestions for improvements, please open an issue or submit a pull request.

<div align="center">
  <sub>Containerized with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
  