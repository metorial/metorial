import { SlateTool } from 'slates';
import { z } from 'zod';
import { connection } from '../lib/client';
import { spec } from '../spec';

export let listRecords = SlateTool.create(spec, {
  name: 'List Records',
  key: 'list_records',
  description: `Retrieve a page of NetSuite records of a type discovered with list_record_types. Supports native body-field filtering; collections return IDs and links. Read exact record fields with get_record or query_suiteql.
Use this for browsing record collections or finding records that match specific criteria.`,
  instructions: [
    'The filter query uses NetSuite REST API query syntax (e.g., "companyName CONTAIN \'Acme\'" or "balance > 1000").',
    'Use limit and offset for pagination through large collections.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      recordType: z.string().describe('Exact native record type from list_record_types'),
      filter: z
        .string()
        .optional()
        .describe(
          'Filter query using NetSuite REST API syntax (e.g., "companyName CONTAIN \'Acme\'")'
        ),
      fields: z
        .array(z.string())
        .optional()
        .describe(
          'Legacy field selection; nonempty values require get_record or query_suiteql because native collections return IDs and links'
        ),
      limit: z
        .number()
        .optional()
        .describe('Integer page size from 1 to 1000; defaults to 1000'),
      offset: z
        .number()
        .optional()
        .describe('Nonnegative integer offset divisible by limit (default limit 1000)')
    })
  )
  .output(
    z.object({
      records: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of records matching the criteria'),
      totalResults: z.number().describe('Total number of matching records'),
      count: z.number().describe('Number of records in this page'),
      offset: z.number().describe('Current offset'),
      hasMore: z.boolean().describe('Whether more records are available')
    })
  )
  .handleInvocation(async ctx => {
    const client = connection(ctx.auth, ctx.config);

    let result = await client.listRecords(ctx.input.recordType, {
      query: ctx.input.filter,
      fields: ctx.input.fields,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    return {
      output: {
        records: result.items,
        totalResults: result.totalResults,
        count: result.count,
        offset: result.offset,
        hasMore: result.hasMore
      },
      message: `Listed **${result.count}** ${ctx.input.recordType} records out of **${result.totalResults}** total.`
    };
  })
  .build();
