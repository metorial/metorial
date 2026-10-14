import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listModelsTool = SlateTool.create(spec, {
  name: 'List Models',
  key: 'list_models',
  description:
    'Discover available AI models, their identifiers, providers and token limits before configuring a bot or sending a completion.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      type: z
        .enum(['language', 'image', 'video', 'rerank', 'decision'])
        .optional()
        .describe('Model type; defaults to language'),
      cursor: z.string().optional().describe('Cursor returned by the previous page'),
      take: z
        .number()
        .refine(
          value => Number.isInteger(value) && value > 0,
          'take must be a positive whole number'
        )
        .optional()
        .describe('Number of models to return'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order')
    })
  )
  .output(
    z.object({
      models: z
        .array(z.record(z.string(), z.any()))
        .describe('Available models with stable IDs and capability limits'),
      cursor: z.string().optional().describe('Cursor for the next page'),
      count: z.number().describe('Number of models returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, runAsUserId: ctx.config.runAsUserId });
    let result = await client.listModels(ctx.input);
    return {
      output: {
        models: result.items,
        cursor: result.cursor ?? undefined,
        count: result.items.length
      },
      message: `Found **${result.items.length}** models.`
    };
  })
  .build();
