import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteDatabase = SlateTool.create(spec, {
  name: 'Delete Database',
  key: 'delete_database',
  description: `Permanently delete a PlanetScale database and all its branches, backups, and data. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      databaseName: z.string().describe('Name of the database to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType,
      organization: ctx.config.organization
    });

    await client.deleteDatabase(ctx.input.databaseName);

    return {
      output: { deleted: true },
      message: `Deleted database **${ctx.input.databaseName}**.`
    };
  });
