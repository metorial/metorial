import { SlateTool } from 'slates';
import { z } from 'zod';
import { CultsClient } from '../lib/client';
import { spec } from '../spec';

export let getMyLikedCreations = SlateTool.create(spec, {
  name: 'Get My Liked Creations',
  key: 'get_my_liked_creations',
  description:
    'List designs liked by your authenticated Cults3D account, with their English names and creation page URLs. Supports limit and offset pagination.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z.number().int().min(1).max(100).optional().describe('Page size (default 20)'),
      offset: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('Number of designs to skip (default 0)')
    })
  )
  .output(
    z.object({
      creations: z.array(
        z.object({
          name: z.string().nullable().describe('English design name'),
          url: z.string().nullable().describe('Creation page URL')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let creations = await new CultsClient(ctx.auth).getMyLikedCreations(ctx.input);
    return {
      output: { creations },
      message: `Retrieved ${creations.length} liked designs.`
    };
  })
  .build();
