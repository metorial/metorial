import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listFields = SlateTool.create(spec, {
  name: 'List Fields',
  key: 'list_fields',
  description:
    'List the fields of a content model or block model, including field IDs, API keys, types, validators, and editor settings.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      modelId: z.string().describe('Model ID or API key. Use list_models to discover models.')
    })
  )
  .output(z.object({ fields: z.array(z.any()).describe('Fields defined on the model') }))
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, environment: ctx.config.environment });
    let fields = await client.listFields(ctx.input.modelId);
    return {
      output: { fields },
      message: `Found **${fields.length}** fields on model **${ctx.input.modelId}**.`
    };
  })
  .build();
