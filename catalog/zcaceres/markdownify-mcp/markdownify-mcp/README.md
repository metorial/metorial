
# Markdownify MCP Server

A containerized version of "Markdownify MCP Server"

> Repository: [zcaceres/markdownify-mcp](https://github.com/zcaceres/markdownify-mcp)

## Description

Markdownify is a Model Context Protocol (MCP) server that converts various file types and web content to Markdown format. It provides a set of tools to transform PDFs, images, audio files, web pages, and more into easily readable and shareable Markdown text.


## Usage

The containers are built automatically and are available on the GitHub Container Registry.

1. Pull the Docker image:

```bash
docker pull ghcr.io/metorial/mcp-container--zcaceres--markdownify-mcp--markdownify-mcp
```

2. Run the container:

```bash
docker run -i --rm \ 
ghcr.io/metorial/mcp-container--zcaceres--markdownify-mcp--markdownify-mcp  "bun run start"
```

- `--rm` removes the container after it exits, so you don't have to clean up manually.
- `-i` allows you to interact with the container in your terminal.




## Usage with Claude

```json
{
  "mcpServers": {
    "markdownify-mcp": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "ghcr.io/metorial/mcp-container--zcaceres--markdownify-mcp--markdownify-mcp",
        "bun run start"
      ],
      "env": {}
    }
  }
}
```

# License

Please refer to the license provided in [the project repository](https://github.com/zcaceres/markdownify-mcp) for more information.

## Contributing

Contributions are welcome! If you notice any issues or have suggestions for improvements, please open an issue or submit a pull request.

<div align="center">
  <sub>Containerized with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
  