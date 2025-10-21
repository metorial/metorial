import { metorial, ResourceTemplate, z } from '@metorial/mcp-server-sdk';

/**
 * Exa MCP Server
 *
 * Provides access to Exa.ai's neural search, content retrieval, and similarity finding capabilities.
 * Exa is an AI-powered search engine optimized for finding high-quality web content.
 */

metorial.createServer<{
  token: string;
}>(
  {
    name: 'exa-server',
    version: '1.0.0'
  },
  async (server, config) => {
    const EXA_API_BASE = 'https://api.exa.ai';

    // ============================================================================
    // Type Definitions
    // ============================================================================

    interface ExaSearchResult {
      title: string;
      url: string;
      publishedDate?: string;
      author?: string;
      id: string;
      image?: string;
      favicon?: string;
      text?: string;
      highlights?: string[];
      highlightScores?: number[];
      summary?: string;
      subpages?: ExaSearchResult[];
      extras?: {
        links?: string[];
      };
    }

    interface ExaSearchResponse {
      requestId: string;
      resolvedSearchType?: string;
      results: ExaSearchResult[];
      searchType?: string;
      context?: string;
      costDollars?: {
        total: number;
        breakDown?: any[];
        perRequestPrices?: Record<string, number>;
        perPagePrices?: Record<string, number>;
      };
    }

    interface ExaContentResponse {
      requestId: string;
      results: ExaSearchResult[];
      context?: string;
      statuses?: Array<{
        id: string;
        status: string;
        error?: {
          tag: string;
          httpStatusCode: number;
        };
      }>;
      costDollars?: {
        total: number;
        breakDown?: any[];
        perRequestPrices?: Record<string, number>;
        perPagePrices?: Record<string, number>;
      };
    }

    // ============================================================================
    // Utility Functions
    // ============================================================================

    /**
     * Makes an authenticated request to the Exa API
     */
    async function exaRequest<T>(endpoint: string, body: Record<string, any>): Promise<T> {
      const response = await fetch(`${EXA_API_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
          'x-api-key': config.token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Exa API request failed (${response.status}): ${errorText}`);
      }

      return (await response.json()) as T;
    }

    /**
     * Formats a search result into a readable text format
     */
    function formatSearchResult(result: ExaSearchResult, index: number): string {
      let text = `\n[${index + 1}] ${result.title}\n`;
      text += `URL: ${result.url}\n`;

      if (result.author) {
        text += `Author: ${result.author}\n`;
      }

      if (result.publishedDate) {
        text += `Published: ${new Date(result.publishedDate).toLocaleDateString()}\n`;
      }

      if (result.summary) {
        text += `\nSummary: ${result.summary}\n`;
      }

      if (result.text) {
        const preview = result.text.substring(0, 300);
        text += `\nContent Preview: ${preview}${result.text.length > 300 ? '...' : ''}\n`;
      }

      if (result.highlights && result.highlights.length > 0) {
        text += `\nHighlights:\n`;
        result.highlights.forEach((highlight, i) => {
          text += `  - ${highlight}\n`;
        });
      }

      if (result.subpages && result.subpages.length > 0) {
        text += `\nRelated Subpages: ${result.subpages.length}\n`;
      }

      return text;
    }

    /**
     * Formats the entire search response
     */
    function formatSearchResponse(response: ExaSearchResponse): string {
      let text = `Exa Search Results\n`;
      text += `===================\n`;
      text += `Request ID: ${response.requestId}\n`;

      if (response.resolvedSearchType) {
        text += `Search Type: ${response.resolvedSearchType}\n`;
      }

      text += `Results Found: ${response.results.length}\n`;

      if (response.costDollars) {
        text += `Cost: $${response.costDollars.total.toFixed(4)}\n`;
      }

      response.results.forEach((result, index) => {
        text += formatSearchResult(result, index);
      });

      return text;
    }

    // ============================================================================
    // Tools
    // ============================================================================

    /**
     * Tool: exa_search
     *
     * Search the web using Exa's neural or keyword search capabilities.
     * Returns high-quality, AI-curated results with optional content, highlights, and summaries.
     */
    server.registerTool(
      'exa_search',
      {
        title: 'Exa Search',
        description:
          "Search the web using Exa's neural search engine. Supports filtering by date, domain, and content type. Returns high-quality results with optional text content, highlights, and AI-generated summaries.",
        inputSchema: {
          query: z.string().describe('The search query'),
          numResults: z
            .number()
            .min(1)
            .max(100)
            .optional()
            .default(10)
            .describe('Number of results to return (1-100)'),
          searchType: z
            .enum(['neural', 'keyword', 'auto'])
            .optional()
            .default('auto')
            .describe(
              'Type of search: neural (semantic), keyword (exact match), or auto (automatically choose)'
            ),
          useAutoprompt: z
            .boolean()
            .optional()
            .describe('Whether to use autoprompt to optimize the query'),
          includeText: z
            .boolean()
            .optional()
            .default(true)
            .describe('Include text content from the pages'),
          includeHighlights: z
            .boolean()
            .optional()
            .describe('Include relevant highlights from the content'),
          includeSummary: z
            .boolean()
            .optional()
            .describe('Include AI-generated summaries of the content'),
          category: z
            .string()
            .optional()
            .describe('Filter by category (e.g., "research paper", "news", "company")'),
          startPublishedDate: z
            .string()
            .optional()
            .describe('Filter results published after this date (ISO 8601 format)'),
          endPublishedDate: z
            .string()
            .optional()
            .describe('Filter results published before this date (ISO 8601 format)'),
          includeDomains: z
            .array(z.string())
            .optional()
            .describe('Only include results from these domains'),
          excludeDomains: z
            .array(z.string())
            .optional()
            .describe('Exclude results from these domains'),
          includeTextPatterns: z
            .array(z.string())
            .optional()
            .describe('Only include results containing these text patterns'),
          excludeTextPatterns: z
            .array(z.string())
            .optional()
            .describe('Exclude results containing these text patterns')
        }
      },
      async params => {
        const requestBody: Record<string, any> = {
          query: params.query,
          numResults: params.numResults,
          type: params.searchType
        };

        if (params.useAutoprompt !== undefined) {
          requestBody.useAutoprompt = params.useAutoprompt;
        }

        if (params.includeText) {
          requestBody.text = true;
        }

        if (params.includeHighlights) {
          requestBody.highlights = true;
        }

        if (params.includeSummary) {
          requestBody.summary = true;
        }

        if (params.category) {
          requestBody.category = params.category;
        }

        if (params.startPublishedDate) {
          requestBody.startPublishedDate = params.startPublishedDate;
        }

        if (params.endPublishedDate) {
          requestBody.endPublishedDate = params.endPublishedDate;
        }

        if (params.includeDomains && params.includeDomains.length > 0) {
          requestBody.includeDomains = params.includeDomains;
        }

        if (params.excludeDomains && params.excludeDomains.length > 0) {
          requestBody.excludeDomains = params.excludeDomains;
        }

        if (params.includeTextPatterns && params.includeTextPatterns.length > 0) {
          requestBody.includeText = params.includeTextPatterns;
        }

        if (params.excludeTextPatterns && params.excludeTextPatterns.length > 0) {
          requestBody.excludeText = params.excludeTextPatterns;
        }

        try {
          const response = await exaRequest<ExaSearchResponse>('/search', requestBody);

          return {
            content: [
              {
                type: 'text' as const,
                text: formatSearchResponse(response)
              },
              {
                type: 'text' as const,
                text: `\n\nRaw JSON Response:\n${JSON.stringify(response, null, 2)}`
              }
            ]
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error performing Exa search: ${
                  error instanceof Error ? error.message : String(error)
                }`
              }
            ],
            isError: true
          };
        }
      }
    );

    /**
     * Tool: exa_find_similar
     *
     * Find content similar to a given URL using Exa's similarity search.
     */
    server.registerTool(
      'exa_find_similar',
      {
        title: 'Exa Find Similar',
        description:
          "Find web pages similar to a given URL using Exa's neural similarity search. Useful for finding related content, research papers, or articles on similar topics.",
        inputSchema: {
          url: z.string().url().describe('The URL to find similar content for'),
          numResults: z
            .number()
            .min(1)
            .max(100)
            .optional()
            .default(10)
            .describe('Number of similar results to return (1-100)'),
          includeText: z
            .boolean()
            .optional()
            .default(true)
            .describe('Include text content from the pages'),
          includeHighlights: z
            .boolean()
            .optional()
            .describe('Include relevant highlights from the content'),
          includeSummary: z
            .boolean()
            .optional()
            .describe('Include AI-generated summaries of the content'),
          excludeSourceDomain: z
            .boolean()
            .optional()
            .describe('Exclude results from the same domain as the source URL'),
          category: z.string().optional().describe('Filter by category'),
          startPublishedDate: z
            .string()
            .optional()
            .describe('Filter results published after this date (ISO 8601 format)'),
          endPublishedDate: z
            .string()
            .optional()
            .describe('Filter results published before this date (ISO 8601 format)')
        }
      },
      async params => {
        const requestBody: Record<string, any> = {
          url: params.url,
          numResults: params.numResults
        };

        if (params.includeText) {
          requestBody.text = true;
        }

        if (params.includeHighlights) {
          requestBody.highlights = true;
        }

        if (params.includeSummary) {
          requestBody.summary = true;
        }

        if (params.excludeSourceDomain !== undefined) {
          requestBody.excludeSourceDomain = params.excludeSourceDomain;
        }

        if (params.category) {
          requestBody.category = params.category;
        }

        if (params.startPublishedDate) {
          requestBody.startPublishedDate = params.startPublishedDate;
        }

        if (params.endPublishedDate) {
          requestBody.endPublishedDate = params.endPublishedDate;
        }

        try {
          const response = await exaRequest<ExaSearchResponse>('/findSimilar', requestBody);

          return {
            content: [
              {
                type: 'text' as const,
                text: formatSearchResponse(response)
              },
              {
                type: 'text' as const,
                text: `\n\nRaw JSON Response:\n${JSON.stringify(response, null, 2)}`
              }
            ]
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error finding similar content: ${
                  error instanceof Error ? error.message : String(error)
                }`
              }
            ],
            isError: true
          };
        }
      }
    );

    /**
     * Tool: exa_get_contents
     *
     * Get full content and metadata for specific URLs using Exa's content extraction.
     */
    server.registerTool(
      'exa_get_contents',
      {
        title: 'Exa Get Contents',
        description:
          'Retrieve full content, metadata, and AI-generated summaries for specific URLs. Can process up to 100 URLs at once with options for text, highlights, summaries, and subpages.',
        inputSchema: {
          urls: z
            .array(z.string().url())
            .min(1)
            .max(100)
            .describe('Array of URLs to get content for (max 100)'),
          includeText: z
            .boolean()
            .optional()
            .default(true)
            .describe('Include text content from the pages'),
          includeHighlights: z
            .boolean()
            .optional()
            .describe('Include relevant highlights from the content'),
          includeSummary: z
            .boolean()
            .optional()
            .describe('Include AI-generated summaries of the content'),
          livecrawl: z
            .enum(['always', 'fallback', 'never'])
            .optional()
            .describe(
              'Control live crawling: always (force fresh), fallback (if cached unavailable), never (cached only)'
            ),
          subpages: z
            .number()
            .min(0)
            .max(10)
            .optional()
            .describe('Number of subpages to include for each URL (0-10)')
        }
      },
      async params => {
        const requestBody: Record<string, any> = {
          ids: params.urls
        };

        if (params.includeText) {
          requestBody.text = true;
        }

        if (params.includeHighlights) {
          requestBody.highlights = true;
        }

        if (params.includeSummary) {
          requestBody.summary = true;
        }

        if (params.livecrawl) {
          requestBody.livecrawl = params.livecrawl;
        }

        if (params.subpages !== undefined) {
          requestBody.subpages = params.subpages;
        }

        try {
          const response = await exaRequest<ExaContentResponse>('/contents', requestBody);

          let text = `Exa Content Results\n`;
          text += `===================\n`;
          text += `Request ID: ${response.requestId}\n`;
          text += `Results Retrieved: ${response.results.length}\n`;

          if (response.costDollars) {
            text += `Cost: $${response.costDollars.total.toFixed(4)}\n`;
          }

          if (response.statuses && response.statuses.length > 0) {
            text += `\nStatus Information:\n`;
            response.statuses.forEach(status => {
              text += `  - ${status.id}: ${status.status}`;
              if (status.error) {
                text += ` (${status.error.tag}, HTTP ${status.error.httpStatusCode})`;
              }
              text += `\n`;
            });
          }

          response.results.forEach((result, index) => {
            text += formatSearchResult(result, index);
          });

          return {
            content: [
              {
                type: 'text' as const,
                text
              },
              {
                type: 'text' as const,
                text: `\n\nRaw JSON Response:\n${JSON.stringify(response, null, 2)}`
              }
            ]
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error getting contents: ${
                  error instanceof Error ? error.message : String(error)
                }`
              }
            ],
            isError: true
          };
        }
      }
    );

    // ============================================================================
    // Resources
    // ============================================================================

    /**
     * Resource: exa://search/{query}
     *
     * Access search results for a specific query.
     */
    server.registerResource(
      'exa-search',
      new ResourceTemplate('exa://search/{query}', { list: undefined }),
      {
        title: 'Exa Search Results',
        description:
          'Access search results for a specific query. The query should be URL-encoded.'
      },
      async (uri, { query }) => {
        try {
          const decodedQuery = decodeURIComponent(query as string);
          const response = await exaRequest<ExaSearchResponse>('/search', {
            query: decodedQuery,
            numResults: 10,
            text: true,
            highlights: true,
            summary: true
          });

          return {
            contents: [
              {
                uri: uri.href,
                mimeType: 'application/json',
                text: JSON.stringify(response, null, 2)
              }
            ]
          };
        } catch (error) {
          throw new Error(
            `Failed to retrieve search results: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
    );

    /**
     * Resource: exa://content/{url}
     *
     * Access the full content of a specific URL.
     */
    server.registerResource(
      'exa-content',
      new ResourceTemplate('exa://content/{url}', { list: undefined }),
      {
        title: 'Exa Content',
        description:
          'Access the full content and metadata for a specific URL. The URL should be URL-encoded.'
      },
      async (uri, { url }) => {
        try {
          const decodedUrl = decodeURIComponent(url as string);
          const response = await exaRequest<ExaContentResponse>('/contents', {
            ids: [decodedUrl],
            text: true,
            highlights: true,
            summary: true
          });

          if (response.results.length === 0) {
            throw new Error(`No content found for URL: ${decodedUrl}`);
          }

          return {
            contents: [
              {
                uri: uri.href,
                mimeType: 'application/json',
                text: JSON.stringify(response.results[0], null, 2)
              }
            ]
          };
        } catch (error) {
          throw new Error(
            `Failed to retrieve content: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
    );

    /**
     * Resource: exa://similar/{url}
     *
     * Access similar content results for a given URL.
     */
    server.registerResource(
      'exa-similar',
      new ResourceTemplate('exa://similar/{url}', { list: undefined }),
      {
        title: 'Exa Similar Content',
        description:
          'Access similar content results for a given URL. The URL should be URL-encoded.'
      },
      async (uri, { url }) => {
        try {
          const decodedUrl = decodeURIComponent(url as string);
          const response = await exaRequest<ExaSearchResponse>('/findSimilar', {
            url: decodedUrl,
            numResults: 10,
            text: true,
            summary: true
          });

          return {
            contents: [
              {
                uri: uri.href,
                mimeType: 'application/json',
                text: JSON.stringify(response, null, 2)
              }
            ]
          };
        } catch (error) {
          throw new Error(
            `Failed to find similar content: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
    );
  }
);
