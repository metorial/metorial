import { metorial, ResourceTemplate, z } from '@metorial/mcp-server-sdk';

/**
 * Configuration interface for Brave Search API
 */
interface BraveConfig {
  token: string;
}

metorial.createServer<BraveConfig>(
  {
    name: 'brave-search-server',
    version: '1.0.0'
  },
  async (server, config) => {
    const BRAVE_API_BASE = 'https://api.search.brave.com/res/v1';

    /**
     * Common headers for Brave API requests
     */
    function getHeaders() {
      return {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': config.token
      };
    }

    /**
     * Make a request to Brave Search API
     */
    async function braveRequest<T>(
      endpoint: string,
      params: Record<string, any> = {}
    ): Promise<T> {
      // Filter out undefined values
      const cleanParams = Object.entries(params)
        .filter(([_, v]) => v !== undefined && v !== null && v !== '')
        .reduce((acc, [k, v]) => {
          // Handle array parameters
          if (Array.isArray(v)) {
            acc[k] = v.join(',');
          } else if (typeof v === 'boolean') {
            acc[k] = v.toString();
          } else {
            acc[k] = String(v);
          }
          return acc;
        }, {} as Record<string, string>);

      const url = new URL(`${BRAVE_API_BASE}${endpoint}`);
      Object.entries(cleanParams).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: getHeaders()
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Brave API error (${response.status}): ${errorText}`);
      }

      return (await response.json()) as T;
    }

    /**
     * Format search results for display
     */
    function formatSearchResults(data: any): string {
      return JSON.stringify(data, null, 2);
    }

    // ============================================================================
    // TOOLS
    // ============================================================================

    /**
     * Web Search Tool
     * Performs comprehensive web searches with full parameter support
     */
    server.registerTool(
      'web_search',
      {
        title: 'Web Search',
        description:
          'Perform a web search using Brave Search API with full parameter control. Returns web results, discussions, FAQs, news, videos, locations, and more.',
        inputSchema: {
          q: z.string().max(400).describe('Search query (max 400 characters, 50 words)'),
          country: z
            .string()
            .length(2)
            .optional()
            .describe('2-character country code (e.g., US, GB, DE)'),
          search_lang: z
            .string()
            .optional()
            .describe('Search language code (e.g., en, es, fr)'),
          ui_lang: z.string().optional().describe('UI language (e.g., en-US, es-ES)'),
          count: z
            .number()
            .int()
            .min(1)
            .max(20)
            .optional()
            .describe('Number of results (max 20)'),
          offset: z
            .number()
            .int()
            .min(0)
            .max(9)
            .optional()
            .describe('Pagination offset (max 9)'),
          safesearch: z
            .enum(['off', 'moderate', 'strict'])
            .optional()
            .describe('Safe search filter level'),
          freshness: z
            .string()
            .optional()
            .describe('Filter by freshness: pd, pw, pm, py, or YYYY-MM-DDtoYYYY-MM-DD'),
          text_decorations: z
            .boolean()
            .optional()
            .describe('Include highlighting in snippets'),
          spellcheck: z.boolean().optional().describe('Enable spellcheck'),
          result_filter: z
            .string()
            .optional()
            .describe(
              'Comma-separated result types: discussions,faq,infobox,news,query,summarizer,videos,web,locations'
            ),
          goggles_id: z
            .string()
            .optional()
            .describe('Goggles ID for custom re-ranking (deprecated, use goggles)'),
          goggles: z
            .array(z.string())
            .optional()
            .describe('List of Goggle URLs or definitions'),
          units: z.enum(['metric', 'imperial']).optional().describe('Measurement units'),
          extra_snippets: z
            .boolean()
            .optional()
            .describe('Get up to 5 additional alternative excerpts'),
          summary: z
            .boolean()
            .optional()
            .describe('Enable summary key generation for AI summarization')
        }
      },
      async params => {
        const data = await braveRequest('/web/search', params);
        return {
          content: [
            {
              type: 'text',
              text: formatSearchResults(data)
            }
          ]
        };
      }
    );

    /**
     * Search with Summary Tool
     * Convenience tool for web search with summary enabled
     */
    server.registerTool(
      'search_with_summary',
      {
        title: 'Search with Summary',
        description:
          'Perform a web search with AI summary enabled. This automatically enables the summary flag and returns a summarizer key for generating AI summaries.',
        inputSchema: {
          q: z.string().max(400).describe('Search query (max 400 characters, 50 words)'),
          country: z.string().length(2).optional().describe('2-character country code'),
          search_lang: z.string().optional().describe('Search language code'),
          count: z.number().int().min(1).max(20).optional().describe('Number of results'),
          offset: z.number().int().min(0).max(9).optional().describe('Pagination offset'),
          safesearch: z
            .enum(['off', 'moderate', 'strict'])
            .optional()
            .describe('Safe search level')
        }
      },
      async params => {
        const data = await braveRequest('/web/search', { ...params, summary: true });
        return {
          content: [
            {
              type: 'text',
              text: formatSearchResults(data)
            }
          ]
        };
      }
    );

    /**
     * Local POI Search Tool
     * Get detailed information about specific locations using their IDs
     */
    server.registerTool(
      'local_poi_search',
      {
        title: 'Local POI Search',
        description:
          'Get detailed information about specific locations using their temporary IDs (valid for 8 hours). Can query up to 20 locations at once.',
        inputSchema: {
          ids: z
            .array(z.string())
            .min(1)
            .max(20)
            .describe('List of location IDs (1-20 IDs, valid for 8 hours)'),
          search_lang: z.string().optional().describe('Search language code'),
          ui_lang: z.string().optional().describe('UI language'),
          units: z.enum(['metric', 'imperial']).optional().describe('Measurement units')
        }
      },
      async params => {
        const data = await braveRequest('/local/pois', params);
        return {
          content: [
            {
              type: 'text',
              text: formatSearchResults(data)
            }
          ]
        };
      }
    );

    /**
     * Local Descriptions Search Tool
     * Get AI-generated descriptions for locations
     */
    server.registerTool(
      'local_descriptions_search',
      {
        title: 'Local Descriptions Search',
        description:
          'Get AI-generated descriptions for specific locations using their temporary IDs (valid for 8 hours). Can query up to 20 locations at once.',
        inputSchema: {
          ids: z
            .array(z.string())
            .min(1)
            .max(20)
            .describe('List of location IDs (1-20 IDs, valid for 8 hours)'),
          search_lang: z.string().optional().describe('Search language code'),
          ui_lang: z.string().optional().describe('UI language')
        }
      },
      async params => {
        const data = await braveRequest('/local/descriptions', params);
        return {
          content: [
            {
              type: 'text',
              text: formatSearchResults(data)
            }
          ]
        };
      }
    );

    /**
     * News Search Tool
     * Specialized tool for news-focused searches
     */
    server.registerTool(
      'search_news',
      {
        title: 'Search News',
        description:
          'Search specifically for news articles. Returns news results relevant to the query with metadata like source, publication date, and thumbnails.',
        inputSchema: {
          q: z.string().max(400).describe('Search query'),
          country: z.string().length(2).optional().describe('2-character country code'),
          search_lang: z.string().optional().describe('Search language code'),
          freshness: z.string().optional().describe('Filter by freshness: pd, pw, pm, py'),
          count: z.number().int().min(1).max(20).optional().describe('Number of results'),
          offset: z.number().int().min(0).max(9).optional().describe('Pagination offset')
        }
      },
      async params => {
        const data = await braveRequest('/web/search', { ...params, result_filter: 'news' });
        return {
          content: [
            {
              type: 'text',
              text: formatSearchResults(data)
            }
          ]
        };
      }
    );

    /**
     * Videos Search Tool
     * Specialized tool for video-focused searches
     */
    server.registerTool(
      'search_videos',
      {
        title: 'Search Videos',
        description:
          'Search specifically for videos. Returns video results with metadata like duration, views, creator, and thumbnails.',
        inputSchema: {
          q: z.string().max(400).describe('Search query'),
          country: z.string().length(2).optional().describe('2-character country code'),
          search_lang: z.string().optional().describe('Search language code'),
          count: z.number().int().min(1).max(20).optional().describe('Number of results'),
          offset: z.number().int().min(0).max(9).optional().describe('Pagination offset')
        }
      },
      async params => {
        const data = await braveRequest('/web/search', { ...params, result_filter: 'videos' });
        return {
          content: [
            {
              type: 'text',
              text: formatSearchResults(data)
            }
          ]
        };
      }
    );

    /**
     * Discussions Search Tool
     * Specialized tool for forum/discussion searches
     */
    server.registerTool(
      'search_discussions',
      {
        title: 'Search Discussions',
        description:
          'Search specifically for forum posts and discussions. Returns relevant forum threads from various discussion platforms.',
        inputSchema: {
          q: z.string().max(400).describe('Search query'),
          country: z.string().length(2).optional().describe('2-character country code'),
          search_lang: z.string().optional().describe('Search language code'),
          count: z.number().int().min(1).max(20).optional().describe('Number of results'),
          offset: z.number().int().min(0).max(9).optional().describe('Pagination offset')
        }
      },
      async params => {
        const data = await braveRequest('/web/search', {
          ...params,
          result_filter: 'discussions'
        });
        return {
          content: [
            {
              type: 'text',
              text: formatSearchResults(data)
            }
          ]
        };
      }
    );

    /**
     * Locations Search Tool
     * Specialized tool for location-based searches
     */
    server.registerTool(
      'search_locations',
      {
        title: 'Search Locations',
        description:
          'Search specifically for locations and points of interest (POIs). Returns location results with addresses, coordinates, ratings, and opening hours.',
        inputSchema: {
          q: z.string().max(400).describe('Search query'),
          country: z.string().length(2).optional().describe('2-character country code'),
          search_lang: z.string().optional().describe('Search language code'),
          units: z.enum(['metric', 'imperial']).optional().describe('Measurement units'),
          count: z.number().int().min(1).max(20).optional().describe('Number of results'),
          offset: z.number().int().min(0).max(9).optional().describe('Pagination offset')
        }
      },
      async params => {
        const data = await braveRequest('/web/search', {
          ...params,
          result_filter: 'locations'
        });
        return {
          content: [
            {
              type: 'text',
              text: formatSearchResults(data)
            }
          ]
        };
      }
    );

    // ============================================================================
    // RESOURCES
    // ============================================================================

    /**
     * Search Result Resource
     * Access a specific search query result with default parameters
     */
    server.registerResource(
      'search_result',
      new ResourceTemplate('brave://search/{query}', { list: undefined }),
      {
        title: 'Search Result',
        description:
          'Access complete search results for a specific query with default parameters'
      },
      async (uri, { query }) => {
        const decodedQuery = decodeURIComponent(query as string);
        const data = await braveRequest('/web/search', { q: decodedQuery });
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: formatSearchResults(data)
            }
          ]
        };
      }
    );

    /**
     * Filtered Search Result Resource
     * Access filtered search results for a specific query
     */
    server.registerResource(
      'search_result_filtered',
      new ResourceTemplate('brave://search/{query}/filter/{filter_type}', { list: undefined }),
      {
        title: 'Filtered Search Result',
        description:
          'Access filtered search results (web, news, videos, discussions, locations, faq, infobox)'
      },
      async (uri, { query, filter_type }) => {
        const decodedQuery = decodeURIComponent(query as string);
        const validFilters = [
          'web',
          'news',
          'videos',
          'discussions',
          'locations',
          'faq',
          'infobox',
          'query',
          'summarizer'
        ];

        if (!validFilters.includes(filter_type as string)) {
          throw new Error(
            `Invalid filter type: ${filter_type}. Must be one of: ${validFilters.join(', ')}`
          );
        }

        const data = await braveRequest('/web/search', {
          q: decodedQuery,
          result_filter: filter_type
        });

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: formatSearchResults(data)
            }
          ]
        };
      }
    );

    /**
     * Paginated Search Result Resource
     * Access paginated search results (20 results per page)
     */
    server.registerResource(
      'search_result_paginated',
      new ResourceTemplate('brave://search/{query}/page/{page_number}', { list: undefined }),
      {
        title: 'Paginated Search Result',
        description:
          'Access a specific page of search results (20 results per page, max 10 pages)'
      },
      async (uri, { query, page_number }) => {
        const decodedQuery = decodeURIComponent(query as string);
        const pageNum = parseInt(page_number as string, 10);

        if (isNaN(pageNum) || pageNum < 1 || pageNum > 10) {
          throw new Error('Page number must be between 1 and 10');
        }

        const offset = pageNum - 1; // 0-based offset
        const data = await braveRequest('/web/search', {
          q: decodedQuery,
          count: 20,
          offset
        });

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: formatSearchResults(data)
            }
          ]
        };
      }
    );

    /**
     * Location Details Resource
     * Access detailed information about a specific location
     */
    server.registerResource(
      'location_details',
      new ResourceTemplate('brave://location/{location_id}', { list: undefined }),
      {
        title: 'Location Details',
        description:
          'Access detailed POI information for a specific location (ID valid for 8 hours)'
      },
      async (uri, { location_id }) => {
        const data = await braveRequest('/local/pois', { ids: [location_id] });
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: formatSearchResults(data)
            }
          ]
        };
      }
    );

    /**
     * Location Description Resource
     * Access AI-generated description for a specific location
     */
    server.registerResource(
      'location_description',
      new ResourceTemplate('brave://location/{location_id}/description', { list: undefined }),
      {
        title: 'Location Description',
        description:
          'Access AI-generated description for a specific location (ID valid for 8 hours)'
      },
      async (uri, { location_id }) => {
        const data = await braveRequest('/local/descriptions', { ids: [location_id] });
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: formatSearchResults(data)
            }
          ]
        };
      }
    );

    /**
     * Contextualized Search Result Resource
     * Access search results with specific country and language context
     */
    server.registerResource(
      'search_result_with_context',
      new ResourceTemplate('brave://search/{query}/context/{country}/{language}', {
        list: undefined
      }),
      {
        title: 'Contextualized Search Result',
        description:
          'Access localized search results with specific country and language context'
      },
      async (uri, { query, country, language }) => {
        const decodedQuery = decodeURIComponent(query as string);

        if ((country as string).length !== 2) {
          throw new Error('Country code must be 2 characters');
        }

        const data = await braveRequest('/web/search', {
          q: decodedQuery,
          country: (country as string).toUpperCase(),
          search_lang: (language as string).toLowerCase()
        });

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: formatSearchResults(data)
            }
          ]
        };
      }
    );
  }
);
