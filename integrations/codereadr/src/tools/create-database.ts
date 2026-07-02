import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createDatabase = SlateTool.create(spec, {
  name: 'Create Database',
  key: 'create_database',
  description: `Create a new barcode validation database in CodeREADr. Databases store barcode values for scan validation and can be linked to services.`
})
  .input(
    z.object({
      name: z.string().describe('Name for the new database'),
      caseSensitive: z
        .boolean()
        .optional()
        .describe(
          'Whether barcode matching is case-sensitive. Defaults to false (case-insensitive).'
        )
    })
  )
  .output(
    z.object({
      databaseId: z.string().describe('ID of the newly created database')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let databaseId = await client.createDatabase(ctx.input.name, ctx.input.caseSensitive);

    return {
      output: { databaseId },
      message: `Created database **${ctx.input.name}** (ID: ${databaseId}).`
    };
  })
  .build();
