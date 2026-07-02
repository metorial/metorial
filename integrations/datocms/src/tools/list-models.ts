import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listModels = SlateTool.create(spec, {
  name: 'List Models',
  key: 'list_models',
  description: `List all content models (item types) defined in the project. Returns model names, API keys, field configuration, and settings like draft mode and localization.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      models: z.array(z.any()).describe('Array of model objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let models = await client.listModels();

    return {
      output: { models },
      message: `Found **${models.length}** models.`
    };
  })
  .build();
