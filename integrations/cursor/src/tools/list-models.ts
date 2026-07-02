import { SlateTool } from 'slates';
import { z } from 'zod';
import { CloudAgentsClient } from '../lib/client';
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
      models: z.array(z.string().describe('Model identifier'))
    })
  )
  .handleInvocation(async ctx => {
    let client = new CloudAgentsClient({ token: ctx.auth.token });
    let result = await client.listModels();

    return {
      output: {
        models: result.models
      },
      message: `Found **${result.models.length}** available model(s): ${result.models.join(', ')}.`
    };
  })
  .build();
