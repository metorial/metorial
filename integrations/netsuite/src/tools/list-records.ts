import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listRecords = SlateTool.create(spec, {
  name: 'List Records',
  key: 'list_records',
  description: `Retrieve a paginated list of NetSuite records of a given type. Supports optional filtering using NetSuite's query syntax and field selection.
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
      recordType: z
        .string()
        .describe(
          'NetSuite record type in camelCase (e.g., "customer", "salesOrder", "invoice")'
        ),
      filter: z
        .string()
        .optional()
        .describe(
          'Filter query using NetSuite REST API syntax (e.g., "companyName CONTAIN \'Acme\'")'
        ),
      fields: z
        .array(z.string())
        .optional()
        .describe('Specific fields to include in the response'),
      limit: z.number().optional().describe('Maximum number of records to return per page'),
      offset: z.number().optional().describe('Number of records to skip for pagination')
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
    let client = new Client({
      ...ctx.auth,
      accountId: ctx.config.accountId
    });

    let result = await client.listRecords(ctx.input.recordType, {
      query: ctx.input.filter,
      fields: ctx.input.fields,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    return {
      output: {
        records: result.items || [],
        totalResults: result.totalResults || 0,
        count: result.count || 0,
        offset: result.offset || 0,
        hasMore: result.hasMore || false
      },
      message: `Listed **${result.count || 0}** ${ctx.input.recordType} records out of **${result.totalResults || 0}** total.`
    };
  })
  .build();
