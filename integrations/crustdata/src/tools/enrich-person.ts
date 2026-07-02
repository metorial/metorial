import { SlateTool } from 'slates';
import { z } from 'zod';
import { CrustdataClient } from '../lib/client';
import { spec } from '../spec';

export let enrichPerson = SlateTool.create(spec, {
  name: 'Enrich Person',
  key: 'enrich_person',
  description: `Enrich data for one or more individuals from public sources.
Returns employment history, education, social profiles, skills, and contact information.
Works with LinkedIn URLs, emails, or name + company combinations.`,
  instructions: [
    'Provide at least one of: linkedinProfileUrl, email, or name + companyName.',
    'Multiple LinkedIn URLs can be comma-separated for batch enrichment.',
    'If a profile is not found immediately, auto-enrichment occurs within 30-60 minutes.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      linkedinProfileUrl: z
        .string()
        .optional()
        .describe(
          'LinkedIn profile URL(s). Supports comma-separated values for batch enrichment (e.g., "https://linkedin.com/in/person1,https://linkedin.com/in/person2").'
        ),
      email: z.string().optional().describe('Email address to look up.'),
      name: z
        .string()
        .optional()
        .describe('Full name of the person (use with companyName for best results).'),
      companyName: z
        .string()
        .optional()
        .describe('Current company name (used with name for matching).'),
      fields: z.array(z.string()).optional().describe('Specific fields to retrieve.'),
      enrichRealtime: z
        .boolean()
        .optional()
        .describe('Enable real-time enrichment for unfound profiles.')
    })
  )
  .output(
    z.object({
      profiles: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Array of enriched person profiles.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CrustdataClient(ctx.auth.token);

    let result = await client.enrichPerson({
      linkedinProfileUrl: ctx.input.linkedinProfileUrl,
      email: ctx.input.email,
      name: ctx.input.name,
      companyName: ctx.input.companyName,
      fields: ctx.input.fields,
      enrichRealtime: ctx.input.enrichRealtime
    });

    let profiles = Array.isArray(result) ? result : [result];

    return {
      output: { profiles },
      message: `Enriched **${profiles.length}** person profile(s).`
    };
  })
  .build();
