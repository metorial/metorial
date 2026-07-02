import { SlateTool } from 'slates';
import { z } from 'zod';
import { DynamicsClient } from '../lib/client';
import { resolveDynamicsInstanceUrl } from '../lib/resolve-instance-url';
import { spec } from '../spec';

export let getRecord = SlateTool.create(spec, {
  name: 'Get Record',
  key: 'get_record',
  description: `Retrieve a single record by its ID from any Dynamics 365 entity. Supports selecting specific columns and expanding related records via navigation properties.`,
  instructions: [
    'Use $select to limit returned columns and improve performance.',
    'Use $expand to include related entity data in the response (e.g., "primarycontactid" or "contact_customer_accounts").'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      entitySetName: z
        .string()
        .describe('OData entity set name (e.g., "accounts", "contacts", "leads")'),
      recordId: z.string().describe('GUID of the record to retrieve'),
      select: z.array(z.string()).optional().describe('List of column names to return'),
      expand: z
        .string()
        .optional()
        .describe('Navigation property to expand (e.g., "primarycontactid($select=fullname)")')
    })
  )
  .output(
    z.object({
      record: z.record(z.string(), z.any()).describe('The retrieved record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DynamicsClient({
      token: ctx.auth.token,
      instanceUrl: resolveDynamicsInstanceUrl(ctx)
    });

    let record = await client.getRecord(ctx.input.entitySetName, ctx.input.recordId, {
      select: ctx.input.select,
      expand: ctx.input.expand
    });

    return {
      output: { record },
      message: `Retrieved record **${ctx.input.recordId}** from **${ctx.input.entitySetName}**.`
    };
  })
  .build();
