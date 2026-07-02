import { SlateTool } from 'slates';
import { z } from 'zod';
import { DeepSeekClient } from '../lib/client';
import { spec } from '../spec';

export let listModels = SlateTool.create(spec, {
  name: 'List Models',
  key: 'list_models',
  description: `List all currently available DeepSeek models with their metadata. Returns model identifiers that can be used in chat and FIM completion requests.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      models: z
        .array(
          z.object({
            modelId: z.string().describe('Model identifier usable in API requests'),
            ownedBy: z.string().describe('Organization that owns the model')
          })
        )
        .describe('List of available models')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DeepSeekClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.listModels();

    let models = result.data.map(m => ({
      modelId: m.id,
      ownedBy: m.owned_by
    }));

    return {
      output: { models },
      message: `Found **${models.length}** available model(s): ${models.map(m => `\`${m.modelId}\``).join(', ')}`
    };
  })
  .build();
