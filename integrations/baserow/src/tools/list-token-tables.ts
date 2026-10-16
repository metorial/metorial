import { SlateTool } from 'slates';
import { z } from 'zod';
import { getClient } from '../lib/client';
import { spec } from '../spec';

export let listTokenTables = SlateTool.create(spec, {
  name: 'List Token Tables',
  key: 'list_token_tables',
  description:
    'Discover every table a Database Token can create, read, update, or delete rows in. Returns table and database IDs for subsequent row and field operations. Requires Database Token authentication.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      tables: z.array(
        z
          .object({
            id: z.number(),
            name: z.string(),
            database_id: z.number(),
            order: z.number()
          })
          .catchall(z.any())
      )
    })
  )
  .handleInvocation(async ctx => {
    let tables = await getClient(ctx).listTokenTables();
    return {
      output: { tables },
      message: `Found **${tables.length}** table(s) accessible to this database token.`
    };
  })
  .build();
