import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let invalidateDatabaseTokens = SlateTool.create(spec, {
  name: 'Invalidate Database Tokens',
  key: 'invalidate_database_tokens',
  description: `Rotate tokens for a database, invalidating all existing database auth tokens. Any clients using old tokens will need to obtain new ones.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      databaseName: z.string().describe('Name of the database to rotate tokens for')
    })
  )
  .output(
    z.object({
      databaseName: z.string().describe('Name of the database whose tokens were invalidated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationSlug: ctx.config.organizationSlug
    });

    await client.invalidateDatabaseTokens(ctx.input.databaseName);

    return {
      output: {
        databaseName: ctx.input.databaseName
      },
      message: `Invalidated all tokens for database **${ctx.input.databaseName}**.`
    };
  })
  .build();
