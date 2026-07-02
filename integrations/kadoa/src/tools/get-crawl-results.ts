import { SlateTool } from 'slates';
import { z } from 'zod';
import { KadoaClient } from '../lib/client';
import { spec } from '../spec';

export let getCrawlResults = SlateTool.create(spec, {
  name: 'Get Crawl Results',
  key: 'get_crawl_results',
  description: `Check crawl session status and retrieve crawled pages. Optionally fetch the content of a specific page in markdown or HTML format.
Use this to monitor crawl progress and retrieve results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sessionId: z.string().describe('Crawl session ID'),
      pageId: z.string().optional().describe('Specific page ID to retrieve content for'),
      contentFormat: z
        .enum(['markdown', 'html'])
        .optional()
        .describe('Format for page content retrieval'),
      currentPage: z.number().optional().describe('Page number for paginated page list'),
      pageSize: z.number().optional().describe('Number of pages per request')
    })
  )
  .output(
    z.object({
      finished: z.boolean().optional().describe('Whether the crawl is complete'),
      crawledPages: z.number().optional().describe('Number of pages crawled so far'),
      pages: z
        .array(
          z.object({
            pageId: z.string().describe('Page ID'),
            url: z.string().optional().describe('Page URL'),
            status: z.string().optional().describe('Page crawl status')
          })
        )
        .optional()
        .describe('List of crawled pages'),
      pageContent: z
        .string()
        .optional()
        .describe('Content of a specific page (when pageId is provided)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KadoaClient({ token: ctx.auth.token });
    let { sessionId, pageId, contentFormat, currentPage, pageSize } = ctx.input;

    // If a specific page content is requested
    if (pageId) {
      let content = await client.getCrawlPageContent(sessionId, pageId, contentFormat);
      return {
        output: {
          pageContent:
            typeof content === 'string'
              ? content
              : content.payload || content.content || JSON.stringify(content)
        },
        message: `Retrieved content for page **${pageId}** in **${contentFormat || 'default'}** format.`
      };
    }

    // Get session status
    let status = await client.getCrawlStatus(sessionId);
    let finished = status.payload?.finished ?? status.finished;
    let crawledPagesCount = status.payload?.crawledPages ?? status.crawledPages;

    // Get page list
    let pagesResult = await client.getCrawlPages(sessionId, { currentPage, pageSize });
    let pages = (pagesResult.payload || pagesResult.pages || pagesResult || []).map(
      (p: any) => ({
        pageId: p.id || p.pageId,
        url: p.url,
        status: p.status
      })
    );

    return {
      output: {
        finished,
        crawledPages: crawledPagesCount,
        pages
      },
      message: `Crawl session **${sessionId}**: ${finished ? '**completed**' : '**in progress**'}, ${crawledPagesCount || 0} page(s) crawled, ${pages.length} page(s) listed.`
    };
  })
  .build();
