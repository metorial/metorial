import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let whoAmI = SlateTool.create(spec, {
  name: 'Who Am I',
  key: 'who_am_i',
  description: 'Validate the connected API key and identify its OnceHub account.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      accountEmail: z
        .string()
        .nullable()
        .describe('Account email when included in the provider validation message'),
      message: z.string().describe('Account validation message returned by OnceHub')
    })
  )
  .handleInvocation(async ctx => {
    let output = await new Client({ token: ctx.auth.token }).getAccountIdentity();
    return { output, message: output.message };
  })
  .build();
