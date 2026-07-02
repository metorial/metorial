import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getBroadcastLinkClicks = SlateTool.create(spec, {
  name: 'Get Broadcast Link Clicks',
  key: 'get_broadcast_link_clicks',
  description: `List link click performance for a broadcast, including unique clicks, click-to-delivery rate, and click-to-open rate.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      broadcastId: z.number().describe('The broadcast ID to inspect'),
      perPage: z.number().optional().describe('Number of links per page (max 1000)'),
      afterCursor: z.string().optional().describe('Pagination cursor to fetch next page'),
      beforeCursor: z.string().optional().describe('Pagination cursor to fetch previous page')
    })
  )
  .output(
    z.object({
      broadcastId: z.number().describe('Broadcast ID'),
      clicks: z.array(
        z.object({
          url: z.string().describe('Clicked URL'),
          uniqueClicks: z.number().describe('Unique click count'),
          clickToDeliveryRate: z.number().describe('Click-to-delivery rate'),
          clickToOpenRate: z.number().describe('Click-to-open rate')
        })
      ),
      hasNextPage: z.boolean().describe('Whether more results are available'),
      endCursor: z.string().nullable().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getBroadcastLinkClicks(ctx.input.broadcastId, {
      perPage: ctx.input.perPage,
      after: ctx.input.afterCursor,
      before: ctx.input.beforeCursor
    });

    let clicks = result.clicks.map(click => ({
      url: click.url,
      uniqueClicks: click.unique_clicks,
      clickToDeliveryRate: click.click_to_delivery_rate,
      clickToOpenRate: click.click_to_open_rate
    }));

    return {
      output: {
        broadcastId: result.broadcastId,
        clicks,
        hasNextPage: result.pagination.has_next_page,
        endCursor: result.pagination.end_cursor
      },
      message: `Found **${clicks.length}** tracked links for broadcast \`${result.broadcastId}\`.`
    };
  })
  .build();
