import { SlateTool } from 'slates';
import { z } from 'zod';
import { CurrentAgentsClient, cloudModelSchema } from '../lib/current-client';
import { spec } from '../spec';

export let listModels = SlateTool.create(spec, {
  name: 'List Models',
  key: 'list_models',
  description: `List available AI models that can be used when launching Cursor cloud agents.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      models: z.array(z.string().describe('Model identifier')),
      modelDetails: z
        .array(cloudModelSchema)
        .optional()
        .describe('Current model names, aliases, supported parameters, and variants')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CurrentAgentsClient({ token: ctx.auth.token });
    let result = await client.listModels();

    return {
      output: {
        models: result.items.map(model => model.id),
        modelDetails: result.items
      },
      message: `Found **${result.items.length}** available model(s): ${result.items.map(model => model.id).join(', ')}.`
    };
  })
  .build();
