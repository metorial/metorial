import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { dataForSEOServiceError } from '../lib/errors';
import { spec } from '../spec';

export let onPageResults = SlateTool.create(spec, {
  name: 'On-Page Results',
  key: 'on_page_results',
  description: `Retrieve OnPage crawl results for a previously created audit task. Use "summary" for crawl progress and aggregate technical SEO issue counts, or "pages" for crawled page-level metrics and checks.`,
  instructions: [
    'Provide the task ID returned by On-Page Audit.',
    'Use summary to check crawl progress and aggregate issue counts.',
    'Use pages to inspect individual crawled URLs with optional pagination, filters, and ordering.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      taskId: z.string().describe('Task ID returned by the On-Page Audit tool'),
      resultType: z
        .enum(['summary', 'pages'])
        .default('summary')
        .describe('Type of OnPage result to retrieve'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of pages to return for pages mode'),
      offset: z.number().optional().describe('Pagination offset for pages mode'),
      filters: z
        .array(z.any())
        .optional()
        .describe('DataForSEO OnPage pages filters. Applies only to pages mode.'),
      orderBy: z
        .array(z.string())
        .optional()
        .describe('Sort rules such as ["checks.is_broken,desc"]. Applies only to pages mode.')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('The OnPage task ID'),
      resultType: z.string().describe('The result type retrieved'),
      crawlProgress: z.string().optional().describe('Current crawl progress for summary mode'),
      summary: z.any().optional().describe('OnPage summary result'),
      totalCount: z.number().optional().describe('Total number of matching pages'),
      pages: z.array(z.any()).optional().describe('Page-level OnPage results'),
      cost: z.number().optional().describe('API cost')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.resultType === 'summary') {
      if (
        ctx.input.limit !== undefined ||
        ctx.input.offset !== undefined ||
        ctx.input.filters ||
        ctx.input.orderBy
      ) {
        throw dataForSEOServiceError(
          'limit, offset, filters, and orderBy only apply when resultType is "pages".'
        );
      }

      let response = await client.onPageSummary(ctx.input.taskId);
      let result = client.extractFirstResult(response);

      return {
        output: {
          taskId: ctx.input.taskId,
          resultType: ctx.input.resultType,
          crawlProgress: result?.crawl_progress,
          summary: result,
          cost: response.cost
        },
        message: `Retrieved OnPage summary for task \`${ctx.input.taskId}\` with crawl progress **${result?.crawl_progress ?? 'unknown'}**.`
      };
    }

    let response = await client.onPagePages({
      taskId: ctx.input.taskId,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      filters: ctx.input.filters,
      orderBy: ctx.input.orderBy
    });
    let result = client.extractFirstResult(response);
    let pages = result?.items ?? [];

    return {
      output: {
        taskId: ctx.input.taskId,
        resultType: ctx.input.resultType,
        totalCount: result?.total_count,
        pages,
        cost: response.cost
      },
      message: `Retrieved **${pages.length}** OnPage page result(s) for task \`${ctx.input.taskId}\`.`
    };
  })
  .build();
