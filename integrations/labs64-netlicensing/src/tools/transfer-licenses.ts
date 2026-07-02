import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let transferLicenses = SlateTool.create(spec, {
  name: 'Transfer Licenses',
  key: 'transfer_licenses',
  description: `Transfer all licenses from one licensee to another. The source licensee must be marked for transfer (markedForTransfer=true) and both licensees must belong to the same product.`,
  instructions: [
    'Before transferring, ensure the source licensee has markedForTransfer set to true using the Manage Licensee tool.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      targetLicenseeNumber: z.string().describe('Licensee number to receive the licenses'),
      sourceLicenseeNumber: z
        .string()
        .describe('Licensee number to transfer licenses from (must be marked for transfer)')
    })
  )
  .output(
    z.object({
      transferred: z.boolean().describe('Whether the transfer was successful'),
      targetLicenseeNumber: z.string().describe('Target licensee number'),
      sourceLicenseeNumber: z.string().describe('Source licensee number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    await client.transferLicenses(
      ctx.input.targetLicenseeNumber,
      ctx.input.sourceLicenseeNumber
    );
    return {
      output: {
        transferred: true,
        targetLicenseeNumber: ctx.input.targetLicenseeNumber,
        sourceLicenseeNumber: ctx.input.sourceLicenseeNumber
      },
      message: `Licenses transferred from **${ctx.input.sourceLicenseeNumber}** to **${ctx.input.targetLicenseeNumber}**.`
    };
  })
  .build();
