import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ScrapeDoClient } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Read the authenticated account’s async scraping capacity, active job count, and available credits.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(z.object({ user: z.record(z.string(), z.unknown()) }))
  .handleInvocation(async ctx => {
    let user = await new ScrapeDoClient(ctx.auth.token).getCurrentUser();
    let details = z
      .object({
        TotalConcurrency: z.number(),
        FreeConcurrency: z.number(),
        ActiveJobs: z.number(),
        AvaliableCredits: z.number()
      })
      .safeParse(user);
    if (!details.success) {
      throw createApiServiceError('Scrape.do returned invalid async account information.');
    }
    return {
      output: { user },
      message: `Async account has **${details.data.ActiveJobs}** active job(s) and **${details.data.FreeConcurrency}**/${details.data.TotalConcurrency} available concurrent slots.`
    };
  })
  .build();
