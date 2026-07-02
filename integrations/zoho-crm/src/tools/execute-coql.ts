import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let executeCoql = SlateTool.create(spec, {
  name: 'Execute COQL Query',
  key: 'execute_coql',
  description: `Execute a COQL (CRM Object Query Language) query to retrieve data using SQL-like syntax.
COQL supports SELECT queries with WHERE, ORDER BY, LIMIT, and OFFSET clauses.
Useful for complex, cross-field queries and precise data extraction.`,
  instructions: [
    'Syntax: "select Field1, Field2 from Module where Condition order by Field limit N offset M".',
    'Example: "select Last_Name, Email from Contacts where Last_Name = \'Smith\' limit 10".',
    'Supported clauses: SELECT, FROM, WHERE, ORDER BY, LIMIT, OFFSET.',
    'Use field API names in queries.'
  ],
  constraints: [
    'Maximum 200 records per query.',
    'Only SELECT queries are supported (no INSERT/UPDATE/DELETE).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('COQL SELECT query string')
    })
  )
  .output(
    z.object({
      records: z.array(z.record(z.string(), z.any())).describe('Query result records'),
      moreRecords: z.boolean().optional().describe('Whether more records match the query')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiBaseUrl: ctx.auth.apiBaseUrl
    });

    let result = await client.executeCoql({ selectQuery: ctx.input.query });

    let records = result?.data || [];
    let moreRecords = result?.info?.more_records || false;

    return {
      output: { records, moreRecords },
      message: `COQL query returned **${records.length}** record(s).${moreRecords ? ' More records match the query.' : ''}`
    };
  })
  .build();
