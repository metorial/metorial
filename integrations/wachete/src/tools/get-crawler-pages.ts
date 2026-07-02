import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCrawlerPages = SlateTool.create(spec, {
  name: 'Get Crawler Pages',
  key: 'get_crawler_pages',
  description: `Retrieves the list of pages discovered by a Portal-type monitor's crawler.
Each page includes its URL, name, and the latest captured content data.
Only applicable to monitors with jobType "Portal".`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      wachetId: z.string().describe('ID of the Portal-type monitor')
    })
  )
  .output(
    z.object({
      pages: z
        .array(
          z.object({
            pageId: z.string().optional().describe('Page ID'),
            name: z.string().optional().describe('Page name'),
            url: z.string().optional().describe('Page URL'),
            lastCheckTimestamp: z
              .string()
              .optional()
              .describe('When the page was last checked'),
            lastValue: z.string().optional().describe('Last captured content value'),
            lastError: z.string().optional().describe('Last error if any')
          })
        )
        .describe('Pages discovered by the crawler')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let pages = await client.getCrawlerPages(ctx.input.wachetId);

    let mappedPages = pages.map(p => ({
      pageId: p.id,
      name: p.name,
      url: p.url,
      lastCheckTimestamp: p.data?.lastCheckTimestamp,
      lastValue: p.data?.raw,
      lastError: p.data?.error
    }));

    return {
      output: { pages: mappedPages },
      message: `Found **${mappedPages.length}** crawled page(s) for monitor \`${ctx.input.wachetId}\`.`
    };
  })
  .build();
