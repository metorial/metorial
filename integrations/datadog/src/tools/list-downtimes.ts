import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listDowntimes = SlateTool.create(spec, {
  name: 'List Downtimes',
  key: 'list_downtimes',
  description: `List Datadog monitor downtimes. Use this to inspect active or scheduled notification suppression windows.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageLimit: z.number().optional().describe('Maximum number of downtimes to return'),
      pageOffset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      downtimes: z
        .array(
          z.object({
            downtimeId: z.string(),
            status: z.string().optional(),
            scope: z.string().optional(),
            message: z.string().optional(),
            monitorId: z.number().optional(),
            monitorTags: z.array(z.string()).optional(),
            created: z.string().optional(),
            modified: z.string().optional()
          })
        )
        .describe('Datadog downtimes'),
      nextOffset: z.number().optional().describe('Next pagination offset')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let result = await client.listDowntimes(ctx.input);

    let downtimes = (result.data || []).map((downtime: any) => ({
      downtimeId: downtime.id,
      status: downtime.attributes?.status,
      scope: downtime.attributes?.scope,
      message: downtime.attributes?.message,
      monitorId: downtime.attributes?.monitor_identifier?.monitor_id,
      monitorTags: downtime.attributes?.monitor_identifier?.monitor_tags,
      created: downtime.attributes?.created,
      modified: downtime.attributes?.modified
    }));

    return {
      output: {
        downtimes,
        nextOffset: result.meta?.pagination?.next_offset
      },
      message: `Found **${downtimes.length}** downtimes`
    };
  })
  .build();
