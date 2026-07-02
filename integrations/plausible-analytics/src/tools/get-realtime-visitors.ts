import { SlateTool } from 'slates';
import { z } from 'zod';
import { StatsClient } from '../lib/client';
import { spec } from '../spec';

export let getRealtimeVisitors = SlateTool.create(spec, {
  name: 'Get Realtime Visitors',
  key: 'get_realtime_visitors',
  description: `Get the current number of visitors on your website in real time. Returns a single count of active visitors within the last 5 minutes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      siteId: z
        .string()
        .describe('Domain of your site as registered in Plausible (e.g., "example.com")')
    })
  )
  .output(
    z.object({
      visitorCount: z.number().describe('Number of current visitors on the site')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StatsClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let count = await client.getRealtimeVisitors(ctx.input.siteId);

    return {
      output: {
        visitorCount: typeof count === 'number' ? count : Number(count)
      },
      message: `**${ctx.input.siteId}** currently has **${count}** active visitor(s).`
    };
  })
  .build();
