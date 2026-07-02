import { SlateTool } from 'slates';
import { z } from 'zod';
import { FluxguardClient } from '../lib/client';
import { spec } from '../spec';

export let startCrawl = SlateTool.create(spec, {
  name: 'Start Crawl',
  key: 'start_crawl',
  description: `Trigger an on-demand crawl of a monitored session. Fluxguard uses a full headless Chrome browser for crawling, so all JavaScript, CSS, and images are loaded and executed. Use this to immediately check for changes rather than waiting for the scheduled interval.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      siteId: z.string().describe('ID of the site to crawl'),
      sessionId: z.string().describe('ID of the session to crawl')
    })
  )
  .output(
    z.object({
      siteId: z.string().describe('ID of the crawled site'),
      sessionId: z.string().describe('ID of the crawled session'),
      started: z.boolean().describe('Whether the crawl was successfully initiated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FluxguardClient(ctx.auth.token);

    await client.startCrawl(ctx.input.siteId, ctx.input.sessionId);

    return {
      output: {
        siteId: ctx.input.siteId,
        sessionId: ctx.input.sessionId,
        started: true
      },
      message: `Started crawl for session \`${ctx.input.sessionId}\` in site \`${ctx.input.siteId}\`.`
    };
  })
  .build();
