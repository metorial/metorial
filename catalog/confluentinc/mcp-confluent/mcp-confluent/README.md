
# mcp-confluent

A containerized version of "mcp-confluent"

> Repository: [confluentinc/mcp-confluent](https://github.com/confluentinc/mcp-confluent)

## Description

An MCP server implementation that enables AI assistants to interact with Confluent Kafka and Confluent Cloud REST APIs. This server allows AI tools like Claude Desktop and Goose CLI to manage Kafka topics, connectors, and Flink SQL statements through natural language interactions.


## Usage

The containers are built automatically and are available on the GitHub Container Registry.

1. Pull the Docker image:

```bash
docker pull ghcr.io/metorial/mcp-container--confluentinc--mcp-confluent--mcp-confluent
```

2. Run the container:

```bash
docker run -i --rm \ 
ghcr.io/metorial/mcp-container--confluentinc--mcp-confluent--mcp-confluent  "pnpm run start"
```

- `--rm` removes the container after it exits, so you don't have to clean up manually.
- `-i` allows you to interact with the container in your terminal.




## Usage with Claude

```json
{
  "mcpServers": {
    "mcp-confluent": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "ghcr.io/metorial/mcp-container--confluentinc--mcp-confluent--mcp-confluent",
        "pnpm run start"
      ],
      "env": {}
    }
  }
}
```

# License

Please refer to the license provided in [the project repository](https://github.com/confluentinc/mcp-confluent) for more information.

## Contributing

Contributions are welcome! If you notice any issues or have suggestions for improvements, please open an issue or submit a pull request.

<div align="center">
  <sub>Containerized with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
  