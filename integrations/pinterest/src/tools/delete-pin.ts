import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deletePin = SlateTool.create(spec, {
  name: 'Delete Pin',
  key: 'delete_pin',
  description: `Permanently delete a Pin. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      pinId: z.string().describe('ID of the pin to delete'),
      adAccountId: z
        .string()
        .optional()
        .describe('Ad account ID for Business Access operation user context')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the pin was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deletePin(ctx.input.pinId, ctx.input.adAccountId);

    return {
      output: {
        deleted: true
      },
      message: `Deleted pin **${ctx.input.pinId}**.`
    };
  })
  .build();
