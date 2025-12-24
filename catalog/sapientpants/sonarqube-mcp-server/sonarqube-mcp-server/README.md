
# SonarQube MCP Server

A containerized version of "SonarQube MCP Server"

> Repository: [sapientpants/sonarqube-mcp-server](https://github.com/sapientpants/sonarqube-mcp-server)

## Description

A Model Context Protocol (MCP) server that integrates with SonarQube to provide AI assistants with access to code quality metrics, issues, and analysis results.


## Usage

The containers are built automatically and are available on the GitHub Container Registry.

1. Pull the Docker image:

```bash
docker pull ghcr.io/metorial/mcp-container--sapientpants--sonarqube-mcp-server--sonarqube-mcp-server
```

2. Run the container:

```bash
docker run -i --rm \ 
-e SONARQUBE_URL=sonarqube-url -e SONARQUBE_TOKEN=sonarqube-token -e SONARQUBE_ORGANIZATION=sonarqube-organization \
ghcr.io/metorial/mcp-container--sapientpants--sonarqube-mcp-server--sonarqube-mcp-server  
```

- `--rm` removes the container after it exits, so you don't have to clean up manually.
- `-i` allows you to interact with the container in your terminal.



### Configuration

The container supports the following configuration options:




#### Environment Variables

- `SONARQUBE_URL`
- `SONARQUBE_TOKEN`
- `SONARQUBE_ORGANIZATION`




## Usage with Claude

```json
{
  "mcpServers": {
    "sonarqube-mcp-server": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "ghcr.io/metorial/mcp-container--sapientpants--sonarqube-mcp-server--sonarqube-mcp-server"
      ],
      "env": {
        "SONARQUBE_URL": "sonarqube-url",
        "SONARQUBE_TOKEN": "sonarqube-token",
        "SONARQUBE_ORGANIZATION": "sonarqube-organization"
      }
    }
  }
}
```

# License

Please refer to the license provided in [the project repository](https://github.com/sapientpants/sonarqube-mcp-server) for more information.

## Contributing

Contributions are welcome! If you notice any issues or have suggestions for improvements, please open an issue or submit a pull request.

<div align="center">
  <sub>Containerized with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
  