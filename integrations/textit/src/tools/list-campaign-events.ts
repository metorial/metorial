import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const listCampaignEvents = SlateTool.create(spec, {
  name: 'List Campaign Events',
  key: 'list_campaign_events',
  description:
    'List campaign events to inspect schedules and discover event UUIDs for updates or deletion.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      eventUuid: z.string().optional().describe('Filter by campaign event UUID.'),
      campaignUuid: z
        .string()
        .optional()
        .describe('Filter by campaign UUID from list_campaigns.'),
      cursor: z
        .string()
        .optional()
        .describe('Opaque nextCursor from the previous response; keep the same filters.')
    })
  )
  .output(
    z.object({
      campaignEvents: z.array(
        z.object({
          eventUuid: z.string(),
          campaign: z.object({ uuid: z.string(), name: z.string() }),
          relativeTo: z.object({ key: z.string(), name: z.string() }),
          offset: z.number(),
          unit: z.string(),
          deliveryHour: z.number(),
          message: z.record(z.string(), z.string()).nullable(),
          flow: z.object({ uuid: z.string(), name: z.string() }).nullable(),
          createdOn: z.string()
        })
      ),
      hasMore: z.boolean(),
      nextCursor: z.string().nullable(),
      raw: z.unknown()
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client(ctx.auth.token);
    const result = await client.listCampaignEvents({
      uuid: ctx.input.eventUuid,
      campaign: ctx.input.campaignUuid,
      cursor: ctx.input.cursor
    });
    return {
      output: {
        campaignEvents: result.results.map(item => ({
          eventUuid: item.uuid,
          campaign: item.campaign,
          relativeTo: item.relative_to,
          offset: item.offset,
          unit: item.unit,
          deliveryHour: item.delivery_hour,
          message: item.message,
          flow: item.flow,
          createdOn: item.created_on
        })),
        hasMore: result.next !== null,
        nextCursor: client.nextCursor(result),
        raw: result
      },
      message: `Found **${result.results.length}** campaign events.`
    };
  })
  .build();
