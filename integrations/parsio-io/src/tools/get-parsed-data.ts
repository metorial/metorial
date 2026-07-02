import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getParsedData = SlateTool.create(spec, {
  name: 'Get Parsed Data',
  key: 'get_parsed_data',
  description: `Retrieve structured parsed data from all documents in a mailbox. Supports filtering by date range. Returns the extracted fields from successfully parsed documents.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      mailboxId: z.string().describe('ID of the mailbox to retrieve parsed data from'),
      dateFrom: z.string().optional().describe('Start date filter (ISO 8601 format)'),
      dateTo: z.string().optional().describe('End date filter (ISO 8601 format)')
    })
  )
  .output(
    z.object({
      records: z.array(z.any()).describe('Array of parsed data records from the mailbox')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getParsedData(ctx.input.mailboxId, {
      from: ctx.input.dateFrom,
      to: ctx.input.dateTo
    });

    let records = Array.isArray(result) ? result : result?.data || result?.records || [];

    return {
      output: { records },
      message: `Retrieved **${records.length}** parsed record(s) from mailbox **${ctx.input.mailboxId}**.`
    };
  })
  .build();
