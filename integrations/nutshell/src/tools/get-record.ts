import { SlateTool } from 'slates';
import { z } from 'zod';
import { NutshellClient } from '../lib/client';
import { spec } from '../spec';

export let getRecord = SlateTool.create(spec, {
  name: 'Get Record',
  key: 'get_record',
  description:
    'Retrieve an activity, task, or note by API ID, including its exact current revision and related record identifiers.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      entityType: z.enum(['Activities', 'Tasks', 'Notes']),
      entityId: z.number().describe('API ID returned by the corresponding create tool')
    })
  )
  .output(
    z.object({
      entityId: z.number(),
      entityType: z.string(),
      rev: z.string(),
      record: z.record(z.string(), z.unknown())
    })
  )
  .handleInvocation(async ctx => {
    let record = await new NutshellClient(ctx.auth).getRecord(
      ctx.input.entityType,
      ctx.input.entityId
    );
    return {
      output: { entityId: record.id, entityType: record.entityType, rev: record.rev, record },
      message: `Retrieved ${record.entityType} record ${record.id}.`
    };
  })
  .build();
