
# Personal intelligence framework

A containerized version of "Personal intelligence framework"

> Repository: [hungryrobot1/MCP-PIF](https://github.com/hungryrobot1/MCP-PIF)

## Description

A MCP implementation of the personal intelligence framework (PIF)


## Usage

The containers are built automatically and are available on the GitHub Container Registry.

1. Pull the Docker image:

```bash
docker pull ghcr.io/metorial/mcp-container--hungryrobot1--mcp-pif--mcp-pif
```

2. Run the container:

```bash
docker run -i --rm \ 
ghcr.io/metorial/mcp-container--hungryrobot1--mcp-pif--mcp-pif  
```

- `--rm` removes the container after it exits, so you don't have to clean up manually.
- `-i` allows you to interact with the container in your terminal.




## Usage with Claude

```json
{
  "mcpServers": {
    "mcp-pif": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "ghcr.io/metorial/mcp-container--hungryrobot1--mcp-pif--mcp-pif"
      ],
      "env": {}
    }
  }
}
```

# License

Please refer to the license provided in [the project repository](https://github.com/hungryrobot1/MCP-PIF) for more information.

## Contributing

Contributions are welcome! If you notice any issues or have suggestions for improvements, please open an issue or submit a pull request.

<div align="center">
  <sub>Containerized with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
  