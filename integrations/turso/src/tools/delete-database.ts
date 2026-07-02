import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteDatabase = SlateTool.create(spec, {
  name: 'Delete Database',
  key: 'delete_database',
  description: `Permanently delete a database from the organization. This action cannot be undone.`,
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
      deletedDatabase: z.string().describe('Name of the deleted database')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationSlug: ctx.config.organizationSlug
    });

    await client.deleteDatabase(ctx.input.databaseName);

    return {
      output: {
        deletedDatabase: ctx.input.databaseName
      },
      message: `Deleted database **${ctx.input.databaseName}**.`
    };
  })
  .build();
