import { metorial, ResourceTemplate, z } from '@metorial/mcp-server-sdk';

/**
 * Firecrawl MCP Server
 * Provides web scraping and crawling capabilities through the Firecrawl API
 */

metorial.createServer<{ token: string }>(
  {
    name: 'firecrawl-server',
    version: '1.0.0'
  },
  async (server, config) => {
    const API_BASE_URL = 'https://api.firecrawl.dev/v2';

    // ============================================================================
    // Type Definitions
    // ============================================================================

    interface FirecrawlError {
      error?: string;
      success?: boolean;
      code?: string;
    }

    interface ScrapeResponse {
      success: boolean;
      data?: {
        markdown?: string;
        summary?: string | null;
        html?: string | null;
        rawHtml?: string | null;
        screenshot?: string | null;
        links?: string[];
        actions?: {
          screenshots?: string[];
          scrapes?: Array<{ url: string; html: string }>;
          javascriptReturns?: Array<{ type: string; value: any }>;
          pdfs?: string[];
        };
        metadata?: {
          title?: string | string[];
          description?: string | string[];
          language?: string | string[] | null;
          sourceURL?: string;
          keywords?: string | string[];
          statusCode?: number;
          error?: string | null;
          [key: string]: any;
        };
        warning?: string | null;
        changeTracking?: any;
      };
      error?: string;
    }

    interface CrawlResponse {
      success: boolean;
      id?: string;
      url?: string;
      error?: string;
    }

    interface CrawlStatusResponse {
      success: boolean;
      status?: string;
      total?: number;
      completed?: number;
      creditsUsed?: number;
      expiresAt?: string;
      next?: string;
      data?: Array<{
        markdown?: string;
        html?: string;
        rawHtml?: string;
        links?: string[];
        screenshot?: string;
        metadata?: any;
      }>;
      error?: string;
    }

    // ============================================================================
    // Schema Definitions
    // ============================================================================

    const formatSchema = z.union([
      z.literal('markdown'),
      z.literal('html'),
      z.literal('rawHtml'),
      z.literal('links'),
      z.literal('screenshot'),
      z.object({
        type: z.literal('markdown')
      }),
      z.object({
        type: z.literal('summary')
      }),
      z.object({
        type: z.literal('html')
      }),
      z.object({
        type: z.literal('rawHtml')
      }),
      z.object({
        type: z.literal('links')
      }),
      z.object({
        type: z.literal('screenshot'),
        fullPage: z.boolean().optional(),
        quality: z.number().optional(),
        viewport: z
          .object({
            width: z.number(),
            height: z.number()
          })
          .optional()
      }),
      z.object({
        type: z.literal('json'),
        schema: z.record(z.any()),
        prompt: z.string().optional()
      })
    ]);

    const actionSchema = z.union([
      z.object({
        type: z.literal('wait'),
        milliseconds: z.number().min(1).optional(),
        selector: z.string().optional()
      }),
      z.object({
        type: z.literal('screenshot'),
        fullPage: z.boolean().optional(),
        quality: z.number().optional(),
        viewport: z
          .object({
            width: z.number(),
            height: z.number()
          })
          .optional()
      }),
      z.object({
        type: z.literal('click'),
        selector: z.string(),
        all: z.boolean().optional()
      }),
      z.object({
        type: z.literal('write'),
        text: z.string()
      }),
      z.object({
        type: z.literal('press'),
        key: z.string()
      }),
      z.object({
        type: z.literal('scroll'),
        direction: z.enum(['up', 'down']).optional(),
        selector: z.string().optional()
      }),
      z.object({
        type: z.literal('scrape')
      }),
      z.object({
        type: z.literal('executeJavascript'),
        script: z.string()
      }),
      z.object({
        type: z.literal('pdf'),
        format: z
          .enum([
            'A0',
            'A1',
            'A2',
            'A3',
            'A4',
            'A5',
            'A6',
            'Letter',
            'Legal',
            'Tabloid',
            'Ledger'
          ])
          .optional(),
        landscape: z.boolean().optional(),
        scale: z.number().optional()
      })
    ]);

    const locationSchema = z.object({
      country: z
        .string()
        .regex(/^[A-Z]{2}$/)
        .optional(),
      languages: z.array(z.string()).optional()
    });

    const scrapeOptionsSchema = z.object({
      formats: z.array(formatSchema).optional(),
      onlyMainContent: z.boolean().optional(),
      includeTags: z.array(z.string()).optional(),
      excludeTags: z.array(z.string()).optional(),
      maxAge: z.number().optional(),
      headers: z.record(z.string()).optional(),
      waitFor: z.number().optional(),
      mobile: z.boolean().optional(),
      skipTlsVerification: z.boolean().optional(),
      timeout: z.number().optional(),
      actions: z.array(actionSchema).optional(),
      location: locationSchema.optional(),
      removeBase64Images: z.boolean().optional(),
      blockAds: z.boolean().optional(),
      proxy: z.enum(['basic', 'stealth', 'auto']).optional(),
      storeInCache: z.boolean().optional()
    });

    // ============================================================================
    // Helper Functions
    // ============================================================================

    /**
     * Make an authenticated request to the Firecrawl API
     */
    async function firecrawlRequest<T>(
      endpoint: string,
      options: RequestInit = {}
    ): Promise<T> {
      const url = `${API_BASE_URL}${endpoint}`;

      const response = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${config.token}`,
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as FirecrawlError;
        throw new Error(
          errorData.error || `Firecrawl API error: ${response.status} ${response.statusText}`
        );
      }

      return (await response.json()) as T;
    }

    /**
     * Format scrape response for display
     */
    function formatScrapeResponse(data: ScrapeResponse): string {
      if (!data.success || !data.data) {
        return JSON.stringify(data, null, 2);
      }

      const parts: string[] = [];

      if (data.data.markdown) {
        parts.push('# Content (Markdown)\n' + data.data.markdown);
      }

      if (data.data.html) {
        parts.push('\n# HTML Content\n' + data.data.html.substring(0, 1000) + '...');
      }

      if (data.data.links && data.data.links.length > 0) {
        parts.push('\n# Links Found\n' + data.data.links.slice(0, 20).join('\n'));
        if (data.data.links.length > 20) {
          parts.push(`... and ${data.data.links.length - 20} more links`);
        }
      }

      if (data.data.metadata) {
        parts.push('\n# Metadata\n' + JSON.stringify(data.data.metadata, null, 2));
      }

      if (data.data.screenshot) {
        parts.push('\n# Screenshot\n' + data.data.screenshot);
      }

      if (data.data.actions) {
        parts.push('\n# Actions Results\n' + JSON.stringify(data.data.actions, null, 2));
      }

      if (data.data.warning) {
        parts.push('\n# Warning\n' + data.data.warning);
      }

      return parts.join('\n');
    }

    // ============================================================================
    // Tool: scrape_url
    // ============================================================================

    server.registerTool(
      'scrape_url',
      {
        title: 'Scrape URL',
        description:
          'Scrape a single URL and return its content in various formats (markdown, HTML, links, screenshots, etc.). Supports advanced features like custom actions, JavaScript execution, and structured data extraction.',
        inputSchema: {
          url: z.string().url().describe('The URL to scrape'),
          formats: z
            .array(formatSchema)
            .optional()
            .describe(
              'Output formats (markdown, html, rawHtml, links, screenshot, json with schema)'
            ),
          onlyMainContent: z
            .boolean()
            .optional()
            .describe('Extract only main content, excluding headers, navs, footers'),
          includeTags: z
            .array(z.string())
            .optional()
            .describe('HTML tags to include in output'),
          excludeTags: z
            .array(z.string())
            .optional()
            .describe('HTML tags to exclude from output'),
          maxAge: z
            .number()
            .optional()
            .describe(
              'Return cached version if younger than this age in ms (default: 2 days)'
            ),
          headers: z
            .record(z.string())
            .optional()
            .describe('Custom HTTP headers (cookies, user-agent, etc.)'),
          waitFor: z.number().optional().describe('Delay in ms before fetching content'),
          mobile: z.boolean().optional().describe('Emulate mobile device'),
          skipTlsVerification: z
            .boolean()
            .optional()
            .describe('Skip TLS certificate verification'),
          timeout: z.number().optional().describe('Request timeout in milliseconds'),
          actions: z
            .array(actionSchema)
            .optional()
            .describe(
              'Actions to perform (wait, click, scroll, screenshot, execute JS, etc.)'
            ),
          location: locationSchema
            .optional()
            .describe('Geographic location settings (country code, languages)'),
          removeBase64Images: z
            .boolean()
            .optional()
            .describe('Remove base64 images from output'),
          blockAds: z
            .boolean()
            .optional()
            .describe('Enable ad-blocking and cookie popup blocking'),
          proxy: z
            .enum(['basic', 'stealth', 'auto'])
            .optional()
            .describe(
              'Proxy type: basic (fast), stealth (reliable), auto (retry with stealth)'
            ),
          storeInCache: z.boolean().optional().describe('Store page in Firecrawl cache'),
          zeroDataRetention: z.boolean().optional().describe('Enable zero data retention mode')
        }
      },
      async params => {
        try {
          const response = await firecrawlRequest<ScrapeResponse>('/scrape', {
            method: 'POST',
            body: JSON.stringify(params)
          });

          return {
            content: [
              {
                type: 'text' as const,
                text: formatScrapeResponse(response)
              }
            ]
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error scraping URL: ${
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
    // Tool: start_crawl
    // ============================================================================

    server.registerTool(
      'start_crawl',
      {
        title: 'Start Crawl',
        description:
          'Start a crawl job to spider an entire website or domain. Supports path filtering, depth control, webhooks, and all scraping options. Returns a crawl job ID for tracking progress.',
        inputSchema: {
          url: z.string().url().describe('Base URL to start crawling from'),
          prompt: z
            .string()
            .optional()
            .describe('Natural language prompt to generate crawler options'),
          excludePaths: z
            .array(z.string())
            .optional()
            .describe('URL pathname regex patterns to exclude'),
          includePaths: z
            .array(z.string())
            .optional()
            .describe('URL pathname regex patterns to include'),
          maxDiscoveryDepth: z
            .number()
            .optional()
            .describe('Maximum depth to crawl based on discovery order'),
          sitemap: z
            .enum(['skip', 'include'])
            .optional()
            .describe('Sitemap mode: include (use sitemap) or skip (discover from links)'),
          ignoreQueryParameters: z
            .boolean()
            .optional()
            .describe('Ignore query parameters when determining unique URLs'),
          limit: z
            .number()
            .optional()
            .describe('Maximum number of pages to crawl (default: 10000)'),
          crawlEntireDomain: z
            .boolean()
            .optional()
            .describe('Follow links to sibling/parent URLs, not just children'),
          allowExternalLinks: z
            .boolean()
            .optional()
            .describe('Follow links to external websites'),
          allowSubdomains: z.boolean().optional().describe('Follow links to subdomains'),
          delay: z.number().optional().describe('Delay in seconds between scrapes'),
          maxConcurrency: z
            .number()
            .optional()
            .describe('Maximum number of concurrent scrapes'),
          webhook: z
            .object({
              url: z.string().url(),
              headers: z.record(z.string()).optional(),
              metadata: z.record(z.any()).optional(),
              events: z.array(z.enum(['completed', 'page', 'failed', 'started'])).optional()
            })
            .optional()
            .describe('Webhook configuration for crawl events'),
          scrapeOptions: scrapeOptionsSchema
            .optional()
            .describe('Scraping options to apply to each page'),
          zeroDataRetention: z.boolean().optional().describe('Enable zero data retention mode')
        }
      },
      async params => {
        try {
          const response = await firecrawlRequest<CrawlResponse>('/crawl', {
            method: 'POST',
            body: JSON.stringify(params)
          });

          if (!response.success || !response.id) {
            throw new Error(response.error || 'Failed to start crawl');
          }

          return {
            content: [
              {
                type: 'text' as const,
                text: `Crawl started successfully!\n\nCrawl ID: ${response.id}\nStatus URL: ${response.url}\n\nUse get_crawl_status tool with this ID to check progress.`
              }
            ]
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error starting crawl: ${
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
    // Tool: get_crawl_status
    // ============================================================================

    server.registerTool(
      'get_crawl_status',
      {
        title: 'Get Crawl Status',
        description:
          'Check the status and progress of a crawl job. Returns current status, number of pages crawled, credits used, and scraped data.',
        inputSchema: {
          crawlId: z.string().describe('The crawl job ID returned from start_crawl'),
          limit: z
            .number()
            .optional()
            .describe('Maximum number of results to return per page'),
          next: z.string().optional().describe('Pagination cursor from previous response')
        }
      },
      async ({ crawlId, limit, next }) => {
        try {
          let endpoint = `/crawl/${encodeURIComponent(crawlId)}`;
          const params = new URLSearchParams();
          if (limit) params.append('limit', String(limit));
          if (next) params.append('next', next);
          if (params.toString()) endpoint += `?${params.toString()}`;

          const response = await firecrawlRequest<CrawlStatusResponse>(endpoint, {
            method: 'GET'
          });

          if (!response.success) {
            throw new Error(response.error || 'Failed to get crawl status');
          }

          const statusText = [
            `Crawl Status: ${response.status}`,
            `Progress: ${response.completed || 0} / ${response.total || 0} pages`,
            `Credits Used: ${response.creditsUsed || 0}`,
            response.expiresAt ? `Expires At: ${response.expiresAt}` : '',
            response.next ? `\nMore results available (use next: ${response.next})` : ''
          ]
            .filter(Boolean)
            .join('\n');

          let dataText = '';
          if (response.data && response.data.length > 0) {
            dataText = `\n\n# Scraped Pages (${response.data.length})\n\n`;
            response.data.forEach((page, idx) => {
              dataText += `## Page ${idx + 1}\n`;
              if (page.metadata?.sourceURL) {
                dataText += `URL: ${page.metadata.sourceURL}\n`;
              }
              if (page.markdown) {
                dataText += `${page.markdown.substring(0, 500)}...\n\n`;
              }
            });
          }

          return {
            content: [
              {
                type: 'text' as const,
                text: statusText + dataText
              }
            ]
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error getting crawl status: ${
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
    // Tool: cancel_crawl
    // ============================================================================

    server.registerTool(
      'cancel_crawl',
      {
        title: 'Cancel Crawl',
        description: 'Cancel an ongoing crawl job.',
        inputSchema: {
          crawlId: z.string().describe('The crawl job ID to cancel')
        }
      },
      async ({ crawlId }) => {
        try {
          const response = await firecrawlRequest(`/crawl/${encodeURIComponent(crawlId)}`, {
            method: 'DELETE'
          });

          return {
            content: [
              {
                type: 'text' as const,
                text: `Crawl ${crawlId} cancelled successfully.`
              }
            ]
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error cancelling crawl: ${
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
    // Resource: Scraped Page
    // ============================================================================

    server.registerResource(
      'scraped-page',
      new ResourceTemplate('firecrawl://scraped/{url}', { list: undefined }),
      {
        title: 'Scraped Page',
        description: 'Access scraped content of a specific URL'
      },
      async (uri, { url }) => {
        try {
          const decodedUrl = decodeURIComponent(url as string);

          const response = await firecrawlRequest<ScrapeResponse>('/scrape', {
            method: 'POST',
            body: JSON.stringify({
              url: decodedUrl,
              formats: ['markdown', 'html', 'links']
            })
          });

          return {
            contents: [
              {
                uri: uri.href,
                mimeType: 'application/json',
                text: JSON.stringify(response.data, null, 2)
              }
            ]
          };
        } catch (error) {
          throw new Error(
            `Failed to fetch scraped page: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
    );

    // ============================================================================
    // Resource: Crawl Job
    // ============================================================================

    server.registerResource(
      'crawl-job',
      new ResourceTemplate('firecrawl://crawl/{crawlId}', { list: undefined }),
      {
        title: 'Crawl Job',
        description: 'Access a specific crawl job and its results'
      },
      async (uri, { crawlId }) => {
        try {
          const response = await firecrawlRequest<CrawlStatusResponse>(
            `/crawl/${encodeURIComponent(crawlId as string)}`,
            { method: 'GET' }
          );

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
            `Failed to fetch crawl job: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
    );

    // ============================================================================
    // Resource: Crawl Job Pages
    // ============================================================================

    server.registerResource(
      'crawl-pages',
      new ResourceTemplate('firecrawl://crawl/{crawlId}/pages', { list: undefined }),
      {
        title: 'Crawl Job Pages',
        description: 'Access all pages from a crawl job'
      },
      async (uri, { crawlId }) => {
        try {
          const response = await firecrawlRequest<CrawlStatusResponse>(
            `/crawl/${encodeURIComponent(crawlId as string)}`,
            { method: 'GET' }
          );

          return {
            contents: [
              {
                uri: uri.href,
                mimeType: 'application/json',
                text: JSON.stringify(response.data || [], null, 2)
              }
            ]
          };
        } catch (error) {
          throw new Error(
            `Failed to fetch crawl pages: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
    );

    // ============================================================================
    // Resource: Crawl Job Page by Index
    // ============================================================================

    server.registerResource(
      'crawl-page',
      new ResourceTemplate('firecrawl://crawl/{crawlId}/page/{pageIndex}', {
        list: undefined
      }),
      {
        title: 'Crawl Job Page',
        description: 'Access a specific page from a crawl job by index'
      },
      async (uri, { crawlId, pageIndex }) => {
        try {
          const response = await firecrawlRequest<CrawlStatusResponse>(
            `/crawl/${encodeURIComponent(crawlId as string)}`,
            { method: 'GET' }
          );

          const index = parseInt(pageIndex as string, 10);
          if (isNaN(index) || !response.data || index < 0 || index >= response.data.length) {
            throw new Error(`Invalid page index: ${pageIndex}`);
          }

          return {
            contents: [
              {
                uri: uri.href,
                mimeType: 'application/json',
                text: JSON.stringify(response.data[index], null, 2)
              }
            ]
          };
        } catch (error) {
          throw new Error(
            `Failed to fetch crawl page: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
    );
  }
);
