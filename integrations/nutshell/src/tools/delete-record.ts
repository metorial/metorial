import { SlateTool } from 'slates';
import { z } from 'zod';
import { NutshellClient } from '../lib/client';
import { spec } from '../spec';

export let deleteRecord = SlateTool.create(spec, {
  name: 'Delete Record',
  key: 'delete_record',
  description:
    'Delete one contact, account, lead, activity, task, or note using the exact current revision. This can remove related CRM data; verify the target and ownership first.',
  instructions: [
    'Read the target with the matching get tool immediately before deleting it. Revision bypass is not supported.'
  ],
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      entityType: z.enum(['Contacts', 'Accounts', 'Leads', 'Activities', 'Tasks', 'Notes']),
      entityId: z.number().describe('Exact API ID of the record to delete'),
      rev: z
        .string()
        .describe('Exact revision from the latest get response; REV_IGNORE is rejected')
    })
  )
  .output(z.object({ entityId: z.number(), entityType: z.string(), deleted: z.boolean() }))
  .handleInvocation(async ctx => {
    let deleted = await new NutshellClient(ctx.auth).deleteRecord(
      ctx.input.entityType,
      ctx.input.entityId,
      ctx.input.rev
    );
    return {
      output: { entityId: ctx.input.entityId, entityType: ctx.input.entityType, deleted },
      message: `Deleted ${ctx.input.entityType} record ${ctx.input.entityId}.`
    };
  })
  .build();
