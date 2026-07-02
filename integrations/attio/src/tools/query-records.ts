import { SlateTool } from 'slates';
import { z } from 'zod';
import { AttioClient } from '../lib/client';
import { spec } from '../spec';

export let queryRecordsTool = SlateTool.create(spec, {
  name: 'Query Records',
  key: 'query_records',
  description: `Query and filter records from any Attio object using structured filters. Supports sorting, pagination, and complex filter expressions.

Use the shorthand filter format for simple equality: \`{ "email_addresses": "john@example.com" }\`
Or use the verbose format for complex conditions: \`{ "$and": [{ "name": { "full_name": { "$eq": "John" } } }] }\``,
  instructions: [
    'Filter operators include $eq, $contains, $starts_with, $ends_with, $lt, $lte, $gt, $gte, $in, $not_empty.',
    'Sorts use the format: [{ "direction": "asc"|"desc", "attribute": "attribute_slug" }].'
  ],
  constraints: ['Maximum limit is 500 records per request.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      objectSlug: z
        .string()
        .describe('Object type slug or ID (e.g. "people", "companies", "deals")'),
      filter: z.any().optional().describe('Filter expression to match records'),
      sorts: z.array(z.any()).optional().describe('Sort specification array'),
      limit: z.number().optional().default(50).describe('Maximum records to return (max 500)'),
      offset: z
        .number()
        .optional()
        .default(0)
        .describe('Number of records to skip for pagination')
    })
  )
  .output(
    z.object({
      records: z
        .array(
          z.object({
            recordId: z.string().describe('The record ID'),
            objectId: z.string().describe('The object ID'),
            createdAt: z.string().describe('When the record was created'),
            webUrl: z.string().optional().describe('URL to view the record in Attio'),
            values: z.record(z.string(), z.any()).describe('Record attribute values')
          })
        )
        .describe('Matching records'),
      count: z.number().describe('Number of records returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AttioClient({ token: ctx.auth.token });

    let records = await client.queryRecords(ctx.input.objectSlug, {
      filter: ctx.input.filter,
      sorts: ctx.input.sorts,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let mapped = records.map((r: any) => ({
      recordId: r.id?.record_id ?? '',
      objectId: r.id?.object_id ?? '',
      createdAt: r.created_at ?? '',
      webUrl: r.web_url,
      values: r.values ?? {}
    }));

    return {
      output: {
        records: mapped,
        count: mapped.length
      },
      message: `Found **${mapped.length}** record(s) in **${ctx.input.objectSlug}**.`
    };
  })
  .build();
