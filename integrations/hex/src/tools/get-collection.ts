import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const getCollection = SlateTool.create(spec, {
  name: 'Get Collection',
  key: 'get_collection',
  description:
    'Read the selected Hex collection. Description and timestamps are returned only when supplied by the provider.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      collectionId: z.string().describe('Collection UUID discovered with List Collections')
    })
  )
  .output(
    z.object({
      collectionId: z.string(),
      name: z.string(),
      description: z.string().nullable().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    const output = await new Client({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl ?? ctx.config.baseUrl
    }).getCollection(ctx.input.collectionId);
    return { output, message: `Retrieved collection **${output.name}**.` };
  })
  .build();
