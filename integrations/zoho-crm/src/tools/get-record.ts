import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getRecord = SlateTool.create(spec, {
  name: 'Get Record',
  key: 'get_record',
  description: `Retrieve a single record by its ID from any Zoho CRM module.
Returns the full record with all fields, or optionally only specific fields.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      module: z
        .string()
        .describe('API name of the CRM module, e.g. "Leads", "Contacts", "Deals"'),
      recordId: z.string().describe('ID of the record to retrieve'),
      fields: z
        .array(z.string())
        .optional()
        .describe('Specific field API names to include in the response')
    })
  )
  .output(
    z.object({
      record: z.record(z.string(), z.any()).describe('The CRM record data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiBaseUrl: ctx.auth.apiBaseUrl
    });

    let result = await client.getRecord(
      ctx.input.module,
      ctx.input.recordId,
      ctx.input.fields
    );
    let record = result?.data?.[0] || {};

    return {
      output: { record },
      message: `Retrieved record **${ctx.input.recordId}** from **${ctx.input.module}**.`
    };
  })
  .build();
