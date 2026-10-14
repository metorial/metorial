import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listRecordVersions = SlateTool.create(spec, {
  name: 'List Record Versions',
  key: 'list_record_versions',
  description: `Retrieve a page of a record's saved versions to inspect content history, version IDs, and publication metadata.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      recordId: z.string().describe('Record ID. Use list_records to discover records.'),
      nested: z
        .boolean()
        .optional()
        .describe('Return full nested block payloads instead of block IDs'),
      pageOffset: z.number().optional().describe('Zero-based offset (default 0)'),
      pageLimit: z.number().optional().describe('Page size (default 15, maximum 50)')
    })
  )
  .output(z.object({ versions: z.array(z.any()).describe('Saved record versions') }))
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, environment: ctx.config.environment });
    let versions = await client.listRecordVersions(ctx.input.recordId, ctx.input);
    return {
      output: { versions },
      message: `Retrieved **${versions.length}** versions of record **${ctx.input.recordId}**.`
    };
  })
  .build();
