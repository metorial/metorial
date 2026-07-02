import { SlateTool } from 'slates';
import { z } from 'zod';
import { DynamicsClient } from '../lib/client';
import { resolveDynamicsInstanceUrl } from '../lib/resolve-instance-url';
import { spec } from '../spec';

export let updateRecord = SlateTool.create(spec, {
  name: 'Update Record',
  key: 'update_record',
  description: `Update an existing record in any Dynamics 365 entity. Only the fields included in the update data will be modified; other fields remain unchanged.`,
  instructions: [
    'Only include fields you want to change in recordData. Omitted fields will not be modified.',
    'To clear a field value, set it to null.',
    'Use @odata.bind to update lookup references.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      entitySetName: z
        .string()
        .describe('OData entity set name (e.g., "accounts", "contacts", "leads")'),
      recordId: z.string().describe('GUID of the record to update'),
      recordData: z
        .record(z.string(), z.any())
        .describe('Fields and values to update on the record')
    })
  )
  .output(
    z.object({
      record: z
        .record(z.string(), z.any())
        .describe('The updated record with all returned fields')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DynamicsClient({
      token: ctx.auth.token,
      instanceUrl: resolveDynamicsInstanceUrl(ctx)
    });

    let record = await client.updateRecord(
      ctx.input.entitySetName,
      ctx.input.recordId,
      ctx.input.recordData
    );

    return {
      output: { record },
      message: `Updated record **${ctx.input.recordId}** in **${ctx.input.entitySetName}**.`
    };
  })
  .build();
