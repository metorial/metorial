import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientForContext } from '../lib/client';
import { spec } from '../spec';

export let invalidateDatabaseTokens = SlateTool.create(spec, {
  name: 'Invalidate Database Tokens',
  key: 'invalidate_database_tokens',
  description: `Choose an organization with list_organizations. Rotate tokens for a database, invalidating all existing database auth tokens. Any clients using old tokens will need to obtain new ones.`,
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
      databaseName: z.string().describe('Name of the database to rotate tokens for')
    })
  )
  .output(
    z.object({
      databaseName: z.string().describe('Name of the database whose tokens were invalidated')
    })
  )
  .handleInvocation(async ctx => {
    const client = clientForContext(ctx);

    await client.invalidateDatabaseTokens(ctx.input.databaseName);

    return {
      output: {
        databaseName: ctx.input.databaseName
      },
      message: `Invalidated all tokens for database **${ctx.input.databaseName}**.`
    };
  })
  .build();
