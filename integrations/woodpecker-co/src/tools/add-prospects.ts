import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let prospectInputSchema = z.object({
  email: z.string().describe('Prospect email address (required)'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  company: z.string().optional().describe('Company name'),
  title: z.string().optional().describe('Job title'),
  phone: z.string().optional().describe('Phone number'),
  website: z.string().optional().describe('Website URL'),
  industry: z.string().optional().describe('Industry'),
  address: z.string().optional().describe('Address'),
  city: z.string().optional().describe('City'),
  state: z.string().optional().describe('State'),
  country: z.string().optional().describe('Country'),
  tags: z.string().optional().describe('Tags for the prospect'),
  snippet1: z.string().optional().describe('Custom snippet field 1'),
  snippet2: z.string().optional().describe('Custom snippet field 2'),
  snippet3: z.string().optional().describe('Custom snippet field 3'),
  snippet4: z.string().optional().describe('Custom snippet field 4'),
  snippet5: z.string().optional().describe('Custom snippet field 5'),
  snippet6: z.string().optional().describe('Custom snippet field 6'),
  snippet7: z.string().optional().describe('Custom snippet field 7'),
  snippet8: z.string().optional().describe('Custom snippet field 8'),
  snippet9: z.string().optional().describe('Custom snippet field 9'),
  snippet10: z.string().optional().describe('Custom snippet field 10'),
  snippet11: z.string().optional().describe('Custom snippet field 11'),
  snippet12: z.string().optional().describe('Custom snippet field 12'),
  snippet13: z.string().optional().describe('Custom snippet field 13'),
  snippet14: z.string().optional().describe('Custom snippet field 14'),
  snippet15: z.string().optional().describe('Custom snippet field 15')
});

export let addProspects = SlateTool.create(spec, {
  name: 'Add Prospects',
  key: 'add_prospects',
  description: `Add one or more prospects to the global Woodpecker database or directly to a specific campaign. If a prospect with the same email already exists, it will be updated. Supports all standard contact fields plus 15 custom snippet fields for personalization.`,
  instructions: [
    'Email is required for each prospect.',
    'If campaignId is provided, prospects will be added directly to that campaign.',
    'Existing prospects (matched by email) will be updated with the new data.'
  ]
})
  .input(
    z.object({
      prospects: z.array(prospectInputSchema).min(1).describe('List of prospects to add'),
      campaignId: z
        .number()
        .optional()
        .describe(
          'Campaign ID to add prospects to. If omitted, prospects are added to the global database only.'
        )
    })
  )
  .output(
    z.object({
      addedCount: z.number().describe('Number of prospects processed'),
      status: z.string().describe('Operation result status'),
      results: z
        .array(z.any())
        .optional()
        .describe('Per-prospect IDs and provider results, including any failures'),
      failedCount: z
        .number()
        .optional()
        .describe('Number of prospects rejected by the provider')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companyId: ctx.config.companyId
    });

    let mapped = ctx.input.prospects.map(p => {
      let prospect: Record<string, any> = { email: p.email };
      if (p.firstName !== undefined) prospect.first_name = p.firstName;
      if (p.lastName !== undefined) prospect.last_name = p.lastName;
      if (p.company !== undefined) prospect.company = p.company;
      if (p.title !== undefined) prospect.title = p.title;
      if (p.phone !== undefined) prospect.phone = p.phone;
      if (p.website !== undefined) prospect.website = p.website;
      if (p.industry !== undefined) prospect.industry = p.industry;
      if (p.address !== undefined) prospect.address = p.address;
      if (p.city !== undefined) prospect.city = p.city;
      if (p.state !== undefined) prospect.state = p.state;
      if (p.country !== undefined) prospect.country = p.country;
      if (p.tags !== undefined) prospect.tags = p.tags;
      for (let i = 1; i <= 15; i++) {
        let key = `snippet${i}` as keyof typeof p;
        if (p[key] !== undefined) prospect[`snippet${i}`] = p[key];
      }
      return prospect;
    });

    let result: any;
    if (ctx.input.campaignId) {
      result = await client.addProspectsToCampaign(ctx.input.campaignId, mapped);
    } else {
      result = await client.addProspectsToDatabase(mapped);
    }

    let results: any[] = result?.prospects ?? [];
    let failedCount = results.filter(p => p.status === 'ERROR').length;
    let addedCount = results.filter(p => p.id != null && p.status !== 'ERROR').length;
    return {
      output: {
        addedCount,
        status:
          typeof result?.status === 'string'
            ? result.status
            : (result?.status?.status ?? 'OK'),
        results,
        failedCount
      },
      message: `Processed **${ctx.input.prospects.length}** prospect(s): ${addedCount} accepted, ${failedCount} rejected.`
    };
  })
  .build();
