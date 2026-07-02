import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getRecord = SlateTool.create(spec, {
  name: 'Get Record',
  key: 'get_record',
  description: `Retrieve a single content record by its ID, including all field values and metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      recordId: z.string().describe('ID of the record to retrieve'),
      version: z
        .enum(['current', 'published'])
        .optional()
        .describe(
          'Record version. "current" includes drafts, "published" only returns published version.'
        ),
      nested: z
        .boolean()
        .optional()
        .describe('When true, block fields return full objects instead of IDs')
    })
  )
  .output(
    z.object({
      record: z.any().describe('The record object with all fields and metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let record = await client.getRecord(ctx.input.recordId, {
      version: ctx.input.version,
      nested: ctx.input.nested
    });

    let title = record.title || record.name || record.id;
    return {
      output: { record },
      message: `Retrieved record **${title}** (ID: ${record.id}).`
    };
  })
  .build();
