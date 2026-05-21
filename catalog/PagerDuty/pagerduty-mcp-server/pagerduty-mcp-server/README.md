
# PagerDuty's official MCP Server

A containerized version of "PagerDuty's official MCP Server"

> Repository: [PagerDuty/pagerduty-mcp-server](https://github.com/PagerDuty/pagerduty-mcp-server)

## Description

PagerDuty's official local MCP server for managing incidents, services, schedules, and event orchestrations directly from your MCP-enabled client.


## Usage

The containers are built automatically and are available on the GitHub Container Registry.

1. Pull the Docker image:

```bash
docker pull ghcr.io/metorial/mcp-container--pagerduty--pagerduty-mcp-server--pagerduty-mcp-server
```

2. Run the container:

```bash
docker run -i --rm \ 
-e PAGERDUTY_USER_API_KEY=pagerduty-user-api-key -e PAGERDUTY_API_HOST=pagerduty-api-host \
ghcr.io/metorial/mcp-container--pagerduty--pagerduty-mcp-server--pagerduty-mcp-server  "uv run pagerduty-mcp"
```

- `--rm` removes the container after it exits, so you don't have to clean up manually.
- `-i` allows you to interact with the container in your terminal.



### Configuration

The container supports the following configuration options:




#### Environment Variables

- `PAGERDUTY_USER_API_KEY`
- `PAGERDUTY_API_HOST`




## Usage with Claude

```json
{
  "mcpServers": {
    "pagerduty-mcp-server": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "ghcr.io/metorial/mcp-container--pagerduty--pagerduty-mcp-server--pagerduty-mcp-server",
        "uv run pagerduty-mcp"
      ],
      "env": {
        "PAGERDUTY_USER_API_KEY": "pagerduty-user-api-key",
        "PAGERDUTY_API_HOST": "pagerduty-api-host"
      }
    }
  }
}
```

# License

Please refer to the license provided in [the project repository](https://github.com/PagerDuty/pagerduty-mcp-server) for more information.

## Contributing

Contributions are welcome! If you notice any issues or have suggestions for improvements, please open an issue or submit a pull request.

<div align="center">
  <sub>Containerized with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
  