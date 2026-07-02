import { SlateTool } from 'slates';
import { z } from 'zod';
import { createSalesforceClient } from '../lib/client';
import { spec } from '../spec';

export let searchRecords = SlateTool.create(spec, {
  name: 'Search Records',
  key: 'search_records',
  description: `Perform a full-text search across multiple Salesforce objects using SOSL (Salesforce Object Search Language). Unlike SOQL which queries a single object, SOSL searches across multiple objects simultaneously.

Example SOSL: \`FIND {Acme} IN ALL FIELDS RETURNING Account(Id, Name), Contact(Id, Name, Email)\``,
  instructions: [
    'Wrap the search term in curly braces: FIND {search term}.',
    'Specify which objects and fields to return using the RETURNING clause.',
    'Use IN ALL FIELDS, IN NAME FIELDS, IN EMAIL FIELDS, or IN PHONE FIELDS to control search scope.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sosl: z.string().describe('The SOSL search query string to execute')
    })
  )
  .output(
    z.object({
      searchRecords: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of matching records from across searched objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = createSalesforceClient({
      instanceUrl: ctx.auth.instanceUrl,
      apiVersion: ctx.config.apiVersion,
      token: ctx.auth.token
    });

    let result = await client.search(ctx.input.sosl);
    let records = result.searchRecords || result;

    return {
      output: {
        searchRecords: Array.isArray(records) ? records : []
      },
      message: `Search returned **${Array.isArray(records) ? records.length : 0}** records`
    };
  })
  .build();
