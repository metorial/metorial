import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let pushModel = SlateTool.create(spec, {
  name: 'Push Model',
  key: 'push_model',
  description: `Upload a model to the Ollama model library. Requires an ollama.com account and appropriate authentication.`,
  constraints: [
    'The model must already exist locally.',
    'Requires authentication with an ollama.com account.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      modelName: z
        .string()
        .describe('Name of the model to push (e.g., "username/mymodel:latest").'),
      insecure: z.boolean().optional().describe('Allow uploading over insecure connections.')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Status of the push operation.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    ctx.progress(`Pushing model **${ctx.input.modelName}**...`);
    let result = await client.pushModel(ctx.input.modelName, ctx.input.insecure);

    return {
      output: {
        status: result.status
      },
      message: `Model **${ctx.input.modelName}** pushed successfully. Status: ${result.status}`
    };
  })
  .build();
