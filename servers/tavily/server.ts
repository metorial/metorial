import { metorial, ResourceTemplate, z } from '@metorial/mcp-server-sdk';

/**
 * Tavily MCP Server
 *
 * Provides AI-powered web search and content extraction capabilities through the Tavily API.
 * Supports comprehensive search filtering, real-time news search, and content extraction from URLs.
 */

interface Config {
  token: string;
}

metorial.createServer<Config>(
  {
    name: 'tavily-server',
    version: '1.0.0'
  },
  async (server, config) => {
    // Base URL for Tavily API
    const TAVILY_BASE_URL = 'https://api.tavily.com';

    /**
     * Helper function to make authenticated requests to Tavily API
     */
    async function tavilyRequest<T>(endpoint: string, body: Record<string, any>): Promise<T> {
      const response = await fetch(`${TAVILY_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.token}`
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Tavily API error (${response.status}): ${errorText}`);
      }

      return (await response.json()) as any;
    }

    /**
     * Country enum for search filtering
     */
    const countryEnum = z.enum([
      'afghanistan',
      'albania',
      'algeria',
      'andorra',
      'angola',
      'argentina',
      'armenia',
      'australia',
      'austria',
      'azerbaijan',
      'bahamas',
      'bahrain',
      'bangladesh',
      'barbados',
      'belarus',
      'belgium',
      'belize',
      'benin',
      'bhutan',
      'bolivia',
      'bosnia and herzegovina',
      'botswana',
      'brazil',
      'brunei',
      'bulgaria',
      'burkina faso',
      'burundi',
      'cambodia',
      'cameroon',
      'canada',
      'cape verde',
      'central african republic',
      'chad',
      'chile',
      'china',
      'colombia',
      'comoros',
      'congo',
      'costa rica',
      'croatia',
      'cuba',
      'cyprus',
      'czech republic',
      'denmark',
      'djibouti',
      'dominican republic',
      'ecuador',
      'egypt',
      'el salvador',
      'equatorial guinea',
      'eritrea',
      'estonia',
      'ethiopia',
      'fiji',
      'finland',
      'france',
      'gabon',
      'gambia',
      'georgia',
      'germany',
      'ghana',
      'greece',
      'guatemala',
      'guinea',
      'haiti',
      'honduras',
      'hungary',
      'iceland',
      'india',
      'indonesia',
      'iran',
      'iraq',
      'ireland',
      'israel',
      'italy',
      'jamaica',
      'japan',
      'jordan',
      'kazakhstan',
      'kenya',
      'kuwait',
      'kyrgyzstan',
      'latvia',
      'lebanon',
      'lesotho',
      'liberia',
      'libya',
      'liechtenstein',
      'lithuania',
      'luxembourg',
      'madagascar',
      'malawi',
      'malaysia',
      'maldives',
      'mali',
      'malta',
      'mauritania',
      'mauritius',
      'mexico',
      'moldova',
      'monaco',
      'mongolia',
      'montenegro',
      'morocco',
      'mozambique',
      'myanmar',
      'namibia',
      'nepal',
      'netherlands',
      'new zealand',
      'nicaragua',
      'niger',
      'nigeria',
      'north korea',
      'north macedonia',
      'norway',
      'oman',
      'pakistan',
      'panama',
      'papua new guinea',
      'paraguay',
      'peru',
      'philippines',
      'poland',
      'portugal',
      'qatar',
      'romania',
      'russia',
      'rwanda',
      'saudi arabia',
      'senegal',
      'serbia',
      'singapore',
      'slovakia',
      'slovenia',
      'somalia',
      'south africa',
      'south korea',
      'south sudan',
      'spain',
      'sri lanka',
      'sudan',
      'sweden',
      'switzerland',
      'syria',
      'taiwan',
      'tajikistan',
      'tanzania',
      'thailand',
      'togo',
      'trinidad and tobago',
      'tunisia',
      'turkey',
      'turkmenistan',
      'uganda',
      'ukraine',
      'united arab emirates',
      'united kingdom',
      'united states',
      'uruguay',
      'uzbekistan',
      'venezuela',
      'vietnam',
      'yemen',
      'zambia',
      'zimbabwe'
    ]);

    // ===========================
    // TOOL: tavily_search
    // ===========================

    server.registerTool(
      'tavily_search',
      {
        title: 'Tavily Search',
        description:
          'Perform an AI-powered web search using Tavily. Supports advanced filtering, news search, and comprehensive result customization.',
        inputSchema: {
          query: z.string().describe('The search query to execute'),
          auto_parameters: z
            .boolean()
            .optional()
            .describe('Enable automatic parameter configuration based on query intent'),
          topic: z
            .enum(['general', 'news', 'finance'])
            .optional()
            .describe(
              'Category of search: general for broad searches, news for real-time updates, finance for financial data'
            ),
          search_depth: z
            .enum(['basic', 'advanced'])
            .optional()
            .describe(
              'Search depth: basic (1 credit) or advanced (2 credits) for more relevant results'
            ),
          chunks_per_source: z
            .number()
            .int()
            .min(1)
            .max(3)
            .optional()
            .describe('Number of content chunks per source (advanced search only)'),
          max_results: z
            .number()
            .int()
            .min(0)
            .max(20)
            .optional()
            .describe('Maximum number of search results to return'),
          time_range: z
            .enum(['day', 'week', 'month', 'year', 'd', 'w', 'm', 'y'])
            .optional()
            .describe('Filter results by publication date range'),
          days: z
            .number()
            .int()
            .min(1)
            .optional()
            .describe('Number of days back to search (news topic only)'),
          start_date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional()
            .describe('Start date filter in YYYY-MM-DD format'),
          end_date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional()
            .describe('End date filter in YYYY-MM-DD format'),
          include_answer: z
            .boolean()
            .optional()
            .describe('Include an LLM-generated answer to the query'),
          include_raw_content: z
            .boolean()
            .optional()
            .describe('Include cleaned HTML content of results'),
          include_images: z.boolean().optional().describe('Include image search results'),
          include_image_descriptions: z
            .boolean()
            .optional()
            .describe('Add descriptions to images (requires include_images)'),
          include_favicon: z.boolean().optional().describe('Include favicon URLs for results'),
          include_domains: z
            .array(z.string())
            .optional()
            .describe('List of domains to specifically include (max 300)'),
          exclude_domains: z
            .array(z.string())
            .optional()
            .describe('List of domains to exclude (max 150)'),
          country: countryEnum
            .optional()
            .describe('Boost results from a specific country (general topic only)')
        }
      },
      async params => {
        try {
          const requestBody: Record<string, any> = {
            query: params.query
          };

          // Add optional parameters if provided
          if (params.auto_parameters !== undefined)
            requestBody.auto_parameters = params.auto_parameters;
          if (params.topic) requestBody.topic = params.topic;
          if (params.search_depth) requestBody.search_depth = params.search_depth;
          if (params.chunks_per_source !== undefined)
            requestBody.chunks_per_source = params.chunks_per_source;
          if (params.max_results !== undefined) requestBody.max_results = params.max_results;
          if (params.time_range) requestBody.time_range = params.time_range;
          if (params.days !== undefined) requestBody.days = params.days;
          if (params.start_date) requestBody.start_date = params.start_date;
          if (params.end_date) requestBody.end_date = params.end_date;
          if (params.include_answer !== undefined)
            requestBody.include_answer = params.include_answer;
          if (params.include_raw_content !== undefined)
            requestBody.include_raw_content = params.include_raw_content;
          if (params.include_images !== undefined)
            requestBody.include_images = params.include_images;
          if (params.include_image_descriptions !== undefined)
            requestBody.include_image_descriptions = params.include_image_descriptions;
          if (params.include_favicon !== undefined)
            requestBody.include_favicon = params.include_favicon;
          if (params.include_domains) requestBody.include_domains = params.include_domains;
          if (params.exclude_domains) requestBody.exclude_domains = params.exclude_domains;
          if (params.country) requestBody.country = params.country;

          const response = await tavilyRequest('/search', requestBody);

          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(response, null, 2)
              }
            ]
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error performing Tavily search: ${
                  error instanceof Error ? error.message : String(error)
                }`
              }
            ],
            isError: true
          };
        }
      }
    );

    // ===========================
    // TOOL: tavily_extract
    // ===========================

    server.registerTool(
      'tavily_extract',
      {
        title: 'Tavily Extract',
        description:
          'Extract and parse content from one or more URLs using Tavily. Returns clean, formatted content ready for AI processing.',
        inputSchema: {
          urls: z
            .array(z.string().url())
            .min(1)
            .describe('List of URLs to extract content from'),
          include_images: z
            .boolean()
            .optional()
            .describe('Include list of images extracted from URLs'),
          include_favicon: z.boolean().optional().describe('Include favicon URLs for results'),
          extract_depth: z
            .enum(['basic', 'advanced'])
            .optional()
            .describe(
              'Extraction depth: basic (1 credit per 5 URLs) or advanced (2 credits per 5 URLs) for tables and embedded content'
            ),
          format: z
            .enum(['markdown', 'text'])
            .optional()
            .describe('Output format: markdown or plain text'),
          timeout: z
            .number()
            .min(1)
            .max(60)
            .optional()
            .describe('Maximum wait time in seconds (1-60)')
        }
      },
      async params => {
        try {
          const requestBody: Record<string, any> = {
            urls: params.urls
          };

          // Add optional parameters if provided
          if (params.include_images !== undefined)
            requestBody.include_images = params.include_images;
          if (params.include_favicon !== undefined)
            requestBody.include_favicon = params.include_favicon;
          if (params.extract_depth) requestBody.extract_depth = params.extract_depth;
          if (params.format) requestBody.format = params.format;
          if (params.timeout !== undefined) requestBody.timeout = params.timeout;

          const response = await tavilyRequest('/extract', requestBody);

          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(response, null, 2)
              }
            ]
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error extracting content: ${
                  error instanceof Error ? error.message : String(error)
                }`
              }
            ],
            isError: true
          };
        }
      }
    );

    // ===========================
    // RESOURCE: tavily://search/{query}
    // ===========================

    server.registerResource(
      'search',
      new ResourceTemplate('tavily://search/{query}', {
        list: undefined
      }),
      {
        title: 'Tavily Search Results',
        description: 'Access search results for a specific query'
      },
      async (uri, params) => {
        try {
          const query = decodeURIComponent(params.query as string);

          const response = await tavilyRequest('/search', {
            query,
            max_results: 5
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
            `Failed to fetch search results: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
    );

    // ===========================
    // RESOURCE: tavily://extracted-content/{url}
    // ===========================

    server.registerResource(
      'extracted-content',
      new ResourceTemplate('tavily://extracted-content/{url}', {
        list: undefined
      }),
      {
        title: 'Tavily Extracted Content',
        description: 'Access extracted and parsed content from a specific URL'
      },
      async (uri, params) => {
        try {
          const targetUrl = decodeURIComponent(params.url as string);

          const response = await tavilyRequest('/extract', {
            urls: [targetUrl],
            format: 'markdown'
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
            `Failed to extract content: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
    );
  }
);
