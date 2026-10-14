import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let cancelCrawl = SlateTool.create(spec, {
  name: 'Cancel Crawl',
  key: 'cancel_crawl',
  description:
    'Stop a pending or running website crawl. Already collected pages remain available. Cancelling a finished crawl succeeds without changing its outcome.',
  tags: { readOnly: false, destructive: false }
})
  .input(z.object({ crawlUuid: z.string().describe('UUID returned by start_crawl.') }))
  .output(
    z.object({
      crawlUuid: z.string(),
      status: z.string().describe('Current crawl status after the cancellation request.'),
      isFinished: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    await client.cancelCrawl(ctx.input.crawlUuid);
    let status = await client.getCrawlStatus(ctx.input.crawlUuid);
    return {
      output: {
        crawlUuid: ctx.input.crawlUuid,
        status: status.status,
        isFinished: status.is_finished
      },
      message: `Cancellation request accepted for crawl \`${ctx.input.crawlUuid}\`. Current status: ${status.status}.`
    };
  })
  .build();
