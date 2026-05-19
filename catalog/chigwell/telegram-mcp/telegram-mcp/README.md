
# Telegram MCP Server

A containerized version of "Telegram MCP Server"

> Repository: [chigwell/telegram-mcp](https://github.com/chigwell/telegram-mcp)

## Description

A Telegram MCP (Model Context Protocol) server built using Python, Telethon, and MCP Python SDK. This MCP server provides simple tools for interacting with Telegram chats directly through MCP-compatible hosts, such as Claude for Desktop.


## Usage

The containers are built automatically and are available on the GitHub Container Registry.

1. Pull the Docker image:

```bash
docker pull ghcr.io/metorial/mcp-container--chigwell--telegram-mcp--telegram-mcp
```

2. Run the container:

```bash
docker run -i --rm \ 
-e TELEGRAM_API_ID=telegram-api-id -e TELEGRAM_API_HASH=telegram-api-hash -e TELEGRAM_SESSION_NAME=telegram-session-name \
ghcr.io/metorial/mcp-container--chigwell--telegram-mcp--telegram-mcp  "telegram-mcp"
```

- `--rm` removes the container after it exits, so you don't have to clean up manually.
- `-i` allows you to interact with the container in your terminal.



### Configuration

The container supports the following configuration options:




#### Environment Variables

- `TELEGRAM_API_ID`
- `TELEGRAM_API_HASH`
- `TELEGRAM_SESSION_NAME`




## Usage with Claude

```json
{
  "mcpServers": {
    "telegram-mcp": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "ghcr.io/metorial/mcp-container--chigwell--telegram-mcp--telegram-mcp",
        "telegram-mcp"
      ],
      "env": {
        "TELEGRAM_API_ID": "telegram-api-id",
        "TELEGRAM_API_HASH": "telegram-api-hash",
        "TELEGRAM_SESSION_NAME": "telegram-session-name"
      }
    }
  }
}
```

# License

Please refer to the license provided in [the project repository](https://github.com/chigwell/telegram-mcp) for more information.

## Contributing

Contributions are welcome! If you notice any issues or have suggestions for improvements, please open an issue or submit a pull request.

<div align="center">
  <sub>Containerized with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
  