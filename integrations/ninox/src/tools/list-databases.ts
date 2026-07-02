import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDatabases = SlateTool.create(spec, {
  name: 'List Databases',
  key: 'list_databases',
  description: `List all databases within a specified team. Returns database identifiers and names.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      teamId: z.string().describe('ID of the team to list databases for')
    })
  )
  .output(
    z.object({
      databases: z
        .array(
          z.object({
            databaseId: z.string().describe('Unique identifier of the database'),
            name: z.string().describe('Name of the database')
          })
        )
        .describe('List of databases in the team')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let databases = await client.listDatabases(ctx.input.teamId);

    return {
      output: {
        databases: databases.map(db => ({
          databaseId: db.id,
          name: db.name
        }))
      },
      message: `Found **${databases.length}** database(s) in team.`
    };
  })
  .build();
