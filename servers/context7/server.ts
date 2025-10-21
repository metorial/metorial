import { metorial, ResourceTemplate, z } from '@metorial/mcp-server-sdk';

/**
 * Context7 MCP Server
 * Provides access to Context7 API for searching libraries and fetching documentation
 */

interface Config {
  token: string;
}

interface SearchResult {
  id: string;
  title: string;
  description: string;
  totalTokens: number;
  totalSnippets: number;
  stars: number;
  trustScore: number;
  versions: string[];
}

interface SearchResponse {
  results: SearchResult[];
}

metorial.createServer<Config>(
  {
    name: 'context7',
    version: '1.0.0'
  },
  async (server, config) => {
    const API_BASE_URL = 'https://context7.com/api/v1';

    /**
     * Make authenticated request to Context7 API
     */
    async function makeContext7Request<T>(endpoint: string): Promise<T> {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${config.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Context7 API error (${response.status}): ${errorText}`);
      }

      return (await response.json()) as T;
    }

    /**
     * Make authenticated request to Context7 API for text responses
     */
    async function makeContext7TextRequest(endpoint: string): Promise<string> {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${config.token}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Context7 API error (${response.status}): ${errorText}`);
      }

      return await response.text();
    }

    /**
     * Build query parameters for documentation requests
     */
    function buildDocQueryParams(params: {
      format?: string;
      topic?: string;
      tokens?: number;
    }): string {
      const queryParams = new URLSearchParams();

      if (params.format) {
        queryParams.append('type', params.format);
      }
      if (params.topic) {
        queryParams.append('topic', params.topic);
      }
      if (params.tokens !== undefined) {
        queryParams.append('tokens', params.tokens.toString());
      }

      const queryString = queryParams.toString();
      return queryString ? `?${queryString}` : '';
    }

    /**
     * Format search results for display
     */
    function formatSearchResults(results: SearchResult[]): string {
      if (results.length === 0) {
        return 'No results found.';
      }

      return results
        .map((result, index) => {
          return [
            `${index + 1}. ${result.title}`,
            `   ID: ${result.id}`,
            `   Description: ${result.description}`,
            `   Stars: ${result.stars}`,
            `   Trust Score: ${result.trustScore}`,
            `   Total Tokens: ${result.totalTokens.toLocaleString()}`,
            `   Total Snippets: ${result.totalSnippets}`,
            result.versions.length > 0 ? `   Versions: ${result.versions.join(', ')}` : '',
            ''
          ]
            .filter(Boolean)
            .join('\n');
        })
        .join('\n');
    }

    // ============================================================================
    // TOOLS
    // ============================================================================

    /**
     * Tool: search_libraries
     * Search for libraries and documentation on Context7
     */
    server.registerTool(
      'search_libraries',
      {
        title: 'Search Libraries',
        description:
          'Search for libraries and documentation on Context7. Returns a list of matching libraries with metadata including stars, trust scores, and token counts.',
        inputSchema: {
          query: z
            .string()
            .describe(
              'Search term for finding libraries (e.g., "react hook form", "next.js ssr")'
            )
        }
      },
      async ({ query }) => {
        try {
          const encodedQuery = encodeURIComponent(query);
          const data = await makeContext7Request<SearchResponse>(
            `/search?query=${encodedQuery}`
          );

          const formattedResults = formatSearchResults(data.results);

          return {
            content: [
              {
                type: 'text',
                text: `Found ${data.results.length} result(s) for "${query}":\n\n${formattedResults}`
              }
            ]
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error occurred';
          return {
            content: [
              {
                type: 'text',
                text: `Error searching libraries: ${errorMessage}`
              }
            ],
            isError: true
          };
        }
      }
    );

    /**
     * Tool: get_documentation
     * Fetch documentation for a specific library/repository
     */
    server.registerTool(
      'get_documentation',
      {
        title: 'Get Documentation',
        description:
          'Fetch documentation for a specific library or repository from Context7. Supports filtering by topic and limiting token count.',
        inputSchema: {
          library_path: z
            .string()
            .describe(
              'The library path (e.g., "vercel/next.js", "react-hook-form/documentation")'
            ),
          format: z
            .enum(['txt', 'json'])
            .optional()
            .describe(
              'Response format - "txt" for plain text or "json" for structured data (default: "txt")'
            ),
          topic: z
            .string()
            .optional()
            .describe(
              'Filter documentation by specific topic (e.g., "ssr", "hooks", "routing")'
            ),
          tokens: z
            .number()
            .optional()
            .describe('Maximum number of tokens to return in the response')
        }
      },
      async ({ library_path, format, topic, tokens }) => {
        try {
          const queryParams = buildDocQueryParams({ format, topic, tokens });
          const endpoint = `/${library_path}${queryParams}`;

          // If format is json or explicitly requested, parse as JSON
          if (format === 'json') {
            const data = await makeContext7Request<any>(endpoint);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(data, null, 2)
                }
              ]
            };
          } else {
            // Default to text format
            const textData = await makeContext7TextRequest(endpoint);
            return {
              content: [
                {
                  type: 'text',
                  text: textData
                }
              ]
            };
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error occurred';
          return {
            content: [
              {
                type: 'text',
                text: `Error fetching documentation: ${errorMessage}`
              }
            ],
            isError: true
          };
        }
      }
    );

    // ============================================================================
    // RESOURCES
    // ============================================================================

    /**
     * Resource: Library Documentation
     * Access documentation for a specific library
     * URI: context7://library/{library_path}/docs
     */
    server.registerResource(
      'library-docs',
      new ResourceTemplate('context7://library/{library_path}/docs', { list: undefined }),
      {
        title: 'Library Documentation',
        description:
          'Access documentation for a specific library. Supports query parameters: format (txt/json), topic, and tokens.'
      },
      async (uri, { library_path }) => {
        try {
          // Parse query parameters from URI
          const url = new URL(uri.href);
          const format = url.searchParams.get('format') || undefined;
          const topic = url.searchParams.get('topic') || undefined;
          const tokensParam = url.searchParams.get('tokens');
          const tokens = tokensParam ? parseInt(tokensParam, 10) : undefined;

          const queryParams = buildDocQueryParams({ format, topic, tokens });
          const endpoint = `/${library_path}${queryParams}`;

          let text: string;

          if (format === 'json') {
            const data = await makeContext7Request<any>(endpoint);
            text = JSON.stringify(data, null, 2);
          } else {
            text = await makeContext7TextRequest(endpoint);
          }

          return {
            contents: [
              {
                uri: uri.href,
                mimeType: format === 'json' ? 'application/json' : 'text/plain',
                text: text
              }
            ]
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error occurred';
          return {
            contents: [
              {
                uri: uri.href,
                mimeType: 'text/plain',
                text: `Error fetching library documentation: ${errorMessage}`
              }
            ]
          };
        }
      }
    );

    /**
     * Resource: Search Results
     * Access search results for a specific query as a resource
     * URI: context7://search/{query}
     */
    server.registerResource(
      'search-results',
      new ResourceTemplate('context7://search/{query}', { list: undefined }),
      {
        title: 'Search Results',
        description: 'Access search results for a specific query as a resource'
      },
      async (uri, { query }) => {
        try {
          const decodedQuery = decodeURIComponent(query as string);
          const encodedQuery = encodeURIComponent(decodedQuery);
          const data = await makeContext7Request<SearchResponse>(
            `/search?query=${encodedQuery}`
          );

          const formattedResults = formatSearchResults(data.results);
          const resultText = `Search results for "${decodedQuery}" (${data.results.length} found):\n\n${formattedResults}`;

          return {
            contents: [
              {
                uri: uri.href,
                mimeType: 'text/plain',
                text: resultText
              }
            ]
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error occurred';
          return {
            contents: [
              {
                uri: uri.href,
                mimeType: 'text/plain',
                text: `Error fetching search results: ${errorMessage}`
              }
            ]
          };
        }
      }
    );
  }
);
