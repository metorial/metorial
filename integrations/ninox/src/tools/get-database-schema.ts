import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      teamId: z.string().describe('ID of the team'),
      databaseId: z.string().describe('ID of the database')
    })
  )
  .output(
    z.object({
      databaseId: z.string().describe('Unique identifier of the database'),
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
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let db = await client.getDatabase(ctx.input.teamId, ctx.input.databaseId);

    return {
      output: {
        databaseId: db.id,
        settings: db.settings,
        schema: db.schema
      },
      message: `Retrieved schema for database **${db.id}**.`
    };
  })
  .build();
