
# Apify MCP Server

A containerized version of "Apify MCP Server"

> Repository: [apify/actors-mcp-server](https://github.com/apify/actors-mcp-server)

## Description

Implementation of an MCP server for all [Apify Actors](https://apify.com/store).


## Usage

The containers are built automatically and are available on the GitHub Container Registry.

1. Pull the Docker image:

```bash
docker pull ghcr.io/metorial/mcp-container--apify--actors-mcp-server--actors-mcp-server
```

2. Run the container:

```bash
docker run -i --rm \ 
-e APIFY_TOKEN=apify-token \
ghcr.io/metorial/mcp-container--apify--actors-mcp-server--actors-mcp-server  "pnpm run start"
```

- `--rm` removes the container after it exits, so you don't have to clean up manually.
- `-i` allows you to interact with the container in your terminal.



### Configuration

The container supports the following configuration options:




#### Environment Variables

- `APIFY_TOKEN`




## Usage with Claude

```json
{
  "mcpServers": {
    "actors-mcp-server": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "ghcr.io/metorial/mcp-container--apify--actors-mcp-server--actors-mcp-server",
        "pnpm run start"
      ],
      "env": {
        "APIFY_TOKEN": "apify-token"
      }
    }
  }
}
```

# License

Please refer to the license provided in [the project repository](https://github.com/apify/actors-mcp-server) for more information.

## Contributing

Contributions are welcome! If you notice any issues or have suggestions for improvements, please open an issue or submit a pull request.

<div align="center">
  <sub>Containerized with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
  