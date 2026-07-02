import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let querySuiteQL = SlateTool.create(spec, {
  name: 'Query SuiteQL',
  key: 'query_suiteql',
  description: `Execute a SuiteQL query against NetSuite data. SuiteQL is a SQL-92 based query language that supports SELECT, JOIN, WHERE, GROUP BY, HAVING, and ORDER BY clauses.
Use this for complex data retrieval, reporting, cross-record queries, and filtering that goes beyond the standard REST API capabilities.`,
  instructions: [
    'Write standard SQL SELECT queries. Common tables include: transaction, customer, vendor, employee, item, account, department, location, subsidiary.',
    'Use "BUILTIN.DF(fieldname)" to get display values for reference fields.',
    'Results are paginated — use limit and offset for large result sets.'
  ],
  constraints: [
    'Maximum of 100,000 results per query.',
    'Only SELECT queries are supported — no INSERT, UPDATE, or DELETE.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .describe(
          'SuiteQL query string (SQL-92 syntax). Example: "SELECT id, companyName FROM customer WHERE dateCreated > \'2024-01-01\'"'
        ),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of results to return per page (default varies by NetSuite)'),
      offset: z.number().optional().describe('Number of results to skip for pagination')
    })
  )
  .output(
    z.object({
      rows: z.array(z.record(z.string(), z.any())).describe('Array of result rows'),
      totalResults: z.number().describe('Total number of matching results'),
      count: z.number().describe('Number of results in this page'),
      offset: z.number().describe('Current offset'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      ...ctx.auth,
      accountId: ctx.config.accountId
    });

    let result = await client.executeSuiteQL(ctx.input.query, {
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    return {
      output: {
        rows: result.items || [],
        totalResults: result.totalResults || 0,
        count: result.count || 0,
        offset: result.offset || 0,
        hasMore: result.hasMore || false
      },
      message: `SuiteQL query returned **${result.count || 0}** rows out of **${result.totalResults || 0}** total results.`
    };
  })
  .build();
