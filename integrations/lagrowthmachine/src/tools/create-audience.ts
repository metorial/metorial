import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createAudience = SlateTool.create(spec, {
  name: 'Create Audience',
  key: 'create_audience',
  description:
    'Create an empty La Growth Machine audience. Add prospects with create_or_update_lead after creating it.',
  instructions: ['The audience name must be unique in your workspace.']
})
  .input(
    z.object({
      name: z
        .string()
        .trim()
        .min(1)
        .max(100)
        .describe('Unique audience name, up to 100 characters')
    })
  )
  .output(
    z.object({
      audience: z.object({
        id: z.string().describe('Created audience ID'),
        name: z.string().describe('Created audience name')
      })
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createAudience(ctx.input.name);
    return {
      output: { audience: result.audience },
      message: `Audience **${result.audience.name}** created.`
    };
  })
  .build();
