import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { KadoaClient } from '../lib/client';
import { validateKadoaInteger } from '../lib/validation';
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
      page: z.number().optional().describe('Current page of the crawled-page list'),
      totalPages: z.number().optional().describe('Total pages in the crawled-page list'),
      totalItems: z.number().optional().describe('Total crawled pages available'),
      hasMore: z.boolean().optional().describe('Whether more pages are available'),
      pageContent: z
        .string()
        .optional()
        .describe('Content of a specific page (when pageId is provided)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KadoaClient({ token: ctx.auth.token });
    let { sessionId, pageId, contentFormat, currentPage, pageSize } = ctx.input;

    validateKadoaInteger(currentPage, 'currentPage', 1);
    validateKadoaInteger(pageSize, 'pageSize', 1);

    // If a specific page content is requested
    if (pageId) {
      let content = await client.getCrawlPageContent(sessionId, pageId, contentFormat);
      if (content === null || content === undefined) {
        throw createApiServiceError('Kadoa returned no content for this crawl page.');
      }
      let payload =
        typeof content === 'string'
          ? content
          : content.payload || content.content || JSON.stringify(content);
      let pageContent =
        typeof payload === 'string' ? payload : JSON.stringify(payload ?? content);
      let format = contentFormat ?? content.pageFormat;
      let mimeType =
        format === 'html'
          ? 'text/html'
          : format === 'markdown'
            ? 'text/markdown'
            : 'text/plain';
      await ctx.addAttachment({
        type: 'content',
        content: new Response(pageContent, {
          headers: { 'Content-Type': `${mimeType}; charset=utf-8` }
        }),
        filename: `crawl-${pageId}.${format === 'html' ? 'html' : format === 'markdown' ? 'md' : 'txt'}`,
        mimeType
      });
      return {
        output: { pageContent },
        message: `Retrieved content for page **${pageId}** in **${contentFormat || 'default'}** format.`
      };
    }

    // Get session status
    let status = await client.getCrawlStatus(sessionId);
    let finished = status.payload?.finished ?? status.finished ?? undefined;
    let crawledPagesCount = status.payload?.crawledPages ?? status.crawledPages ?? undefined;

    // Get page list
    let pagesResult = await client.getCrawlPages(sessionId, { currentPage, pageSize });
    let pageRows = pagesResult.payload ?? pagesResult.pages ?? pagesResult;
    if (!Array.isArray(pageRows)) {
      throw createApiServiceError(
        'Kadoa returned an invalid crawled-page list. Try requesting the session again.'
      );
    }
    let pages = pageRows.map((p: any) => ({
      pageId: p.id || p.pageId,
      url: p.url ?? undefined,
      status: p.status ?? undefined
    }));

    return {
      output: {
        finished,
        crawledPages: crawledPagesCount,
        pages,
        page: pagesResult.pagination?.page ?? undefined,
        totalPages: pagesResult.pagination?.totalPages ?? undefined,
        totalItems: pagesResult.pagination?.totalItems ?? undefined,
        hasMore: pagesResult.pagination?.hasMore ?? undefined
      },
      message: `Crawl session **${sessionId}**: ${finished ? '**completed**' : '**in progress**'}, ${crawledPagesCount || 0} page(s) crawled, ${pages.length} page(s) listed.`
    };
  })
  .build();
