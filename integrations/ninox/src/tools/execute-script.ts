import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

export let executeScript = SlateTool.create(spec, {
  name: 'Execute Script',
  key: 'execute_script',
  description: `Execute a Ninox script that can both read and write data. Can run complex queries, trigger global functions, compute formula field values, and modify records. More powerful than **Execute Query** but should be used carefully as it can alter data.`,
  instructions: [
    'Scripts can modify data — use with caution.',
    'Can call global functions defined in the Ninox database.',
    'Returns computed/formula field values not available through standard record retrieval.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      teamId: z.string().describe('Team ID. Use list_teams to discover accessible teams.'),
      databaseId: z
        .string()
        .describe('Database ID. Use list_databases to discover databases.'),
      script: z
        .string()
        .describe('Ninox script to execute (e.g. "let t := first(select Contact); t.Title")')
    })
  )
  .output(
    z.object({
      result: z
        .any()
        .describe('Script execution result — may be an array, string, number, or other value')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.exec(ctx.input.teamId, ctx.input.databaseId, ctx.input.script);

    let resultSummary = Array.isArray(result)
      ? `Script executed, returned **${result.length}** result(s).`
      : `Script executed successfully.`;

    return {
      output: {
        result
      },
      message: resultSummary
    };
  })
  .build();
