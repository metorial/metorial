import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientForContext } from '../lib/client';
import { spec } from '../spec';

export let deleteDatabase = SlateTool.create(spec, {
  name: 'Delete Database',
  key: 'delete_database',
  description: `Choose an organization with list_organizations. Delete a database and its data. Recovery is available only to eligible organizations within Turso retention limits; do not rely on recovery.`,
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      organizationSlug: z
        .string()
        .optional()
        .describe(
          'Organization slug. Call list_organizations to discover authorized organizations; older connections may use their saved organization.'
        ),
      databaseName: z.string().describe('Name of the database to delete')
    })
  )
  .output(
    z.object({
      deletedDatabase: z.string().describe('Name of the deleted database')
    })
  )
  .handleInvocation(async ctx => {
    const client = clientForContext(ctx);

    await client.deleteDatabase(ctx.input.databaseName);

    return {
      output: {
        deletedDatabase: ctx.input.databaseName
      },
      message: `Deleted database **${ctx.input.databaseName}**.`
    };
  })
  .build();
