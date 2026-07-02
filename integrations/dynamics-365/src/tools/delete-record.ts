import { SlateTool } from 'slates';
import { z } from 'zod';
import { DynamicsClient } from '../lib/client';
import { resolveDynamicsInstanceUrl } from '../lib/resolve-instance-url';
import { spec } from '../spec';

export let deleteRecord = SlateTool.create(spec, {
  name: 'Delete Record',
  key: 'delete_record',
  description: `Permanently delete a record from any Dynamics 365 entity. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      entitySetName: z
        .string()
        .describe('OData entity set name (e.g., "accounts", "contacts", "leads")'),
      recordId: z.string().describe('GUID of the record to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the record was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DynamicsClient({
      token: ctx.auth.token,
      instanceUrl: resolveDynamicsInstanceUrl(ctx)
    });

    await client.deleteRecord(ctx.input.entitySetName, ctx.input.recordId);

    return {
      output: { deleted: true },
      message: `Deleted record **${ctx.input.recordId}** from **${ctx.input.entitySetName}**.`
    };
  })
  .build();
