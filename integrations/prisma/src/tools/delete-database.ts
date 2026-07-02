import { SlateTool } from 'slates';
import { z } from 'zod';
import { PrismaClient } from '../lib/client';
import { spec } from '../spec';

export let deleteDatabase = SlateTool.create(spec, {
  name: 'Delete Database',
  key: 'delete_database',
  description: `Permanently delete a Prisma Postgres database. This action is irreversible and will destroy all data, connections, and backups associated with the database.`,
  constraints: [
    'This action is irreversible. All data in the database will be permanently lost.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      databaseId: z.string().describe('ID of the database to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the database was successfully deleted'),
      databaseId: z.string().describe('ID of the deleted database')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PrismaClient(ctx.auth.token);
    await client.deleteDatabase(ctx.input.databaseId);

    return {
      output: {
        deleted: true,
        databaseId: ctx.input.databaseId
      },
      message: `Database **${ctx.input.databaseId}** was permanently deleted.`
    };
  })
  .build();
