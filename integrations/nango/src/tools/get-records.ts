import { SlateTool } from 'slates';
import { clientFor } from '../lib/client';
import { connectionId, integrationId, jsonObject, parse, text, z } from '../lib/schemas';
import { spec } from '../spec';

const metadata = z.object({
  deleted_at: z.string().nullable(),
  last_action: text,
  first_seen_at: text,
  last_modified_at: text,
  cursor: text
});
export const getRecords = SlateTool.create(spec, {
  name: 'Get Records',
  key: 'get_records',
  description:
    'Retrieve one page of synced records for an exact connection and deployed data model. Discover integration/connection IDs with list_connections and model names with list_functions. Preserve native opaque cursors. Pages can be smaller than limit while more data exists; continue until nextCursor is absent. Concurrent updates may repeat records. Recognized credential fields are redacted.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      connectionId,
      providerConfigKey: integrationId,
      model: text.describe('Exact deployed model name from list_functions.'),
      cursor: text.optional(),
      modifiedAfter: z.string().datetime({ offset: true }).optional(),
      recordIds: z.array(text).max(100).optional(),
      limit: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .describe(
          'Native page size; local 1,000-record safety cap, not a documented provider maximum.'
        ),
      variant: text.optional()
    })
  )
  .output(
    z.object({
      records: z.array(
        z.object({
          fields: jsonObject,
          nangoMetadata: z.object({
            deletedAt: z.string().nullable(),
            lastAction: text,
            firstSeenAt: text,
            lastModifiedAt: text,
            cursor: text
          })
        })
      ),
      nextCursor: text.optional(),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    const result = await clientFor(ctx).getRecords({ ...ctx.input, ids: ctx.input.recordIds });
    const records = result.records.map(item => {
      const { _nango_metadata, ...fields } = item;
      const m = parse(metadata, _nango_metadata);
      return {
        fields,
        nangoMetadata: {
          deletedAt: m.deleted_at,
          lastAction: m.last_action,
          firstSeenAt: m.first_seen_at,
          lastModifiedAt: m.last_modified_at,
          cursor: m.cursor
        }
      };
    });
    return {
      output: {
        records,
        nextCursor: result.next_cursor ?? undefined,
        hasMore: result.next_cursor !== null
      },
      message: result.next_cursor
        ? 'Retrieved one page; more records are available using the native cursor.'
        : 'Retrieved the final native record page.'
    };
  })
  .build();
