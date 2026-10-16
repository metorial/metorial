import { SlateTool } from 'slates';
import { z } from 'zod';
import { PiloterrClient } from '../lib/client';
import { normalizeOutput } from '../lib/response';
import { spec } from '../spec';

let technologySchema = z.object({
  slug: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  confidence: z.number().optional(),
  version: z.string().nullable().optional(),
  icon: z.string().optional(),
  website: z.string().optional(),
  cpe: z.string().nullable().optional(),
  categories: z
    .array(
      z.object({
        id: z.number().optional(),
        slug: z.string().optional(),
        name: z.string().optional()
      })
    )
    .optional()
});

let detectTechnologyOutputSchema = z.object({
  raw: z.any().describe('Full provider response'),
  urls: z.any().optional().describe('Analyzed URLs'),
  cms: z.string().nullable().optional().describe('Detected CMS (simple mode)'),
  technologyNames: z.array(z.string()).optional().describe('Names returned in simple mode'),
  technologies: z
    .array(technologySchema)
    .optional()
    .describe('Detected technologies with details')
});

export let detectTechnology = SlateTool.create(spec, {
  name: 'Detect Website Technology',
  key: 'detect_technology',
  description: `Detect the technology stack of any website including CMS, frameworks, analytics, CDN, hosting, and more. Returns detailed technology information with confidence scores in expert mode, or a simplified summary in simple mode.`,
  constraints: ['Response time is typically 10-15 seconds.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('URL or domain to analyze'),
      mode: z
        .enum(['simple', 'expert'])
        .default('expert')
        .describe(
          'Detection mode: "expert" for detailed info with confidence scores, "simple" for a concise summary'
        )
    })
  )
  .output(detectTechnologyOutputSchema)
  .handleInvocation(async ctx => {
    let client = new PiloterrClient(ctx.auth.token);
    let result = await client.detectTechnology({
      url: ctx.input.url,
      mode: ctx.input.mode
    });

    return {
      output: normalizeOutput(detectTechnologyOutputSchema, {
        ...result,
        raw: result,
        technologyNames:
          Array.isArray(result.technologies) &&
          result.technologies.every((item: unknown) => typeof item === 'string')
            ? result.technologies
            : undefined
      }),
      message: 'Retrieved website technology information.'
    };
  })
  .build();
