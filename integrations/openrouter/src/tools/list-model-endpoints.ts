import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listModelEndpoints = SlateTool.create(spec, {
  name: 'List Model Endpoints',
  key: 'list_model_endpoints',
  description:
    'List the upstream provider endpoints available for a specific OpenRouter model. Use this to compare provider routing options, pricing, context limits, and availability for a model.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      modelId: z
        .string()
        .describe('Model identifier with author and slug, for example "openai/gpt-4o-mini"')
    })
  )
  .output(
    z.object({
      modelId: z.string().describe('Model ID'),
      name: z.string().optional().describe('Model display name'),
      description: z.string().optional().describe('Model description'),
      endpoints: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Provider endpoints available for the model')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      siteUrl: ctx.config.siteUrl,
      appTitle: ctx.config.appTitle
    });

    let data = await client.listModelEndpoints(ctx.input.modelId);
    let endpoints = Array.isArray(data.endpoints)
      ? (data.endpoints as Record<string, unknown>[])
      : [];

    return {
      output: {
        modelId: (data.id as string) || ctx.input.modelId,
        name: (data.name as string) || undefined,
        description: (data.description as string) || undefined,
        endpoints
      },
      message: `Found **${endpoints.length}** endpoint(s) for **${data.name || ctx.input.modelId}**.`
    };
  })
  .build();
