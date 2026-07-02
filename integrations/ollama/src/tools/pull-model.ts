import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let pullModel = SlateTool.create(spec, {
  name: 'Pull Model',
  key: 'pull_model',
  description: `Download a model from the Ollama model library. The model will be available locally after the pull completes.`,
  constraints: [
    'Pulling large models may take significant time depending on model size and network speed.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      modelName: z
        .string()
        .describe('Name of the model to pull (e.g., "llama3.2", "gemma3:2b").'),
      insecure: z.boolean().optional().describe('Allow downloading over insecure connections.')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Status of the pull operation.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    ctx.progress(`Pulling model **${ctx.input.modelName}**...`);
    let result = await client.pullModel(ctx.input.modelName, ctx.input.insecure);

    return {
      output: {
        status: result.status
      },
      message: `Model **${ctx.input.modelName}** pulled successfully. Status: ${result.status}`
    };
  })
  .build();
