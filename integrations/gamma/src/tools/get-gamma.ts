import { SlateTool } from 'slates';
import { z } from 'zod';
import { GammaClient } from '../lib/client';
import { spec } from '../spec';

export let getGammaTool = SlateTool.create(spec, {
  name: 'Get Gamma',
  key: 'get_gamma',
  description:
    'Retrieve a Gamma document or template title, canonical URL, author, theme, timestamps, and archive state.',
  instructions: [
    'Use a file ID from search_gammas, search_templates, or a completed get_generation_status result. The document ID from a gamma.app/docs URL is also accepted.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      gammaId: z
        .string()
        .min(1)
        .max(128)
        .regex(/^[A-Za-z0-9_-]+$/)
        .describe(
          'Gamma file ID from search_gammas or get_generation_status, or document ID from a Gamma URL'
        )
    })
  )
  .output(
    z.object({
      id: z.string(),
      title: z.string(),
      type: z.enum(['regular', 'template']),
      url: z.string(),
      thumbnailUrl: z.string().nullable(),
      description: z.string().nullable(),
      author: z.object({ name: z.string(), avatarUrl: z.string().nullable() }).nullable(),
      createdTime: z.string().nullable(),
      updatedTime: z.string().nullable(),
      themeId: z.string().nullable(),
      archived: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GammaClient(ctx.auth.token);
    let result = await client.getGamma(ctx.input.gammaId);
    return {
      output: result,
      message: `Retrieved **${result.title}**. View it at ${result.url}`
    };
  });
