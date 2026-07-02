import { SlateTool } from 'slates';
import { z } from 'zod';
import { PiloterrClient } from '../lib/client';
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
  .output(
    z.object({
      urls: z.any().optional().describe('Analyzed URLs'),
      cms: z.string().nullable().optional().describe('Detected CMS (simple mode)'),
      technologies: z
        .array(technologySchema)
        .optional()
        .describe('Detected technologies with details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PiloterrClient(ctx.auth.token);
    let result = await client.detectTechnology({
      url: ctx.input.url,
      mode: ctx.input.mode
    });

    let techCount = Array.isArray(result.technologies) ? result.technologies.length : 0;

    return {
      output: result,
      message: `Detected **${techCount} technologies** on **${ctx.input.url}** using ${ctx.input.mode} mode.`
    };
  })
  .build();
