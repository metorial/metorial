import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deletePass = SlateTool.create(spec, {
  name: 'Delete Pass',
  key: 'delete_pass',
  description: `Permanently delete a generated wallet pass. This removes the pass from PassSlot and it will no longer be available for download or updates.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      passTypeIdentifier: z
        .string()
        .describe('Pass type identifier (e.g., "pass.example.id1")'),
      serialNumber: z.string().describe('Unique serial number of the pass to delete')
    })
  )
  .output(
    z.object({
      serialNumber: z.string().describe('Serial number of the deleted pass'),
      passTypeIdentifier: z.string().describe('Pass type identifier')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    await client.deletePass(ctx.input.passTypeIdentifier, ctx.input.serialNumber);

    return {
      output: {
        serialNumber: ctx.input.serialNumber,
        passTypeIdentifier: ctx.input.passTypeIdentifier
      },
      message: `Deleted pass **${ctx.input.serialNumber}**.`
    };
  })
  .build();
