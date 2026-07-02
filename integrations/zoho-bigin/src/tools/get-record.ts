import { SlateTool } from 'slates';
import { z } from 'zod';
import { BiginClient } from '../lib/client';
import { spec } from '../spec';

export let getRecord = SlateTool.create(spec, {
  name: 'Get Record',
  key: 'get_record',
  description: `Retrieve a single record by its ID from any Bigin module. Returns all fields for the specified record.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      module: z
        .enum(['Contacts', 'Accounts', 'Pipelines', 'Products', 'Tasks', 'Events', 'Calls'])
        .describe('Module API name. Accounts = Companies, Pipelines = Deals.'),
      recordId: z.string().describe('Unique ID of the record to retrieve')
    })
  )
  .output(
    z.object({
      record: z.record(z.string(), z.any()).describe('The record data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BiginClient({
      token: ctx.auth.token,
      apiDomain: ctx.auth.apiDomain
    });

    let result = await client.getRecord(ctx.input.module, ctx.input.recordId);
    let record = result.data?.[0] || {};

    return {
      output: { record },
      message: `Retrieved record **${ctx.input.recordId}** from **${ctx.input.module}**.`
    };
  })
  .build();
