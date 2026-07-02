import { SlateTool } from 'slates';
import { z } from 'zod';
import { CohereClient } from '../lib/client';
import { spec } from '../spec';

export let listModelsTool = SlateTool.create(spec, {
  name: 'List Models',
  key: 'list_models',
  description: `List available Cohere models with their capabilities. Filter by endpoint type (chat, embed, rerank, etc.) to find models compatible with a specific use case.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      endpoint: z
        .enum(['chat', 'embed', 'classify', 'summarize', 'rerank', 'rate', 'generate'])
        .optional()
        .describe('Filter models by supported endpoint type'),
      defaultOnly: z
        .boolean()
        .optional()
        .describe('When filtering by endpoint, only return the default model'),
      pageSize: z
        .number()
        .min(1)
        .max(1000)
        .optional()
        .describe('Number of models per page (default: 20, max: 1000)'),
      pageToken: z.string().optional().describe('Pagination token from a previous response')
    })
  )
  .output(
    z.object({
      models: z
        .array(
          z.object({
            name: z.string().describe('Model identifier'),
            endpoints: z.array(z.string()).optional().describe('Supported API endpoints'),
            contextLength: z.number().optional().describe('Maximum context window in tokens'),
            isDeprecated: z.boolean().optional().describe('Whether the model is deprecated'),
            finetuned: z.boolean().optional().describe('Whether the model is fine-tuned')
          })
        )
        .describe('List of available models'),
      nextPageToken: z.string().optional().describe('Token to fetch the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CohereClient({ token: ctx.auth.token });

    let result = await client.listModels({
      endpoint: ctx.input.endpoint,
      defaultOnly: ctx.input.defaultOnly,
      pageSize: ctx.input.pageSize,
      pageToken: ctx.input.pageToken
    });

    let models = (result.models || []).map((m: any) => ({
      name: m.name || '',
      endpoints: m.endpoints,
      contextLength: m.context_length,
      isDeprecated: m.is_deprecated,
      finetuned: m.finetuned
    }));

    return {
      output: {
        models,
        nextPageToken: result.next_page_token
      },
      message: `Found **${models.length}** model(s)${ctx.input.endpoint ? ` supporting the **${ctx.input.endpoint}** endpoint` : ''}.`
    };
  })
  .build();
