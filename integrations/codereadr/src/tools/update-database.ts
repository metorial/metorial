import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateDatabase = SlateTool.create(spec, {
  name: 'Rename Database',
  key: 'update_database',
  description: `Rename an existing barcode validation database.`
})
  .input(
    z.object({
      databaseId: z.string().describe('ID of the database to rename'),
      name: z.string().describe('New name for the database')
    })
  )
  .output(
    z.object({
      databaseId: z.string().describe('ID of the renamed database')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    await client.updateDatabase(ctx.input.databaseId, ctx.input.name);

    return {
      output: { databaseId: ctx.input.databaseId },
      message: `Renamed database **${ctx.input.databaseId}** to **${ctx.input.name}**.`
    };
  })
  .build();
