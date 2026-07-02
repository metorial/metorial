import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteEvents = SlateTool.create(spec, {
  name: 'Delete Events',
  key: 'delete_events',
  description: `Delete events from a Keen.io event collection. Optionally narrow the scope using filters, timeframe, or timezone. Without filters or timeframe, **all events** in the collection will be deleted.`,
  constraints: [
    'Requires Master Key authentication.',
    'Deletion is permanent and irreversible.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      collectionName: z.string().describe('The event collection to delete events from'),
      timeframe: z
        .union([
          z.string(),
          z.object({
            start: z.string().describe('ISO 8601 start datetime'),
            end: z.string().describe('ISO 8601 end datetime')
          })
        ])
        .optional()
        .describe('Timeframe to scope the deletion'),
      filters: z
        .array(
          z.object({
            propertyName: z.string().describe('The event property to filter on'),
            operator: z.string().describe('The filter operator'),
            propertyValue: z.any().describe('The value to compare against')
          })
        )
        .optional()
        .describe('Filters to narrow which events are deleted'),
      timezone: z.string().optional().describe('Timezone for timeframe calculations')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      projectId: ctx.config.projectId,
      token: ctx.auth.token
    });

    let params: Record<string, any> = {};
    if (ctx.input.timeframe) params.timeframe = ctx.input.timeframe;
    if (ctx.input.timezone) params.timezone = ctx.input.timezone;
    if (ctx.input.filters) {
      params.filters = ctx.input.filters.map(f => ({
        property_name: f.propertyName,
        operator: f.operator,
        property_value: f.propertyValue
      }));
    }

    await client.deleteEvents(
      ctx.input.collectionName,
      Object.keys(params).length > 0 ? params : undefined
    );

    let scopeDesc =
      ctx.input.timeframe || ctx.input.filters ? 'matching events' : 'all events';

    return {
      output: { success: true },
      message: `Deleted ${scopeDesc} from collection **${ctx.input.collectionName}**.`
    };
  });
