import { SlateTool } from 'slates';
import { z } from 'zod';
import { connection } from '../lib/client';
import { spec } from '../spec';
export const listRecordTypes = SlateTool.create(spec, {
  name: 'List Record Types',
  key: 'list_record_types',
  description:
    'Discover exact record type names exposed by the authenticated account and role through the native metadata catalog. Use these names with get_record_metadata and record tools; this does not identify a person or list roles.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      recordTypes: z.array(z.string()).describe('Native role-specific record type names'),
      count: z.number().describe('Number of record types returned in this bounded catalog')
    })
  )
  .handleInvocation(async ctx => {
    const recordTypes = await connection(ctx.auth, ctx.config).listRecordTypes();
    return {
      output: { recordTypes, count: recordTypes.length },
      message: `Discovered **${recordTypes.length}** record types exposed to this connection.`
    };
  })
  .build();
