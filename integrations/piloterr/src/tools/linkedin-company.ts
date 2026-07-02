import { SlateTool } from 'slates';
import { z } from 'zod';
import { PiloterrClient } from '../lib/client';
import { spec } from '../spec';

export let linkedinCompany = SlateTool.create(spec, {
  name: 'LinkedIn Company',
  key: 'linkedin_company',
  description: `Extract structured data from a LinkedIn company page. Retrieve company details including name, industry, employee count, followers, specialities, locations, affiliated companies, and recent posts. Supports lookup by LinkedIn URL, company username, company ID, or domain name (reverse lookup).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('LinkedIn company URL, username, or company ID'),
      domain: z
        .string()
        .optional()
        .describe('Company domain for reverse lookup (e.g., "apple.com")')
    })
  )
  .output(
    z.object({
      companyId: z.string().optional(),
      companyUrl: z.string().optional(),
      companyName: z.string().optional(),
      logoUrl: z.string().optional(),
      website: z.string().optional(),
      industry: z.string().optional(),
      tagline: z.string().optional(),
      description: z.string().optional(),
      founded: z.any().optional(),
      staffCount: z.number().optional(),
      staffRange: z.string().optional(),
      followerCount: z.number().optional(),
      specialities: z.array(z.string()).optional(),
      headquarter: z.any().optional(),
      locations: z.array(z.any()).optional(),
      raw: z.any().describe('Full raw response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PiloterrClient(ctx.auth.token);
    let result = await client.getLinkedInCompany({
      query: ctx.input.query,
      domain: ctx.input.domain
    });

    return {
      output: {
        companyId: result.company_id,
        companyUrl: result.company_url,
        companyName: result.company_name,
        logoUrl: result.logo_url,
        website: result.website,
        industry: result.industry,
        tagline: result.tagline,
        description: result.description,
        founded: result.founded,
        staffCount: result.staff_count,
        staffRange: result.staff_range,
        followerCount: result.follower_count,
        specialities: result.specialities,
        headquarter: result.headquarter,
        locations: result.locations,
        raw: result
      },
      message: `Retrieved LinkedIn company data for **${result.company_name ?? ctx.input.query ?? ctx.input.domain}**.`
    };
  })
  .build();
