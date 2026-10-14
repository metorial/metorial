import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { companySchema, mapCompany } from '../lib/profiles';
import { spec } from '../spec';

export let lookupCompany = SlateTool.create(spec, {
  name: 'Look Up Company',
  key: 'lookup_company',
  description:
    'Resolve a known company by domain, LinkedIn URL, or numeric LinkedIn ID. Returns at most one company profile including its stable ID, industry, employee count, and headquarters.',
  instructions: [
    'Provide at least one company identifier.',
    'An empty companies array means no match was found. Results may consume credits.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      domain: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Company website domain, such as example.com'),
      linkedinUrl: z.string().trim().min(1).optional().describe('Company LinkedIn URL'),
      linkedinId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Numeric company LinkedIn ID')
    })
  )
  .output(
    z.object({
      companies: z
        .array(companySchema)
        .describe('Matching company profile, or an empty array'),
      creditsUsed: z.number().optional().describe('Credits consumed by this lookup')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.domain && !ctx.input.linkedinUrl && !ctx.input.linkedinId) {
      throw createApiServiceError(
        'Provide domain, linkedinUrl, or linkedinId to look up a company.'
      );
    }
    let result = await new Client({ token: ctx.auth.token }).lookupCompany({
      domain: ctx.input.domain,
      professional_network_url: ctx.input.linkedinUrl,
      professional_network_id: ctx.input.linkedinId
    });
    let companies = (result.companies ?? []).map(mapCompany);
    return {
      output: { companies, creditsUsed: result.metadata?.credits },
      message: companies.length
        ? 'Found the matching company profile.'
        : 'No matching company was found.'
    };
  })
  .build();
