import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

export let getDatabaseSchema = SlateTool.create(spec, {
  name: 'Get Database',
  key: 'get_database',
  description: `Retrieve full database details including its settings (name, icon, color) and complete schema configuration. Useful for understanding the overall database structure.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      teamId: z.string().describe('Team ID. Use list_teams to discover accessible teams.'),
      databaseId: z.string().describe('Database ID. Use list_databases to discover databases.')
    })
  )
  .output(
    z.object({
      databaseId: z.string().optional().describe('Unique identifier when returned by Ninox'),
      settings: z
        .record(z.string(), z.any())
        .describe('Database settings (name, icon, color, etc.)'),
      schema: z
        .record(z.string(), z.any())
        .describe(
          'Full database schema including table declarations, fields, functions, and layout'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let db = await client.getDatabase(ctx.input.teamId, ctx.input.databaseId);

    return {
      output: {
        databaseId: db.id,
        settings: db.settings,
        schema: db.schema
      },
      message: `Retrieved schema for database **${ctx.input.databaseId}**.`
    };
  })
  .build();
