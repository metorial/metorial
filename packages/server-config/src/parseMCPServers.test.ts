import { describe, expect, test } from 'bun:test';
import { parseMCPServers } from './parseMCPServers';

let parse = (server: unknown) => parseMCPServers(JSON.stringify(server));

describe('parseMCPServers', () => {
  test('does not treat uvx installer option values as MCP server arguments', () => {
    let result = parse({
      mcpServers: {
        linear: {
          command: 'uvx',
          args: [
            '--from',
            'git+https://github.com/example/linear-mcp',
            'linear-mcp',
            '--workspace',
            'WORKSPACE_ID'
          ],
          env: {
            LINEAR_API_KEY: '...'
          }
        }
      }
    });

    expect(result?.cliArguments).toEqual({
      template: '--workspace WORKSPACE_ID',
      keys: [{ key: 'WORKSPACE_ID' }]
    });
    expect(result?.environmentVariables).toEqual([{ key: 'LINEAR_API_KEY' }]);
  });

  test('does not treat npx package option values as MCP server arguments', () => {
    let result = parse({
      mcpServers: {
        github: {
          command: 'npx',
          args: [
            '--package',
            '@modelcontextprotocol/server-github',
            'mcp-server-github',
            '--repo',
            'OWNER/REPO'
          ],
          env: {
            GITHUB_PERSONAL_ACCESS_TOKEN: '...'
          }
        }
      }
    });

    expect(result?.cliArguments).toEqual({
      template: '--repo OWNER/REPO',
      keys: []
    });
  });

  test('parses arguments after uv run options and the server entrypoint', () => {
    let result = parse({
      mcpServers: {
        docs: {
          command: 'uv',
          args: [
            'run',
            '--with',
            'mcp-server-docs',
            'mcp-server-docs',
            '--api-key',
            'DOCS_API_KEY'
          ]
        }
      }
    });

    expect(result?.cliArguments).toEqual({
      template: '--api-key DOCS_API_KEY',
      keys: [{ key: 'DOCS_API_KEY' }]
    });
  });
});
