import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { companyProfileSchema } from '../lib/profile-schemas';
import { spec } from '../spec';

export let enrichCompanyProfile = SlateTool.create(spec, {
  name: 'Enrich Company Profile',
  key: 'enrich_company_profile',
  description:
    'Look up one company synchronously by its domain or LinkedIn page to get its name, industry, employee count, headquarters and other company details. This lookup does not consume credits.',
  instructions: [
    'Provide companyDomain, companyLinkedinUrl, or both. No company match is reported as an error.'
  ],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      companyDomain: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe(
          'Company website or domain, such as microsoft.com. Required when companyLinkedinUrl is omitted.'
        ),
      companyLinkedinUrl: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Company LinkedIn page URL. Required when companyDomain is omitted.')
    })
  )
  .output(
    z.object({
      profile: companyProfileSchema.describe(
        'Company details, using the provider field names. Unknown fields may be null or empty.'
      )
    })
  )
  .handleInvocation(async ctx => {
    let profile = await new Client({ token: ctx.auth.token }).enrichCompanyProfile(ctx.input);
    return { output: { profile }, message: 'Retrieved the company profile.' };
  })
  .build();
