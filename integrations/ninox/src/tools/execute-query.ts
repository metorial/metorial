import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let executeQuery = SlateTool.create(spec, {
  name: 'Execute Query',
  key: 'execute_query',
  description: `Execute a read-only Ninox query expression against a database. Queries use Ninox's own query language to select and filter data. For example: \`(select Contact).'First Name'\` retrieves first names from a Contact table.`,
  instructions: [
    'Queries are read-only and cannot modify data. Use Execute Script for write operations.',
    'The query language is Ninox-specific — refer to the Ninox scripting documentation for syntax.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      teamId: z.string().describe('ID of the team'),
      databaseId: z.string().describe('ID of the database'),
      query: z
        .string()
        .describe('Ninox query expression to execute (e.g. "(select Contact).\'First Name\'")')
    })
  )
  .output(
    z.object({
      result: z
        .any()
        .describe(
          'Query result — may be an array, string, number, or other value depending on the query'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let result = await client.query(ctx.input.teamId, ctx.input.databaseId, ctx.input.query);

    let resultSummary = Array.isArray(result)
      ? `Returned **${result.length}** result(s).`
      : `Query executed successfully.`;

    return {
      output: {
        result
      },
      message: resultSummary
    };
  })
  .build();
