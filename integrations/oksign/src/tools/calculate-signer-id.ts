import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let calculateSignerId = SlateTool.create(spec, {
  name: 'Calculate Signer ID',
  key: 'calculate_signer_id',
  description: `Calculate an OKSign signer ID from a person's name and email. Signer IDs are required when configuring form fields and sending notifications. The ID follows the format: bt_00000000-0000-0000-0000-0000000-XXXXXXXXXXXX.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().describe('Full name of the signer'),
      email: z.string().describe('Email address of the signer')
    })
  )
  .output(
    z.object({
      signerId: z.string().describe('Calculated signer ID in OKSign format')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let signerId = await client.calculateSignerId(ctx.input.name, ctx.input.email);

    return {
      output: { signerId },
      message: `Signer ID for **${ctx.input.name}** (${ctx.input.email}): \`${signerId}\``
    };
  })
  .build();
