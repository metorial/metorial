import { SlateTool } from 'slates';
import { z } from 'zod';
import { PerplexityClient } from '../lib/client';
import { spec } from '../spec';

export let listAgentModels = SlateTool.create(spec, {
  name: 'List Agent Models',
  key: 'list_agent_models',
  description:
    'List model identifiers currently available for the Perplexity Agent API. Use these IDs with agent_completion model or models fields.',
  instructions: [
    'Use this before agent_completion when you need the current provider/model identifier.',
    'Model availability can change over time, so prefer this tool over hardcoded model lists.'
  ],
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
            id: z.string().describe('Model identifier for the Agent API'),
            object: z.string().optional(),
            created: z.number().optional(),
            ownedBy: z.string().optional().describe('Model owner/provider')
          })
        )
        .describe('Available Agent API models'),
      modelCount: z.number().describe('Number of models returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PerplexityClient(ctx.auth.token);
    let response = await client.listAgentModels();
    let models = response.data.map(model => ({
      id: model.id,
      object: model.object,
      created: model.created,
      ownedBy: model.owned_by
    }));

    return {
      output: {
        models,
        modelCount: models.length
      },
      message: `Found **${models.length}** Perplexity Agent API models.`
    };
  })
  .build();
