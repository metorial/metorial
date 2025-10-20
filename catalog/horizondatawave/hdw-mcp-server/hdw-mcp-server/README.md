
# HDW MCP Server

A containerized version of "HDW MCP Server"

> Repository: [horizondatawave/hdw-mcp-server](https://github.com/horizondatawave/hdw-mcp-server)

## Description

A Model Context Protocol (MCP) server that provides comprehensive access to LinkedIn data and functionalities using the HorizonDataWave API, enabling not only data retrieval but also robust management of user accounts.


## Usage

The containers are built automatically and are available on the GitHub Container Registry.

1. Pull the Docker image:

```bash
docker pull ghcr.io/metorial/mcp-container--horizondatawave--hdw-mcp-server--hdw-mcp-server
```

2. Run the container:

```bash
docker run -i --rm \ 
-e HDW_ACCESS_TOKEN=hdw-access-token -e HDW_ACCOUNT_ID=hdw-account-id \
ghcr.io/metorial/mcp-container--horizondatawave--hdw-mcp-server--hdw-mcp-server  "node build/server.js"
```

- `--rm` removes the container after it exits, so you don't have to clean up manually.
- `-i` allows you to interact with the container in your terminal.



### Configuration

The container supports the following configuration options:




#### Environment Variables

- `HDW_ACCESS_TOKEN`
- `HDW_ACCOUNT_ID`




## Usage with Claude

```json
{
  "mcpServers": {
    "hdw-mcp-server": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "ghcr.io/metorial/mcp-container--horizondatawave--hdw-mcp-server--hdw-mcp-server",
        "node build/server.js"
      ],
      "env": {
        "HDW_ACCESS_TOKEN": "hdw-access-token",
        "HDW_ACCOUNT_ID": "hdw-account-id"
      }
    }
  }
}
```

# License

Please refer to the license provided in [the project repository](https://github.com/horizondatawave/hdw-mcp-server) for more information.

## Contributing

Contributions are welcome! If you notice any issues or have suggestions for improvements, please open an issue or submit a pull request.

<div align="center">
  <sub>Containerized with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
  