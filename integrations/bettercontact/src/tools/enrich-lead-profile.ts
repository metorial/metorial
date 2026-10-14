import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { leadProfileSchema } from '../lib/profile-schemas';
import { spec } from '../spec';

export let enrichLeadProfile = SlateTool.create(spec, {
  name: 'Enrich Lead Profile',
  key: 'enrich_lead_profile',
  description:
    'Look up one person synchronously to get their job title, seniority, location, LinkedIn profile and current company. Returns profile data in this call. Use enrich_contacts to find an email address or phone number.',
  instructions: [
    'Provide linkedinUrl whenever available. Otherwise provide firstName, lastName and companyDomain together; a company name alone cannot replace the domain.',
    'linkedinUrl takes precedence over the name and company inputs.',
    'A successful lookup consumes 0.1 credit. No profile match is reported as an error and consumes no credits.'
  ],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      linkedinUrl: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe(
          'Public LinkedIn profile URL. Sufficient on its own and takes precedence over other inputs.'
        ),
      firstName: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe(
          'First name. Required with lastName and companyDomain when linkedinUrl is omitted.'
        ),
      lastName: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe(
          'Last name. Required with firstName and companyDomain when linkedinUrl is omitted.'
        ),
      companyDomain: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe(
          'Company domain. Required with firstName and lastName when linkedinUrl is omitted.'
        ),
      company: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Optional company name, supplied in addition to companyDomain.')
    })
  )
  .output(
    z.object({
      profile: leadProfileSchema.describe(
        'Person and current company details, using the provider field names.'
      )
    })
  )
  .handleInvocation(async ctx => {
    let profile = await new Client({ token: ctx.auth.token }).enrichLeadProfile(ctx.input);
    return {
      output: { profile },
      message: 'Retrieved the lead profile and current company details.'
    };
  })
  .build();
