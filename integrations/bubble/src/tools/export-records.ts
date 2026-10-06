import { SlateTool } from 'slates';
import { z } from 'zod';
import { type BubbleRecord, clientFor } from '../lib/client';
import { fail, integer, typeName } from '../lib/validation';
import { spec } from '../spec';
import { constraintSchema } from './search-records';

export const exportRecords = SlateTool.create(spec, {
  name: 'Export Records',
  key: 'export_records',
  description:
    'Download a bounded JSON export of records visible through the Bubble Data API, with native filters and sorting. Returns a continuation offset when more records remain.',
  instructions: [
    'Discover exposed data types and fields with get_api_spec.',
    'The export follows current Data API privacy permissions. Concurrent changes can alter offset-based results; this is not a database snapshot.'
  ],
  constraints: [
    'At most 5000 records and 16 MiB per export. No upload, export job or background polling is performed.'
  ],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      dataType: z.string().describe('Exposed Bubble data type from get_api_spec.'),
      constraints: z.array(constraintSchema).optional(),
      sortField: z.string().optional(),
      descending: z.boolean().optional(),
      cursor: z
        .number()
        .optional()
        .describe(
          'Native starting offset, default zero; preserve filters and sorting when continuing.'
        ),
      maxRecords: z
        .number()
        .optional()
        .describe('Maximum records to include, from 1 to 5000; default 1000.')
    })
  )
  .output(
    z.object({
      filename: z.string(),
      mimeType: z.string(),
      recordCount: z.number(),
      complete: z
        .boolean()
        .describe(
          'Whether the final native page reported no remaining visible records from the requested offset. This is not a snapshot guarantee.'
        ),
      nextCursor: z
        .number()
        .optional()
        .describe(
          'Continue with this offset and the same filters/sorting when the export is incomplete.'
        )
    })
  )
  .handleInvocation(async ctx => {
    const client = clientFor(ctx),
      maximum = integer(ctx.input.maxRecords ?? 1000, 'maxRecords', 1, 5000);
    const start = integer(ctx.input.cursor ?? 0, 'cursor');
    let cursor = start,
      remaining = 0;
    const records: BubbleRecord[] = [],
      ids = new Set<string>();
    let bytes = 2;
    while (records.length < maximum) {
      const page = await client.searchRecords(ctx.input.dataType, {
        constraints: ctx.input.constraints?.map(constraint => ({
          key: constraint.key,
          constraint_type: constraint.constraintType,
          ...(constraint.value === undefined ? {} : { value: constraint.value })
        })),
        sortField: ctx.input.sortField,
        descending: ctx.input.descending,
        cursor,
        limit: Math.min(100, maximum - records.length)
      });
      for (const record of page.results) {
        if (ids.has(record._id))
          throw fail(
            'Records changed or repeated across export pages. No complete export can be confirmed; retry after stabilizing the data.'
          );
        ids.add(record._id);
        bytes += Buffer.byteLength(JSON.stringify(record)) + 1;
        if (bytes > 16 * 1024 * 1024)
          throw fail('The export exceeds 16 MiB. Reduce maxRecords or narrow the filters.');
        records.push(record);
      }
      remaining = page.remaining;
      cursor = integer(page.cursor + page.count, 'next cursor');
      if (!remaining) break;
    }
    const filename = `bubble-${typeName(ctx.input.dataType).replace(/[^A-Za-z0-9_-]/g, '_')}-${start}.json`;
    await ctx.addAttachment({
      type: 'content',
      content: new Response(JSON.stringify(records), {
        headers: { 'content-type': 'application/json' }
      }),
      filename,
      mimeType: 'application/json'
    });
    return {
      output: {
        filename,
        mimeType: 'application/json',
        recordCount: records.length,
        complete: remaining === 0,
        ...(remaining ? { nextCursor: cursor } : {})
      },
      message: `Prepared ${records.length} visible record(s) as JSON.${remaining ? ' More records remain; continue with nextCursor.' : ''}`
    };
  })
  .build();
