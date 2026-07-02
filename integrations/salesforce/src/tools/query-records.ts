import { SlateTool } from 'slates';
import { z } from 'zod';
import { createSalesforceClient } from '../lib/client';
import { spec } from '../spec';

export let queryRecords = SlateTool.create(spec, {
  name: 'Query Records',
  key: 'query_records',
  description: `Execute a SOQL (Salesforce Object Query Language) query to retrieve records. Supports standard SELECT queries with WHERE, ORDER BY, LIMIT, GROUP BY, and relationship queries. Use **queryAll** mode to include deleted and archived records.

Example SOQL: \`SELECT Id, Name, Industry FROM Account WHERE Industry = 'Technology' LIMIT 10\``,
  instructions: [
    'Always include the Id field in your SELECT clause for record identification.',
    'Use relationship queries to traverse parent-child relationships (e.g., SELECT Id, Account.Name FROM Contact).',
    'Use the nextRecordsUrl from the response to paginate through large result sets.'
  ],
  constraints: [
    'SOQL queries are subject to Salesforce governor limits.',
    'A single query can return up to 2,000 records by default.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      soql: z.string().describe('The SOQL query string to execute'),
      includeDeletedRecords: z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, uses queryAll to include deleted and archived records'),
      nextRecordsUrl: z
        .string()
        .optional()
        .describe('URL for fetching the next page of results from a previous query response')
    })
  )
  .output(
    z.object({
      totalSize: z.number().describe('Total number of records matching the query'),
      done: z
        .boolean()
        .describe('Whether all results have been returned (false if more pages exist)'),
      records: z.array(z.record(z.string(), z.any())).describe('Array of matching records'),
      nextRecordsUrl: z
        .string()
        .optional()
        .describe('URL to fetch the next page of results, if more exist')
    })
  )
  .handleInvocation(async ctx => {
    let client = createSalesforceClient({
      instanceUrl: ctx.auth.instanceUrl,
      apiVersion: ctx.config.apiVersion,
      token: ctx.auth.token
    });

    let result: any;

    if (ctx.input.nextRecordsUrl) {
      result = await client.queryMore(ctx.input.nextRecordsUrl);
    } else if (ctx.input.includeDeletedRecords) {
      result = await client.queryAll(ctx.input.soql);
    } else {
      result = await client.query(ctx.input.soql);
    }

    return {
      output: {
        totalSize: result.totalSize,
        done: result.done,
        records: result.records,
        nextRecordsUrl: result.nextRecordsUrl
      },
      message: `Query returned **${result.totalSize}** total records (${result.records.length} in this page)${result.done ? '' : ' — more pages available'}`
    };
  })
  .build();
