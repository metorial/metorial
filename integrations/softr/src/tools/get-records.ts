import { SlateTool } from 'slates';
import { DatabaseClient } from '../lib/client';
import {
  dbId,
  exactRecord,
  mappedRecord,
  nativeRecord,
  page,
  recordOutput,
  single,
  tblId
} from '../lib/schemas';
import { bytes, connection, fail, paging, z } from '../lib/validation';
import { spec } from '../spec';
export const getRecords = SlateTool.create(spec, {
  name: 'Get Records',
  key: 'get_records',
  description:
    'Read one exact record or a native page in a table from list_tables. Use list_table_views for a viewId. Optionally prepare a bounded JSON download of the returned record data; this does not create a provider export job.',
  constraints: ['Local JSON request/download bound:8 MiB; one page at most200 records.'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      databaseId: dbId,
      tableId: tblId,
      recordId: z.string().optional(),
      offset: z.number().optional(),
      limit: z.number().optional(),
      fieldNames: z.boolean().optional(),
      viewId: z.string().optional(),
      download: z
        .boolean()
        .optional()
        .describe('Prepare the returned single record or page as a JSON download.')
    })
  )
  .output(
    z.object({
      records: z.array(recordOutput).optional(),
      record: recordOutput.optional(),
      total: z.number().optional(),
      offset: z.number().optional(),
      limit: z.number().optional(),
      hasMore: z.boolean().optional(),
      nextOffset: z.number().optional(),
      filename: z.string().optional(),
      mimeType: z.string().optional(),
      size: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = new DatabaseClient(connection(ctx.auth, ctx.config));
    let output: Record<string, unknown>;
    if (ctx.input.recordId !== undefined) {
      if (
        ctx.input.offset !== undefined ||
        ctx.input.limit !== undefined ||
        ctx.input.viewId !== undefined
      )
        fail('A single-record read does not accept page or view filters.');
      output = {
        record: mappedRecord(
          exactRecord(
            single(
              nativeRecord,
              await client.getRecord(
                ctx.input.databaseId,
                ctx.input.tableId,
                ctx.input.recordId,
                { fieldNames: ctx.input.fieldNames }
              )
            ),
            ctx.input.tableId,
            ctx.input.recordId
          )
        )
      };
    } else {
      const p = paging(ctx.input.offset, ctx.input.limit);
      output = page(
        await client.listRecords(ctx.input.databaseId, ctx.input.tableId, {
          ...p,
          fieldNames: ctx.input.fieldNames,
          viewId: ctx.input.viewId
        }),
        ctx.input.tableId,
        p
      );
    }
    if (ctx.input.download) {
      const content = bytes(output);
      await ctx.addAttachment({
        type: 'content',
        content: new Response(new Uint8Array(content), {
          headers: { 'content-type': 'application/json' }
        }),
        filename: 'records.json',
        mimeType: 'application/json'
      });
      output = {
        ...output,
        filename: 'records.json',
        mimeType: 'application/json',
        size: content.length
      };
    }
    return {
      output,
      message: ctx.input.download
        ? 'Returned record data and prepared its JSON download.'
        : 'Returned native record data and exact page metadata.'
    };
  })
  .build();
