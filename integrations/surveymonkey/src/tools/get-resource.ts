import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { id, invalid } from '../lib/response';
import { spec } from '../spec';
export let getResource = SlateTool.create(spec, {
  key: 'get_resource',
  name: 'Get Resource',
  description:
    'Inspect an exact collector, contact list, or invitation message using IDs discovered by the list tools or returned by creation. Useful for recovery after an uncertain write.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      resource: z.enum(['collector', 'contact_list', 'message']),
      resourceId: id,
      collectorId: id.optional().describe('Required for an invitation message.')
    })
  )
  .output(
    z.object({
      resource: z.string(),
      resourceId: z.string(),
      data: z.record(z.string(), z.unknown())
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    if (ctx.input.resource === 'message' && !ctx.input.collectorId)
      throw invalid('Provide collectorId for a message.');
    if (ctx.input.resource !== 'message' && ctx.input.collectorId)
      throw invalid('collectorId applies only to a message.');
    let data =
      ctx.input.resource === 'collector'
        ? await client.getCollector(ctx.input.resourceId)
        : ctx.input.resource === 'contact_list'
          ? await client.getContactList(ctx.input.resourceId)
          : await client.getMessage(ctx.input.collectorId!, ctx.input.resourceId);
    let keys =
      ctx.input.resource === 'collector'
        ? [
            'id',
            'type',
            'name',
            'status',
            'url',
            'survey_id',
            'date_created',
            'date_modified',
            'response_count',
            'allow_multiple_responses'
          ]
        : ctx.input.resource === 'contact_list'
          ? ['id', 'name', 'href']
          : [
              'id',
              'type',
              'status',
              'is_scheduled',
              'scheduled_date',
              'subject',
              'body',
              'date_created'
            ];
    let publicData = Object.fromEntries(
      keys.filter(key => data[key] !== undefined).map(key => [key, data[key]])
    );
    return {
      output: { resource: ctx.input.resource, resourceId: data.id, data: publicData },
      message: `Retrieved ${ctx.input.resource} ${data.id}.`
    };
  })
  .build();
