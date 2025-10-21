import { metorial, ResourceTemplate, z } from '@metorial/mcp-server-sdk';

/**
 * Configuration interface for the Perplexity MCP Server
 */
interface Config {
  token: string;
}

/**
 * Message structure for Perplexity API requests
 */
interface PerplexityMessage {
  role: string;
  content: string;
}

/**
 * Perplexity API chat completion response structure
 */
interface PerplexityResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  citations?: string[];
}

/**
 * Perplexity Search API response structure
 */
interface PerplexitySearchResponse {
  results: Array<{
    title: string;
    url: string;
    snippet?: string;
    date?: string;
  }>;
}

/**
 * Initialize the MCP server with metadata
 */
metorial.createServer<Config>(
  {
    name: 'perplexity-mcp-server',
    version: '1.0.0'
  },
  async (server, config) => {
    /**
     * Performs a chat completion by sending a request to the Perplexity API.
     * Appends citations to the returned message content if they exist.
     *
     * @param messages - An array of message objects with role and content
     * @param model - The Perplexity model to use for the completion
     * @returns The chat completion result with appended citations
     * @throws Will throw an error if the API request fails
     */
    async function performChatCompletion(
      messages: PerplexityMessage[],
      model: string
    ): Promise<string> {
      const url = 'https://api.perplexity.ai/chat/completions';
      const body = {
        model: model,
        messages: messages
      };

      let response: Response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.token}`
          },
          body: JSON.stringify(body)
        });
      } catch (error) {
        throw new Error(`Network error while calling Perplexity API: ${error}`);
      }

      if (!response.ok) {
        let errorText: string;
        try {
          errorText = await response.text();
        } catch (parseError) {
          errorText = 'Unable to parse error response';
        }
        throw new Error(
          `Perplexity API error: ${response.status} ${response.statusText}\n${errorText}`
        );
      }

      let data: PerplexityResponse;
      try {
        data = (await response.json()) as any;
      } catch (jsonError) {
        throw new Error(`Failed to parse JSON response from Perplexity API: ${jsonError}`);
      }

      let messageContent = data.choices[0]?.message.content;

      // Append citations if provided
      if (data.citations && Array.isArray(data.citations) && data.citations.length > 0) {
        messageContent += '\n\nCitations:\n';
        data.citations.forEach((citation: string, index: number) => {
          messageContent += `[${index + 1}] ${citation}\n`;
        });
      }

      return messageContent ?? '';
    }

    /**
     * Formats search results from the Perplexity Search API into a readable string.
     *
     * @param data - The search response data from the API
     * @returns Formatted search results as a string
     */
    function formatSearchResults(data: PerplexitySearchResponse): string {
      if (!data.results || !Array.isArray(data.results)) {
        return 'No search results found.';
      }

      let formattedResults = `Found ${data.results.length} search results:\n\n`;

      data.results.forEach((result, index: number) => {
        formattedResults += `${index + 1}. **${result.title}**\n`;
        formattedResults += `   URL: ${result.url}\n`;
        if (result.snippet) {
          formattedResults += `   ${result.snippet}\n`;
        }
        if (result.date) {
          formattedResults += `   Date: ${result.date}\n`;
        }
        formattedResults += '\n';
      });

      return formattedResults;
    }

    /**
     * Performs a web search using the Perplexity Search API.
     *
     * @param query - The search query string
     * @param maxResults - Maximum number of results to return (1-20)
     * @param maxTokensPerPage - Maximum tokens to extract per webpage
     * @param country - Optional ISO country code for regional results
     * @returns The formatted search results
     * @throws Will throw an error if the API request fails
     */
    async function performSearch(
      query: string,
      maxResults: number = 10,
      maxTokensPerPage: number = 1024,
      country?: string
    ): Promise<string> {
      const url = 'https://api.perplexity.ai/search';
      const body: Record<string, unknown> = {
        query: query,
        max_results: maxResults,
        max_tokens_per_page: maxTokensPerPage
      };

      if (country) {
        body.country = country;
      }

      let response: Response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.token}`
          },
          body: JSON.stringify(body)
        });
      } catch (error) {
        throw new Error(`Network error while calling Perplexity Search API: ${error}`);
      }

      if (!response.ok) {
        let errorText: string;
        try {
          errorText = await response.text();
        } catch (parseError) {
          errorText = 'Unable to parse error response';
        }
        throw new Error(
          `Perplexity Search API error: ${response.status} ${response.statusText}\n${errorText}`
        );
      }

      let data: PerplexitySearchResponse;
      try {
        data = (await response.json()) as any;
      } catch (jsonError) {
        throw new Error(
          `Failed to parse JSON response from Perplexity Search API: ${jsonError}`
        );
      }

      return formatSearchResults(data);
    }

    /**
     * Register the perplexity_ask tool
     * Engages in a conversation using the Sonar API with the sonar-pro model
     */
    server.registerTool(
      'perplexity_ask',
      {
        title: 'Perplexity Ask',
        description:
          'Engages in a conversation using the Sonar API. Accepts an array of messages (each with a role and content) and returns a chat completion response from the Perplexity model with citations.',
        inputSchema: {
          messages: z
            .array(
              z.object({
                role: z
                  .string()
                  .describe('Role of the message (e.g., system, user, assistant)'),
                content: z.string().describe('The content of the message')
              })
            )
            .describe('Array of conversation messages')
        }
      },
      async ({ messages }) => {
        try {
          const result = await performChatCompletion(messages, 'sonar-pro');
          return {
            content: [{ type: 'text', text: result }]
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error instanceof Error ? error.message : String(error)}`
              }
            ],
            isError: true
          };
        }
      }
    );

    /**
     * Register the perplexity_research tool
     * Performs deep research using the Perplexity API with sonar-deep-research model
     */
    server.registerTool(
      'perplexity_research',
      {
        title: 'Perplexity Research',
        description:
          'Performs deep research using the Perplexity API. Accepts an array of messages and returns a comprehensive research response with citations using the sonar-deep-research model.',
        inputSchema: {
          messages: z
            .array(
              z.object({
                role: z
                  .string()
                  .describe('Role of the message (e.g., system, user, assistant)'),
                content: z.string().describe('The content of the message')
              })
            )
            .describe('Array of conversation messages')
        }
      },
      async ({ messages }) => {
        try {
          const result = await performChatCompletion(messages, 'sonar-deep-research');
          return {
            content: [{ type: 'text', text: result }]
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error instanceof Error ? error.message : String(error)}`
              }
            ],
            isError: true
          };
        }
      }
    );

    /**
     * Register the perplexity_reason tool
     * Performs reasoning tasks using the Perplexity API with sonar-reasoning-pro model
     */
    server.registerTool(
      'perplexity_reason',
      {
        title: 'Perplexity Reason',
        description:
          'Performs reasoning tasks using the Perplexity API. Accepts an array of messages and returns a well-reasoned response using the sonar-reasoning-pro model.',
        inputSchema: {
          messages: z
            .array(
              z.object({
                role: z
                  .string()
                  .describe('Role of the message (e.g., system, user, assistant)'),
                content: z.string().describe('The content of the message')
              })
            )
            .describe('Array of conversation messages')
        }
      },
      async ({ messages }) => {
        try {
          const result = await performChatCompletion(messages, 'sonar-reasoning-pro');
          return {
            content: [{ type: 'text', text: result }]
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error instanceof Error ? error.message : String(error)}`
              }
            ],
            isError: true
          };
        }
      }
    );

    /**
     * Register the perplexity_search tool
     * Performs web search using the Perplexity Search API
     */
    server.registerTool(
      'perplexity_search',
      {
        title: 'Perplexity Search',
        description:
          'Performs web search using the Perplexity Search API. Returns ranked search results with titles, URLs, snippets, and metadata.',
        inputSchema: {
          query: z.string().describe('Search query string'),
          max_results: z
            .number()
            .min(1)
            .max(20)
            .optional()
            .describe('Maximum number of results to return (1-20, default: 10)'),
          max_tokens_per_page: z
            .number()
            .min(256)
            .max(2048)
            .optional()
            .describe('Maximum tokens to extract per webpage (default: 1024)'),
          country: z
            .string()
            .optional()
            .describe(
              'ISO 3166-1 alpha-2 country code for regional results (e.g., "US", "GB")'
            )
        }
      },
      async ({ query, max_results, max_tokens_per_page, country }) => {
        try {
          const result = await performSearch(query, max_results, max_tokens_per_page, country);
          return {
            content: [{ type: 'text', text: result }]
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error instanceof Error ? error.message : String(error)}`
              }
            ],
            isError: true
          };
        }
      }
    );

    /**
     * Register search-result resource
     * Provides access to detailed search results by search query
     */
    server.registerResource(
      'search-result',
      new ResourceTemplate('search-result://{query}', { list: undefined }),
      {
        title: 'Search Result',
        description: 'Access detailed results from a specific search query'
      },
      async (uri, { query }) => {
        try {
          const decodedQuery = decodeURIComponent(query as string);
          const result = await performSearch(decodedQuery);
          return {
            contents: [
              {
                uri: uri.href,
                text: result,
                mimeType: 'text/plain'
              }
            ]
          };
        } catch (error) {
          throw new Error(
            `Failed to fetch search results: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
    );

    /**
     * Register conversation resource
     * Provides access to conversation history by conversation ID
     */
    server.registerResource(
      'conversation',
      new ResourceTemplate('conversation://{conversationId}', { list: undefined }),
      {
        title: 'Conversation',
        description: 'Access a specific conversation thread with all messages'
      },
      async (uri, { conversationId }) => {
        // Note: Since Perplexity API doesn't provide conversation history endpoints,
        // this is a placeholder that could be extended with local storage or caching
        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(
                {
                  id: conversationId,
                  message:
                    'Conversation history not available - Perplexity API does not provide conversation storage. Consider implementing local caching if needed.'
                },
                null,
                2
              ),
              mimeType: 'application/json'
            }
          ]
        };
      }
    );

    /**
     * Register citation resource
     * Provides access to citation information by URL
     */
    server.registerResource(
      'citation',
      new ResourceTemplate('citation://{citationUrl}', { list: undefined }),
      {
        title: 'Citation',
        description: 'Access detailed information about a specific citation/source'
      },
      async (uri, { citationUrl }) => {
        const decodedUrl = decodeURIComponent(citationUrl as string);
        return {
          contents: [
            {
              uri: uri.href,
              text: `Citation URL: ${decodedUrl}\n\nThis resource provides access to citation metadata. The actual content is available at the URL above.`,
              mimeType: 'text/plain'
            }
          ]
        };
      }
    );

    /**
     * Register research resource
     * Provides access to completed research tasks
     */
    server.registerResource(
      'research',
      new ResourceTemplate('research://{topic}', { list: undefined }),
      {
        title: 'Research',
        description: 'Access a completed research task with all findings and citations'
      },
      async (uri, { topic }) => {
        try {
          const decodedTopic = decodeURIComponent(topic as string);
          const messages = [
            {
              role: 'user',
              content: `Provide comprehensive research on: ${decodedTopic}`
            }
          ];
          const result = await performChatCompletion(messages, 'sonar-deep-research');
          return {
            contents: [
              {
                uri: uri.href,
                text: result,
                mimeType: 'text/plain'
              }
            ]
          };
        } catch (error) {
          throw new Error(
            `Failed to fetch research: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
    );
  }
);
