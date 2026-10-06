import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, records } from '../lib/client';
import { spec } from '../spec';

export let enrichTechnographics = SlateTool.create(spec, {
  name: 'Enrich Technographics',
  key: 'enrich_technographics',
  description: `Retrieve the technology stack installed at a company. Returns information about technologies, software, and tools that a company uses. Useful for competitive intelligence and technology-based targeting.`,
  constraints: [
    'Enrichment can consume credits and counts against request/record limits. Purchased-record and usage history may be retained by ZoomInfo.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      companyId: z.number().optional().describe('ZoomInfo company ID'),
      companyName: z.string().optional().describe('Company name'),
      companyWebsite: z.string().optional().describe('Company website domain'),
      technologyNames: z
        .array(z.string())
        .optional()
        .describe('Filter by specific technology names')
    })
  )
  .output(
    z.object({
      technologies: z
        .array(z.record(z.string(), z.unknown()))
        .describe(
          'Technology stack data including product names, categories, and install dates'
        )
    })
  )
  .handleInvocation(async ctx => {
    const client = Client.fromContext(ctx);

    let result = await client.enrichTechnology(ctx.input);

    const technologies = records(result);

    return {
      output: { technologies },
      message: `Found **${technologies.length}** technologies for the company.`
    };
  })
  .build();
