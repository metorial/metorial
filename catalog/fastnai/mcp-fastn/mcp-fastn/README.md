
# Fastn Server

A containerized version of "Fastn Server"

> Repository: [fastnai/mcp-fastn](https://github.com/fastnai/mcp-fastn)

## Description

The Fastn server is a powerful, scalable platform that enables dynamic tool registration and execution based on API definitions. It seamlessly integrates with services like Claude.ai and Cursor.ai, providing a unified server solution for a wide range of tasks. With its robust architecture, Fastn delivers exceptional performance and flexibility for real-time, API-driven operations.


## Usage

The containers are built automatically and are available on the GitHub Container Registry.

1. Pull the Docker image:

```bash
docker pull ghcr.io/metorial/mcp-container--fastnai--mcp-fastn--mcp-fastn
```

2. Run the container:

```bash
docker run -i --rm \ 
ghcr.io/metorial/mcp-container--fastnai--mcp-fastn--mcp-fastn  "fastn-mcp --api_key api-key --space_id workspace-id"
```

- `--rm` removes the container after it exits, so you don't have to clean up manually.
- `-i` allows you to interact with the container in your terminal.



### Configuration

The container supports the following configuration options:


#### Arguments

- `--api_key`
- `--space_id`






## Usage with Claude

```json
{
  "mcpServers": {
    "mcp-fastn": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "ghcr.io/metorial/mcp-container--fastnai--mcp-fastn--mcp-fastn",
        "fastn-mcp --api_key api-key --space_id workspace-id"
      ],
      "env": {}
    }
  }
}
```

# License

Please refer to the license provided in [the project repository](https://github.com/fastnai/mcp-fastn) for more information.

## Contributing

Contributions are welcome! If you notice any issues or have suggestions for improvements, please open an issue or submit a pull request.

<div align="center">
  <sub>Containerized with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
  