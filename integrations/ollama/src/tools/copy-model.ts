import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let copyModel = SlateTool.create(spec, {
  name: 'Copy Model',
  key: 'copy_model',
  description: `Duplicate an existing model under a new name. Creates a copy of the source model that can be independently modified or used.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      source: z.string().describe('Name of the existing model to copy (e.g., "llama3.2").'),
      destination: z.string().describe('Name for the new copy (e.g., "my-llama").')
    })
  )
  .output(
    z.object({
      source: z.string().describe('Source model name.'),
      destination: z.string().describe('Destination model name.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    await client.copyModel(ctx.input.source, ctx.input.destination);

    return {
      output: {
        source: ctx.input.source,
        destination: ctx.input.destination
      },
      message: `Copied model **${ctx.input.source}** to **${ctx.input.destination}**.`
    };
  })
  .build();
