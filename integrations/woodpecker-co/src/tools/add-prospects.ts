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
      status: z.string().describe('Operation result status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companyId: ctx.config.companyId
    });

    let mapped = ctx.input.prospects.map(p => {
      let prospect: Record<string, any> = { email: p.email };
      if (p.firstName) prospect.first_name = p.firstName;
      if (p.lastName) prospect.last_name = p.lastName;
      if (p.company) prospect.company = p.company;
      if (p.title) prospect.title = p.title;
      if (p.phone) prospect.phone = p.phone;
      if (p.website) prospect.website = p.website;
      if (p.industry) prospect.industry = p.industry;
      if (p.address) prospect.address = p.address;
      if (p.city) prospect.city = p.city;
      if (p.state) prospect.state = p.state;
      if (p.country) prospect.country = p.country;
      if (p.tags) prospect.tags = p.tags;
      for (let i = 1; i <= 15; i++) {
        let key = `snippet${i}` as keyof typeof p;
        if (p[key]) prospect[`snippet${i}`] = p[key];
      }
      return prospect;
    });

    let result: any;
    if (ctx.input.campaignId) {
      result = await client.addProspectsToCampaign(ctx.input.campaignId, mapped);
    } else {
      result = await client.addProspectsToDatabase(mapped);
    }

    return {
      output: {
        addedCount: ctx.input.prospects.length,
        status: result?.status ?? 'OK'
      },
      message: ctx.input.campaignId
        ? `Added **${ctx.input.prospects.length}** prospect(s) to campaign ${ctx.input.campaignId}.`
        : `Added **${ctx.input.prospects.length}** prospect(s) to the global database.`
    };
  })
  .build();
