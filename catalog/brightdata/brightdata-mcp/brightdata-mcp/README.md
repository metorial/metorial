
# Bright Data MCP

A containerized version of "Bright Data MCP"

> Repository: [brightdata/brightdata-mcp](https://github.com/brightdata/brightdata-mcp)

## Description

One MCP for the Web. Easily search, crawl, navigate, and extract websites without getting blocked. Ideal for discovering and retrieving structured insights from any public source - effortlessly and ethically.


## Usage

The containers are built automatically and are available on the GitHub Container Registry.

1. Pull the Docker image:

```bash
docker pull ghcr.io/metorial/mcp-container--brightdata--brightdata-mcp--brightdata-mcp
```

2. Run the container:

```bash
docker run -i --rm \ 
-e API_TOKEN=api-token -e RATE_LIMIT=rate-limit -e WEB_UNLOCKER_ZONE=web-unlocker-zone -e BROWSER_ZONE=browser-zone \
ghcr.io/metorial/mcp-container--brightdata--brightdata-mcp--brightdata-mcp  "npm run start"
```

- `--rm` removes the container after it exits, so you don't have to clean up manually.
- `-i` allows you to interact with the container in your terminal.



### Configuration

The container supports the following configuration options:




#### Environment Variables

- `API_TOKEN`
- `RATE_LIMIT`
- `WEB_UNLOCKER_ZONE`
- `BROWSER_ZONE`




## Usage with Claude

```json
{
  "mcpServers": {
    "brightdata-mcp": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "ghcr.io/metorial/mcp-container--brightdata--brightdata-mcp--brightdata-mcp",
        "npm run start"
      ],
      "env": {
        "API_TOKEN": "api-token",
        "RATE_LIMIT": "rate-limit",
        "WEB_UNLOCKER_ZONE": "web-unlocker-zone",
        "BROWSER_ZONE": "browser-zone"
      }
    }
  }
}
```

# License

Please refer to the license provided in [the project repository](https://github.com/brightdata/brightdata-mcp) for more information.

## Contributing

Contributions are welcome! If you notice any issues or have suggestions for improvements, please open an issue or submit a pull request.

<div align="center">
  <sub>Containerized with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
  