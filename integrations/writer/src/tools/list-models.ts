import { SlateTool } from 'slates';
import { z } from 'zod';
import { WriterClient } from '../lib/client';
import { spec } from '../spec';

export let listModels = SlateTool.create(spec, {
  name: 'List Models',
  key: 'list_models',
  description: `List all available Palmyra models in your Writer account. Returns model IDs, names, and types. Use this to discover which models are available for text generation and chat completions.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      models: z
        .array(
          z.object({
            modelId: z.string().describe('Unique model identifier'),
            name: z.string().describe('Display name of the model'),
            type: z.string().describe('Type of the model')
          })
        )
        .describe('Available models')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WriterClient(ctx.auth.token);

    ctx.progress('Listing available models...');
    let models = await client.listModels();

    let modelNames = models.map(m => m.name).join(', ');

    return {
      output: { models },
      message: `Found **${models.length}** model(s): ${modelNames}`
    };
  })
  .build();
