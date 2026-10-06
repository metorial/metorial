import { SlateTool } from 'slates';
import { DatabaseClient } from '../lib/client';
import { collection, databaseOutput, mappedDatabase, nativeDatabase } from '../lib/schemas';
import { connection, z } from '../lib/validation';
import { spec } from '../spec';
export const listDatabases = SlateTool.create(spec, {
  name: 'List Databases',
  key: 'list_databases',
  description:
    'Discover authorized database IDs, names and workspace IDs. The detailed native endpoint defines a collection without paging parameters; oversized or explicitly incomplete collections are refused.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(z.object({ databases: z.array(databaseOutput) }))
  .handleInvocation(async ctx => ({
    output: {
      databases: collection(
        nativeDatabase,
        await new DatabaseClient(connection(ctx.auth, ctx.config)).listDatabases()
      ).map(mappedDatabase)
    },
    message: 'Returned authorized databases and workspace IDs.'
  }))
  .build();
